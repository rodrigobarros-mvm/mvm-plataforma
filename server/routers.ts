import { COOKIE_NAME } from "@shared/const";
import Anthropic from "@anthropic-ai/sdk";
import { oportunidades, maquinas as maquinasTable, estoque as estoqueTable } from "../drizzle/schema";
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
  getConsultorMetas,
  upsertConsultorMetas,
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
const appRouter = router({
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
      .input(z.object({ id: z.number(), role: z.enum(["adm", "gerente", "bdr", "consultor"]) }))
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
    role: z.enum(["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr", "consultor"]),
    origin: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    ...
    await createInvite({
      email: input.email,
      role: input.role,
      token,
      invitedBy: ctx.user.id,
      expiresAt,
      invitedByRole: senderRole as any,
    });
invite: canInviteProcedure
  .input(z.object({
    email: z.string().email(),
    role: z.enum(["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr", "consultor"]),
    unidade: z.enum(["bahia", "piaui", "ambas"]).default("bahia"),
    origin: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    ...
    await createInvite({
      email: input.email,
      role: input.role,
      unidade: input.unidade,
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
          modeloTrator: z.string().optional(),
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

      // ─── PDF Extraction ───────────────────────────────────────────────────────────
pdfExtract: router({
  extractMaquina: admOrGerenteProcedure
    .input(z.object({ base64: z.string() }))
    .mutation(async ({ input }) => {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: input.base64 },
            },
            {
              type: "text",
              text: `Analise esta ficha técnica de trator/máquina agrícola e extraia TODOS os dados.
Responda SOMENTE com JSON válido, sem texto adicional, sem markdown, sem explicações.

Formato exato:
{
  "marca": "LS Tractor ou ENSIGN",
  "modelo": "nome exato do modelo",
  "serie": "série se houver",
  "potenciaCv": "número em cv",
  "tracao": "4x4 ou 4x2",
  "transmissao": "descrição da transmissão",
  "versao": "Plataformado ou Cabinado ou outro",
  "aplicacaoPrincipal": "principais usos da máquina",
  "culturasSegmentos": "culturas e segmentos recomendados",
  "descricaoCompleta": "descrição técnica completa em 2-3 parágrafos",
  "fichaTecnica": {
    "Motor": "...",
    "Potência Máxima": "...",
    "Torque": "...",
    "Cilindros": "...",
    "Capacidade do Tanque": "...",
    "Peso": "...",
    "Dimensões": "...",
    "Bitola Dianteira": "...",
    "Bitola Traseira": "...",
    "Rodagem Dianteira": "...",
    "Rodagem Traseira": "...",
    "Capacidade Hidráulica": "...",
    "Engate": "...",
    "Tomada de Força": "...",
    "Cabine": "..."
  }
}

Inclua TODOS os campos encontrados na ficha técnica. Se não encontrar um campo, omita-o.`,
            },
          ],
        }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
      const clean = text.replace(/```json\n?|```\n?/g, "").trim();
      try {
        return JSON.parse(clean);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao processar resposta da IA" });
      }
    }),
    
  }),
  // ─── Consultor Metas ──────────────────────────────────────────────────────────
consultorMetas: router({
  get: protectedProcedure.query(async () => {
    return getConsultorMetas();
  }),

  upsert: admOrGerenteProcedure
    .input(z.object({
      propostasDia:        z.string(),
      visitasSemana:       z.string(),
      vendasMes:           z.string(),
      ticketMedioMes:      z.string(),
      conversaoProposta:   z.string(),
      maquinasVendidasMes: z.string(),
      faturamentoMes:      z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await upsertConsultorMetas([
        { tipo: "propostas_dia",          valorMeta: input.propostasDia,        periodo: "diario"  },
        { tipo: "visitas_semana",         valorMeta: input.visitasSemana,       periodo: "semanal" },
        { tipo: "vendas_mes",             valorMeta: input.vendasMes,           periodo: "mensal"  },
        { tipo: "ticket_medio_mes",       valorMeta: input.ticketMedioMes,      periodo: "mensal"  },
        { tipo: "conversao_proposta",     valorMeta: input.conversaoProposta,   periodo: "mensal"  },
        { tipo: "maquinas_vendidas_mes",  valorMeta: input.maquinasVendidasMes, periodo: "mensal"  },
        { tipo: "faturamento_mes",        valorMeta: input.faturamentoMes,      periodo: "mensal"  },
      ], ctx.user.id);
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


// ─── OPORTUNIDADES ROUTER ─────────────────────────────────────────────────────
import {
  oportunidades, oportunidadeInteracoes,
  maquinas, estoque, propostas
} from "../drizzle/schema";

const oportunidadesRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0 };
      const { leads: leadsTable, users } = await import("../drizzle/schema");
      const conditions: any[] = [];
      if (input.status) conditions.push(eq(oportunidades.status, input.status as any));
      const rows = await db
        .select({
          id: oportunidades.id,
          leadId: oportunidades.leadId,
          bdrId: oportunidades.bdrId,
          consultorId: oportunidades.consultorId,
          titulo: oportunidades.titulo,
          modeloInteresse: oportunidades.modeloInteresse,
          urgencia: oportunidades.urgencia,
          formaPagamento: oportunidades.formaPagamento,
          ticketEstimado: oportunidades.ticketEstimado,
          observacoesBdr: oportunidades.observacoesBdr,
          status: oportunidades.status,
          createdAt: oportunidades.createdAt,
          updatedAt: oportunidades.updatedAt,
          leadNome: leadsTable.nomeFantasia,
          leadRazao: leadsTable.razaoSocial,
          leadCidade: leadsTable.cidade,
          leadUf: leadsTable.uf,
          bdrNome: users.name,
        })
        .from(oportunidades)
        .leftJoin(leadsTable, eq(oportunidades.leadId, leadsTable.id))
        .leftJoin(users, eq(oportunidades.bdrId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(oportunidades.createdAt))
        .limit(input.limit);
      return { data: rows, total: rows.length };
    }),

  create: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      modeloInteresse: z.string().optional(),
      urgencia: z.string().optional(),
      formaPagamento: z.string().optional(),
      ticketEstimado: z.string().optional(),
      observacoesBdr: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(oportunidades).values({
        leadId: input.leadId,
        bdrId: ctx.user!.id,
        modeloInteresse: input.modeloInteresse,
        urgencia: input.urgencia,
        formaPagamento: input.formaPagamento,
        ticketEstimado: input.ticketEstimado,
        observacoesBdr: input.observacoesBdr,
        status: "aguardando_consultor",
      });
      // Notify admins/gerentes + all consultores
      const { notifications } = await import("../drizzle/schema");
      const toNotify = await db.select({ id: users.id, role: users.role }).from(users)
        .where(inArray(users.role, ["adm", "gerente", "admin", "consultor"]));
      if (toNotify.length > 0) {
        await db.insert(notifications).values(toNotify.map(u => ({
          userId: u.id,
          type: "nova_oportunidade",
          title: u.role === "consultor" ? "🔥 Novo Lead Qualificado para Voce!" : "Nova Oportunidade Qualificada",
          content: u.role === "consultor"
            ? `BDR passou lead qualificado: ${input.modeloInteresse ?? "modelo a definir"} — R$ ${input.ticketEstimado ?? "a definir"}. Acesse Pipeline para assumir!`
            : `BDR passou um lead qualificado. Modelo: ${input.modeloInteresse ?? "a definir"} — Ticket: R$ ${input.ticketEstimado ?? "?"}`,
          relatedLeadId: input.leadId,
        })));
      }
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
      motivoPerda: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(oportunidades)
        .set({
          status: input.status as any,
          motivoPerda: input.motivoPerda,
          consultorId: ctx.user!.id,
          updatedAt: new Date(),
        })
        .where(eq(oportunidades.id, input.id));
      return { success: true };
    }),
});

// ─── MAQUINAS ROUTER ─────────────────────────────────────────────────────────
const { users } = await import("../drizzle/schema").catch(() => ({ users: null }));

const maquinasRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      marca: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0 };
      const conditions: any[] = [eq(maquinas.ativo, true)];
      if (input.marca) conditions.push(eq(maquinas.marca, input.marca));
      if (input.search) {
        conditions.push(or(
          like(maquinas.modelo, `%${input.search}%`),
          like(maquinas.serie, `%${input.search}%`),
          like(maquinas.aplicacaoPrincipal, `%${input.search}%`),
        ));
      }
      const rows = await db.select().from(maquinas)
        .where(and(...conditions))
        .orderBy(maquinas.marca, maquinas.potenciaCv);
      return { data: rows, total: rows.length };
    }),

  create: admOrGerenteProcedure
    .input(z.object({
      marca: z.string(),
      serie: z.string().optional(),
      modelo: z.string(),
      potenciaCv: z.string().optional(),
      tracao: z.string().optional(),
      transmissao: z.string().optional(),
      versao: z.string().optional(),
      aplicacaoPrincipal: z.string().optional(),
      culturasSegmentos: z.string().optional(),
      precoFabrica: z.string().optional(),
      precoTabelaVarejo: z.string().optional(),
      fotoUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(maquinas).values({
        ...input,
        potenciaCv: input.potenciaCv || null,
        precoFabrica: input.precoFabrica || null,
        precoTabelaVarejo: input.precoTabelaVarejo || null,
        ativo: true,
      });
      return { success: true };
    }),
});

