import { and, count, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  commissionConfig,
  commissions,
  contactAttempts,
  goals,
  kpiConfig,
  leadAssignmentLog,
  leadInteractions,
  leadReleaseLog,
  leads,
  notifications,
  userInvites,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "adm";
    updateSet.role = "adm";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  // Se o usuário está fazendo login via OAuth (openId não começa com "invite_"),
  // verificar se já existe um registro com o mesmo email criado por convite.
  // Se sim, atualizar o openId e preservar o role do convite.
  if (user.email && !user.openId.startsWith("invite_")) {
    const existingByEmail = await db.select({ id: users.id, role: users.role, loginMethod: users.loginMethod })
      .from(users)
      .where(eq(users.email, user.email))
      .limit(1);

    if (existingByEmail.length > 0) {
      const existingUser = existingByEmail[0];
      // Atualizar o openId do usuário existente para o novo openId OAuth
      // Preservar o role se o usuário foi criado por convite
      const preserveRole = existingUser.loginMethod === "invite" && existingUser.role !== "bdr";
      await db.update(users).set({
        openId: user.openId,
        lastSignedIn: values.lastSignedIn,
        ...(user.name ? { name: user.name } : {}),
        ...(preserveRole ? {} : (user.role ? { role: user.role } : {})),
      }).where(eq(users.id, existingUser.id));
      return;
    }
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  id: number,
  data: {
    name?: string;
    lastName?: string;
    cargo?: string;
    whatsapp?: string;
    photoUrl?: string;
    email?: string;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function updateUserRole(id: number, role: "adm" | "gerente" | "bdr") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function toggleUserBlock(id: number, isBlocked: boolean) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ isBlocked }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, id));
}

// ─── User Invites ─────────────────────────────────────────────────────────────
export async function createInvite(data: {
  email: string;
  role: "adm" | "gerente" | "diretor" | "coordenador" | "supervisor" | "bdr";
  token: string;
  invitedBy: number;
  expiresAt: Date;
  invitedByRole?: "adm" | "admin" | "gerente" | "diretor" | "coordenador" | "supervisor";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(userInvites).values(data as any);
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userInvites).where(eq(userInvites.token, token)).limit(1);
  return result[0];
}

export async function markInviteUsed(token: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(userInvites).set({ usedAt: new Date() }).where(eq(userInvites.token, token));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeads(opts: {
  page?: number;
  limit?: number;
  search?: string;
  uf?: string;
  ufs?: string[];
  cidade?: string;
  cidades?: string[];
  segmento?: string;
  classificacoes?: string[];
  status?: string;
  isHighPriority?: boolean;
  assignedTo?: number;
  isQualified?: boolean;
  // Se true, retorna APENAS leads liberados pelo ADM (para Gerente/BDR)
  onlyReleased?: boolean;
  // Se true, retorna leads NÃO liberados (para tela de liberação do ADM)
  onlyUnreleased?: boolean;
  onlyUnassigned?: boolean;
  hasNomeFantasia?: boolean;
  modeloTrator?: string;
}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const page = opts.page ?? 1;
  const limit = opts.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  conditions.push(eq(leads.isHidden, false));
  if (opts.search) {
    conditions.push(
      or(
        like(leads.nomeFantasia, `%${opts.search}%`),
        like(leads.razaoSocial, `%${opts.search}%`),
        like(leads.cnpj, `%${opts.search}%`),
        like(leads.cidade, `%${opts.search}%`)
      )
    );
  }
  // Filtros simples (string única)
  if (opts.uf && (!opts.ufs || opts.ufs.length === 0)) conditions.push(eq(leads.uf, opts.uf));
  if (opts.cidade && (!opts.cidades || opts.cidades.length === 0)) conditions.push(like(leads.cidade, `%${opts.cidade}%`));
  if (opts.segmento) conditions.push(like(leads.segmento, `%${opts.segmento}%`));
  if (opts.modeloTrator) conditions.push(like(leads.modeloTrator, `%${opts.modeloTrator}%`));
  // Filtros multi-seleção (arrays)
  if (opts.ufs && opts.ufs.length > 0) conditions.push(inArray(leads.uf, opts.ufs));
  if (opts.cidades && opts.cidades.length > 0) {
    const cidadeConditions = opts.cidades.map((c) => like(leads.cidade, `%${c}%`));
    conditions.push(or(...cidadeConditions)!);
  }
  if (opts.classificacoes && opts.classificacoes.length > 0) conditions.push(inArray(leads.classificacao, opts.classificacoes));
  if (opts.status) conditions.push(eq(leads.statusContato, opts.status));
  if (opts.isHighPriority !== undefined) conditions.push(eq(leads.isHighPriority, opts.isHighPriority));
  if (opts.assignedTo !== undefined) conditions.push(eq(leads.assignedTo, opts.assignedTo));
  if (opts.isQualified !== undefined) conditions.push(eq(leads.isQualified, opts.isQualified));
  // Filtro de visibilidade: Gerente/BDR só veem leads liberados pelo ADM
  if (opts.onlyReleased === true) conditions.push(eq(leads.isReleasedToTeam, true));
  if (opts.onlyUnreleased === true) conditions.push(eq(leads.isReleasedToTeam, false));
  if (opts.onlyUnassigned === true) conditions.push(isNull(leads.assignedTo));
  // Filtro por existência de nome fantasia
  if (opts.hasNomeFantasia === true) conditions.push(sql`${leads.nomeFantasia} IS NOT NULL AND ${leads.nomeFantasia} != ''`);
  if (opts.hasNomeFantasia === false) conditions.push(or(isNull(leads.nomeFantasia), sql`${leads.nomeFantasia} = ''`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, totalResult] = await Promise.all([
    db.select().from(leads).where(where).limit(limit).offset(offset).orderBy(desc(leads.updatedAt)),
    db.select({ count: count() }).from(leads).where(where),
  ]);

  return { data, total: totalResult[0]?.count ?? 0 };
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id));
}

export async function qualifyLead(leadId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leads)
    .set({ isQualified: true, qualifiedAt: new Date(), qualifiedBy: userId, statusContato: "Qualificado" })
    .where(eq(leads.id, leadId));
  await db.insert(leadInteractions).values({
    leadId,
    userId,
    type: "qualificacao",
    content: "Lead qualificado pelo BDR",
  });
}

export async function disqualifyLead(leadId: number, userId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leads)
    .set({
      isQualified: false,
      disqualifiedReason: reason,
      disqualifiedAt: new Date(),
      disqualifiedBy: userId,
      statusContato: "Desqualificado",
    })
    .where(eq(leads.id, leadId));
  await db.insert(leadInteractions).values({
    leadId,
    userId,
    type: "desqualificacao",
    content: reason,
  });
}

export async function addLeadInteraction(data: {
  leadId: number;
  userId: number;
  type: "contato" | "qualificacao" | "desqualificacao" | "observacao" | "tentativa" | "whatsapp_share";
  content?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leadInteractions).values(data);
  // Incrementa o contador de tentativas no lead
  if (data.type === "tentativa") {
    await db
      .update(leads)
      .set({ attemptCount: sql`${leads.attemptCount} + 1` })
      .where(eq(leads.id, data.leadId));
  }
}

