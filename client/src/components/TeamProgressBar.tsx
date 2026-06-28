import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone, Target, Zap, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink, Filter, Users, FileText, MapPin, UserCheck
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BRAZIL_UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === "day") {
    const s = fmt(now);
    return { startDate: s, endDate: s };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now);
    mon.setDate(diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { startDate: fmt(mon), endDate: fmt(sun) };
  }
  if (period === "month") {
    const s = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: s, endDate: fmt(last) };
  }
  if (period === "year") {
    return { startDate: `${now.getFullYear()}-01-01`, endDate: `${now.getFullYear()}-12-31` };
  }
  const s = fmt(new Date());
  return { startDate: s, endDate: s };
}

// ─── Segmented Progress Bar ───────────────────────────────────────────────────

function SegBar({
  attempts, contacts, goal, height = "h-2.5",
}: {
  attempts: number; contacts: number; goal: number; height?: string;
}) {
  const total = attempts + contacts;
  const totalPct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const contactsPct = goal > 0 ? Math.min(totalPct, Math.round((contacts / goal) * 100)) : 0;
  const attemptsPct = Math.max(0, totalPct - contactsPct);
  const baseColor = totalPct >= 100 ? "#22c55e" : totalPct >= 60 ? "#3b82f6" : totalPct >= 30 ? "#eab308" : "#ef4444";

  return (
    <div className={`w-full bg-white/10 rounded-full ${height} overflow-hidden flex`}>
      {attemptsPct > 0 && (
        <div className={`${height} transition-all duration-500`}
          style={{ width: `${attemptsPct}%`, background: baseColor, borderRadius: contactsPct > 0 ? "9999px 0 0 9999px" : "9999px" }}
        />
      )}
      {contactsPct > 0 && (
        <div className={`${height} bg-green-500 transition-all duration-500`}
          style={{ width: `${contactsPct}%`, borderRadius: attemptsPct > 0 ? "0 9999px 9999px 0" : "9999px" }}
        />
      )}
    </div>
  );
}

