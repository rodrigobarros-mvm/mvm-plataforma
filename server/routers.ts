import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  addLeadInteraction,
  bulkInsertLeads,
  createGoal,
  createInvite,
  createNotification,
  deleteGoal,
  deleteUser,
  disqualifyLead,
  getAllCommissions,
  getAllUsers,
  getBdrRanking,
  getCommissionConfig,
  getCommissionsByUser,
  getContactAttemptsByDate,
  getDashboardStats,
  getDisqualificationReasons,
  getPipelineStats,
  getBdrsAtRisk,
  getStagnantLeads,
  getGoals,
  getInviteByToken,
  getKpiConfig,
  getLeadById,
  getLeadInteractions,
  getLeads,
  getLeadsImportCount,
  getNotifications,
  getUnreadNotificationCount,
  getUserById,
  incrementContactAttempt,
  markAllNotificationsRead,
  markInviteUsed,
  getInvitesByUser,
  markNotificationRead,
  qualifyLead,
  toggleUserBlock,
  updateLead,
  updateUserProfile,
  updateUserRole,
  upsertCommissionConfig,
  upsertKpiConfig,
  releaseLeadsToTeam,
  revokeLeadsFromTeam,
  getLeadReleaseStats,
  getLeadReleaseLog,
  undoReleaseLog,
  unassignLeadFromBdr,
  assignLeadsToBdr,
  getLeadsFilterOptions,
  createFollowUp,
  getFollowUpsByUser,
  getFollowUpsByLead,
  markFollowUpDone,
  deleteFollowUp,
  addAssignmentLog,
  getAssignmentHistory,
  getBdrWorkload,
  getTodayContactsByUser,
  getTeamStats,
  getBdrContactDetails,
  getBdrQualifiedDetails,
  getQualificationFields,
  upsertQualificationField,
  deleteQualificationField,
  reorderQualificationFields,
  getLeadQualificationData,
  saveLeadQualificationData,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── Role Guards ──────────────────────────────────────────────────────────────
const admProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "adm" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao ADM" });
  }
  return next({ ctx });
});

// Roles com acesso de gerência (mesmo nível de permissão)
const GERENTE_ROLES = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"];

const admOrGerenteProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!GERENTE_ROLES.includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao ADM ou Gerente" });
  }
  return next({ ctx });
});