export async function getLeadInteractions(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(leadInteractions)
    .where(eq(leadInteractions.leadId, leadId))
    .orderBy(desc(leadInteractions.createdAt));
}

// ─── Contact Attempts ─────────────────────────────────────────────────────────
export async function incrementContactAttempt(userId: number, date: string) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(contactAttempts)
    .where(and(eq(contactAttempts.userId, userId), eq(contactAttempts.date, date)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(contactAttempts)
      .set({ count: sql`${contactAttempts.count} + 1` })
      .where(and(eq(contactAttempts.userId, userId), eq(contactAttempts.date, date)));
  } else {
    await db.insert(contactAttempts).values({ userId, date, count: 1 });
  }
}

export async function getContactAttemptsByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select()
    .from(contactAttempts)
    .where(and(eq(contactAttempts.userId, userId), eq(contactAttempts.date, date)))
    .limit(1);
  return result[0]?.count ?? 0;
}

/**
 * Conta interações do tipo "contato" realizadas pelo BDR em um determinado dia.
 * Contatos realizados são um subconjunto das tentativas de contato.
 */
export async function getTodayContactsByUser(userId: number, date: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const startOfDay = new Date(date + "T00:00:00.000Z");
  const endOfDay = new Date(date + "T23:59:59.999Z");
  const result = await db
    .select({ count: count() })
    .from(leadInteractions)
    .where(
      and(
        eq(leadInteractions.userId, userId),
        eq(leadInteractions.type, "contato"),
        gte(leadInteractions.createdAt, startOfDay),
        lte(leadInteractions.createdAt, endOfDay)
      )
    );
  return result[0]?.count ?? 0;
}

// ─── Dashboard / KPIs ─────────────────────────────────────────────────────────
export async function getDashboardStats(period: "today" | "week" | "month" | "all" = "all") {
  const db = await getDb();
  if (!db) return null;

  // Calcular intervalo de datas com base no período
  const now = new Date();
  let periodStart: Date | null = null;
  if (period === "today") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  } else if (period === "week") {
    const day = now.getDay(); // 0=dom
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // segunda-feira
    periodStart = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  } else if (period === "month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  // Condições de período para tentativas/contatos/qualificados
  const attemptsPeriodCond = periodStart ? gte(contactAttempts.date, periodStart.toISOString().split("T")[0]!) : undefined;
  const contactsPeriodCond = periodStart ? gte(leadInteractions.createdAt, periodStart) : undefined;
  const qualifiedPeriodCond = periodStart ? gte(leads.qualifiedAt, periodStart) : undefined;

  const [totalLeads, qualifiedLeads, disqualifiedLeads, byUf, byStatus, attemptsResult, contactsResult] = await Promise.all([
    db.select({ count: count() }).from(leads).where(eq(leads.isHidden, false)),
    db.select({ count: count() }).from(leads).where(
      and(eq(leads.isQualified, true), eq(leads.isHidden, false), ...(qualifiedPeriodCond ? [qualifiedPeriodCond] : []))
    ),
    db.select({ count: count() }).from(leads).where(
      and(eq(leads.statusContato, "Desqualificado"), eq(leads.isHidden, false))
    ),
    db.select({ uf: leads.uf, count: count() }).from(leads)
      .where(and(eq(leads.isQualified, true), eq(leads.isHidden, false), ...(qualifiedPeriodCond ? [qualifiedPeriodCond] : [])))
      .groupBy(leads.uf).orderBy(desc(count())),
    db.select({ status: leads.statusContato, count: count() }).from(leads)
      .where(eq(leads.isHidden, false)).groupBy(leads.statusContato),
    // Tentativas filtradas por período
    attemptsPeriodCond
      ? db.select({ total: sql<number>`COALESCE(SUM(${contactAttempts.count}), 0)` }).from(contactAttempts).where(attemptsPeriodCond)
      : db.select({ total: sql<number>`COALESCE(SUM(${contactAttempts.count}), 0)` }).from(contactAttempts),
    // Contatos realizados filtrados por período
    contactsPeriodCond
      ? db.select({ total: count() }).from(leadInteractions).where(and(eq(leadInteractions.type, "contato"), contactsPeriodCond))
      : db.select({ total: count() }).from(leadInteractions).where(eq(leadInteractions.type, "contato")),
  ]);
  return {
    totalLeads: totalLeads[0]?.count ?? 0,
    qualifiedLeads: qualifiedLeads[0]?.count ?? 0,
    disqualifiedLeads: disqualifiedLeads[0]?.count ?? 0,
    byUf,
    byStatus,
    totalAttempts: Number(attemptsResult[0]?.total ?? 0),
    totalContacts: contactsResult[0]?.total ?? 0,
    period,
  };
}

export async function getBdrRanking(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(leads.isQualified, true)];
  if (startDate) conditions.push(gte(leads.qualifiedAt, new Date(startDate)));
  if (endDate) conditions.push(lte(leads.qualifiedAt, new Date(endDate)));

  const ranking = await db
    .select({
      userId: leads.qualifiedBy,
      qualifiedCount: count(),
    })
    .from(leads)
    .where(and(...conditions))
    .groupBy(leads.qualifiedBy)
    .orderBy(desc(count()));

  const enriched = await Promise.all(
    ranking.map(async (r) => {
      if (!r.userId) return { ...r, userName: "Desconhecido", userPhoto: null };
      const user = await getUserById(r.userId);
      return {
        ...r,
        userName: user ? `${user.name ?? ""} ${user.lastName ?? ""}`.trim() : "Desconhecido",
        userPhoto: user?.photoUrl ?? null,
        cargo: user?.cargo ?? null,
      };
    })
  );
  return enriched;
}

export async function getDisqualificationReasons() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ reason: leads.disqualifiedReason, count: count() })
    .from(leads)
    .where(and(eq(leads.statusContato, "Desqualificado"), eq(leads.isHidden, false)))
    .groupBy(leads.disqualifiedReason)
    .orderBy(desc(count()))
    .limit(20);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  content: string;
  relatedLeadId?: number;
  relatedUserId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function getNotifications(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

// ─── Goals ────────────────────────────────────────────────────────────────────
export async function getGoals(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db
      .select()
      .from(goals)
      .where(or(eq(goals.userId, userId), isNull(goals.userId)))
      .orderBy(desc(goals.createdAt));
  }
  return db.select().from(goals).orderBy(desc(goals.createdAt));
}

export async function createGoal(data: typeof goals.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(goals).values(data);
}

export async function deleteGoal(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(goals).where(eq(goals.id, id));
}

// ─── Commissions ──────────────────────────────────────────────────────────────
export async function getCommissionConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(commissionConfig).limit(1);
  return result[0] ?? null;
}