function SimpleBar({ value, goal, color, height = "h-1.5" }: { value: number; goal: number; color: string; height?: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className={`w-full bg-white/10 rounded-full ${height} overflow-hidden`}>
      <div className={`${height} rounded-full transition-all duration-500`}
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── BDR Detail Row ───────────────────────────────────────────────────────────

function BdrRow({ bdr, isManager, period }: {
  bdr: {
    id: number; name: string; cargo: string;
    attempts: number; contacts: number; qualified: number;
    goalAttempts: number; goalQualified: number;
  };
  isManager: boolean;
  period: { startDate: string; endDate: string };
}) {
  const [, setLocation] = useLocation();
  const [expandType, setExpandType] = useState<"contacts" | "qualified" | null>(null);

  const totalActivity = bdr.attempts + bdr.contacts;
  const qualPct = bdr.goalQualified > 0 ? Math.min(100, Math.round((bdr.qualified / bdr.goalQualified) * 100)) : 0;

  const { data: contactDetails } = trpc.dashboard.bdrContactDetails.useQuery(
    { bdrId: bdr.id, startDate: period.startDate, endDate: period.endDate },
    { enabled: isManager && expandType === "contacts" }
  );
  const { data: qualifiedDetails } = trpc.dashboard.bdrQualifiedDetails.useQuery(
    { bdrId: bdr.id, startDate: period.startDate, endDate: period.endDate },
    { enabled: isManager && expandType === "qualified" }
  );

  return (
    <div className="border border-white/10 rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "#e21d3c", color: "white" }}>
            {bdr.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{bdr.name}</p>
            <p className="text-white/50 text-[10px] truncate">{bdr.cargo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${isManager ? "hover:bg-white/10 cursor-pointer" : "cursor-default"} ${expandType === "contacts" ? "bg-white/10" : ""}`}
            onClick={() => isManager && setExpandType(expandType === "contacts" ? null : "contacts")}
          >
            <Phone className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{totalActivity}</span>
            <span className="text-white/40">/{bdr.goalAttempts}</span>
            {bdr.contacts > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
                <CheckCircle2 className="w-2 h-2" />{bdr.contacts}
              </span>
            )}
            {isManager && <ChevronDown className="w-3 h-3 text-white/40" />}
          </button>
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${isManager ? "hover:bg-white/10 cursor-pointer" : "cursor-default"} ${expandType === "qualified" ? "bg-white/10" : ""}`}
            onClick={() => isManager && setExpandType(expandType === "qualified" ? null : "qualified")}
          >
            <Target className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{bdr.qualified}</span>
            <span className="text-white/40">/{bdr.goalQualified}</span>
            {qualPct >= 100 && <span className="text-green-400 text-[10px]">✓</span>}
            {isManager && <ChevronDown className="w-3 h-3 text-white/40" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SegBar attempts={bdr.attempts} contacts={bdr.contacts} goal={bdr.goalAttempts} height="h-1.5" />
        <SimpleBar value={bdr.qualified} goal={bdr.goalQualified} height="h-1.5"
          color={qualPct >= 100 ? "#22c55e" : qualPct >= 60 ? "#3b82f6" : qualPct >= 30 ? "#eab308" : "#ef4444"} />
      </div>

      {isManager && expandType === "contacts" && contactDetails && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Tentativas e Contatos</p>
          {contactDetails.length === 0 && <p className="text-white/40 text-xs">Nenhuma atividade no período</p>}
          {contactDetails.map((item) => (
            <button key={item.id}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-all text-left"
              onClick={() => item.leadId && setLocation(`/leads/${item.leadId}`)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                  style={{ background: item.type === "contato" ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.2)", color: item.type === "contato" ? "#4ade80" : "#60a5fa" }}>
                  {item.type === "contato" ? "Contato" : "Tentativa"}
                </span>
                <span className="text-white/80 text-xs truncate">{item.nomeFantasia || item.razaoSocial || `Lead #${item.leadId}`}</span>
                {item.cidade && <span className="text-white/40 text-[10px] shrink-0">{item.cidade}/{item.uf}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-white/40 text-[10px]">
                  {new Date(item.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <ExternalLink className="w-3 h-3 text-white/30" />
              </div>
            </button>
          ))}
        </div>
      )}

      {isManager && expandType === "qualified" && qualifiedDetails && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Leads Qualificados</p>
          {qualifiedDetails.length === 0 && <p className="text-white/40 text-xs">Nenhum lead qualificado no período</p>}
          {qualifiedDetails.map((lead) => (
            <button key={lead.id}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-all text-left"
              onClick={() => setLocation(`/leads/${lead.id}`)}>
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-white/80 text-xs truncate">{lead.nomeFantasia || lead.razaoSocial || `Lead #${lead.id}`}</span>
                {lead.cidade && <span className="text-white/40 text-[10px] shrink-0">{lead.cidade}/{lead.uf}</span>}
              </div>
              <ExternalLink className="w-3 h-3 text-white/30 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Consultor Row ────────────────────────────────────────────────────────────

function ConsultorRow({
  consultor,
  metaPropostas,
  metaVisitas,
}: {
  consultor: {
    userId: number; userName: string;
    propostasEnviadas: number; visitasRealizadas: number;
    vendasRealizadas: number; faturamentoTotal: number; score: number;
  };
  metaPropostas: number;
  metaVisitas: number;
}) {
  const [, setLocation] = useLocation();
  const propPct  = metaPropostas > 0 ? Math.min(100, Math.round((consultor.propostasEnviadas / metaPropostas) * 100)) : 0;
  const visitPct = metaVisitas   > 0 ? Math.min(100, Math.round((consultor.visitasRealizadas  / metaVisitas)   * 100)) : 0;

  const propColor  = propPct  >= 100 ? "#22c55e" : propPct  >= 60 ? "#3b82f6" : propPct  >= 30 ? "#eab308" : "#ef4444";
  const visitColor = visitPct >= 100 ? "#22c55e" : visitPct >= 60 ? "#3b82f6" : visitPct >= 30 ? "#eab308" : "#ef4444";

  return (
    <div className="border border-white/10 rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "#0a1e5a", color: "white" }}>
            {(consultor.userName ?? "C").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{consultor.userName}</p>
            <p className="text-white/50 text-[10px]">Consultor Comercial</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          {/* Propostas */}
          <div className="flex items-center gap-1 px-2 py-1 rounded">
            <FileText className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{consultor.propostasEnviadas}</span>
            <span className="text-white/40">/{metaPropostas}</span>
            {propPct >= 100 && <span className="text-green-400 text-[10px]">✓</span>}
          </div>
          {/* Visitas */}
          <div className="flex items-center gap-1 px-2 py-1 rounded">
            <MapPin className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{consultor.visitasRealizadas}</span>
            <span className="text-white/40">/{metaVisitas}</span>
            {visitPct >= 100 && <span className="text-green-400 text-[10px]">✓</span>}
          </div>
        </div>
      </div>

      {/* Barras */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <p className="text-white/40 text-[10px]">Propostas</p>
          <SimpleBar value={consultor.propostasEnviadas} goal={metaPropostas} color={propColor} height="h-1.5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-white/40 text-[10px]">Visitas</p>
          <SimpleBar value={consultor.visitasRealizadas} goal={metaVisitas} color={visitColor} height="h-1.5" />
        </div>
      </div>

      {/* Vendas e faturamento (info extra) */}
      {(consultor.vendasRealizadas > 0 || consultor.faturamentoTotal > 0) && (
        <div className="flex items-center gap-3 pt-1 border-t border-white/10">
          <span className="text-[10px] text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            {consultor.vendasRealizadas} venda{consultor.vendasRealizadas !== 1 ? "s" : ""}
          </span>
          {consultor.faturamentoTotal > 0 && (
            <span className="text-[10px] text-white/50">
              R$ {consultor.faturamentoTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamProgressBar() {
  const { user } = useAuth();
  const [expanded, setExpanded]   = useState(false);
  const [period, setPeriod]       = useState("day");
  const [filterBdrId, setFilterBdrId] = useState<number | undefined>(undefined);
  const [filterUf, setFilterUf]   = useState<string | undefined>(undefined);
  const [viewMode, setViewMode]   = useState<"bdr" | "consultor">("bdr");

  const isManager = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"].includes(user?.role ?? "");
  const isAdm     = user?.role === "adm" || user?.role === "admin";

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // ── BDR stats ──
  const { data: stats, isLoading } = trpc.dashboard.teamStats.useQuery(
    { ...dateRange, bdrId: filterBdrId, uf: filterUf || undefined },
    { enabled: !!user, refetchInterval: 60_000 }
  );

  // ── Consultor ranking (propostas + visitas) ──
  const periodMap: Record<string, "dia" | "semana" | "mes"> = { day: "dia", week: "semana", month: "mes", year: "mes" };
  const { data: consultorRanking } = trpc.consultorRanking.ranking.useQuery(
    { periodo: periodMap[period] ?? "mes" },
    { enabled: !!user && isManager && (expanded || viewMode === "consultor"), refetchInterval: 60_000 }
  );

  // ── Metas dos consultores via kpi (reaproveitando o campo de metas do Goals.tsx) ──
  // Metas hardcoded conforme Goals.tsx — quando o backend tiver endpoint próprio, substituir aqui
  const META_PROPOSTAS_DIA  = 3;  // propostasDia configurado em Goals
  const META_VISITAS_SEMANA = 5;  // visitasSemana configurado em Goals

  // Adapta meta de acordo com o período selecionado
  const metaPropostasNoPeriodo = period === "day" ? META_PROPOSTAS_DIA
    : period === "week" ? META_PROPOSTAS_DIA * 5
    : period === "month" ? META_PROPOSTAS_DIA * 22
    : META_PROPOSTAS_DIA * 22;

  const metaVisitasNoPeriodo = period === "day" ? Math.ceil(META_VISITAS_SEMANA / 5)
    : period === "week" ? META_VISITAS_SEMANA
    : period === "month" ? META_VISITAS_SEMANA * 4
    : META_VISITAS_SEMANA * 4;

  // Totais da equipe de consultores
  const totalPropostasConsultores = useMemo(() =>
    (consultorRanking ?? []).reduce((s, c) => s + c.propostasEnviadas, 0), [consultorRanking]);
  const totalVisitasConsultores = useMemo(() =>
    (consultorRanking ?? []).reduce((s, c) => s + c.visitasRealizadas, 0), [consultorRanking]);
  const metaEquipePropostas = metaPropostasNoPeriodo * Math.max(1, consultorRanking?.length ?? 1);
  const metaEquipeVisitas   = metaVisitasNoPeriodo   * Math.max(1, consultorRanking?.length ?? 1);

  // ── BDR totals ──
  const totalAttempts  = stats?.totalAttempts  ?? 0;
  const totalContacts  = stats?.totalContacts  ?? 0;
  const totalActivity  = totalAttempts + totalContacts;
  const totalQualified = stats?.totalQualified ?? 0;
  const goalAttempts   = stats?.totalGoalAttempts   ?? 80;
  const goalQualified  = stats?.totalGoalQualified  ?? 5;
  const dailyAttemptsGoal  = stats?.dailyAttemptsGoal  ?? 80;
  const dailyQualifiedGoal = stats?.dailyQualifiedGoal ?? 5;
  const totalBdrCount  = stats?.totalBdrCount ?? 1;

  const attPct  = goalAttempts  > 0 ? Math.min(100, Math.round((totalActivity  / goalAttempts)  * 100)) : 0;
  const qualPct = goalQualified > 0 ? Math.min(100, Math.round((totalQualified / goalQualified) * 100)) : 0;
  const propPctEquipe  = metaEquipePropostas > 0 ? Math.min(100, Math.round((totalPropostasConsultores / metaEquipePropostas) * 100)) : 0;
  const visitPctEquipe = metaEquipeVisitas   > 0 ? Math.min(100, Math.round((totalVisitasConsultores   / metaEquipeVisitas)   * 100)) : 0;

  const periodLabel: Record<string, string> = { day: "Hoje", week: "Esta semana", month: "Este mês", year: "Este ano" };

  if (!user || isLoading) return null;

  return (
    <div style={{ background: "oklch(0.17 0.06 240)" }} className="border-b border-border">
      {/* ── Barra principal ── */}
      <div className="w-full px-4 py-2 flex items-center gap-4">

        {/* Toggle BDR / Consultor — só para gestores */}
        {isManager && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setViewMode("bdr")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${viewMode === "bdr" ? "text-white" : "text-white/40 hover:text-white/70"}`}
              style={{ background: viewMode === "bdr" ? "rgba(226,29,60,0.25)" : "transparent" }}
            >
              <Phone className="w-3 h-3" />
              <span className="hidden sm:inline">BDR</span>
            </button>
            <button
              onClick={() => setViewMode("consultor")}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${viewMode === "consultor" ? "text-white" : "text-white/40 hover:text-white/70"}`}
              style={{ background: viewMode === "consultor" ? "rgba(10,30,90,0.5)" : "transparent" }}
            >
              <UserCheck className="w-3 h-3" />
              <span className="hidden sm:inline">Consultores</span>
            </button>
          </div>
        )}

        {/* ── Modo BDR ── */}
        {viewMode === "bdr" && (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Phone className="w-4 h-4 text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-1">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/70 text-xs truncate">
                      Tentativas {periodLabel[period] ?? "Hoje"} — Equipe
                    </span>
                    <span className="text-white/40 text-[10px] truncate hidden sm:block">
                      Meta individual: {dailyAttemptsGoal}/dia · {totalBdrCount} BDR{totalBdrCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-white font-semibold text-xs">{totalActivity}/{goalAttempts}</span>
                    {totalContacts > 0 && (
                      <span className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80" }}>
                        <CheckCircle2 className="w-2.5 h-2.5" />{totalContacts}
                      </span>
                    )}
                  </div>
                </div>
                <SegBar attempts={totalAttempts} contacts={totalContacts} goal={goalAttempts} />
              </div>
              {attPct >= 100 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">✓</Badge>}
            </div>

            <div className="w-px h-8 bg-white/10 shrink-0" />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Target className="w-4 h-4 text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/70 text-xs truncate">Qualif. {periodLabel[period]} — Equipe</span>
                    <span className="text-white/40 text-[10px] truncate hidden sm:block">Meta: {dailyQualifiedGoal}/dia</span>
                  </div>
                  <span className="text-white font-semibold text-xs ml-2 shrink-0">{totalQualified}/{goalQualified}</span>
                </div>
                <SimpleBar value={totalQualified} goal={goalQualified} height="h-2.5"
                  color={qualPct >= 100 ? "#22c55e" : qualPct >= 60 ? "#3b82f6" : qualPct >= 30 ? "#eab308" : "#ef4444"} />
              </div>
              {qualPct >= 100 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">🏆</Badge>}
            </div>
          </>
        )}

        {/* ── Modo Consultor ── */}
        {viewMode === "consultor" && isManager && (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-4 h-4 text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5 gap-1">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/70 text-xs truncate">Propostas {periodLabel[period]} — Equipe</span>
                    <span className="text-white/40 text-[10px] truncate hidden sm:block">
                      Meta: {META_PROPOSTAS_DIA}/dia · {consultorRanking?.length ?? 0} consultor{(consultorRanking?.length ?? 0) !== 1 ? "es" : ""}
                    </span>
                  </div>
                  <span className="text-white font-semibold text-xs shrink-0">
                    {totalPropostasConsultores}/{metaEquipePropostas}
                  </span>
                </div>
                <SimpleBar value={totalPropostasConsultores} goal={metaEquipePropostas} height="h-2.5"
                  color={propPctEquipe >= 100 ? "#22c55e" : propPctEquipe >= 60 ? "#3b82f6" : propPctEquipe >= 30 ? "#eab308" : "#ef4444"} />
              </div>
              {propPctEquipe >= 100 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">✓</Badge>}
            </div>

            <div className="w-px h-8 bg-white/10 shrink-0" />

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <MapPin className="w-4 h-4 text-white/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/70 text-xs truncate">Visitas {periodLabel[period]} — Equipe</span>
                    <span className="text-white/40 text-[10px] truncate hidden sm:block">
                      Meta: {META_VISITAS_SEMANA}/semana
                    </span>
                  </div>
                  <span className="text-white font-semibold text-xs ml-2 shrink-0">
                    {totalVisitasConsultores}/{metaEquipeVisitas}
                  </span>
                </div>
                <SimpleBar value={totalVisitasConsultores} goal={metaEquipeVisitas} height="h-2.5"
                  color={visitPctEquipe >= 100 ? "#22c55e" : visitPctEquipe >= 60 ? "#3b82f6" : visitPctEquipe >= 30 ? "#eab308" : "#ef4444"} />
              </div>
              {visitPctEquipe >= 100 && <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">🏆</Badge>}
            </div>
          </>
        )}

        <div className="w-px h-8 bg-white/10 shrink-0 hidden md:block" />

        {/* Botões de ação */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-all"
            onClick={() => setExpanded(e => !e)}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Detalhes</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {user?.role === "bdr" && (
            <Link href="/work-mode">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "#e21d3c", color: "white" }}>
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Iniciar Prospecção</span>
                <span className="sm:hidden">Prospectar</span>
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Painel expandido ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/50 shrink-0" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-7 text-xs w-32 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por BDR (só no modo BDR, só ADM) */}
            {viewMode === "bdr" && isAdm && (
              <Select value={filterBdrId ? String(filterBdrId) : "all"}
                onValueChange={(v) => setFilterBdrId(v === "all" ? undefined : Number(v))}>
                <SelectTrigger className="h-7 text-xs w-40 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos os BDRs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os BDRs</SelectItem>
                  {(stats?.bdrs ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filtro por UF (só modo BDR) */}
            {viewMode === "bdr" && (
              <Select value={filterUf ?? "all"} onValueChange={(v) => setFilterUf(v === "all" ? undefined : v)}>
                <SelectTrigger className="h-7 text-xs w-28 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos os UFs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os UFs</SelectItem>
                  {BRAZIL_UFS.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <span className="text-white/40 text-[10px]">
              {dateRange.startDate === dateRange.endDate ? dateRange.startDate : `${dateRange.startDate} → ${dateRange.endDate}`}
            </span>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 text-[10px] text-white/50">
            {viewMode === "bdr" ? (
              <>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-blue-400" /> Tentativas</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-green-500" /> Contatos realizados</span>
                <span className="flex items-center gap-1"><Target className="w-3 h-3 text-white/50" /> Leads qualificados</span>
                {isManager && <span className="text-white/40 italic">Clique nos números para ver detalhes</span>}
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Propostas enviadas</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Visitas realizadas (GPS)</span>
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> Vendas fechadas</span>
              </>
            )}
          </div>

          {/* Lista de BDRs */}
          {viewMode === "bdr" && (
            stats?.bdrs && stats.bdrs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {stats.bdrs.map((bdr) => (
                  <BdrRow key={bdr.id} bdr={bdr} isManager={isManager} period={dateRange} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-white/40 text-sm">
                Nenhuma atividade registrada no período selecionado.
              </div>
            )
          )}

          {/* Lista de Consultores */}
          {viewMode === "consultor" && (
            consultorRanking && consultorRanking.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {consultorRanking.map((c) => (
                  <ConsultorRow
                    key={c.userId}
                    consultor={c}
                    metaPropostas={metaPropostasNoPeriodo}
                    metaVisitas={metaVisitasNoPeriodo}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-white/40 text-sm">
                Nenhum dado de consultores no período selecionado.
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