// ─── ESTOQUE ROUTER ───────────────────────────────────────────────────────────
const estoqueRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      localizacao: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0 };
      const conditions: any[] = [];
      if (input.localizacao) conditions.push(eq(estoque.localizacao, input.localizacao as any));
      const { maquinas: maquinasT } = await import("../drizzle/schema");
      const rows = await db
        .select({
          id: estoque.id,
          maquinaId: estoque.maquinaId,
          maquinaModelo: maquinasT.modelo,
          maquinaMarca: maquinasT.marca,
          chassis: estoque.chassis,
          cor: estoque.cor,
          localizacao: estoque.localizacao,
          anoFabricacao: estoque.anoFabricacao,
          anoModelo: estoque.anoModelo,
          custoAquisicao: estoque.custoAquisicao,
          freteEntrada: estoque.freteEntrada,
          impostos: estoque.impostos,
          precoVendaBruto: estoque.precoVendaBruto,
          margemPercentual: estoque.margemPercentual,
          observacoes: estoque.observacoes,
          dataEntrada: estoque.dataEntrada,
          maquinaModelo: maquinas.modelo,
          maquinaCv: maquinas.potenciaCv,
          maquinaMarca: maquinas.marca,
        })
        .from(estoque)
        .leftJoin(maquinas, eq(estoque.maquinaId, maquinas.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(estoque.createdAt));
      return { data: rows, total: rows.length };
    }),

  create: admOrGerenteProcedure
    .input(z.object({
      maquinaId: z.number(),
      chassis: z.string().optional(),
      cor: z.string().optional(),
      localizacao: z.string().optional(),
      anoFabricacao: z.number().optional(),
      anoModelo: z.number().optional(),
      custoAquisicao: z.string().optional(),
      freteEntrada: z.string().optional(),
      impostos: z.string().optional(),
      precoVendaBruto: z.string().optional(),
      margemPercentual: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(estoque).values({
        ...input,
        localizacao: (input.localizacao ?? "loja") as any,
        dataEntrada: new Date(),
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      notaFiscalUrl: z.string().optional(),
      checklistConcluido: z.boolean().optional(),
      checklistData: z.string().optional(),
      fotosRecebimento: z.string().optional(),
      observacoes: z.string().optional(),
      custoAquisicao: z.string().optional(),
      freteEntrada: z.string().optional(),
      impostos: z.string().optional(),
      margemPercentual: z.string().optional(),
      precoVendaBruto: z.string().optional(),
      descontoMaxConsultor: z.string().optional(),
      disponivel: z.boolean().optional(),
      aprovadoPor: z.number().optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, ...data } = input;
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.disponivel === true) {
        updateData.aprovadoPor = ctx.user!.id;
        updateData.dataAprovacao = new Date();
        // Notify all consultores
        const { users } = await import("../drizzle/schema");
        const consultores = await db.select({ id: users.id }).from(users)
          .where(inArray(users.role, ["consultor"]));
        for (const c of consultores) {
          await createNotification({
            userId: c.id,
            type: "maquina_disponivel",
            title: "Nova maquina disponivel para venda!",
            content: `Uma nova maquina foi liberada para venda pelo gestor. Verifique o estoque para gerar propostas.`,
          });
        }
      }
      await db.update(estoque).set(updateData).where(eq(estoque.id, id));
      return { success: true };
    }),

  getByChasis: protectedProcedure
    .input(z.object({ chassis: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const { maquinas } = await import("../drizzle/schema");
      const rows = await db
        .select({
          id: estoque.id,
          chassis: estoque.chassis,
          localizacao: estoque.localizacao,
          disponivel: estoque.disponivel,
          precoVendaBruto: estoque.precoVendaBruto,
          descontoMaxConsultor: estoque.descontoMaxConsultor,
          margemPercentual: estoque.margemPercentual,
          maquinaId: estoque.maquinaId,
          modelo: maquinas.modelo,
          marca: maquinas.marca,
          potenciaCv: maquinas.potenciaCv,
          anoFabricacao: estoque.anoFabricacao,
          anoModelo: estoque.anoModelo,
          cor: estoque.cor,
        })
        .from(estoque)
        .leftJoin(maquinas, eq(estoque.maquinaId, maquinas.id))
        .where(eq(estoque.chassis, input.chassis))
        .limit(1);
      return rows[0] ?? null;
    }),

  listDisponivel: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { maquinas } = await import("../drizzle/schema");
    return db
      .select({
        id: estoque.id,
        chassis: estoque.chassis,
        localizacao: estoque.localizacao,
        disponivel: estoque.disponivel,
        precoVendaBruto: estoque.precoVendaBruto,
        descontoMaxConsultor: estoque.descontoMaxConsultor,
        margemPercentual: estoque.margemPercentual,
        maquinaId: estoque.maquinaId,
        modelo: maquinas.modelo,
        marca: maquinas.marca,
        potenciaCv: maquinas.potenciaCv,
        cor: estoque.cor,
        anoModelo: estoque.anoModelo,
      })
      .from(estoque)
      .leftJoin(maquinas, eq(estoque.maquinaId, maquinas.id))
      .where(and(eq(estoque.disponivel, true), inArray(estoque.localizacao, ["loja", "fabrica"])))
      .orderBy(estoque.localizacao, estoque.createdAt);
  }),
});