export async function upsertCommissionConfig(data: {
  valuePerQualifiedLead: string;
  percentageOfTicket?: string;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(commissionConfig).limit(1);
  if (existing.length > 0) {
    await db.update(commissionConfig).set(data).where(eq(commissionConfig.id, existing[0]!.id));
  } else {
    await db.insert(commissionConfig).values(data);
  }
}

export async function getCommissionsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(commissions)
    .where(eq(commissions.userId, userId))
    .orderBy(desc(commissions.createdAt));
}

export async function getAllCommissions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(commissions).orderBy(desc(commissions.createdAt));
}

// ─── KPI Config ───────────────────────────────────────────────────────────────
export async function getKpiConfig() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(kpiConfig).limit(1);
  return result[0] ?? null;
}

export async function upsertKpiConfig(data: {
  dailyContactAttempts: number;
  dailyQualifiedLeads: number;
  conversionRateTarget?: string;
  updatedBy: number;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(kpiConfig).limit(1);
  if (existing.length > 0) {
    await db.update(kpiConfig).set(data).where(eq(kpiConfig.id, existing[0]!.id));
  } else {
    await db.insert(kpiConfig).values(data);
  }
}

// ─── Bulk Lead Import ─────────────────────────────────────────────────────────
export async function bulkInsertLeads(rows: (typeof leads.$inferInsert)[]) {
  const db = await getDb();
  if (!db) return 0;
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.insert(leads).values(chunk).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
    inserted += chunk.length;
  }
  return inserted;
}

export async function getLeadsImportCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(leads);
  return result[0]?.count ?? 0;
}

// ─── Lead Release (Controle de Visibilidade) ──────────────────────────────────
export async function releaseLeadsToTeam(opts: {
  releasedBy: number;
  // Filtros para selecionar quais leads liberar
  uf?: string;
  ufs?: string[];
  cidade?: string;
  cidades?: string[];
  segmento?: string;
  classificacoes?: string[];
  isHighPriority?: boolean;
  hasNomeFantasia?: boolean;
  // Se fornecidos, libera apenas esses IDs específicos
  ids?: number[];
  // Limite máximo de leads a liberar (opcional)
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(leads.isHidden, false), eq(leads.isReleasedToTeam, false)];

  if (opts.ids && opts.ids.length > 0) {
    // Libera apenas os IDs especificados
    conditions.push(inArray(leads.id, opts.ids));
  } else {
    // Aplica filtros (suporte a string única e arrays)
    if (opts.ufs && opts.ufs.length > 0) conditions.push(inArray(leads.uf, opts.ufs));
    else if (opts.uf) conditions.push(eq(leads.uf, opts.uf));
    if (opts.cidades && opts.cidades.length > 0) {
      const cidadeConditions = opts.cidades.map((c) => like(leads.cidade, `%${c}%`));
      conditions.push(or(...cidadeConditions)!);
    } else if (opts.cidade) conditions.push(like(leads.cidade, `%${opts.cidade}%`));
    if (opts.classificacoes && opts.classificacoes.length > 0) conditions.push(inArray(leads.classificacao, opts.classificacoes));
    else if (opts.segmento) conditions.push(like(leads.segmento, `%${opts.segmento}%`));
    if (opts.isHighPriority !== undefined) conditions.push(eq(leads.isHighPriority, opts.isHighPriority));
    if (opts.hasNomeFantasia === true)
      conditions.push(sql`${leads.nomeFantasia} IS NOT NULL AND ${leads.nomeFantasia} != ''`);
    if (opts.hasNomeFantasia === false)
      conditions.push(sql`(${leads.nomeFantasia} IS NULL OR ${leads.nomeFantasia} = '')`);
  }

   const where = and(...conditions) as ReturnType<typeof and>;
  // Contar quantos serão liberados
  const countResult = await db.select({ count: count() }).from(leads).where(where);
  const totalAvailable = countResult[0]?.count ?? 0;
  if (totalAvailable === 0) return 0;
  // Se limit for especificado, busca os IDs dos primeiros N leads e libera apenas eles
  if (opts.limit && opts.limit > 0 && !opts.ids?.length) {
    const limitedLeads = await db.select({ id: leads.id }).from(leads).where(where).limit(opts.limit);
    const limitedIds = limitedLeads.map((l) => l.id);
    if (limitedIds.length === 0) return 0;
    await db.update(leads).set({
      isReleasedToTeam: true,
      releasedAt: new Date(),
      releasedBy: opts.releasedBy,
    }).where(inArray(leads.id, limitedIds));
    await db.insert(leadReleaseLog).values({
      releasedBy: opts.releasedBy,
      totalReleased: limitedIds.length,
      filters: JSON.stringify({ uf: opts.uf, cidade: opts.cidade, segmento: opts.segmento, isHighPriority: opts.isHighPriority, hasNomeFantasia: opts.hasNomeFantasia, limit: opts.limit }),
      leadIds: JSON.stringify(limitedIds),
    });
    return limitedIds.length;
  }
  const total = totalAvailable;
  // Buscar IDs para salvar no log
  const allLeadRows = await db.select({ id: leads.id }).from(leads).where(where);
  const allLeadIds = allLeadRows.map((l) => l.id);
  // Liberar
  await db.update(leads).set({
    isReleasedToTeam: true,
    releasedAt: new Date(),
    releasedBy: opts.releasedBy,
  }).where(where);

  // Registrar log com IDs
  await db.insert(leadReleaseLog).values({
    releasedBy: opts.releasedBy,
    totalReleased: total,
    filters: JSON.stringify({ uf: opts.uf, cidade: opts.cidade, segmento: opts.segmento, isHighPriority: opts.isHighPriority, hasNomeFantasia: opts.hasNomeFantasia, ids: opts.ids }),
    leadIds: JSON.stringify(allLeadIds),
  });

  return total;
}

export async function undoReleaseLog(logId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [log] = await db.select().from(leadReleaseLog).where(eq(leadReleaseLog.id, logId)).limit(1);
  if (!log) return 0;
  const ids: number[] = log.leadIds ? JSON.parse(log.leadIds) : [];
  if (ids.length === 0) return 0;
  await db.update(leads).set({
    isReleasedToTeam: false,
    releasedAt: null,
    releasedBy: null,
    assignedTo: null,
  }).where(inArray(leads.id, ids));
  await db.delete(leadReleaseLog).where(eq(leadReleaseLog.id, logId));
  return ids.length;
}

export async function unassignLeadFromBdr(leadId: number) {
  const db = await getDb();
  if (!db) return { ok: false, previousBdrId: null };
  // Buscar o BDR atual antes de desatribuir
  const [lead] = await db.select({ assignedTo: leads.assignedTo, nomeFantasia: leads.nomeFantasia, razaoSocial: leads.razaoSocial }).from(leads).where(eq(leads.id, leadId)).limit(1);
  const previousBdrId = lead?.assignedTo ?? null;
  const leadName = lead?.nomeFantasia || lead?.razaoSocial || `Lead #${leadId}`;
  await db.update(leads).set({
    assignedTo: null,
  }).where(eq(leads.id, leadId));
  return { ok: true, previousBdrId, leadName };
}

