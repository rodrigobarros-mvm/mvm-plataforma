import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy, Medal, Award, TrendingUp, FileText, MapPin,
  Target, DollarSign, Zap, CheckCircle2,
  Calendar, Clock, BarChart3, Download, ArrowLeft, X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = "dia" | "semana" | "mes";

type ConsultorStats = {
  userId: number;
  userName: string | null;
  userPhoto?: string | null;
  propostasEnviadas: number;
  visitasRealizadas: number;
  vendasRealizadas: number;
  maquinasVendidas: number;
  volumePropostas: number;
  faturamentoTotal: number;
  score: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function initials(name: string | null) {
  return (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

const PERIOD_TABS = [
  { key: "dia" as Period,    label: "Hoje",        icon: Clock },
  { key: "semana" as Period, label: "Esta Semana", icon: Calendar },
  { key: "mes" as Period,    label: "Este Mês",    icon: BarChart3 },
];

const MEDAL = ["🥇", "🥈", "🥉"];
const MEDAL_COLOR = ["#e21d3c", "#64748b", "#92400e"];

// ─── Detalhe do Consultor ─────────────────────────────────────────────────────
function ConsultorDetail({
  consultor,
  metas,
  period,
  onClose,
}: {
  consultor: ConsultorStats;
  metas: Record<string, string>;
  period: Period;
  onClose: () => void;
}) {
  const metaPropostas   = Number(metas["propostas_dia"]      ?? 3)  * (period === "dia" ? 1 : period === "semana" ? 5 : 22);
  const metaVisitas     = Number(metas["visitas_semana"]     ?? 5)  * (period === "semana" ? 1 : period === "mes" ? 4 : 0);
  const metaVendas      = Number(metas["vendas_mes"]         ?? 8)  * (period === "mes" ? 1 : 0);
  const metaFaturamento = Number(metas["faturamento_mes"]    ?? 1200000) * (period === "mes" ? 1 : period === "semana" ? 0.25 : 0.05);

  const rows = [
    {
      label: "Propostas Enviadas", value: consultor.propostasEnviadas,
      meta: metaPropostas, color: "#0a1e5a", icon: FileText, fmt: (v: number) => String(v),
    },
    {
      label: "Visitas Realizadas", value: consultor.visitasRealizadas,
      meta: metaVisitas, color: "#7C3AED", icon: MapPin, fmt: (v: number) => String(v),
    },
    {
      label: "Vendas Fechadas", value: consultor.vendasRealizadas,
      meta: metaVendas, color: "#059669", icon: CheckCircle2, fmt: (v: number) => String(v),
    },
    {
      label: "Máquinas Vendidas", value: consultor.maquinasVendidas,
      meta: 0, color: "#D97706", icon: Zap, fmt: (v: number) => String(v),
    },
    {
      label: "Volume de Propostas", value: consultor.volumePropostas,
      meta: 0, color: "#0891B2", icon: TrendingUp, fmt: formatCurrency,
    },
    {
      label: "Faturamento Total", value: consultor.faturamentoTotal,
      meta: metaFaturamento, color: "#e21d3c", icon: DollarSign, fmt: formatCurrency,
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2 px-2" onClick={onClose}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <h2 className="text-lg font-bold text-foreground">Detalhe do Consultor</h2>
      </div>

      {/* Perfil */}
      <Card className="border-border">
        <CardContent className="p-5 flex items-center gap-4">
          <Avatar className="w-16 h-16 border-4 border-border">
            <AvatarImage src={consultor.userPhoto ?? ""} />
            <AvatarFallback className="text-lg font-bold text-white" style={{ background: "#0a1e5a" }}>
              {initials(consultor.userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-foreground">{consultor.userName ?? "—"}</p>
            <p className="text-sm text-muted-foreground">Consultor Comercial</p>
          </div>
          <div className="text-center">
            <Badge
              className="text-lg px-4 py-1 font-black"
              style={{
                background: consultor.score >= 80 ? "#e21d3c" : consultor.score >= 60 ? "#D97706" : "#94A3B8",
                color: "white",
              }}
            >
              {consultor.score}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">score</p>
          </div>
        </CardContent>
      </Card>

      {/* Métricas com barra de progresso */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Performance detalhada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map((r) => {
            const pct = r.meta > 0 ? Math.min((r.value / r.meta) * 100, 100) : null;
            return (
              <div key={r.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <r.icon className="w-4 h-4 shrink-0" style={{ color: r.color }} />
                    <span className="text-sm font-medium text-foreground">{r.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{ color: r.color }}>{r.fmt(r.value)}</span>
                    {r.meta > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">/ {r.fmt(r.meta)}</span>
                    )}
                  </div>
                </div>
                {pct !== null && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: r.color }}
                    />
                  </div>
                )}
                {pct !== null && (
                  <p className="text-xs text-muted-foreground mt-0.5 text-right">{Math.round(pct)}% da meta</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Score breakdown */}
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            Composição do Score
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Propostas Enviadas",  peso: "30%", color: "#0a1e5a" },
              { label: "Visitas Realizadas",  peso: "20%", color: "#7C3AED" },
              { label: "Vendas Fechadas",     peso: "25%", color: "#059669" },
              { label: "Máquinas Vendidas",   peso: "10%", color: "#D97706" },
              { label: "Volume de Propostas", peso: "5%",  color: "#0891B2" },
              { label: "Faturamento Total",   peso: "10%", color: "#e21d3c" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground flex-1">{s.label}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>{s.peso}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pódio ────────────────────────────────────────────────────────────────────
function PodiumCard({
  consultor,
  pos,
  onClick,
}: {
  consultor: ConsultorStats;
  pos: number;
  onClick: () => void;
}) {
  const color = MEDAL_COLOR[pos] ?? "#94a3b8";
  const isFirst = pos === 0;
  return (
    <Card
      className={`border-border text-center cursor-pointer hover:shadow-md transition-shadow ${isFirst ? "ring-2 ring-red-600 shadow-lg" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4 pt-5">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <Avatar className={`${isFirst ? "w-16 h-16" : "w-12 h-12"} border-4`} style={{ borderColor: color }}>
              <AvatarImage src={consultor.userPhoto ?? ""} />
              <AvatarFallback className="text-white font-bold" style={{ background: "#0a1e5a" }}>
                {initials(consultor.userName)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{MEDAL[pos]}</span>
          </div>
        </div>
        <p className="font-bold text-sm text-foreground truncate">{consultor.userName}</p>
        <p className={`${isFirst ? "text-3xl" : "text-2xl"} font-black mt-1`} style={{ color }}>
          {consultor.score}
        </p>
        <p className="text-xs text-muted-foreground">score</p>
        <div className="mt-3 space-y-1 text-xs text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Propostas</span>
            <strong>{consultor.propostasEnviadas}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Visitas</span>
            <strong>{consultor.visitasRealizadas}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vendas</span>
            <strong style={{ color: "#059669" }}>{consultor.vendasRealizadas}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Faturamento</span>
            <strong style={{ color: "#059669" }}>{formatCurrency(consultor.faturamentoTotal)}</strong>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 underline underline-offset-2">Ver detalhe →</p>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RankingConsultores() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("mes");
  const [selected, setSelected] = useState<ConsultorStats | null>(null);
  const isAdm = user?.role === "adm" || user?.role === "admin" || user?.role === "gerente";

  const { data: rankingReal, isLoading } = trpc.consultorRanking.ranking.useQuery(
    { periodo: period },
    { refetchInterval: 60_000 }
  );
  const { data: metasData } = trpc.consultorMetas.get.useQuery();
  const metas: Record<string, string> = metasData ?? {};

  const ranking: ConsultorStats[] = rankingReal ?? [];
  const top3 = ranking.slice(0, 3);

  // Metas calculadas por período (fallback para valores do banco ou padrão)
  const mult = period === "dia" ? 1 : period === "semana" ? 5 : 22;
  const metaPropostas   = Number(metas["propostas_dia"]   ?? 3)  * mult;
  const metaVisitas     = Number(metas["visitas_semana"]  ?? 5)  * (period === "semana" ? 1 : period === "mes" ? 4 : 0);
  const metaVendas      = Number(metas["vendas_mes"]      ?? 8)  * (period === "mes" ? 1 : 0);
  const metaFaturamento = Number(metas["faturamento_mes"] ?? 1200000) * (period === "mes" ? 1 : period === "semana" ? 0.25 : 0.05);

  // Tela de detalhe
  if (selected) {
    return (
      <ConsultorDetail
        consultor={selected}
        metas={metas}
        period={period}
        onClose={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6" style={{ color: "#e21d3c" }} />
            Ranking Consultores Comerciais
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Performance medida em propostas, visitas, vendas e faturamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
          {isAdm && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.href = "/goals"}>
              <Target className="w-4 h-4" /> Configurar Metas
            </Button>
          )}
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 border-b border-border pb-3">
        {PERIOD_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              period === t.key ? "text-white" : "text-muted-foreground hover:bg-muted"
            }`}
            style={period === t.key ? { background: "#0a1e5a" } : {}}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Vazio */}
      {!isLoading && ranking.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum dado de performance ainda.</p>
            <p className="text-xs text-muted-foreground mt-1">Os dados aparecerão conforme os consultores registrarem propostas e visitas.</p>
          </CardContent>
        </Card>
      )}

      {/* Pódio */}
      {!isLoading && top3.length >= 2 && (
        <div className="grid grid-cols-3 gap-4">
          {[top3[1], top3[0], top3[2]].map((c, i) => {
            const pos = i === 0 ? 1 : i === 1 ? 0 : 2;
            if (!c) return <div key={i} />;
            return (
              <PodiumCard
                key={c.userId}
                consultor={c}
                pos={pos}
                onClick={() => setSelected(c)}
              />
            );
          })}
        </div>
      )}

      {/* Tabela completa */}
      {!isLoading && ranking.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: "#e21d3c" }} />
              Classificação Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-semibold w-8">#</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-semibold">Consultor</th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <FileText className="w-3.5 h-3.5" style={{ color: "#0a1e5a" }} />
                        <span>Propostas</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
                        <span>Visitas</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span>Vendas</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <Zap className="w-3.5 h-3.5" style={{ color: "#D97706" }} />
                        <span>Máquinas</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <TrendingUp className="w-3.5 h-3.5" style={{ color: "#0891B2" }} />
                        <span>Volume</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5" style={{ color: "#e21d3c" }} />
                        <span>Faturamento</span>
                      </div>
                    </th>
                    <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((c, i) => (
                    <tr
                      key={c.userId}
                      className={`border-b border-border/50 last:border-0 transition-colors hover:bg-muted/40 cursor-pointer ${i === 0 ? "bg-red-50/40" : ""}`}
                      onClick={() => setSelected(c)}
                    >
                      <td className="py-3 px-3">
                        <span className="text-sm font-bold text-muted-foreground">
                          {i < 3 ? MEDAL[i] : `${i + 1}°`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={c.userPhoto ?? ""} />
                            <AvatarFallback className="text-xs font-bold text-white" style={{ background: "#0a1e5a" }}>
                              {initials(c.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground whitespace-nowrap">{c.userName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold" style={{ color: "#0a1e5a" }}>{c.propostasEnviadas}</p>
                        {metaPropostas > 0 && (
                          <div className="w-10 h-1 bg-muted rounded mt-1 mx-auto overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${Math.min(c.propostasEnviadas / metaPropostas * 100, 100)}%`, background: "#0a1e5a" }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold" style={{ color: "#7C3AED" }}>{c.visitasRealizadas}</p>
                        {metaVisitas > 0 && (
                          <div className="w-10 h-1 bg-muted rounded mt-1 mx-auto overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${Math.min(c.visitasRealizadas / metaVisitas * 100, 100)}%`, background: "#7C3AED" }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-green-700">{c.vendasRealizadas}</p>
                        {metaVendas > 0 && (
                          <div className="w-10 h-1 bg-muted rounded mt-1 mx-auto overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${Math.min(c.vendasRealizadas / metaVendas * 100, 100)}%`, background: "#059669" }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-yellow-700">{c.maquinasVendidas}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-blue-700 text-xs">{formatCurrency(c.volumePropostas)}</p>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-green-700 text-xs">{formatCurrency(c.faturamentoTotal)}</p>
                        {metaFaturamento > 0 && (
                          <div className="w-10 h-1 bg-muted rounded mt-1 mx-auto overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${Math.min(c.faturamentoTotal / metaFaturamento * 100, 100)}%`, background: "#e21d3c" }} />
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge
                          style={{
                            background: c.score >= 80 ? "#e21d3c" : c.score >= 60 ? "#D97706" : "#94A3B8",
                            color: "white",
                          }}
                        >
                          {c.score}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
