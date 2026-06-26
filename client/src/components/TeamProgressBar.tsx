import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone, Target, Zap, CheckCircle2, ChevronDown, ChevronUp,
  ExternalLink, Filter, Users
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
    const day = now.getDay(); // 0=Sun
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    // FIX: não mutar 'now' — clonar antes de chamar setDate
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
  // default: today
  const s = fmt(new Date());
  return { startDate: s, endDate: s };
}

// ─── Segmented Progress Bar ───────────────────────────────────────────────────

function SegBar({
  attempts,
  contacts,
  goal,
  height = "h-2.5",
}: {
  attempts: number;
  contacts: number;
  goal: number;
  height?: string;
}) {
  const total = attempts + contacts;
  const totalPct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const contactsPct = goal > 0 ? Math.min(totalPct, Math.round((contacts / goal) * 100)) : 0;
  const attemptsPct = Math.max(0, totalPct - contactsPct);

  const baseColor =
    totalPct >= 100 ? "#22c55e"
    : totalPct >= 60 ? "#3b82f6"
    : totalPct >= 30 ? "#eab308"
    : "#ef4444";

  return (
    <div className={`w-full bg-white/10 rounded-full ${height} overflow-hidden flex`}>
      {attemptsPct > 0 && (
        <div
          className={`${height} transition-all duration-500`}
          style={{
            width: `${attemptsPct}%`,
            background: baseColor,
            borderRadius: contactsPct > 0 ? "9999px 0 0 9999px" : "9999px",
          }}
        />
      )}
      {contactsPct > 0 && (
        <div
          className={`${height} bg-green-500 transition-all duration-500`}
          style={{
            width: `${contactsPct}%`,
            borderRadius: attemptsPct > 0 ? "0 9999px 9999px 0" : "9999px",
          }}
        />
      )}
    </div>
  );
}

// ─── BDR Detail Row ───────────────────────────────────────────────────────────