export async function revokeLeadsFromTeam(opts: {
  ids?: number[];
  uf?: string;
}) {
  const db = await getDb();
  if (!db) return 0;

  const conditions = [eq(leads.isReleasedToTeam, true)];
  if (opts.ids && opts.ids.length > 0) {
    conditions.push(inArray(leads.id, opts.ids));
  } else if (opts.uf) {
    conditions.push(eq(leads.uf, opts.uf));
  }

  const where = and(...conditions);
  const countResult = await db.select({ count: count() }).from(leads).where(where);
  const total = countResult[0]?.count ?? 0;
  if (total === 0) return 0;

  await db.update(leads).set({
    isReleasedToTeam: false,
    releasedAt: null,
    releasedBy: null,
  }).where(where);

  return total;
}

export async function getLeadReleaseStats() {
  const db = await getDb();
  if (!db) return { total: 0, released: 0, unreleased: 0 };
  const [totalRes, releasedRes] = await Promise.all([
    db.select({ count: count() }).from(leads).where(eq(leads.isHidden, false)),
    db.select({ count: count() }).from(leads).where(and(eq(leads.isHidden, false), eq(leads.isReleasedToTeam, true))),
  ]);
  const total = totalRes[0]?.count ?? 0;
  const released = releasedRes[0]?.count ?? 0;
  return { total, released, unreleased: total - released };
}

export async function getLeadReleaseLog() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadReleaseLog).orderBy(desc(leadReleaseLog.createdAt)).limit(50);
}

// ─── Invite helpers ───────────────────────────────────────────────────────────
export async function getInvitesByUser(userId: number, userRole: string) {
  const db = await getDb();
  if (!db) return [];
  const isAdm = userRole === "adm" || userRole === "admin";
  if (isAdm) {
    // ADM vê todos os convites
    return db.select().from(userInvites).orderBy(desc(userInvites.createdAt)).limit(100);
  }
  // Gerência vê apenas os convites que enviou
  return db.select().from(userInvites)
    .where(eq(userInvites.invitedBy, userId))
    .orderBy(desc(userInvites.createdAt))
    .limit(100);
}

// ─── Pipeline / Funil ─────────────────────────────────────────────────────────
export async function getPipelineStats(bdrUserId?: number) {
  const db = await getDb();
  if (!db) return null;

  const baseCondition = eq(leads.isHidden, false);
  const bdrCondition = bdrUserId ? eq(leads.assignedTo, bdrUserId) : undefined;
  const where = bdrCondition ? and(baseCondition, bdrCondition) : baseCondition;

  // Estágios do funil baseados em statusContato + isQualified + isDisqualified
  const [
    totalReleased,
    notStarted,
    inContact,
    waiting,
    qualified,
    disqualified,
    byBdr,
    avgTimeToQualify,
  ] = await Promise.all([
    // Total liberado para o time
    db.select({ count: count() }).from(leads).where(and(eq(leads.isHidden, false), eq(leads.isReleasedToTeam, true))),
    // Não iniciado (sem status ou "Não Iniciado")
    db.select({ count: count() }).from(leads).where(
      and(where, or(isNull(leads.statusContato), eq(leads.statusContato, "Não Iniciado")))
    ),
    // Em contato
    db.select({ count: count() }).from(leads).where(
      and(where, eq(leads.statusContato, "Em Contato"))
    ),
    // Aguardando retorno
    db.select({ count: count() }).from(leads).where(
      and(where, or(eq(leads.statusContato, "Aguardando Retorno"), eq(leads.statusContato, "Follow-up")))
    ),
    // Qualificados
    db.select({ count: count() }).from(leads).where(
      and(where, eq(leads.isQualified, true))
    ),
    // Desqualificados
    db.select({ count: count() }).from(leads).where(
      and(where, eq(leads.statusContato, "Desqualificado"))
    ),
    // Por BDR
    db
      .select({
        userId: leads.assignedTo,
        qualified: sql<number>`SUM(CASE WHEN ${leads.isQualified} = 1 THEN 1 ELSE 0 END)`,
        disqualified: sql<number>`SUM(CASE WHEN ${leads.statusContato} = 'Desqualificado' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN ${leads.statusContato} = 'Em Contato' OR ${leads.statusContato} = 'Aguardando Retorno' THEN 1 ELSE 0 END)`,
        total: count(),
      })
      .from(leads)
      .where(and(eq(leads.isHidden, false), eq(leads.isReleasedToTeam, true)))
      .groupBy(leads.assignedTo),
    // Tempo médio para qualificar (em dias)
    db
      .select({
        avgDays: sql<number>`AVG(DATEDIFF(${leads.qualifiedAt}, ${leads.createdAt}))`,
      })
      .from(leads)
      .where(and(eq(leads.isQualified, true), eq(leads.isHidden, false))),
  ]);

  const totalCount = (notStarted[0]?.count ?? 0) + (inContact[0]?.count ?? 0) + (waiting[0]?.count ?? 0) + (qualified[0]?.count ?? 0) + (disqualified[0]?.count ?? 0);
  const conversionRate = totalCount > 0 ? ((qualified[0]?.count ?? 0) / totalCount) * 100 : 0;

  return {
    totalReleased: totalReleased[0]?.count ?? 0,
    stages: [
      { name: "Não Iniciado", count: notStarted[0]?.count ?? 0, color: "#94a3b8", order: 1 },
      { name: "Em Contato", count: inContact[0]?.count ?? 0, color: "#3b82f6", order: 2 },
      { name: "Aguardando Retorno", count: waiting[0]?.count ?? 0, color: "#f59e0b", order: 3 },
      { name: "Qualificado", count: qualified[0]?.count ?? 0, color: "#22c55e", order: 4 },
      { name: "Desqualificado", count: disqualified[0]?.count ?? 0, color: "#ef4444", order: 5 },
    ],
    byBdr,
    conversionRate: Math.round(conversionRate * 10) / 10,
    avgDaysToQualify: Math.round((avgTimeToQualify[0]?.avgDays ?? 0) * 10) / 10,
  };
}

// ─── BDRs em Risco ────────────────────────────────────────────────────────────
export async function getBdrsAtRisk() {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().split("T")[0]!;
  const kpi = await getKpiConfig();
  const attemptsGoal = kpi?.dailyContactAttempts ?? 80;
  const leadsGoal = kpi?.dailyQualifiedLeads ?? 5;

  // Buscar todos os BDRs
  const allBdrs = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users).where(eq(users.role, "bdr"));

  const results = await Promise.all(allBdrs.map(async (bdr) => {
    const attempts = await getContactAttemptsByDate(bdr.id, today);
    const start = new Date(today + "T00:00:00.000Z");
    const end = new Date(today + "T23:59:59.999Z");
    const allQualified = await getLeads({ assignedTo: bdr.id, isQualified: true, page: 1, limit: 9999 });
    const todayQualified = (allQualified.data ?? []).filter((l: any) => {
      if (!l.qualifiedAt) return false;
      const d = new Date(l.qualifiedAt);
      return d >= start && d <= end;
    }).length;

    const attemptsPercent = attemptsGoal > 0 ? (attempts / attemptsGoal) * 100 : 0;
    const leadsPercent = leadsGoal > 0 ? (todayQualified / leadsGoal) * 100 : 0;
    const isAtRisk = attemptsPercent < 50 || leadsPercent < 50;

    return {
      id: bdr.id,
      name: bdr.name ?? `BDR #${bdr.id}`,
      email: bdr.email,
      todayAttempts: attempts,
      attemptsGoal,
      todayQualified,
      leadsGoal,
      attemptsPercent: Math.round(attemptsPercent),
      leadsPercent: Math.round(leadsPercent),
      isAtRisk,
    };
  }));

  return results.filter(r => r.isAtRisk);
}

