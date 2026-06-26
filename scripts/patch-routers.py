#!/usr/bin/env python3
"""Patch routers.ts to update invite router with cascade logic and first access."""

content = open('server/routers.ts').read()

# 1. Replace the invite router block
old_invite = """    invite: admProcedure
      .input(z.object({ email: z.string().email(), role: z.enum(["adm", "gerente", "bdr"]) }))
      .mutation(async ({ ctx, input }) => {
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await createInvite({ ...input, token, invitedBy: ctx.user.id, expiresAt });
        return { token, success: true };
      }),
    acceptInvite: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const invite = await getInviteByToken(input.token);
        if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
        if (invite.usedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite já utilizado" });
        if (new Date() > invite.expiresAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado" });
        await markInviteUsed(input.token);
        return { email: invite.email, role: invite.role };
      }),"""

new_invite = """    invite: canInviteProcedure
      .input(z.object({
        email: z.string().email(),
        role: z.enum(["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr"]),
        origin: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const senderRole = ctx.user.role as string;
        const isAdm = senderRole === "adm" || senderRole === "admin";
        // Gerência (não ADM) só pode convidar BDR
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
        const openId = `invite_${invite.email.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}`;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { users } = await import("../drizzle/schema");
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
        }).onDuplicateKeyUpdate({
          set: {
            name: input.name,
            lastName: input.lastName,
            cargo: input.cargo,
            whatsapp: input.whatsapp,
            role: invite.role as any,
            passwordHash,
          }
        });
        await markInviteUsed(input.token);
        return { success: true, email: invite.email, role: invite.role };
      }),
    listInvites: canInviteProcedure.query(async ({ ctx }) => {
      return getInvitesByUser(ctx.user.id, ctx.user.role as string);
    }),"""

if old_invite in content:
    content = content.replace(old_invite, new_invite, 1)
    print("invite router patched OK")
else:
    print("ERROR: old_invite block not found!")

# 2. Add getDb and getInvitesByUser to imports
old_import_db = "import {\n  addLeadInteraction,"
new_import_db = "import { getDb } from \"./db\";\nimport {\n  addLeadInteraction,"

if old_import_db in content:
    content = content.replace(old_import_db, new_import_db, 1)
    print("getDb import added OK")

old_import_fn = "  markInviteUsed,"
new_import_fn = "  markInviteUsed,\n  getInvitesByUser,"

if old_import_fn in content:
    content = content.replace(old_import_fn, new_import_fn, 1)
    print("getInvitesByUser import added OK")

open('server/routers.ts', 'w').write(content)
print("File written OK")
