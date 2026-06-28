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
  role: mysqlEnum("role", ["user", "admin", "adm", "gerente", "diretor", "coordenador", "supervisor", "bdr", "consultor"]).default("bdr").notNull(),
  cargo: varchar("cargo", { length: 128 }),
  whatsapp: varchar("whatsapp", { length: 32 }),
  photoUrl: text("photoUrl"),
  unidade: mysqlEnum("unidade", ["bahia", "piaui", "ambas"]).default("bahia").notNull(),
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
  role: mysqlEnum("role", ["adm", "gerente", "diretor", "coordenador", "supervisor", "bdr", "consultor"]).notNull(),
  invitedByRole: mysqlEnum("invitedByRole", ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor", "consultor"]),
  unidade: mysqlEnum("unidade", ["bahia", "piaui", "ambas"]).default("bahia"),
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


// ─── FASE 1: Handoff BDR → Consultor ─────────────────────────────────────────
export const oportunidades = mysqlTable("oportunidades", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),          // lead qualificado de origem
  bdrId: int("bdrId").notNull(),             // BDR que qualificou
  consultorId: int("consultorId"),           // consultor atribuído
  titulo: varchar("titulo", { length: 256 }),
  // Dados capturados na qualificação
  modeloInteresse: varchar("modeloInteresse", { length: 256 }),
  frotaAtual: varchar("frotaAtual", { length: 256 }),
  urgencia: varchar("urgencia", { length: 64 }),  // imediato / 30-90 dias / pesquisando
  formaPagamento: varchar("formaPagamento", { length: 128 }),
  ticketEstimado: decimal("ticketEstimado", { precision: 12, scale: 2 }),
  observacoesBdr: text("observacoesBdr"),    // resumo do BDR para o consultor
  // Controle de pipeline
  status: mysqlEnum("status", [
    "aguardando_consultor",   // BDR passou, consultor ainda não assumiu
    "em_negociacao",          // consultor está trabalhando
    "proposta_enviada",       // proposta gerada e enviada
    "aguardando_decisao",     // cliente analisando
    "ganho",                  // fechado
    "perdido",                // perdeu
    "cancelado",
  ]).default("aguardando_consultor").notNull(),
  motivoPerda: text("motivoPerda"),
  dataFechamento: timestamp("dataFechamento"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Oportunidade = typeof oportunidades.$inferSelect;

// Interações da oportunidade (consultor registra reuniões, ligações etc.)
export const oportunidadeInteracoes = mysqlTable("oportunidade_interacoes", {
  id: int("id").autoincrement().primaryKey(),
  oportunidadeId: int("oportunidadeId").notNull(),
  userId: int("userId").notNull(),
  tipo: mysqlEnum("tipo", ["ligacao", "reuniao", "email", "whatsapp", "visita", "proposta", "observacao"]).notNull(),
  resumo: text("resumo"),
  proximoPasso: text("proximoPasso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── FASE 2: Catálogo de Máquinas e Propostas ────────────────────────────────
export const maquinas = mysqlTable("maquinas", {
  id: int("id").autoincrement().primaryKey(),
  marca: varchar("marca", { length: 64 }).notNull(),           // LS Tractor / ENSIGN
  serie: varchar("serie", { length: 128 }),
  modelo: varchar("modelo", { length: 128 }).notNull(),
  potenciaCv: decimal("potenciaCv", { precision: 6, scale: 1 }),
  tracao: varchar("tracao", { length: 32 }),
  transmissao: varchar("transmissao", { length: 128 }),
  versao: varchar("versao", { length: 64 }),                  // Plataformado / Cabinado
  aplicacaoPrincipal: text("aplicacaoPrincipal"),
  culturasSegmentos: text("culturasSegmentos"),
  // Preço e precificação
  precoFabrica: decimal("precoFabrica", { precision: 12, scale: 2 }),  // custo na fábrica
  precoTabelaVarejo: decimal("precoTabelaVarejo", { precision: 12, scale: 2 }),
  // Ficha técnica (JSON)
  fichaTecnica: text("fichaTecnica"),       // JSON: { campo: valor } — extraído do PDF + campos manuais
  camposCustom: text("camposCustom"),       // JSON: campos adicionados manualmente pelo gestor
  fichaTecnicaPdfUrl: text("fichaTecnicaPdfUrl"), // PDF original uploadado
  descricaoCompleta: text("descricaoCompleta"),   // Texto completo extraído do PDF
  // Imagem
  fotoUrl: text("fotoUrl"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Maquina = typeof maquinas.$inferSelect;

// ─── FASE 3: Estoque (chassis) ────────────────────────────────────────────────
export const estoque = mysqlTable("estoque", {
  id: int("id").autoincrement().primaryKey(),
  maquinaId: int("maquinaId").notNull(),
  chassis: varchar("chassis", { length: 64 }).unique(),
  cor: varchar("cor", { length: 64 }),
  localizacao: mysqlEnum("localizacao", ["loja", "fabrica", "transito", "vendido"]).default("loja").notNull(),
  anoFabricacao: int("anoFabricacao"),
  anoModelo: int("anoModelo"),
  // Custos
  custoAquisicao: decimal("custoAquisicao", { precision: 12, scale: 2 }),
  freteEntrada: decimal("freteEntrada", { precision: 10, scale: 2 }),
  impostos: decimal("impostos", { precision: 10, scale: 2 }),
  // Precificação
  precoVendaBruto: decimal("precoVendaBruto", { precision: 12, scale: 2 }),
  margemPercentual: decimal("margemPercentual", { precision: 5, scale: 2 }),
  descontoMaxConsultor: decimal("descontoMaxConsultor", { precision: 4, scale: 2 }).default("3.00"),
  // Nota Fiscal
  notaFiscalEntrada: varchar("notaFiscalEntrada", { length: 64 }),
  notaFiscalUrl: text("notaFiscalUrl"),
  // Checklist de recebimento
  checklistConcluido: boolean("checklistConcluido").default(false).notNull(),
  checklistData: text("checklistData"),   // JSON com itens do checklist
  fotosRecebimento: text("fotosRecebimento"), // JSON array de base64/urls
  // Fluxo de liberação para venda
  disponivel: boolean("disponivel").default(false).notNull(),
  aprovadoPor: int("aprovadoPor"),
  dataAprovacao: timestamp("dataAprovacao"),
  // Datas
  dataEntrada: timestamp("dataEntrada"),
  dataVenda: timestamp("dataVenda"),
  vendidoPara: int("vendidoPara"),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Estoque = typeof estoque.$inferSelect;

// ─── FASE 3: Precificação (regras por estado/produto) ─────────────────────────
export const precificacao = mysqlTable("precificacao", {
  id: int("id").autoincrement().primaryKey(),
  maquinaId: int("maquinaId").notNull(),
  // Impostos sobre o produto
  icmsOrigem: decimal("icmsOrigem", { precision: 5, scale: 2 }).default("12.00"),   // SC -> cliente
  icmsDestino: decimal("icmsDestino", { precision: 5, scale: 2 }).default("12.00"),
  ipi: decimal("ipi", { precision: 5, scale: 2 }).default("0.00"),
  pis: decimal("pis", { precision: 5, scale: 2 }).default("0.65"),
  cofins: decimal("cofins", { precision: 5, scale: 2 }).default("3.00"),
  st: decimal("st", { precision: 5, scale: 2 }).default("0.00"),
  // Frete estimado por região
  freteNordeste: decimal("freteNordeste", { precision: 10, scale: 2 }),
  freteSudeste: decimal("freteSudeste", { precision: 10, scale: 2 }),
  freteSul: decimal("freteSul", { precision: 10, scale: 2 }),
  freteCentroOeste: decimal("freteCentroOeste", { precision: 10, scale: 2 }),
  freteNorte: decimal("freteNorte", { precision: 10, scale: 2 }),
  // Margem mínima e padrão
  margemMinima: decimal("margemMinima", { precision: 5, scale: 2 }).default("8.00"),
  margemPadrao: decimal("margemPadrao", { precision: 5, scale: 2 }).default("12.00"),
  // BNDES/FINAME spread
  spreadFinanciamento: decimal("spreadFinanciamento", { precision: 5, scale: 2 }).default("0.00"),
  ativo: boolean("ativo").default(true).notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── Propostas Comerciais ────────────────────────────────────────────────────
export const propostas = mysqlTable("propostas", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 32 }).unique(),         // PROP-2025-001
  oportunidadeId: int("oportunidadeId").notNull(),
  consultorId: int("consultorId").notNull(),
  // Cliente
  clienteNome: varchar("clienteNome", { length: 512 }).notNull(),
  clienteCnpj: varchar("clienteCnpj", { length: 32 }),
  clienteUf: varchar("clienteUf", { length: 4 }),
  // Itens (JSON: [{maquinaId, chassis, qty, precoUnitario, desconto, total}])
  itens: text("itens").notNull(),
  // Totais
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  descontoTotal: decimal("descontoTotal", { precision: 12, scale: 2 }).default("0"),
  freteTotal: decimal("freteTotal", { precision: 10, scale: 2 }).default("0"),
  totalGeral: decimal("totalGeral", { precision: 12, scale: 2 }).notNull(),
  margemGeral: decimal("margemGeral", { precision: 5, scale: 2 }),
  // Condições
  condicaoPagamento: varchar("condicaoPagamento", { length: 256 }),
  prazoEntrega: varchar("prazoEntrega", { length: 128 }),
  validadeAte: timestamp("validadeAte"),
  // Status
  status: mysqlEnum("status", ["rascunho", "enviada", "aceita", "recusada", "expirada"]).default("rascunho").notNull(),
  motivoRecusa: text("motivoRecusa"),
  // Conteúdo para PDF
  observacoesCliente: text("observacoesCliente"),
  observacoesInternas: text("observacoesInternas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Proposta = typeof propostas.$inferSelect;

// ─── Consultor Performance (propostas, visitas, vendas) ──────────────────────
export const consultorAtividades = mysqlTable("consultor_atividades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tipo: mysqlEnum("tipo", ["proposta_enviada", "visita_realizada", "venda_realizada", "maquina_vendida"]).notNull(),
  qtdMaquinas: int("qtdMaquinas").default(1),  // qtd de máquinas na venda
  oportunidadeId: int("oportunidadeId"),
  propostaId: int("propostaId"),
  ticketValor: decimal("ticketValor", { precision: 12, scale: 2 }),
  observacoes: text("observacoes"),
  dataAtividade: timestamp("dataAtividade").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ConsultorAtividade = typeof consultorAtividades.$inferSelect;

// ─── Consultor Goals (metas específicas de consultores) ───────────────────────
export const consultorMetas = mysqlTable("consultor_metas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),                // null = meta para todos os consultores
  tipo: mysqlEnum("tipo", [
    "propostas_dia",      // propostas enviadas por dia
    "visitas_semana",     // visitas realizadas por semana
    "vendas_mes",         // vendas fechadas por mês
    "ticket_medio_mes",   // ticket médio mensal
    "conversao_proposta", // % conversão proposta → venda
  ]).notNull(),
  valorMeta: decimal("valorMeta", { precision: 12, scale: 2 }).notNull(),
  periodo: mysqlEnum("periodo", ["diario", "semanal", "mensal"]).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  criadoPor: int("criadoPor").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ConsultorMeta = typeof consultorMetas.$inferSelect;

// ─── Consultor Check-in de Visita (geolocalização) ───────────────────────────
export const visitaCheckins = mysqlTable("visita_checkins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  oportunidadeId: int("oportunidadeId"),
  leadId: int("leadId"),
  // Localização do consultor no momento do check-in
  latConsultor: decimal("latConsultor", { precision: 10, scale: 7 }),
  lngConsultor: decimal("lngConsultor", { precision: 10, scale: 7 }),
  // Localização esperada (endereço do cliente)
  latCliente: decimal("latCliente", { precision: 10, scale: 7 }),
  lngCliente: decimal("lngCliente", { precision: 10, scale: 7 }),
  distanciaMetros: int("distanciaMetros"),  // distância calculada entre consultor e cliente
  enderecoConsultor: text("enderecoConsultor"),  // reverse geocode do consultor
  enderecoCliente: text("enderecoCliente"),
  status: mysqlEnum("status", ["valido", "suspeito", "invalido"]).default("valido").notNull(),
  // valido = consultor está no raio de 500m do cliente
  // suspeito = entre 500m e 2km
  // invalido = mais de 2km de distância
  fotoUrl: text("fotoUrl"),         // foto opcional tirada no momento da visita
  observacoes: text("observacoes"),
  durMinutos: int("durMinutos"),    // duração da visita em minutos
  checkoutAt: timestamp("checkoutAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VisitaCheckin = typeof visitaCheckins.$inferSelect;

// ─── Agenda do Consultor (tarefas / compromissos) ─────────────────────────────
export const agendaConsultor = mysqlTable("agenda_consultor", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tipo: mysqlEnum("tipo", ["visita", "ligacao", "reuniao_online", "proposta", "outro"]).notNull(),
  titulo: varchar("titulo", { length: 256 }).notNull(),
  leadId: int("leadId"),
  oportunidadeId: int("oportunidadeId"),
  dataHora: timestamp("dataHora").notNull(),
  duracaoMinutos: int("duracaoMinutos").default(60),
  // Localização (para visitas)
  endereco: text("endereco"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  distanciaKm: decimal("distanciaKm", { precision: 8, scale: 2 }),
  status: mysqlEnum("status", ["agendado", "em_andamento", "concluido", "cancelado"]).default("agendado").notNull(),
  checkinId: int("checkinId"),      // check-in vinculado (quando visita)
  observacoes: text("observacoes"),
  criadoPorSugestao: boolean("criadoPorSugestao").default(false), // true = criado pelo "buscar empresas próximas"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AgendaConsultor = typeof agendaConsultor.$inferSelect;