// ─── Leads Estagnados ─────────────────────────────────────────────────────────
export async function getStagnantLeads(daysThreshold = 3, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  // Leads liberados, não qualificados, não desqualificados, sem interação recente
  const stagnant = await db
    .select({
      id: leads.id,
      nomeFantasia: leads.nomeFantasia,
      razaoSocial: leads.razaoSocial,
      uf: leads.uf,
      cidade: leads.cidade,
      statusContato: leads.statusContato,
      assignedTo: leads.assignedTo,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(
      and(
        eq(leads.isHidden, false),
        eq(leads.isReleasedToTeam, true),
        eq(leads.isQualified, false),
        lte(leads.updatedAt, cutoff)
      )
    )
    .orderBy(leads.updatedAt)
    .limit(limit);

  return stagnant;
}

// ─── Filtros Dinâmicos (para multi-seleção) ───────────────────────────────────
export async function getDistinctUFs(): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ uf: leads.uf })
    .from(leads)
    .where(and(eq(leads.isHidden, false), sql`${leads.uf} IS NOT NULL AND ${leads.uf} != ''`))
    .orderBy(leads.uf);
  return rows.map((r) => r.uf!).filter(Boolean);
}

export async function getDistinctCidades(ufs?: string[]): Promise<{ cidade: string; uf: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(leads.isHidden, false),
    sql`${leads.cidade} IS NOT NULL AND ${leads.cidade} != ''`,
  ];
  if (ufs && ufs.length > 0) {
    conditions.push(inArray(leads.uf, ufs));
  }
  const rows = await db
    .select({ cidade: leads.cidade, uf: leads.uf, count: count() })
    .from(leads)
    .where(and(...conditions))
    .groupBy(leads.cidade, leads.uf)
    .orderBy(desc(count()));
  return rows.map((r) => ({ cidade: r.cidade!, uf: r.uf!, count: r.count })).filter((r) => r.cidade);
}

export async function getDistinctClassificacoes(): Promise<{ label: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ classificacao: leads.classificacao, count: count() })
    .from(leads)
    .where(and(eq(leads.isHidden, false), sql`${leads.classificacao} IS NOT NULL AND ${leads.classificacao} != ''`))
    .groupBy(leads.classificacao)
    .orderBy(desc(count()));
  return rows.map((r) => ({ label: r.classificacao!, count: r.count })).filter((r) => r.label);
}

