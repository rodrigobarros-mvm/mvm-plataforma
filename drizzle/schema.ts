import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "adm", "gerente", "diretor", "coordenador", "supervisor", "bdr"]).default("bdr").notNull(),
  cargo: varchar("cargo", { length: 128 }),
  whatsapp: varchar("whatsapp", { length: 32 }),
  photoUrl: text("photoUrl"),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── User Invites ─────────────────────────────────────────────────────────────
export const userInvites = mysqlTable("user_invites", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr"]).notNull(),
  invitedByRole: mysqlEnum("invitedByRole", ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"]),
  token: varchar("token", { length: 128 }).notNull().unique(),
  invitedBy: int("invitedBy").notNull(),
  usedAt: timestamp("usedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    prioridade: varchar("prioridade", { length: 32 }),
    classificacao: varchar("classificacao", { length: 64 }),
    nomeFantasia: varchar("nomeFantasia", { length: 256 }),
    razaoSocial: varchar("razaoSocial", { length: 512 }),
    cnpj: varchar("cnpj", { length: 32 }),
    segmento: varchar("segmento", { length: 128 }),
    uf: varchar("uf", { length: 4 }),
    cidade: varchar("cidade", { length: 128 }),
    enderecoCompleto: text("enderecoCompleto"),
    whatsapp1: varchar("whatsapp1", { length: 64 }),
    whatsapp2: varchar("whatsapp2", { length: 64 }),
    email: varchar("email", { length: 320 }),
    linkedinGerente: text("linkedinGerente"),
    linkedinDiretor: text("linkedinDiretor"),
    linkedinCeo: text("linkedinCeo"),
    googleMaps: text("googleMaps"),
    nomeDecissor: varchar("nomeDecissor", { length: 256 }),
    conheceMarca: varchar("conheceMarca", { length: 64 }),
    frotaAtual: varchar("frotaAtual", { length: 128 }),
    creditoFormaPagamento: varchar("creditoFormaPagamento", { length: 256 }),
    urgenciaCompra: varchar("urgenciaCompra", { length: 128 }),
    desafioPrincipal: text("desafioPrincipal"),
    statusContato: varchar("statusContato", { length: 64 }).default("Não iniciado"),
    dataContato: varchar("dataContato", { length: 32 }),
    linkCrm: text("linkCrm"),
    observacoes: text("observacoes"),
    scriptAbertura: text("scriptAbertura"),
    scriptParceria: text("scriptParceria"),
    scriptTecnico: text("scriptTecnico"),
    // Endereço detalhado
    logradouro: varchar("logradouro", { length: 256 }),
    numero: varchar("numero", { length: 32 }),
    complemento: varchar("complemento", { length: 128 }),
    bairro: varchar("bairro", { length: 128 }),
    // Dados empresariais extras
    capitalSocial: varchar("capitalSocial", { length: 64 }),
    matrizFilial: varchar("matrizFilial", { length: 32 }),
    socios: text("socios"),
    cnae: varchar("cnae", { length: 128 }),
    // Campos de qualificação
    isQualified: boolean("isQualified").default(false),
    qualifiedAt: timestamp("qualifiedAt"),
    qualifiedBy: int("qualifiedBy"),
    disqualifiedReason: text("disqualifiedReason"),
    disqualifiedAt: timestamp("disqualifiedAt"),
    disqualifiedBy: int("disqualifiedBy"),
    // Campos de controle
    isHighPriority: boolean("isHighPriority").default(false),
    isHidden: boolean("isHidden").default(false),
    assignedTo: int("assignedTo"),
    // Controle de visibilidade: somente ADM libera leads para Gerente/BDR
    isReleasedToTeam: boolean("isReleasedToTeam").default(false),
    releasedAt: timestamp("releasedAt"),
    releasedBy: int("releasedBy"),
    modeloTrator: varchar("modeloTrator", { length: 128 }),
    ticketEstimado: decimal("ticketEstimado", { precision: 12, scale: 2 }),
    attemptCount: int("attemptCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    ufIdx: index("uf_idx").on(table.uf),
    statusIdx: index("status_idx").on(table.statusContato),
    priorityIdx: index("priority_idx").on(table.isHighPriority),
    assignedIdx: index("assigned_idx").on(table.assignedTo),
  })
);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Lead Interactions ────────────────────────────────────────────────────────
export const leadInteractions = mysqlTable("lead_interactions", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["contato", "qualificacao", "desqualificacao", "observacao", "tentativa", "whatsapp_share"]).notNull(),
  content: text("content"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Contact Attempts ─────────────────────────────────────────────────────────
export const contactAttempts = mysqlTable("contact_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  date: varchar("date", { length: 16 }).notNull(), // YYYY-MM-DD
  count: int("count").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Goals ────────────────────────────────────────────────────────────────────
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: mysqlEnum("type", ["leads_qualificados", "tentativas_contato", "conversao"]).notNull(),
  targetValue: int("targetValue").notNull(),
  period: mysqlEnum("period", ["diario", "semanal", "mensal"]).notNull(),
  startDate: varchar("startDate", { length: 16 }).notNull(),
  endDate: varchar("endDate", { length: 16 }),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Commissions ──────────────────────────────────────────────────────────────
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  leadId: int("leadId"),
  valuePerLead: decimal("valuePerLead", { precision: 10, scale: 2 }).notNull(),
  ticketValue: decimal("ticketValue", { precision: 12, scale: 2 }),
  percentageOfTicket: decimal("percentageOfTicket", { precision: 5, scale: 2 }),
  status: mysqlEnum("status", ["pendente", "aprovado", "pago"]).default("pendente").notNull(),
  paidAt: timestamp("paidAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Commission Config ─────────────────────────────────────────────────────────
export const commissionConfig = mysqlTable("commission_config", {
  id: int("id").autoincrement().primaryKey(),
  valuePerQualifiedLead: decimal("valuePerQualifiedLead", { precision: 10, scale: 2 }).default("0").notNull(),
  percentageOfTicket: decimal("percentageOfTicket", { precision: 5, scale: 2 }).default("0"),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  relatedLeadId: int("relatedLeadId"),
  relatedUserId: int("relatedUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Lead Release Log ────────────────────────────────────────────────────────
export const leadReleaseLog = mysqlTable("lead_release_log", {
  id: int("id").autoincrement().primaryKey(),
  releasedBy: int("releasedBy").notNull(),
  totalReleased: int("totalReleased").notNull(),
  filters: text("filters"), // JSON string of filters used
  leadIds: text("leadIds"), // JSON array of released lead IDs for undo
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadReleaseLog = typeof leadReleaseLog.$inferSelect;

// ─── Push Subscriptions ─────────────────────────────────────────────────────
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// ─── KPI Config ───────────────────────────────────────────────────────────────
export const kpiConfig = mysqlTable("kpi_config", {
  id: int("id").autoincrement().primaryKey(),
  dailyContactAttempts: int("dailyContactAttempts").default(80).notNull(),
  dailyQualifiedLeads: int("dailyQualifiedLeads").default(5).notNull(),
  conversionRateTarget: decimal("conversionRateTarget", { precision: 5, scale: 2 }).default("6.25"),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Follow-ups ───────────────────────────────────────────────────────────────
export const followUps = mysqlTable("follow_ups", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  userId: int("userId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  note: text("note"),
  isDone: boolean("isDone").default(false).notNull(),
  notifiedAt: timestamp("notifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type FollowUp = typeof followUps.$inferSelect;
export type InsertFollowUp = typeof followUps.$inferInsert;

// ─── Qualification Fields ────────────────────────────────────────────────────
export const qualificationFields = mysqlTable("qualification_fields", {
  id: int("id").autoincrement().primaryKey(),
  label: varchar("label", { length: 128 }).notNull(),
  fieldKey: varchar("fieldKey", { length: 64 }).notNull().unique(),
  type: mysqlEnum("type", ["text", "number", "select", "multiselect", "boolean", "textarea"]).notNull().default("text"),
  required: boolean("required").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  options: text("options"), // JSON array of strings for select/multiselect
  placeholder: varchar("placeholder", { length: 256 }),
  helpText: varchar("helpText", { length: 512 }),
  isBuiltIn: boolean("isBuiltIn").default(false).notNull(), // campos padrão não podem ser excluídos
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type QualificationField = typeof qualificationFields.$inferSelect;
export type InsertQualificationField = typeof qualificationFields.$inferInsert;

// ─── Lead Qualification Data ──────────────────────────────────────────────────
export const leadQualificationData = mysqlTable("lead_qualification_data", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  fieldId: int("fieldId").notNull(),
  value: text("value"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LeadQualificationData = typeof leadQualificationData.$inferSelect;

// ─── Lead Assignment Log ──────────────────────────────────────────────────────
export const leadAssignmentLog = mysqlTable("lead_assignment_log", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  action: mysqlEnum("action", ["assigned", "unassigned"]).notNull(),
  byUserId: int("byUserId").notNull(),   // quem executou a ação
  toUserId: int("toUserId"),             // BDR destino (null em unassigned)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LeadAssignmentLog = typeof leadAssignmentLog.$inferSelect;
export type InsertLeadAssignmentLog = typeof leadAssignmentLog.$inferInsert;