// ─── PROPOSTAS ROUTER ─────────────────────────────────────────────────────────
const propostasRouter = router({
  create: protectedProcedure
    .input(z.object({
      oportunidadeId: z.number().optional(),
      clienteNome: z.string(),
      clienteCnpj: z.string().optional(),
      clienteUf: z.string().optional(),
      itens: z.string(),
      subtotal: z.string(),
      descontoTotal: z.string().optional(),
      freteTotal: z.string().optional(),
      totalGeral: z.string(),
      condicaoPagamento: z.string().optional(),
      prazoEntrega: z.string().optional(),
      observacoesCliente: z.string().optional(),
      numero: z.string().optional(),
      chassisEstoque: z.string().optional(),
      descontoSolicitado: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { propostas, users } = await import("../drizzle/schema");
      const numero = input.numero ?? `PROP-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*999)+1).padStart(3,"0")}`;
      // Check if discount needs manager approval
      const descontoSolicitado = Number(input.descontoSolicitado ?? 0);
      let needsApproval = false;
      if (input.chassisEstoque) {
        const estoqueRow = await db.select({ descontoMaxConsultor: estoque.descontoMaxConsultor })
          .from(estoque).where(eq(estoque.chassis, input.chassisEstoque)).limit(1);
        const maxDesc = Number(estoqueRow[0]?.descontoMaxConsultor ?? 3);
        if (descontoSolicitado > maxDesc) needsApproval = true;
      }

      await db.insert(propostas).values({
        numero,
        oportunidadeId: input.oportunidadeId,
        consultorId: ctx.user!.id,
        clienteNome: input.clienteNome,
        clienteCnpj: input.clienteCnpj,
        clienteUf: input.clienteUf,
        itens: input.itens,
        subtotal: input.subtotal,
        descontoTotal: input.descontoTotal ?? "0",
        freteTotal: input.freteTotal ?? "0",
        totalGeral: input.totalGeral,
        condicaoPagamento: input.condicaoPagamento,
        prazoEntrega: input.prazoEntrega,
        observacoesCliente: input.observacoesCliente,
        chassisEstoque: input.chassisEstoque,
        descontoSolicitado: input.descontoSolicitado,
        status: needsApproval ? "aguardando_aprovacao" : "enviada",
      });

      // If needs approval, notify managers
      if (needsApproval) {
        const { users } = await import("../drizzle/schema");
        const admins = await db.select({ id: users.id }).from(users)
          .where(inArray(users.role, ["adm", "gerente", "admin"]));
        for (const a of admins) {
          await createNotification({
            userId: a.id,
            type: "desconto_aprovacao",
            title: "Desconto acima do limite — aprovacao necessaria",
            content: `${ctx.user!.name} solicitou ${descontoSolicitado}% de desconto na proposta ${numero} para ${input.clienteNome}. Acesse Historico de Propostas para aprovar ou reprovar.`,
          });
        }
      }
      // Auto-update opportunity status
      if (input.oportunidadeId) {
        await db.update(oportunidades)
          .set({ status: "proposta_enviada", updatedAt: new Date() })
          .where(eq(oportunidades.id, input.oportunidadeId));
      }
      // Notify managers
      const admins = await db.select({ id: users.id }).from(users)
        .where(inArray(users.role, ["adm", "gerente", "admin"]));
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          type: "proposta_enviada",
          title: "Nova Proposta Enviada",
          content: `${ctx.user!.name} enviou ${numero} para ${input.clienteNome} — R$ ${Number(input.totalGeral).toLocaleString("pt-BR")}`,
        });
      }
      return { success: true, numero };
    }),

  list: protectedProcedure
    .input(z.object({
      consultorId: z.number().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { data: [], total: 0 };
      const { propostas, users } = await import("../drizzle/schema");
      const conditions: any[] = [];
      const role = ctx.user!.role;
      if (role === "consultor") conditions.push(eq(propostas.consultorId, ctx.user!.id));
      else if (input.consultorId) conditions.push(eq(propostas.consultorId, input.consultorId));
      const rows = await db
        .select({
          id: propostas.id,
          numero: propostas.numero,
          clienteNome: propostas.clienteNome,
          clienteCnpj: propostas.clienteCnpj,
          clienteUf: propostas.clienteUf,
          totalGeral: propostas.totalGeral,
          condicaoPagamento: propostas.condicaoPagamento,
          prazoEntrega: propostas.prazoEntrega,
          status: propostas.status,
          consultorId: propostas.consultorId,
          consultorNome: users.name,
          observacoesCliente: propostas.observacoesCliente,
          createdAt: propostas.createdAt,
          updatedAt: propostas.updatedAt,
        })
        .from(propostas)
        .leftJoin(users, eq(propostas.consultorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(propostas.createdAt))
        .limit(input.limit);
      return { data: rows, total: rows.length };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["rascunho","enviada","aceita","recusada","expirada"]),
      motivoRecusa: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { propostas } = await import("../drizzle/schema");
      await db.update(propostas)
        .set({ status: input.status, motivoRecusa: input.motivoRecusa, updatedAt: new Date() })
        .where(eq(propostas.id, input.id));
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { totalGeral: 0, mesAtual: 0, aceitas: 0, volumeMes: 0, volumeTotal: 0 };
    const { propostas } = await import("../drizzle/schema");
    const conditions: any[] = [];
    if (ctx.user!.role === "consultor") conditions.push(eq(propostas.consultorId, ctx.user!.id));
    const rows = await db.select({
      status: propostas.status,
      totalGeral: propostas.totalGeral,
      createdAt: propostas.createdAt,
    }).from(propostas).where(conditions.length > 0 ? and(...conditions) : undefined);
    const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
    const mesAtual = rows.filter(r => new Date(r.createdAt) >= startOfMonth);
    return {
      totalGeral: rows.length,
      mesAtual: mesAtual.length,
      aceitas: rows.filter(r => r.status === "aceita").length,
      volumeMes: mesAtual.reduce((acc, r) => acc + Number(r.totalGeral || 0), 0),
      volumeTotal: rows.reduce((acc, r) => acc + Number(r.totalGeral || 0), 0),
    };
  }),
});