// ─── Atribuição de Leads a BDRs ───────────────────────────────────────────────
export async function assignLeadsToBdr(opts: {
  bdrId: number;
  assignedBy: number;
  // Filtros para selecionar quais leads atribuir
  ids?: number[];
  ufs?: string[];
  cidades?: string[];
  classificacoes?: string[];
  isHighPriority?: boolean;
  hasNomeFantasia?: boolean;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return 0;
   // Só pode atribuir leads já liberados
  const conditions = [eq(leads.isHidden, false), eq(leads.isReleasedToTeam, true)];

  if (opts.ids && opts.ids.length > 0) {
    conditions.push(inArray(leads.id, opts.ids));
  } else {
    if (opts.ufs && opts.ufs.length > 0) conditions.push(inArray(leads.uf, opts.ufs));
    if (opts.cidades && opts.cidades.length > 0) {
      const cidadeConditions = opts.cidades.map((c) => like(leads.cidade, `%${c}%`));
      conditions.push(or(...cidadeConditions)!);
    }
    if (opts.classificacoes && opts.classificacoes.length > 0) conditions.push(inArray(leads.classificacao, opts.classificacoes));
    if (opts.isHighPriority !== undefined) conditions.push(eq(leads.isHighPriority, opts.isHighPriority));
    if (opts.hasNomeFantasia === true)
      conditions.push(sql`${leads.nomeFantasia} IS NOT NULL AND ${leads.nomeFantasia} != ''`);
    if (opts.hasNomeFantasia === false)
      conditions.push(sql`(${leads.nomeFantasia} IS NULL OR ${leads.nomeFantasia} = ''`);
  }

  const where = and(...conditions) as ReturnType<typeof and>;

  if (opts.limit && opts.limit > 0 && !opts.ids?.length) {
    const limitedLeads = await db.select({ id: leads.id }).from(leads).where(where).limit(opts.limit);
    const limitedIds = limitedLeads.map((l) => l.id);
    if (limitedIds.length === 0) return { total: 0, ids: [] };
    await db.update(leads).set({ assignedTo: opts.bdrId, updatedAt: new Date() }).where(inArray(leads.id, limitedIds));
    return { total: limitedIds.length, ids: limitedIds };
  }

  // Buscar IDs antes de atualizar para retornar no log
  const toAssign = await db.select({ id: leads.id }).from(leads).where(where);
  const assignedIds = toAssign.map((l) => l.id);
  if (assignedIds.length === 0) return { total: 0, ids: [] };
  await db.update(leads).set({ assignedTo: opts.bdrId, updatedAt: new Date() }).where(inArray(leads.id, assignedIds));
  return { total: assignedIds.length, ids: assignedIds };
}

export async function getLeadsFilterOptions(opts: {
  ufs?: string[];
  onlyReleased?: boolean;
  onlyUnreleased?: boolean;
}) {
  const db = await getDb();
  if (!db) return { ufs: [], cidades: [], classificacoes: [], segmentos: [] };

  const baseConditions = [eq(leads.isHidden, false)];
  if (opts.onlyReleased) baseConditions.push(eq(leads.isReleasedToTeam, true));
  if (opts.onlyUnreleased) baseConditions.push(eq(leads.isReleasedToTeam, false));

  // UFs
  const ufRows = await db
    .selectDistinct({ uf: leads.uf })
    .from(leads)
    .where(and(...baseConditions, sql`${leads.uf} IS NOT NULL AND ${leads.uf} != ''`))
    .orderBy(leads.uf);
  const ufs = ufRows.map((r) => r.uf!).filter(Boolean);

  // Cidades (filtradas por UF se fornecidas)
  const cidadeConditions = [...baseConditions, sql`${leads.cidade} IS NOT NULL AND ${leads.cidade} != ''`];
  if (opts.ufs && opts.ufs.length > 0) cidadeConditions.push(inArray(leads.uf, opts.ufs));
  const cidadeRows = await db
    .select({ cidade: leads.cidade, uf: leads.uf, count: count() })
    .from(leads)
    .where(and(...cidadeConditions))
    .groupBy(leads.cidade, leads.uf)
    .orderBy(desc(count()))
    .limit(300);
  const cidades = cidadeRows.map((r) => ({ cidade: r.cidade!, uf: r.uf!, count: r.count })).filter((r) => r.cidade);

  // Classificações
  const classRows = await db
    .select({ classificacao: leads.classificacao, count: count() })
    .from(leads)
    .where(and(...baseConditions, sql`${leads.classificacao} IS NOT NULL AND ${leads.classificacao} != ''`))
    .groupBy(leads.classificacao)
    .orderBy(desc(count()));
  const classificacoes = classRows.map((r) => ({ label: r.classificacao!, count: r.count })).filter((r) => r.label);

  // Segmentos (atividade principal)
  const segRows = await db
    .select({ segmento: leads.segmento, count: count() })
    .from(leads)
    .where(and(...baseConditions, sql`${leads.segmento} IS NOT NULL AND ${leads.segmento} != ''`))
    .groupBy(leads.segmento)
    .orderBy(desc(count()))
    .limit(200);
  const segmentos = segRows.map((r) => ({ label: r.segmento!, count: r.count })).filter((r) => r.label);

  // Modelos de Trator
  const modeloConditions = [...baseConditions, sql`${leads.modeloTrator} IS NOT NULL AND ${leads.modeloTrator} != ''`];
  if (opts.ufs && opts.ufs.length > 0) modeloConditions.push(inArray(leads.uf, opts.ufs));
  const modeloRows = await db
    .select({ modeloTrator: leads.modeloTrator, count: count() })
    .from(leads)
    .where(and(...modeloConditions))
    .groupBy(leads.modeloTrator)
    .orderBy(desc(count()))
    .limit(100);

  // Split multi-model entries (e.g. "MT7.80F; MT7.90F") into individual models
  const modeloMap = new Map<string, number>();
  for (const row of modeloRows) {
    if (!row.modeloTrator) continue;
    const parts = row.modeloTrator.split(/[;,]/).map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      // Extract just the model code (e.g. "MT7.80F" from "MT7.80F Cabinado (82cv)")
      const match = part.match(/^([A-Z][A-Z0-9.]+(?:\s+[A-Z][A-Z0-9.]*)?)/i);
      const key = match ? match[1].trim() : part.substring(0, 20);
      modeloMap.set(key, (modeloMap.get(key) ?? 0) + row.count);
    }
  }
  const modelos = Array.from(modeloMap.entries())
    .map(([label, cnt]) => ({ label, count: cnt }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return { ufs, cidades, classificacoes, segmentos, modelos };
}

// ─── Follow-ups ───────────────────────────────────────────────────────────────

export async function createFollowUp(data: {
  leadId: number;
  userId: number;
  scheduledAt: Date;
  note?: string;
}) {
  const db = await getDb();
  if (!db) return null;
  const { followUps } = await import("../drizzle/schema");
  await db.insert(followUps).values({
    leadId: data.leadId,
    userId: data.userId,
    scheduledAt: data.scheduledAt,
    note: data.note ?? null,
  });
}

export async function getFollowUpsByUser(userId: number, includesDone = false) {
  const db = await getDb();
  if (!db) return [];
  const { followUps } = await import("../drizzle/schema");
  const { leads: leadsTable } = await import("../drizzle/schema");
  const { eq, and, desc } = await import("drizzle-orm");
  const conditions: any[] = [eq(followUps.userId, userId)];
  if (!includesDone) conditions.push(eq(followUps.isDone, false));
  return db
    .select({
      id: followUps.id,
      leadId: followUps.leadId,
      userId: followUps.userId,
      scheduledAt: followUps.scheduledAt,
      note: followUps.note,
      isDone: followUps.isDone,
      notifiedAt: followUps.notifiedAt,
      createdAt: followUps.createdAt,
      leadName: leadsTable.nomeFantasia,
      leadRazao: leadsTable.razaoSocial,
      leadCidade: leadsTable.cidade,
      leadUf: leadsTable.uf,
    })
    .from(followUps)
    .leftJoin(leadsTable, eq(followUps.leadId, leadsTable.id))
    .where(and(...conditions))
    .orderBy(desc(followUps.scheduledAt));
}

export async function getFollowUpsByLead(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { followUps } = await import("../drizzle/schema");
  const { users: usersTable } = await import("../drizzle/schema");
  const { eq, desc } = await import("drizzle-orm");
  return db
    .select({
      id: followUps.id,
      leadId: followUps.leadId,
      userId: followUps.userId,
      scheduledAt: followUps.scheduledAt,
      note: followUps.note,
      isDone: followUps.isDone,
      notifiedAt: followUps.notifiedAt,
      createdAt: followUps.createdAt,
      userName: usersTable.name,
      userLastName: usersTable.lastName,
    })
    .from(followUps)
    .leftJoin(usersTable, eq(followUps.userId, usersTable.id))
    .where(eq(followUps.leadId, leadId))
    .orderBy(desc(followUps.scheduledAt));
}

export async function markFollowUpDone(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { followUps } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  await db.update(followUps).set({ isDone: true }).where(and(eq(followUps.id, id), eq(followUps.userId, userId)));
}

export async function deleteFollowUp(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const { followUps } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  await db.delete(followUps).where(and(eq(followUps.id, id), eq(followUps.userId, userId)));
}

export async function getPendingFollowUpsToNotify() {
  const db = await getDb();
  if (!db) return [];
  const { followUps } = await import("../drizzle/schema");
  const { leads: leadsTable } = await import("../drizzle/schema");
  const { eq, and, lte, isNull } = await import("drizzle-orm");
  const now = new Date();
  return db
    .select({
      id: followUps.id,
      leadId: followUps.leadId,
      userId: followUps.userId,
      scheduledAt: followUps.scheduledAt,
      note: followUps.note,
      leadName: leadsTable.nomeFantasia,
      leadRazao: leadsTable.razaoSocial,
    })
    .from(followUps)
    .leftJoin(leadsTable, eq(followUps.leadId, leadsTable.id))
    .where(and(eq(followUps.isDone, false), lte(followUps.scheduledAt, now), isNull(followUps.notifiedAt)))
    .limit(50);
}

export async function markFollowUpNotified(id: number) {
  const db = await getDb();
  if (!db) return;
  const { followUps } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await db.update(followUps).set({ notifiedAt: new Date() }).where(eq(followUps.id, id));
}

// ─── Lead Assignment Log ──────────────────────────────────────────────────────

export async function addAssignmentLog(data: {
  leadId: number;
  action: "assigned" | "unassigned";
  byUserId: number;
  toUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(leadAssignmentLog).values({
    leadId: data.leadId,
    action: data.action,
    byUserId: data.byUserId,
    toUserId: data.toUserId ?? null,
  });
}

export async function getAssignmentHistory(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { eq, desc } = await import("drizzle-orm");
  const byUser = { id: users.id, name: users.name, lastName: users.lastName, cargo: users.cargo };
  // Alias para o BDR destino (toUserId)
  const { users: usersAlias } = await import("../drizzle/schema");
  const rows = await db
    .select({
      id: leadAssignmentLog.id,
      action: leadAssignmentLog.action,
      createdAt: leadAssignmentLog.createdAt,
      byUserId: leadAssignmentLog.byUserId,
      toUserId: leadAssignmentLog.toUserId,
      byName: users.name,
      byLastName: users.lastName,
      byCargo: users.cargo,
    })
    .from(leadAssignmentLog)
    .leftJoin(users, eq(leadAssignmentLog.byUserId, users.id))
    .where(eq(leadAssignmentLog.leadId, leadId))
    .orderBy(desc(leadAssignmentLog.createdAt))
    .limit(50);

  // Buscar nomes dos BDRs destino separadamente para evitar duplo join com mesma tabela
  const toUserIds = Array.from(new Set(rows.map((r) => r.toUserId).filter(Boolean) as number[]));
  let toUserMap: Record<number, { name: string | null; lastName: string | null }> = {};
  if (toUserIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    const toUsers = await db
      .select({ id: usersAlias.id, name: usersAlias.name, lastName: usersAlias.lastName })
      .from(usersAlias)
      .where(inArray(usersAlias.id, toUserIds));
    toUserMap = Object.fromEntries(toUsers.map((u) => [u.id, { name: u.name, lastName: u.lastName }]));
  }

  return rows.map((r) => ({
    ...r,
    toName: r.toUserId ? (toUserMap[r.toUserId]?.name ?? null) : null,
    toLastName: r.toUserId ? (toUserMap[r.toUserId]?.lastName ?? null) : null,
  }));
}

export async function getBdrWorkload() {
  const db = await getDb();
  if (!db) return [];
  const { eq, count, and, isNotNull } = await import("drizzle-orm");
  const rows = await db
    .select({
      bdrId: leads.assignedTo,
      assignedCount: count(),
      name: users.name,
      lastName: users.lastName,
      cargo: users.cargo,
    })
    .from(leads)
    .leftJoin(users, eq(leads.assignedTo, users.id))
    .where(and(eq(leads.isHidden, false), isNotNull(leads.assignedTo)))
    .groupBy(leads.assignedTo, users.name, users.lastName, users.cargo);
  return rows.filter((r) => r.bdrId !== null);
}

// ─── Team Stats (Global Progress Bar) ─────────────────────────────────────────

/**
 * Retorna estatísticas agregadas de todos os BDRs para a barra de progresso global.
 * Suporta filtros por período (dia/semana/mês/ano) e por BDR específico.
 */
export async function getTeamStats(opts: {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  bdrId?: number;
  uf?: string;
}) {
  const db = await getDb();
  if (!db) return { totalAttempts: 0, totalContacts: 0, totalQualified: 0, totalGoalAttempts: 0, totalGoalQualified: 0, days: 1, bdrs: [] };

  const { startDate, endDate, bdrId, uf } = opts;
  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");

  // Buscar apenas BDRs ativos (excluir gestores: adm, gerente, diretor, coordenador, supervisor)
  const allBdrs = await db.select().from(users).where(
    and(eq(users.isBlocked, false), eq(users.role, "bdr"))
  );
  let bdrList = allBdrs;
  if (bdrId) bdrList = bdrList.filter(u => u.id === bdrId);

  // KPI config para metas individuais
  const kpi = await getKpiConfig();
  const dailyAttemptsGoal = kpi?.dailyContactAttempts ?? 80;
  const dailyQualifiedGoal = kpi?.dailyQualifiedLeads ?? 5;

  // Calcular número de dias no período
  // NOTA: end é T23:59:59.999Z, então diff ≈ N - 0.000001 dias.
  // Math.ceil garante que 0.9999... → 1, 1.9999... → 2, etc. (sem o bug do +1)
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));

  // Buscar tentativas (contact_attempts) para cada BDR no período
  const attemptsRows = await db
    .select({
      userId: contactAttempts.userId,
      total: sql<number>`SUM(${contactAttempts.count})`,
    })
    .from(contactAttempts)
    .where(
      and(
        gte(contactAttempts.date, startDate),
        lte(contactAttempts.date, endDate),
        ...(bdrId ? [eq(contactAttempts.userId, bdrId)] : [])
      )
    )
    .groupBy(contactAttempts.userId);

  // Buscar contatos realizados (lead_interactions tipo "contato") no período
  const contactsRows = await db
    .select({
      userId: leadInteractions.userId,
      total: count(),
    })
    .from(leadInteractions)
    .where(
      and(
        eq(leadInteractions.type, "contato"),
        gte(leadInteractions.createdAt, start),
        lte(leadInteractions.createdAt, end),
        ...(bdrId ? [eq(leadInteractions.userId, bdrId)] : [])
      )
    )
    .groupBy(leadInteractions.userId);

  // Buscar leads qualificados no período
  const qualifiedConditions: any[] = [
    eq(leads.isQualified, true),
    gte(leads.qualifiedAt, start),
    lte(leads.qualifiedAt, end),
  ];
  if (bdrId) qualifiedConditions.push(eq(leads.qualifiedBy, bdrId));
  if (uf) qualifiedConditions.push(eq(leads.uf, uf));

  const qualifiedRows = await db
    .select({
      userId: leads.qualifiedBy,
      total: count(),
    })
    .from(leads)
    .where(and(...qualifiedConditions))
    .groupBy(leads.qualifiedBy);

  // Montar mapas por userId
  const attemptsMap: Record<number, number> = {};
  for (const r of attemptsRows) if (r.userId) attemptsMap[r.userId] = Number(r.total) || 0;

  const contactsMap: Record<number, number> = {};
  for (const r of contactsRows) if (r.userId) contactsMap[r.userId] = Number(r.total) || 0;

  const qualifiedMap: Record<number, number> = {};
  for (const r of qualifiedRows) if (r.userId) qualifiedMap[r.userId] = Number(r.total) || 0;

  // Montar resultado por BDR — todos os BDRs da lista (com ou sem atividade)
  const bdrs = bdrList
    .map(u => ({
      id: u.id,
      name: `${u.name ?? ""} ${u.lastName ?? ""}`.trim() || "Sem nome",
      cargo: u.cargo ?? u.role ?? "",
      photoUrl: u.photoUrl ?? null,
      attempts: attemptsMap[u.id] ?? 0,
      contacts: contactsMap[u.id] ?? 0,
      qualified: qualifiedMap[u.id] ?? 0,
      goalAttempts: dailyAttemptsGoal * days,
      goalQualified: dailyQualifiedGoal * days,
    }));

  // Totais agregados
  const totalAttempts = bdrs.reduce((s, b) => s + b.attempts, 0);
  const totalContacts = bdrs.reduce((s, b) => s + b.contacts, 0);
  const totalQualified = bdrs.reduce((s, b) => s + b.qualified, 0);

  // Meta total = soma das metas de TODOS os BDRs cadastrados (independente de atividade no período)
  const totalBdrCount = Math.max(1, bdrList.length);
  const totalGoalAttempts = dailyAttemptsGoal * days * totalBdrCount;
  const totalGoalQualified = dailyQualifiedGoal * days * totalBdrCount;

  return {
    totalAttempts,
    totalContacts,
    totalQualified,
    totalGoalAttempts,
    totalGoalQualified,
    dailyAttemptsGoal,   // meta individual por BDR por dia (sem multiplicar)
    dailyQualifiedGoal,  // meta individual por BDR por dia (sem multiplicar)
    totalBdrCount,
    days,
    bdrs,
  };
}

/**
 * Retorna as interações detalhadas (tentativas + contatos) de um BDR em um período,
 * com dados do lead para navegação pelos gestores.
 */
export async function getBdrContactDetails(opts: {
  bdrId: number;
  startDate: string;
  endDate: string;
  type?: "tentativa" | "contato";
}) {
  const db = await getDb();
  if (!db) return [];
  const { bdrId, startDate, endDate, type } = opts;
  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");

  const conditions: any[] = [
    eq(leadInteractions.userId, bdrId),
    gte(leadInteractions.createdAt, start),
    lte(leadInteractions.createdAt, end),
  ];
  if (type) conditions.push(eq(leadInteractions.type, type));
  else conditions.push(inArray(leadInteractions.type, ["tentativa", "contato"]));

  const rows = await db
    .select({
      id: leadInteractions.id,
      leadId: leadInteractions.leadId,
      type: leadInteractions.type,
      content: leadInteractions.content,
      createdAt: leadInteractions.createdAt,
      nomeFantasia: leads.nomeFantasia,
      razaoSocial: leads.razaoSocial,
      cnpj: leads.cnpj,
      cidade: leads.cidade,
      uf: leads.uf,
      segmento: leads.segmento,
    })
    .from(leadInteractions)
    .leftJoin(leads, eq(leadInteractions.leadId, leads.id))
    .where(and(...conditions))
    .orderBy(desc(leadInteractions.createdAt))
    .limit(200);

  return rows;
}

/**
 * Retorna os leads qualificados detalhados de um BDR em um período.
 */
export async function getBdrQualifiedDetails(opts: {
  bdrId: number;
  startDate: string;
  endDate: string;
  uf?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const { bdrId, startDate, endDate, uf } = opts;
  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");

  const conditions: any[] = [
    eq(leads.isQualified, true),
    eq(leads.qualifiedBy, bdrId),
    gte(leads.qualifiedAt, start),
    lte(leads.qualifiedAt, end),
  ];
  if (uf) conditions.push(eq(leads.uf, uf));

  const rows = await db
    .select({
      id: leads.id,
      nomeFantasia: leads.nomeFantasia,
      razaoSocial: leads.razaoSocial,
      cnpj: leads.cnpj,
      cidade: leads.cidade,
      uf: leads.uf,
      segmento: leads.segmento,
      qualifiedAt: leads.qualifiedAt,
    })
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.qualifiedAt))
    .limit(200);

  return rows;
}