// Procedure para quem pode convidar (ADM convida qualquer um; gerência convida BDR)
const canInviteProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!GERENTE_ROLES.includes(ctx.user.role ?? "")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para enviar convites" });
  }
  return next({ ctx });
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Users ────────────────────────────────────────────────────────────────
  users: router({
    loginWithPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const { createHash } = await import("crypto");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const passwordHash = createHash("sha256").update(input.password).digest("hex");
        const found = await db.select().from(usersTable)
          .where(eq(usersTable.email, input.email))
          .limit(1);
        const user = found[0];
        if (!user || user.passwordHash !== passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou senha incorretos" });
        }
        if (user.isBlocked) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta está bloqueada. Contate o administrador." });
        }
        // Create session cookie — payload must match sdk.verifySession expectations
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "secret");
        const token = await new SignJWT({
          openId: user.openId,
          appId: process.env.VITE_APP_ID ?? "lstractor",
          name: user.name ?? user.email ?? "",
        })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setExpirationTime("7d")
          .sign(secret);
        const { getSessionCookieOptions } = await import("./_core/cookies");
        const { COOKIE_NAME } = await import("../shared/const");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
        return { success: true, role: user.role };
      }),
    list: admProcedure.query(async () => {
      return getAllUsers();
    }),

    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getUserById(input.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          lastName: z.string().optional(),
          cargo: z.string().optional(),
          whatsapp: z.string().optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({ base64: z.string(), mimeType: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const ext = input.mimeType.split("/")[1] ?? "jpg";
        const key = `avatars/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateUserProfile(ctx.user.id, { photoUrl: url });
        return { url };
      }),

    updateRole: admProcedure
      .input(z.object({ id: z.number(), role: z.enum(["adm", "gerente", "bdr"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.id, input.role);
        return { success: true };
      }),

    toggleBlock: admProcedure
      .input(z.object({ id: z.number(), isBlocked: z.boolean() }))
      .mutation(async ({ input }) => {
        await toggleUserBlock(input.id, input.isBlocked);
        return { success: true };
      }),

    delete: admProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteUser(input.id);
      return { success: true };
    }),
    invite: canInviteProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr"]),
        origin: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const senderRole = ctx.user.role as string;
        const isAdm = senderRole === "adm" || senderRole === "admin";
        if (!isAdm && input.role !== "bdr") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Gerentes, Diretores, Coordenadores e Supervisores só podem convidar BDRs" });
        }
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await createInvite({
          email: input.email,
          role: input.role,
          token,
          invitedBy: ctx.user.id,
          expiresAt,
          invitedByRole: senderRole as any,
        });
        const origin = input.origin ?? "";
        const inviteUrl = `${origin}/primeiro-acesso?token=${token}`;
        return { token, inviteUrl, success: true };
      }),
    acceptInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido ou expirado" });
        if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite já foi utilizado" });
        if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado. Solicite um novo convite." });
        return { email: invite.email, role: invite.role, valid: true };
      }),
    completeFirstAccess: publicProcedure
      .input(z.object({
        token: z.string(),
        name: z.string().min(1),
        lastName: z.string().min(1),
        cargo: z.string().optional(),
        whatsapp: z.string().optional(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
        if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite já utilizado" });
        if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado" });
        const { createHash } = await import("crypto");
        const passwordHash = createHash("sha256").update(input.password).digest("hex");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // Verificar se já existe usuário com esse email (criado via OAuth)
        const existing = await db.select({ id: users.id, openId: users.openId })
          .from(users)
          .where(eq(users.email, invite.email))
          .limit(1);

        if (existing.length > 0) {
          // Atualizar o registro existente com os dados do convite
          await db.update(users).set({
            name: input.name,
            lastName: input.lastName,
            cargo: input.cargo,
            whatsapp: input.whatsapp,
            role: invite.role as any,
            passwordHash,
            loginMethod: "invite",
            lastSignedIn: new Date(),
          }).where(eq(users.id, existing[0].id));
        } else {
          // Criar novo usuário com openId único baseado no token
          const openId = `invite_${input.token}`;
          await db.insert(users).values({
            openId,
            email: invite.email,
            name: input.name,
            lastName: input.lastName,
            cargo: input.cargo,
            whatsapp: input.whatsapp,
            role: invite.role as any,
            passwordHash,
            loginMethod: "invite",
            lastSignedIn: new Date(),
          });
        }
        await markInviteUsed(input.token);
        return { success: true, email: invite.email, role: invite.role };
      }),
    listInvites: canInviteProcedure.query(async ({ ctx }) => {
      return getInvitesByUser(ctx.user.id, ctx.user.role as string);
    }),
  }),

  // ─── Leads ────────────────────────────────────────────────────────────────
  leads: router({
    list: protectedProcedure
      .input(
        z.object({
          page: z.number().default(1),
          limit: z.number().default(50),
          search: z.string().optional(),
          uf: z.string().optional(),
          cidade: z.string().optional(),
          segmento: z.string().optional(),
          status: z.string().optional(),
          isHighPriority: z.boolean().optional(),
          assignedTo: z.number().optional(),
          isQualified: z.boolean().optional(),
          hasNomeFantasia: z.boolean().optional(),
          onlyUnreleased: z.boolean().optional(),
          onlyReleased: z.boolean().optional(),
          onlyUnassigned: z.boolean().optional(),
          ufs: z.array(z.string()).optional(),
          cidades: z.array(z.string()).optional(),
          classificacoes: z.array(z.string()).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        // ADM vê todos os leads (incluindo não liberados, a menos que filtre)
        if (role === "adm" || role === "admin") {
          return getLeads(input);
        }
        // Gerente, Diretor, Coordenador, Supervisor e BDR só vêem leads liberados pelo ADM
        const opts = { ...input, onlyReleased: true };
        // BDR vê todos os leads liberados (sem atribuição) + os atribuídos a ele
        // Não filtramos por assignedTo aqui — o BDR vê todos os liberados
        // (a atribuição específica é opcional e serve para organização interna)
        return getLeads(opts);
      }),
    // Router exclusivo ADM: liberar leads em massa para o time
    release: admProcedure
      .input(
        z.object({
          ids: z.array(z.number()).optional(),
          uf: z.string().optional(),
          ufs: z.array(z.string()).optional(),
          cidade: z.string().optional(),
          cidades: z.array(z.string()).optional(),
          segmento: z.string().optional(),
          classificacoes: z.array(z.string()).optional(),
          isHighPriority: z.boolean().optional(),
          hasNomeFantasia: z.boolean().optional(),
          limit: z.number().optional(), // Quantidade máxima de leads a liberar
        })
      )
      .mutation(async ({ ctx, input }) => {
        const total = await releaseLeadsToTeam({ ...input, releasedBy: ctx.user.id });
        return { success: true, total };
      }),
    // Router exclusivo ADM: revogar acesso a leads
    revoke: admProcedure
      .input(z.object({ ids: z.array(z.number()).optional(), uf: z.string().optional() }))
      .mutation(async ({ input }) => {
        const total = await revokeLeadsFromTeam(input);
        return { success: true, total };
      }),
    // Stats de liberação (somente ADM)
    releaseStats: admProcedure.query(async () => {
      return getLeadReleaseStats();
    }),
    // Histórico de liberações (somente ADM)
    releaseLog: admProcedure.query(async () => {
      return getLeadReleaseLog();
    }),
    undoRelease: admProcedure
      .input(z.object({ logId: z.number() }))
      .mutation(async ({ input }) => {
        const total = await undoReleaseLog(input.logId);
        return { success: true, total };
      }),
    unassignLead: admOrGerenteProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await unassignLeadFromBdr(input.leadId);
        if (result.ok && result.previousBdrId) {
          // Registrar log de desatribuição
          try {
            await addAssignmentLog({
              leadId: input.leadId,
              action: "unassigned",
              byUserId: ctx.user.id,
              toUserId: null,
            });
          } catch {}
          // Notificar o BDR que o lead foi desatribuído
          try {
            const { sendPushToUser } = await import("./pushSender");
            await sendPushToUser(result.previousBdrId, {
              title: "Lead removido da sua carteira",
              body: `O lead "${result.leadName}" foi removido da sua carteira pelo gestor.`,
              url: "/leads",
            });
          } catch {}
          // In-app notification
          try {
            await createNotification({
              userId: result.previousBdrId,
              type: "system",
              title: "Lead removido da sua carteira",
              content: `O lead "${result.leadName}" foi removido da sua carteira por ${ctx.user.name ?? "um gestor"}.`,
            });
          } catch {}
        }
        return { success: result.ok };
      }),
    // Buscar nome do BDR atribuído a um lead
    getAssignedBdr: admOrGerenteProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        const db2 = await (await import("./db")).getDb();
        if (!db2) return null;
        const { leads: leadsTable } = await import("../drizzle/schema");
        const { users: usersTable } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const [row] = await db2
          .select({ id: usersTable.id, name: usersTable.name, lastName: usersTable.lastName, cargo: usersTable.cargo })
          .from(leadsTable)
          .innerJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
          .where(eq(leadsTable.id, input.leadId))
          .limit(1);
        return row ?? null;
      }),
    // Histórico de atribuições de um lead
    assignmentHistory: admOrGerenteProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return getAssignmentHistory(input.leadId);
      }),
    // Carga de leads por BDR (quantos leads cada BDR tem atribuídos)
    bdrWorkload: admOrGerenteProcedure
      .query(async () => {
        return getBdrWorkload();
      }),
    // Opções de filtro dinâmico (UFs, cidades, classificações) para multi-seleção
    filterOptions: admOrGerenteProcedure
      .input(z.object({
        ufs: z.array(z.string()).optional(),
        onlyReleased: z.boolean().optional(),
        onlyUnreleased: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return getLeadsFilterOptions(input);
      }),
    // Atribuição em massa de leads a um BDR específico
    assignBulk: admOrGerenteProcedure
      .input(z.object({
        bdrId: z.number(),
        ids: z.array(z.number()).optional(),
        ufs: z.array(z.string()).optional(),
        cidades: z.array(z.string()).optional(),
        classificacoes: z.array(z.string()).optional(),
        isHighPriority: z.boolean().optional(),
        hasNomeFantasia: z.boolean().optional(),
        limit: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await assignLeadsToBdr({ ...input, assignedBy: ctx.user.id });
        const total = typeof result === "number" ? result : (result as any)?.total ?? 0;
        const assignedIds: number[] = typeof result === "object" && (result as any)?.ids ? (result as any).ids : [];
        // Registrar log de atribuição para cada lead
        if (assignedIds.length > 0) {
          await Promise.allSettled(
            assignedIds.map((leadId) =>
              addAssignmentLog({ leadId, action: "assigned", byUserId: ctx.user.id, toUserId: input.bdrId })
            )
          );
        }
        // Send Web Push notification to the BDR
        if (total > 0) {
          try {
            const { sendPushToUser } = await import("./pushSender");
            await sendPushToUser(input.bdrId, {
              title: "Novos leads atribuídos!",
              body: `${total} lead${total > 1 ? "s foram atribuídos" : " foi atribuído"} à sua carteira. Acesse agora para prospectar!`,
              url: "/leads/priority",
              tag: "leads-assigned",
            });
          } catch (_) { /* push is best-effort */ }
        }
        return { success: true, total };
      }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getLeadById(input.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            nomeDecissor: z.string().optional(),
            conheceMarca: z.string().optional(),
            frotaAtual: z.string().optional(),
            creditoFormaPagamento: z.string().optional(),
            urgenciaCompra: z.string().optional(),
            desafioPrincipal: z.string().optional(),
            statusContato: z.string().optional(),
            dataContato: z.string().optional(),
            linkCrm: z.string().optional(),
            observacoes: z.string().optional(),
            modeloTrator: z.string().optional(),
            ticketEstimado: z.string().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        await updateLead(input.id, input.data as Parameters<typeof updateLead>[1]);
        return { success: true };
      }),

    qualify: protectedProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const lead = await getLeadById(input.id);
        if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

        // Verificar campos obrigatórios
        const requiredFields = [
          "nomeDecissor",
          "conheceMarca",
          "frotaAtual",
          "urgenciaCompra",
          "statusContato",
          "whatsapp1",
          "email",
        ] as const;
        const missing = requiredFields.filter((f) => !lead[f]);
        if (missing.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Campos obrigatórios faltando: ${missing.join(", ")}`,
          });
        }

        await qualifyLead(input.id, ctx.user.id);

        // Notificar ADMs e Gerentes (in-app + push)
        const allUsers = await getAllUsers();
        const managers = allUsers.filter((u) => GERENTE_ROLES.includes(u.role ?? ""));
        const bdrName = `${ctx.user.name ?? ""} ${(ctx.user as any).lastName ?? ""}`.trim() || "Um BDR";
        const leadName = lead.nomeFantasia ?? lead.razaoSocial ?? "Lead";
        const { sendPushToUser } = await import("./pushSender");
        for (const mgr of managers) {
          // In-app notification
          await createNotification({
            userId: mgr.id,
            type: "lead_qualificado",
            title: "Lead Qualificado!",
            content: `${bdrName} qualificou o lead: ${leadName}`,
            relatedLeadId: input.id,
            relatedUserId: ctx.user.id,
          });
          // Push notification
          await sendPushToUser(mgr.id, {
            title: `✅ Lead Qualificado!`,
            body: `${bdrName} qualificou: ${leadName}`,
            url: `/leads/${input.id}`,
          }).catch(() => {}); // silenciar erro se sem subscription
        }

        // Verificar meta diária
        const today = new Date().toISOString().split("T")[0]!;
        const todayQualified = await getLeads({
          isQualified: true,
          assignedTo: ctx.user.id,
        });
        const todayCount = todayQualified.data.filter((l) => {
          if (!l.qualifiedAt) return false;
          return l.qualifiedAt.toISOString().split("T")[0] === today;
        }).length;

        const kpi = await getKpiConfig();
        const dailyGoal = kpi?.dailyQualifiedLeads ?? 5;

        if (todayCount >= dailyGoal) {
          // Notificar o BDR
          await createNotification({
            userId: ctx.user.id,
            type: "meta_atingida",
            title: "🎉 Parabéns! Meta atingida!",
            content: `Você atingiu a meta de ${dailyGoal} leads qualificados hoje!`,
          });
          // Notificar ADMs e Gerentes
          for (const mgr of managers) {
            await createNotification({
              userId: mgr.id,
              type: "bdr_meta_atingida",
              title: "BDR bateu a meta!",
              content: `${ctx.user.name} atingiu a meta de ${dailyGoal} leads qualificados hoje!`,
              relatedUserId: ctx.user.id,
            });
          }
        }

        return { success: true };
      }),

    disqualify: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres") }))
      .mutation(async ({ ctx, input }) => {
        await disqualifyLead(input.id, ctx.user.id, input.reason);
        return { success: true };
      }),

    hide: admProcedure.input(z.object({ id: z.number(), isHidden: z.boolean() })).mutation(async ({ input }) => {
      await updateLead(input.id, { isHidden: input.isHidden });
      return { success: true };
    }),

    assign: admOrGerenteProcedure
      .input(z.object({ leadId: z.number(), userId: z.number() }))
      .mutation(async ({ input }) => {
        await updateLead(input.leadId, { assignedTo: input.userId });
        return { success: true };
      }),

    addInteraction: protectedProcedure
      .input(
        z.object({
          leadId: z.number(),
          type: z.enum(["contato", "observacao", "tentativa"]),
          content: z.string().optional(),
        })
      )
       .mutation(async ({ ctx, input }) => {
        await addLeadInteraction({ ...input, userId: ctx.user.id });
        if (input.type === "tentativa") {
          const today = new Date().toISOString().split("T")[0]!;
          await incrementContactAttempt(ctx.user.id, today);
          // Verificar se atingiu meta de tentativas
          const kpi = await getKpiConfig();
          const attemptsGoal = kpi?.dailyContactAttempts ?? 80;
          const totalAttempts = await getContactAttemptsByDate(ctx.user.id, today);
          if (totalAttempts === attemptsGoal) {
            await createNotification({
              userId: ctx.user.id,
              type: "meta_atingida",
              title: "🎯 Meta de tentativas atingida!",
              content: `Você completou ${attemptsGoal} tentativas de contato hoje. Continue assim!`,
            });
          }
          // Alerta para ADM/Gerente se BDR está com baixo volume (a cada 20 tentativas, verificar se está abaixo)
          if (totalAttempts > 0 && totalAttempts % 20 === 0 && totalAttempts < attemptsGoal * 0.5) {
            const allUsers = await getAllUsers();
            const managers = allUsers.filter((u) => ["adm", "admin", "gerente"].includes(u.role ?? ""));
            for (const mgr of managers) {
              await createNotification({
                userId: mgr.id,
                type: "alerta_tentativas",
                title: "⚠️ BDR com baixo volume de contatos",
                content: `${ctx.user.name} realizou apenas ${totalAttempts} de ${attemptsGoal} tentativas hoje.`,
                relatedUserId: ctx.user.id,
              });
            }
          }
        }
        return { success: true };
      }),
    getInteractions: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return getLeadInteractions(input.leadId);
      }),
    // Registra que o lead foi compartilhado via WhatsApp com o consultor
    registerWhatsAppShare: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await addLeadInteraction({
          leadId: input.leadId,
          userId: ctx.user.id,
          type: "whatsapp_share",
          content: "Lead compartilhado via WhatsApp com o consultor comercial",
        });
        return { success: true };
      }),

    importCount: protectedProcedure.query(async () => {
      return getLeadsImportCount();
    }),
    nextForWork: protectedProcedure
      .input(z.object({ excludeIds: z.array(z.number()).optional() }))
      .query(async ({ ctx, input }) => {
        // Retorna o próximo lead prioritário para o BDR trabalhar (não qualificado, não desqualificado)
        const opts: Parameters<typeof getLeads>[0] = {
          page: 1,
          limit: 1,
          isHighPriority: true,
          isQualified: false,
        };
        if (ctx.user.role === "bdr") {
          opts.assignedTo = ctx.user.id;
          opts.onlyReleased = true;
        } else if (ctx.user.role !== "adm" && ctx.user.role !== "admin") {
          opts.onlyReleased = true;
        }
        const result = await getLeads(opts);
        const items = result.data ?? [];
        const excluded = input.excludeIds ?? [];
        const next = items.find((l: { id: number }) => !excluded.includes(l.id));
        if (!next) {
          // Fallback: qualquer lead não qualificado
          const fallback = await getLeads({ ...opts, isHighPriority: undefined, page: 1, limit: 1 });
          const fallbackItems = fallback.data ?? [];
          return fallbackItems.find((l: { id: number }) => !excluded.includes(l.id)) ?? null;
        }
        return next;
      }),
    todayQualified: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().split("T")[0]!;
      const start = new Date(today + "T00:00:00.000Z");
      const end = new Date(today + "T23:59:59.999Z");
      const result = await getLeads({
        assignedTo: ctx.user.role === "bdr" ? ctx.user.id : undefined,
        isQualified: true,
        page: 1,
        limit: 999,
      });
      const items = (result.data ?? []) as Array<{ qualifiedAt?: Date | null }>;
      const todayCount = items.filter(l => {
        if (!l.qualifiedAt) return false;
        const d = new Date(l.qualifiedAt);
        return d >= start && d <= end;
      }).length;
      return { todayQualified: todayCount };
    }),
  }),

  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard: router({
    stats: admOrGerenteProcedure
      .input(z.object({ period: z.enum(["today", "week", "month", "all"]).default("all") }))
      .query(async ({ input }) => {
        return getDashboardStats(input.period);
      }),

    bdrStats: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().split("T")[0]!;
      const start = new Date(today + "T00:00:00.000Z");
      const end = new Date(today + "T23:59:59.999Z");
      const [attempts, todayContacts, allQualified, kpi] = await Promise.all([
        getContactAttemptsByDate(ctx.user.id, today),
        getTodayContactsByUser(ctx.user.id, today),
        getLeads({ assignedTo: ctx.user.id, isQualified: true, page: 1, limit: 9999 }),
        getKpiConfig(),
      ]);
      const todayQualified = (allQualified.data ?? []).filter((l: any) => {
        if (!l.qualifiedAt) return false;
        const d = new Date(l.qualifiedAt);
        return d >= start && d <= end;
      }).length;
      return {
        todayAttempts: attempts,
        todayContacts,
        todayQualified,
        totalQualified: allQualified.total,
        dailyGoal: kpi?.dailyQualifiedLeads ?? 5,
        dailyAttemptsGoal: kpi?.dailyContactAttempts ?? 80,
      };
    }),

    ranking: protectedProcedure
      .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }))
      .query(async ({ input }) => {
        return getBdrRanking(input.startDate, input.endDate);
      }),

    disqualificationReasons: admOrGerenteProcedure.query(async () => {
      return getDisqualificationReasons();
    }),
    pipeline: admOrGerenteProcedure
      .input(z.object({ bdrUserId: z.number().optional() }))
      .query(async ({ input }) => {
        return getPipelineStats(input.bdrUserId);
      }),
    bdrsAtRisk: admOrGerenteProcedure.query(async () => {
      return getBdrsAtRisk();
    }),
    stagnantLeads: admOrGerenteProcedure
      .input(z.object({ daysThreshold: z.number().default(3), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return getStagnantLeads(input.daysThreshold, input.limit);
      }),
    // Estatísticas globais da equipe para a barra de progresso (visível para todos)
    teamStats: protectedProcedure
      .input(z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),   // YYYY-MM-DD
        bdrId: z.number().optional(),
        uf: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getTeamStats(input);
      }),
    // Detalhes de tentativas/contatos de um BDR (apenas gestores)
    bdrContactDetails: admOrGerenteProcedure
      .input(z.object({
        bdrId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        type: z.enum(["tentativa", "contato"]).optional(),
      }))
      .query(async ({ input }) => {
        return getBdrContactDetails(input);
      }),
    // Detalhes de leads qualificados de um BDR (apenas gestores)
    bdrQualifiedDetails: admOrGerenteProcedure
      .input(z.object({
        bdrId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        uf: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getBdrQualifiedDetails(input);
      }),
  }),

  // ─── Notifications ────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return getNotifications(ctx.user.id, input.limit);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Goals ────────────────────────────────────────────────────────────────
  goals: router({
    list: protectedProcedure
      .input(z.object({ userId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const uid = ctx.user.role === "bdr" ? ctx.user.id : input.userId;
        return getGoals(uid);
      }),

    create: admOrGerenteProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          type: z.enum(["leads_qualificados", "tentativas_contato", "conversao"]),
          targetValue: z.number(),
          period: z.enum(["diario", "semanal", "mensal"]),
          startDate: z.string(),
          endDate: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createGoal({ ...input, createdBy: ctx.user.id });
        return { success: true };
      }),

    delete: admOrGerenteProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteGoal(input.id);
      return { success: true };
    }),
  }),

  // ─── Commissions ──────────────────────────────────────────────────────────
  commissions: router({
    getConfig: admOrGerenteProcedure.query(async () => {
      return getCommissionConfig();
    }),

    updateConfig: admOrGerenteProcedure
      .input(
        z.object({
          valuePerQualifiedLead: z.string(),
          percentageOfTicket: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertCommissionConfig({ ...input, updatedBy: ctx.user.id });
        return { success: true };
      }),

    myCommissions: protectedProcedure.query(async ({ ctx }) => {
      return getCommissionsByUser(ctx.user.id);
    }),

    all: admOrGerenteProcedure.query(async () => {
      return getAllCommissions();
    }),
  }),
  // ─── Push Notifications ──────────────────────────────────────────────────────────────
  push: router({
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { pushSubscriptions } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.delete(pushSubscriptions).where(
          and(eq(pushSubscriptions.userId, ctx.user.id), eq(pushSubscriptions.endpoint, input.endpoint))
        );
        await db.insert(pushSubscriptions).values({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        });
        return { success: true };
      }),
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { pushSubscriptions } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await db.delete(pushSubscriptions).where(
          and(eq(pushSubscriptions.userId, ctx.user.id), eq(pushSubscriptions.endpoint, input.endpoint))
        );
        return { success: true };
      }),
  }),
  // ─── KPI Config ───────────────────────────────────────────────────────────────────────────────
  kpi: router({
    get: protectedProcedure.query(async () => {
      return getKpiConfig();
    }),

    update: admOrGerenteProcedure
      .input(
        z.object({
          dailyContactAttempts: z.number(),
          dailyQualifiedLeads: z.number(),
          conversionRateTarget: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertKpiConfig({ ...input, updatedBy: ctx.user.id });
        return { success: true };
      }),
  }),
  // ─── Follow-ups ─────────────────────────────────────────────────────────────────────────────────────
  followUp: router({
    create: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        scheduledAt: z.date(),
        note: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createFollowUp({
          leadId: input.leadId,
          userId: ctx.user.id,
          scheduledAt: input.scheduledAt,
          note: input.note,
        });
        return { success: true };
      }),

    listMine: protectedProcedure
      .input(z.object({ includesDone: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        return getFollowUpsByUser(ctx.user.id, input.includesDone ?? false);
      }),

    listByLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return getFollowUpsByLead(input.leadId);
      }),

    done: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markFollowUpDone(input.id, ctx.user.id);
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteFollowUp(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── Qualification Fields (Configuração de Campos de Qualificação) ─────────────────────────
  qualificationFields: router({
    // Listar todos os campos (ADM/Gerente veem todos; BDR veem apenas os ativos)
    list: protectedProcedure
      .input(z.object({ onlyActive: z.boolean().optional() }))
      .query(async ({ ctx, input }) => {
        const isManager = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"].includes(ctx.user.role ?? "");
        const onlyActive = input.onlyActive ?? !isManager;
        return getQualificationFields(onlyActive);
      }),

    // Criar ou atualizar campo (somente ADM)
    upsert: admProcedure
      .input(z.object({
        id: z.number().optional(),
        label: z.string().min(1).max(128),
        fieldKey: z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "fieldKey deve começar com letra e conter apenas letras, números e _"),
        type: z.enum(["text", "number", "select", "multiselect", "boolean", "textarea"]),
        required: z.boolean(),
        active: z.boolean(),
        displayOrder: z.number().int().min(0),
        options: z.string().nullable().optional(),
        placeholder: z.string().max(256).nullable().optional(),
        helpText: z.string().max(512).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const field = await upsertQualificationField({ ...input, userId: ctx.user.id });
        if (!field) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao salvar campo" });
        return field;
      }),

    // Excluir campo (somente ADM; campos built-in não podem ser excluídos)
    delete: admProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const ok = await deleteQualificationField(input.id);
        if (!ok) throw new TRPCError({ code: "FORBIDDEN", message: "Campo padrão não pode ser excluído ou campo não encontrado" });
        return { success: true };
      }),

    // Reordenar campos (somente ADM)
    reorder: admProcedure
      .input(z.object({
        items: z.array(z.object({ id: z.number(), displayOrder: z.number().int().min(0) })),
      }))
      .mutation(async ({ input }) => {
        await reorderQualificationFields(input.items);
        return { success: true };
      }),

    // Buscar dados de qualificação de um lead específico
    getLeadData: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ input }) => {
        return getLeadQualificationData(input.leadId);
      }),

    // Salvar dados de qualificação de um lead
    saveLeadData: protectedProcedure
      .input(z.object({
        leadId: z.number(),
        entries: z.array(z.object({
          fieldId: z.number(),
          value: z.string().nullable(),
        })),
      }))
      .mutation(async ({ input }) => {
        await saveLeadQualificationData(input.leadId, input.entries);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