// ─── CONSULTOR RANKING ROUTER ─────────────────────────────────────────────────
const consultorRankingRouter = router({
  ranking: protectedProcedure
    .input(z.object({
      periodo: z.enum(["dia", "semana", "mes"]).default("mes"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { propostas, visitaCheckins, oportunidades, users } = await import("../drizzle/schema");

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (input.periodo === "dia") {
        startDate.setHours(0, 0, 0, 0);
      } else if (input.periodo === "semana") {
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Get all consultores
      const consultores = await db.select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.role, ["consultor", "adm", "admin", "gerente"]));

      // Get propostas per consultor
      const propostasRows = await db.select({
        consultorId: propostas.consultorId,
        totalGeral: propostas.totalGeral,
        status: propostas.status,
        createdAt: propostas.createdAt,
      }).from(propostas).where(gte(propostas.createdAt, startDate));

      // Get checkins per consultor (visitas)
      const checkinsRows = await db.select({
        userId: visitaCheckins.userId,
        durMinutos: visitaCheckins.durMinutos,
        status: visitaCheckins.status,
        createdAt: visitaCheckins.createdAt,
      }).from(visitaCheckins).where(gte(visitaCheckins.createdAt, startDate));

      // Get ganhos (vendas fechadas) per consultor
      const ganhosRows = await db.select({
        consultorId: oportunidades.consultorId,
        ticketEstimado: oportunidades.ticketEstimado,
        updatedAt: oportunidades.updatedAt,
      }).from(oportunidades)
        .where(and(eq(oportunidades.status, "ganho"), gte(oportunidades.updatedAt, startDate)));

      // Build ranking
      const rankingMap = new Map<number, {
        userId: number; userName: string;
        propostasEnviadas: number; volumePropostas: number;
        visitasRealizadas: number; vendasRealizadas: number;
        faturamentoTotal: number; maquinasVendidas: number;
      }>();

      for (const c of consultores) {
        rankingMap.set(c.id, {
          userId: c.id, userName: c.name ?? "—",
          propostasEnviadas: 0, volumePropostas: 0,
          visitasRealizadas: 0, vendasRealizadas: 0,
          faturamentoTotal: 0, maquinasVendidas: 0,
        });
      }

      for (const p of propostasRows) {
        if (!p.consultorId) continue;
        const entry = rankingMap.get(p.consultorId);
        if (!entry) continue;
        entry.propostasEnviadas++;
        entry.volumePropostas += Number(p.totalGeral || 0);
        if (p.status === "aceita") {
          entry.vendasRealizadas++;
          entry.faturamentoTotal += Number(p.totalGeral || 0);
          entry.maquinasVendidas++;
        }
      }

      for (const v of checkinsRows) {
        const entry = rankingMap.get(v.userId);
        if (!entry) continue;
        if (v.status === "valido" || v.status === "suspeito") {
          entry.visitasRealizadas++;
        }
      }

      for (const g of ganhosRows) {
        if (!g.consultorId) continue;
        const entry = rankingMap.get(g.consultorId);
        if (!entry) continue;
        // Only count if not already counted via propostas
        if (entry.vendasRealizadas === 0) {
          entry.vendasRealizadas++;
          entry.faturamentoTotal += Number(g.ticketEstimado || 0);
        }
      }

      // Calculate score (weighted)
      const result = Array.from(rankingMap.values()).map(r => {
        const maxP = Math.max(...Array.from(rankingMap.values()).map(x => x.propostasEnviadas), 1);
        const maxV = Math.max(...Array.from(rankingMap.values()).map(x => x.visitasRealizadas), 1);
        const maxVe = Math.max(...Array.from(rankingMap.values()).map(x => x.vendasRealizadas), 1);
        const maxF = Math.max(...Array.from(rankingMap.values()).map(x => x.faturamentoTotal), 1);
        const score = Math.round(
          (r.propostasEnviadas / maxP) * 30 +
          (r.visitasRealizadas / maxV) * 20 +
          (r.vendasRealizadas / maxVe) * 25 +
          (r.faturamentoTotal / maxF) * 25
        );
        return { ...r, score };
      });

      return result.sort((a, b) => b.score - a.score);
    }),
});

// Extend appRouter
const appRouterExtended = {
  ...appRouter,
  oportunidades: oportunidadesRouter,
  maquinas: maquinasRouter,
  estoque: estoqueRouter,
  propostas: propostasRouter,
  consultorRanking: consultorRankingRouter,
};
export { appRouterExtended as appRouter };
export type AppRouter = typeof appRouterExtended;