// ─── Qualification Fields ─────────────────────────────────────────────────────

export async function getQualificationFields(onlyActive = false) {
  const db = await getDb();
  if (!db) return [];
  const { qualificationFields } = await import("../drizzle/schema");
  const { asc, eq } = await import("drizzle-orm");
  const conditions: any[] = [];
  if (onlyActive) conditions.push(eq(qualificationFields.active, true));
  const rows = await db
    .select()
    .from(qualificationFields)
    .where(conditions.length > 0 ? conditions[0] : undefined)
    .orderBy(asc(qualificationFields.displayOrder));
  return rows;
}

export async function upsertQualificationField(data: {
  id?: number;
  label: string;
  fieldKey: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "textarea";
  required: boolean;
  active: boolean;
  displayOrder: number;
  options?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  userId: number;
}) {
  const db = await getDb();
  if (!db) return null;
  const { qualificationFields } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  if (data.id) {
    await db.update(qualificationFields).set({
      label: data.label,
      type: data.type,
      required: data.required,
      active: data.active,
      displayOrder: data.displayOrder,
      options: data.options ?? null,
      placeholder: data.placeholder ?? null,
      helpText: data.helpText ?? null,
      updatedBy: data.userId,
    }).where(eq(qualificationFields.id, data.id));
    const [updated] = await db.select().from(qualificationFields).where(eq(qualificationFields.id, data.id)).limit(1);
    return updated ?? null;
  } else {
    await db.insert(qualificationFields).values({
      label: data.label,
      fieldKey: data.fieldKey,
      type: data.type,
      required: data.required,
      active: data.active,
      displayOrder: data.displayOrder,
      options: data.options ?? null,
      placeholder: data.placeholder ?? null,
      helpText: data.helpText ?? null,
      isBuiltIn: false,
      createdBy: data.userId,
      updatedBy: data.userId,
    });
    const [created] = await db.select().from(qualificationFields)
      .where(eq(qualificationFields.fieldKey, data.fieldKey)).limit(1);
    return created ?? null;
  }
}

