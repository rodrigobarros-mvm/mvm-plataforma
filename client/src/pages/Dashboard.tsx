import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Award, BarChart3, CheckCircle2, Forklift, Target, TrendingUp, Users, XCircle, Zap,
  AlertTriangle, Clock, Phone, ChevronRight, ExternalLink
} from "lucide-react";
import { Link } from "wouter";

const COLORS = ["#e8621a", "#1e40af", "#16a34a", "#7c3aed", "#ca8a04", "#0891b2"];

type Period = "today" | "week" | "month" | "all";
const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoje",
  week: "Semana",
  month: "Mês",
  all: "Total",
};

// ─── Clickable StatCard ───────────────────────────────────────────────────────
function StatCard({
  title, value, sub, icon: Icon, color, onClick,
}: {
  title: string; value: string | number; sub?: string; icon: React.ElementType; color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`border-border transition-all duration-150 ${onClick ? "cursor-pointer hover:ring-2 hover:ring-offset-1 active:scale-[0.98]" : ""}`}
      style={onClick ? { "--tw-ring-color": color } as React.CSSProperties : undefined}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-muted-foreground text-xs md:text-sm font-medium leading-tight">{title}</p>
            <p className="text-xl md:text-2xl font-bold text-foreground mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
            {sub && <p className="text-[11px] md:text-xs text-muted-foreground mt-1 leading-tight">{sub}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
              <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color }} />
            </div>
            {onClick && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {(["today", "week", "month", "all"] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === p
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

// ─── BDR Dashboard ────────────────────────────────────────────────────────────
function BdrDashboard() {
  const { data: stats, isLoading } = trpc.dashboard.bdrStats.useQuery();
  const { data: ranking } = trpc.dashboard.ranking.useQuery({});

  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 md:h-28" />)}</div>;

  const todayContacts = (stats as any)?.todayContacts ?? 0;
  const todayAttempts = stats?.todayAttempts ?? 0;
  const totalActivity = todayAttempts + todayContacts;
  const attemptsGoal = stats?.dailyAttemptsGoal ?? 80;
  const qualifiedGoal = stats?.dailyGoal ?? 5;
  const totalQualified = stats?.totalQualified ?? 0;

  const attemptsProgress = attemptsGoal > 0 ? Math.min((totalActivity / attemptsGoal) * 100, 100) : 0;
  const qualifiedProgress = qualifiedGoal > 0 ? Math.min((totalQualified / qualifiedGoal) * 100, 100) : 0;

  // Taxas de conversão BDR
  const convAttemptToContact = totalActivity > 0 ? ((todayContacts / totalActivity) * 100).toFixed(1) : "0.0";
  const convContactToQualified = todayContacts > 0 ? ((totalQualified / todayContacts) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="Tentativas Hoje" value={totalActivity} sub={`Meta: ${attemptsGoal} · ${todayContacts} contatos realizados`} icon={Zap} color="#e8621a" />
        <StatCard title="Leads Qualificados" value={totalQualified} sub={`Meta diária: ${qualifiedGoal}`} icon={CheckCircle2} color="#16a34a" />
        <StatCard title="Taxa Tent. → Contato" value={`${convAttemptToContact}%`} sub={`${todayContacts} de ${totalActivity} tentativas`} icon={TrendingUp} color="#7c3aed" />
        <StatCard title="Taxa Contato → Qualif." value={`${convContactToQualified}%`} sub={`${totalQualified} de ${todayContacts} contatos`} icon={Target} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso Diário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Tentativas + Contatos</span>
                <span className="font-semibold">{totalActivity} / {attemptsGoal}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden flex">
                {todayAttempts > 0 && (
                  <div className="h-2 bg-blue-500 transition-all" style={{ width: `${attemptsGoal > 0 ? Math.min((todayAttempts / attemptsGoal) * 100, 100) : 0}%` }} />
                )}
                {todayContacts > 0 && (
                  <div className="h-2 bg-green-500 transition-all" style={{ width: `${attemptsGoal > 0 ? Math.min((todayContacts / attemptsGoal) * 100, 100) : 0}%` }} />
                )}
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />{todayAttempts} tentativas</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{todayContacts} contatos</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Leads qualificados</span>
                <span className="font-semibold">{totalQualified} / {qualifiedGoal}</span>
              </div>
              <Progress value={qualifiedProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: "#e8621a" }} />
              Ranking Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ranking ?? []).slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}°</span>
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={r.userPhoto ?? ""} />
                    <AvatarFallback className="text-xs" style={{ background: "oklch(0.22 0.08 240)", color: "white" }}>
                      {r.userName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{r.userName}</span>
                  <Badge variant="secondary">{r.qualifiedCount} leads</Badge>
                </div>
              ))}
              {(!ranking || ranking.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("all");
  const [modal, setModal] = useState<string | null>(null);

  const periodInput = useMemo(() => ({ period }), [period]);
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery(periodInput);
  const { data: ranking } = trpc.dashboard.ranking.useQuery({});
  const { data: reasons } = trpc.dashboard.disqualificationReasons.useQuery();
  const { data: bdrsAtRisk } = trpc.dashboard.bdrsAtRisk.useQuery(undefined, { refetchInterval: 120_000 });
  const { data: stagnantLeads } = trpc.dashboard.stagnantLeads.useQuery({ daysThreshold: 3, limit: 8 }, { refetchInterval: 300_000 });
  const { data: releaseStats } = trpc.leads.releaseStats.useQuery();

  // Leads qualificados para o modal
  const { data: qualifiedLeadsList } = trpc.leads.list.useQuery(
    { isQualified: true, page: 1, limit: 50 },
    { enabled: modal === "qualified" }
  );
  // Leads desqualificados para o modal
  const { data: disqualifiedLeadsList } = trpc.leads.list.useQuery(
    { status: "Desqualificado", page: 1, limit: 50 },
    { enabled: modal === "disqualified" }
  );

  if (isLoading) return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 md:h-28" />)}
      </div>
    </div>
  );

  // Taxas de conversão
  const totalAttempts = (stats as any)?.totalAttempts ?? 0;
  const totalContacts = (stats as any)?.totalContacts ?? 0;
  const qualifiedLeads = stats?.qualifiedLeads ?? 0;
  const conversionAttemptToContact = totalAttempts > 0
    ? ((totalContacts / totalAttempts) * 100).toFixed(1) : "0.0";
  const conversionContactToQualified = totalContacts > 0
    ? ((qualifiedLeads / totalContacts) * 100).toFixed(1) : "0.0";
  // Taxa geral: (tentativas+contatos) → qualificados
  const totalActivity = totalAttempts + totalContacts;
  const conversionOverall = totalActivity > 0
    ? ((qualifiedLeads / totalActivity) * 100).toFixed(1) : "0.0";

  const statusData = (stats?.byStatus ?? []).map(s => ({ name: s.status ?? "Desconhecido", value: s.count }));
  const ufData = (stats?.byUf ?? []).slice(0, 8).map(u => ({ name: u.uf ?? "?", leads: u.count }));
  const reasonsData = (reasons ?? []).slice(0, 6).map(r => ({
    name: (r.reason ?? "Não informado").substring(0, 30), count: r.count,
  }));

  const periodLabel = PERIOD_LABELS[period];

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Period Selector + KPI Cards (mobile + desktop) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground font-medium">KPIs — {periodLabel}</p>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <StatCard
            title="Total de Leads"
            value={stats?.totalLeads ?? 0}
            sub="na base completa"
            icon={Forklift}
            color="#e8621a"
            onClick={() => setModal("total")}
          />
          <StatCard
            title="Leads Qualificados"
            value={qualifiedLeads}
            sub={`${conversionOverall}% das atividades · ${periodLabel}`}
            icon={CheckCircle2}
            color="#16a34a"
            onClick={() => setModal("qualified")}
          />
          <StatCard
            title="Desqualificados"
            value={stats?.disqualifiedLeads ?? 0}
            sub="com justificativa"
            icon={XCircle}
            color="#dc2626"
            onClick={() => setModal("disqualified")}
          />
          <StatCard
            title="Tentativas"
            value={totalAttempts.toLocaleString("pt-BR")}
            sub={`${totalContacts.toLocaleString("pt-BR")} contatos realizados · ${periodLabel}`}
            icon={Phone}
            color="#0ea5e9"
            onClick={() => setModal("attempts")}
          />
          <StatCard
            title="Taxa Tent. → Contato"
            value={`${conversionAttemptToContact}%`}
            sub={`${totalContacts} de ${totalAttempts} · ${periodLabel}`}
            icon={TrendingUp}
            color="#7c3aed"
            onClick={() => setModal("convAttempt")}
          />
          <StatCard
            title="Taxa Contato → Qualif."
            value={`${conversionContactToQualified}%`}
            sub={`${qualifiedLeads} de ${totalContacts} · ${periodLabel}`}
            icon={Target}
            color="#f59e0b"
            onClick={() => setModal("convContact")}
          />
        </div>
      </div>

      {/* ── Alertas de BDRs em Risco + Leads Estagnados (mobile + desktop) ── */}
      {((bdrsAtRisk && bdrsAtRisk.length > 0) || (stagnantLeads && stagnantLeads.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {bdrsAtRisk && bdrsAtRisk.length > 0 && (
            <Card className="border-orange-200" style={{ background: "#fff7ed" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  BDRs em Risco Hoje
                </CardTitle>
                <CardDescription className="text-orange-600">Abaixo de 50% das metas diárias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bdrsAtRisk.map((bdr) => (
                    <div key={bdr.id} className="p-3 bg-white rounded-lg border border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-800">{bdr.name}</p>
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Em risco</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 mb-1">Tentativas: {bdr.todayAttempts}/{bdr.attemptsGoal}</p>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${bdr.attemptsPercent}%` }} />
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1">Leads: {bdr.todayQualified}/{bdr.leadsGoal}</p>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${bdr.leadsPercent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stagnantLeads && stagnantLeads.length > 0 && (
            <Card className="border-yellow-200" style={{ background: "#fefce8" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                  <Clock className="w-4 h-4" />
                  Leads Estagnados (+3 dias)
                </CardTitle>
                <CardDescription className="text-yellow-600">Sem interação nos últimos 3 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stagnantLeads.map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="p-2.5 bg-white rounded-lg border border-yellow-100 hover:border-yellow-300 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {lead.nomeFantasia || lead.razaoSocial || "Lead sem nome"}
                            </p>
                            <p className="text-xs text-gray-500">{lead.cidade}, {lead.uf}</p>
                          </div>
                          <Badge variant="outline" className="text-xs ml-2 shrink-0">
                            {lead.statusContato || "Sem status"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: "#e8621a" }} />
              Ranking de BDRs
            </CardTitle>
            <CardDescription>Leads qualificados por BDR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(ranking ?? []).slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: i === 0 ? "#e8621a" : i === 1 ? "#94a3b8" : i === 2 ? "#ca8a04" : "#e2e8f0", color: i < 3 ? "white" : "#64748b" }}>
                    {i + 1}
                  </div>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={r.userPhoto ?? ""} />
                    <AvatarFallback className="text-xs font-bold" style={{ background: "oklch(0.22 0.08 240)", color: "white" }}>
                      {r.userName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.userName}</p>
                    {(r as any).cargo && <p className="text-xs text-muted-foreground truncate">{(r as any).cargo}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{r.qualifiedCount}</p>
                    <p className="text-xs text-muted-foreground">leads</p>
                  </div>
                </div>
              ))}
              {(!ranking || ranking.length === 0) && (
                <p className="text-muted-foreground text-sm text-center py-6">Nenhum lead qualificado ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: "#e8621a" }} />
              Status dos Leads
            </CardTitle>
            <CardDescription>Distribuição por status de contato</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, "Leads"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads Qualificados por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {ufData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ufData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#e8621a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Principais Motivos de Desqualificação</CardTitle>
          </CardHeader>
          <CardContent>
            {reasonsData.length > 0 ? (
              <div className="space-y-2">
                {reasonsData.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{r.name}</p>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                        <div className="h-1.5 rounded-full" style={{ width: `${(r.count / (reasonsData[0]?.count ?? 1)) * 100}%`, background: "#e8621a" }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Nenhum lead desqualificado ainda</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modais de detalhes dos KPIs ── */}

      {/* Modal: Total de Leads */}
      <Dialog open={modal === "total"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Forklift className="w-5 h-5" style={{ color: "#e8621a" }} />
              Total de Leads na Base
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border bg-muted/30">
                <p className="text-2xl font-bold">{(stats?.totalLeads ?? 0).toLocaleString("pt-BR")}</p>
                <p className="text-sm text-muted-foreground">Total na base</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30">
                <p className="text-2xl font-bold text-green-600">{qualifiedLeads}</p>
                <p className="text-sm text-muted-foreground">Qualificados ({conversionOverall}%)</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-3">Distribuição por Estado (qualificados)</p>
              {ufData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ufData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#e8621a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>}
            </div>
            <div className="flex justify-end">
              <Link href="/leads">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setModal(null)}>
                  <ExternalLink className="w-4 h-4" />
                  Ver lista completa
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Leads Qualificados */}
      <Dialog open={modal === "qualified"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Leads Qualificados — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{qualifiedLeads} leads qualificados no período</p>
            {(qualifiedLeadsList?.data ?? []).slice(0, 30).map((lead: any) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} onClick={() => setModal(null)}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.nomeFantasia || lead.razaoSocial || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{lead.cidade}, {lead.uf} · CNPJ: {lead.cnpj}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className="bg-green-100 text-green-700 text-xs">Qualificado</Badge>
                    {lead.qualifiedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(lead.qualifiedAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
            {(qualifiedLeadsList?.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead qualificado no período</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Desqualificados */}
      <Dialog open={modal === "disqualified"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Leads Desqualificados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{stats?.disqualifiedLeads ?? 0} leads desqualificados</p>
            <div className="space-y-2 mb-4">
              <p className="text-sm font-semibold">Principais motivos</p>
              {reasonsData.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.name}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${(r.count / (reasonsData[0]?.count ?? 1)) * 100}%`, background: "#dc2626" }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground w-8 text-right">{r.count}</span>
                </div>
              ))}
            </div>
            {(disqualifiedLeadsList?.data ?? []).slice(0, 20).map((lead: any) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} onClick={() => setModal(null)}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.nomeFantasia || lead.razaoSocial || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{lead.cidade}, {lead.uf}</p>
                    {lead.disqualificationReason && (
                      <p className="text-xs text-red-500 mt-0.5">Motivo: {lead.disqualificationReason}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Tentativas */}
      <Dialog open={modal === "attempts"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-sky-500" />
              Tentativas de Contato — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border bg-muted/30">
                <p className="text-2xl font-bold">{totalAttempts.toLocaleString("pt-BR")}</p>
                <p className="text-sm text-muted-foreground">Total de tentativas</p>
              </div>
              <div className="p-4 rounded-xl border bg-muted/30">
                <p className="text-2xl font-bold text-green-600">{totalContacts.toLocaleString("pt-BR")}</p>
                <p className="text-sm text-muted-foreground">Contatos realizados</p>
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Taxa de sucesso (tentativa → contato)</p>
              <p className="text-3xl font-bold" style={{ color: "#7c3aed" }}>{conversionAttemptToContact}%</p>
              <Progress value={parseFloat(conversionAttemptToContact)} className="h-2 mt-2" />
            </div>
            <div className="p-4 rounded-xl border bg-muted/30">
              <p className="text-sm text-muted-foreground mb-1">Taxa geral (atividades → qualificados)</p>
              <p className="text-3xl font-bold" style={{ color: "#16a34a" }}>{conversionOverall}%</p>
              <p className="text-xs text-muted-foreground mt-1">{qualifiedLeads} qualificados de {totalActivity} atividades</p>
            </div>
            <div className="flex justify-end">
              <Link href="/relatorios">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setModal(null)}>
                  <ExternalLink className="w-4 h-4" />
                  Ver relatório completo
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Taxa Tentativa → Contato */}
      <Dialog open={modal === "convAttempt"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
              Taxa Tentativas → Contatos — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 rounded-xl border text-center">
              <p className="text-5xl font-bold" style={{ color: "#7c3aed" }}>{conversionAttemptToContact}%</p>
              <p className="text-sm text-muted-foreground mt-2">de {totalAttempts} tentativas resultaram em {totalContacts} contatos realizados</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-lg font-bold">{totalAttempts.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Tentativas totais</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-lg font-bold text-green-600">{totalContacts.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Contatos realizados</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Fórmula: Contatos Realizados ÷ Total de Tentativas × 100
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Taxa Contato → Qualificado */}
      <Dialog open={modal === "convContact"} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: "#f59e0b" }} />
              Taxa Contatos → Qualificados — {periodLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-6 rounded-xl border text-center">
              <p className="text-5xl font-bold" style={{ color: "#f59e0b" }}>{conversionContactToQualified}%</p>
              <p className="text-sm text-muted-foreground mt-2">de {totalContacts} contatos resultaram em {qualifiedLeads} leads qualificados</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-lg font-bold">{totalContacts.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">Contatos realizados</p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <p className="text-lg font-bold text-green-600">{qualifiedLeads}</p>
                <p className="text-xs text-muted-foreground">Leads qualificados</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Fórmula: Leads Qualificados ÷ Contatos Realizados × 100
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isAdmOrGerente = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"].includes(role);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Bem-vindo, {user?.name}! Acompanhe suas métricas em tempo real.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Dados em tempo real
        </div>
      </div>

      {isAdmOrGerente ? <AdminDashboard /> : <BdrDashboard />}
    </div>
  );
}