function BdrRow({
  bdr,
  isManager,
  period,
}: {
  bdr: {
    id: number;
    name: string;
    cargo: string;
    attempts: number;
    contacts: number;
    qualified: number;
    goalAttempts: number;
    goalQualified: number;
  };
  isManager: boolean;
  period: { startDate: string; endDate: string };
}) {
  const [, setLocation] = useLocation();
  const [expandType, setExpandType] = useState<"contacts" | "qualified" | null>(null);

  const totalActivity = bdr.attempts + bdr.contacts;
  const attPct = bdr.goalAttempts > 0 ? Math.min(100, Math.round((totalActivity / bdr.goalAttempts) * 100)) : 0;
  const qualPct = bdr.goalQualified > 0 ? Math.min(100, Math.round((bdr.qualified / bdr.goalQualified) * 100)) : 0;

  // Detalhes de contatos/tentativas (apenas gestores)
  const { data: contactDetails } = trpc.dashboard.bdrContactDetails.useQuery(
    { bdrId: bdr.id, startDate: period.startDate, endDate: period.endDate },
    { enabled: isManager && expandType === "contacts" }
  );

  // Detalhes de leads qualificados (apenas gestores)
  const { data: qualifiedDetails } = trpc.dashboard.bdrQualifiedDetails.useQuery(
    { bdrId: bdr.id, startDate: period.startDate, endDate: period.endDate },
    { enabled: isManager && expandType === "qualified" }
  );

  return (
    <div className="border border-white/10 rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)" }}>
      {/* Header do BDR */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "#e8621a", color: "white" }}
          >
            {bdr.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{bdr.name}</p>
            <p className="text-white/50 text-[10px] truncate">{bdr.cargo}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-xs">
          {/* Tentativas */}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${isManager ? "hover:bg-white/10 cursor-pointer" : "cursor-default"} ${expandType === "contacts" ? "bg-white/10" : ""}`}
            onClick={() => isManager && setExpandType(expandType === "contacts" ? null : "contacts")}
            title={isManager ? "Ver detalhes das tentativas/contatos" : undefined}
          >
            <Phone className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{totalActivity}</span>
            <span className="text-white/40">/{bdr.goalAttempts}</span>
            {bdr.contacts > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>
                <CheckCircle2 className="w-2 h-2" />{bdr.contacts}
              </span>
            )}
            {isManager && <ChevronDown className="w-3 h-3 text-white/40" />}
          </button>
          {/* Qualificados */}
          <button
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all ${isManager ? "hover:bg-white/10 cursor-pointer" : "cursor-default"} ${expandType === "qualified" ? "bg-white/10" : ""}`}
            onClick={() => isManager && setExpandType(expandType === "qualified" ? null : "qualified")}
            title={isManager ? "Ver leads qualificados" : undefined}
          >
            <Target className="w-3 h-3 text-white/60" />
            <span className="text-white font-semibold">{bdr.qualified}</span>
            <span className="text-white/40">/{bdr.goalQualified}</span>
            {qualPct >= 100 && <span className="text-green-400 text-[10px]">✓</span>}
            {isManager && <ChevronDown className="w-3 h-3 text-white/40" />}
          </button>
        </div>
      </div>

      {/* Mini barras */}
      <div className="grid grid-cols-2 gap-2">
        <SegBar attempts={bdr.attempts} contacts={bdr.contacts} goal={bdr.goalAttempts} height="h-1.5" />
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{
              width: `${qualPct}%`,
              background: qualPct >= 100 ? "#22c55e" : qualPct >= 60 ? "#3b82f6" : qualPct >= 30 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Detalhes expandidos: contatos/tentativas */}
      {isManager && expandType === "contacts" && contactDetails && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Tentativas e Contatos</p>
          {contactDetails.length === 0 && <p className="text-white/40 text-xs">Nenhuma atividade no período</p>}
          {contactDetails.map((item) => (
            <button
              key={item.id}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-all text-left"
              onClick={() => item.leadId && setLocation(`/leads/${item.leadId}`)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
                  style={{
                    background: item.type === "contato" ? "rgba(34,197,94,0.2)" : "rgba(59,130,246,0.2)",
                    color: item.type === "contato" ? "#4ade80" : "#60a5fa",
                  }}
                >
                  {item.type === "contato" ? "Contato" : "Tentativa"}
                </span>
                <span className="text-white/80 text-xs truncate">
                  {item.nomeFantasia || item.razaoSocial || `Lead #${item.leadId}`}
                </span>
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

      {/* Detalhes expandidos: leads qualificados */}
      {isManager && expandType === "qualified" && qualifiedDetails && (
        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Leads Qualificados</p>
          {qualifiedDetails.length === 0 && <p className="text-white/40 text-xs">Nenhum lead qualificado no período</p>}
          {qualifiedDetails.map((lead) => (
            <button
              key={lead.id}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-white/10 transition-all text-left"
              onClick={() => setLocation(`/leads/${lead.id}`)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-white/80 text-xs truncate">
                  {lead.nomeFantasia || lead.razaoSocial || `Lead #${lead.id}`}
                </span>
                {lead.cidade && <span className="text-white/40 text-[10px] shrink-0">{lead.cidade}/{lead.uf}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-white/40 text-[10px]">
                  {lead.qualifiedAt ? new Date(lead.qualifiedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                <ExternalLink className="w-3 h-3 text-white/30" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamProgressBar() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState("day");
  const [filterBdrId, setFilterBdrId] = useState<number | undefined>(undefined);
  const [filterUf, setFilterUf] = useState<string | undefined>(undefined);

  const isManager = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"].includes(user?.role ?? "");

  const dateRange = useMemo(() => getDateRange(period), [period]);

  const { data: stats, isLoading } = trpc.dashboard.teamStats.useQuery(
    { ...dateRange, bdrId: filterBdrId, uf: filterUf || undefined },
    { enabled: !!user, refetchInterval: 60_000 }
  );

  // Lista de BDRs para o filtro (apenas gestores)
  const { data: allUsers } = trpc.users.list.useQuery(undefined, { enabled: isManager });
  const bdrUsers = useMemo(() => (allUsers ?? []).filter((u: any) => !u.isBlocked), [allUsers]);

  if (!user || isLoading) return null;

  const totalAttempts = stats?.totalAttempts ?? 0;
  const totalContacts = stats?.totalContacts ?? 0;
  const totalActivity = totalAttempts + totalContacts;
  const totalQualified = stats?.totalQualified ?? 0;
  // Meta global da equipe (soma das metas de todos os BDRs × dias)
  const goalAttempts = stats?.totalGoalAttempts ?? 80;
  const goalQualified = stats?.totalGoalQualified ?? 5;
  // Meta individual por BDR por dia (sem multiplicar)
  const dailyAttemptsGoal = stats?.dailyAttemptsGoal ?? 80;
  const dailyQualifiedGoal = stats?.dailyQualifiedGoal ?? 5;
  const totalBdrCount = stats?.totalBdrCount ?? 1;

  const attPct = goalAttempts > 0 ? Math.min(100, Math.round((totalActivity / goalAttempts) * 100)) : 0;
  const qualPct = goalQualified > 0 ? Math.min(100, Math.round((totalQualified / goalQualified) * 100)) : 0;

  const periodLabel: Record<string, string> = {
    day: "Hoje",
    week: "Esta semana",
    month: "Este mês",
    year: "Este ano",
  };

  return (
    <div style={{ background: "oklch(0.17 0.06 240)" }} className="border-b border-border">
      {/* ── Barra principal (sempre visível) ── */}
      <div
        className="w-full px-4 py-2 flex items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
        title="Clique para ver detalhes por BDR"
      >
        {/* Tentativas + Contatos */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Phone className="w-4 h-4 text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5 gap-1">
              <div className="flex flex-col min-w-0">
                <span className="text-white/70 text-xs truncate">
                  Tentativas {periodLabel[period] ?? "Hoje"} — Equipe
                </span>
                <span className="text-white/40 text-[10px] truncate">
                  Meta individual: {dailyAttemptsGoal}/dia · {totalBdrCount} BDR{totalBdrCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-white font-semibold text-xs">{totalActivity}/{goalAttempts}</span>
                {totalContacts > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80" }}
                    title={`${totalContacts} contato${totalContacts > 1 ? "s" : ""} realizado${totalContacts > 1 ? "s" : ""}`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />{totalContacts}
                  </span>
                )}
              </div>
            </div>
            <SegBar attempts={totalAttempts} contacts={totalContacts} goal={goalAttempts} />
            {totalContacts > 0 && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] text-white/50">
                  <span className="inline-block w-2 h-1.5 rounded-full bg-blue-400" />{totalAttempts} tentativas
                </span>
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="inline-block w-2 h-1.5 rounded-full bg-green-500" />{totalContacts} contatos realizados
                </span>
              </div>
            )}
          </div>
          {attPct >= 100 && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">✓ Meta</Badge>
          )}
        </div>

        {/* Divisor */}
        <div className="w-px h-8 bg-white/10 shrink-0" />

        {/* Leads qualificados */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Target className="w-4 h-4 text-white/70 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex flex-col min-w-0">
                <span className="text-white/70 text-xs truncate">Qualificados {periodLabel[period] ?? "Hoje"} — Equipe</span>
                <span className="text-white/40 text-[10px] truncate">Meta individual: {dailyQualifiedGoal}/dia</span>
              </div>
              <span className="text-white font-semibold text-xs ml-2 shrink-0">{totalQualified}/{goalQualified}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${qualPct}%`,
                  background: qualPct >= 100 ? "#22c55e" : qualPct >= 60 ? "#3b82f6" : qualPct >= 30 ? "#eab308" : "#ef4444",
                }}
              />
            </div>
          </div>
          {qualPct >= 100 && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">🏆 Meta</Badge>
          )}
        </div>

        {/* Divisor */}
        <div className="w-px h-8 bg-white/10 shrink-0 hidden md:block" />

        {/* Botões de ação */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Expandir painel */}
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 transition-all"
            onClick={() => setExpanded(e => !e)}
            title="Ver detalhes por BDR"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Detalhes</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Botão modo de trabalho (apenas BDR) — visível em todas as telas */}
          {user?.role === "bdr" && (
            <Link href="/work-mode">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                style={{ background: "#e8621a", color: "white" }}
              >
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
            {/* Período */}
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

            {/* Filtro por BDR (apenas gestores) */}
            {isManager && (
              <Select
                value={filterBdrId ? String(filterBdrId) : "all"}
                onValueChange={(v) => setFilterBdrId(v === "all" ? undefined : Number(v))}
              >
                <SelectTrigger className="h-7 text-xs w-40 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos os BDRs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os BDRs</SelectItem>
                  {bdrUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {`${u.name ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Filtro por UF */}
            <Select value={filterUf ?? "all"} onValueChange={(v) => setFilterUf(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-7 text-xs w-28 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Todos os UFs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os UFs</SelectItem>
                {BRAZIL_UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-white/40 text-[10px]">
              {dateRange.startDate === dateRange.endDate
                ? dateRange.startDate
                : `${dateRange.startDate} → ${dateRange.endDate}`}
            </span>
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 text-[10px] text-white/50">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-full bg-blue-400" /> Tentativas
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-full bg-green-500" /> Contatos realizados
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3 text-white/50" /> Leads qualificados
            </span>
            {isManager && (
              <span className="text-white/40 italic">Clique nos números para ver detalhes</span>
            )}
          </div>

          {/* Lista de BDRs */}
          {stats?.bdrs && stats.bdrs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {stats.bdrs.map((bdr) => (
                <BdrRow
                  key={bdr.id}
                  bdr={bdr}
                  isManager={isManager}
                  period={dateRange}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-white/40 text-sm">
              Nenhuma atividade registrada no período selecionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