export async function deleteQualificationField(id: number) {
  const db = await getDb();
  if (!db) return false;
  const { qualificationFields } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  // Não permite excluir campos built-in
  const [field] = await db.select().from(qualificationFields)
    .where(and(eq(qualificationFields.id, id), eq(qualificationFields.isBuiltIn, false))).limit(1);
  if (!field) return false;
  await db.delete(qualificationFields).where(eq(qualificationFields.id, id));
  return true;
}

export async function reorderQualificationFields(items: { id: number; displayOrder: number }[]) {
  const db = await getDb();
  if (!db) return;
  const { qualificationFields } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  await Promise.all(items.map(item =>
    db.update(qualificationFields).set({ displayOrder: item.displayOrder }).where(eq(qualificationFields.id, item.id))
  ));
}

// ─── Lead Qualification Data ──────────────────────────────────────────────────

export async function getLeadQualificationData(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  const { leadQualificationData, qualificationFields } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  return db
    .select({
      id: leadQualificationData.id,
      leadId: leadQualificationData.leadId,
      fieldId: leadQualificationData.fieldId,
      value: leadQualificationData.value,
      fieldLabel: qualificationFields.label,
      fieldKey: qualificationFields.fieldKey,
      fieldType: qualificationFields.type,
    })
    .from(leadQualificationData)
    .leftJoin(qualificationFields, eq(leadQualificationData.fieldId, qualificationFields.id))
    .where(eq(leadQualificationData.leadId, leadId));
}

export async function saveLeadQualificationData(leadId: number, entries: { fieldId: number; value: string | null }[]) {
  const db = await getDb();
  if (!db) return;
  const { leadQualificationData } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");
  for (const entry of entries) {
    const [existing] = await db.select().from(leadQualificationData)
      .where(and(eq(leadQualificationData.leadId, leadId), eq(leadQualificationData.fieldId, entry.fieldId))).limit(1);
    if (existing) {
      await db.update(leadQualificationData).set({ value: entry.value })
        .where(and(eq(leadQualificationData.leadId, leadId), eq(leadQualificationData.fieldId, entry.fieldId)));
    } else {
      await db.insert(leadQualificationData).values({ leadId, fieldId: entry.fieldId, value: entry.value });
    }
  }
}
