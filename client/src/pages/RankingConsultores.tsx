import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Trophy, Medal, Award, TrendingUp, FileText, MapPin,
  Target, DollarSign, Zap, CheckCircle2, Phone, Star,
  Calendar, Clock, BarChart3, Users, Download
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIOD_TABS = [
  { key: "dia",  label: "Hoje",       icon: Clock },
  { key: "semana", label: "Esta Semana", icon: Calendar },
  { key: "mes",  label: "Este Mês",   icon: BarChart3 },
] as const;

type Period = "dia" | "semana" | "mes";

type ConsultorStats = {
  userId: number;
  userName: string | null;
  userPhoto: string | null;
  propostasEnviadas: number;
  visitasRealizadas: number;
  vendasRealizadas: number;
  maquinasVendidas: number;
  volumePropostas: number;
  faturamentoTotal: number;
  score: number; // score ponderado para ranking
};

// Mock data — será substituído por dados reais do backend
function mockData(period: Period): ConsultorStats[] {
  const base = period === "dia" ? 1 : period === "semana" ? 5 : 22;
  return [
    { userId: 1, userName: "Carlos Menezes", userPhoto: null, propostasEnviadas: 3*base, visitasRealizadas: Math.floor(1.2*base), vendasRealizadas: Math.floor(0.4*base), maquinasVendidas: Math.floor(0.6*base), volumePropostas: 280000*base, faturamentoTotal: 95000*base, score: 94 },
    { userId: 2, userName: "Fernanda Lima", userPhoto: null, propostasEnviadas: 2*base, visitasRealizadas: Math.floor(0.9*base), vendasRealizadas: Math.floor(0.35*base), maquinasVendidas: Math.floor(0.5*base), volumePropostas: 210000*base, faturamentoTotal: 78000*base, score: 81 },
    { userId: 3, userName: "Roberto Vasconcelos", userPhoto: null, propostasEnviadas: 2*base, visitasRealizadas: Math.floor(0.7*base), vendasRealizadas: Math.floor(0.2*base), maquinasVendidas: Math.floor(0.3*base), volumePropostas: 175000*base, faturamentoTotal: 52000*base, score: 67 },
    { userId: 4, userName: "Ana Paula Rocha", userPhoto: null, propostasEnviadas: Math.floor(1.5*base), visitasRealizadas: Math.floor(0.5*base), vendasRealizadas: Math.floor(0.15*base), maquinasVendidas: Math.floor(0.2*base), volumePropostas: 120000*base, faturamentoTotal: 38000*base, score: 52 },
  ];
}

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `R$ ${(v/1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v/1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function PodiumCard({ consultor, pos }: { consultor: ConsultorStats; pos: number }) {
  const configs = [
    { medal: "🥇", color: "#e21d3c", ring: true, size: "w-16 h-16", fontSize: "text-3xl" },
    { medal: "🥈", color: "#64748b", ring: false, size: "w-12 h-12", fontSize: "text-2xl" },
    { medal: "🥉", color: "#92400e", ring: false, size: "w-12 h-12", fontSize: "text-2xl" },
  ];
  const cfg = configs[pos];
  if (!cfg) return null;
  const initials = consultor.userName?.split(" ").map(w => w[0]).join("").slice(0, 2) ?? "?";
  return (
    <Card className={`border-border text-center ${cfg.ring ? "ring-2 ring-red-600 shadow-lg" : ""}`}>
      <CardContent className="p-4 pt-5">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <Avatar className={`${cfg.size} border-4`} style={{ borderColor: cfg.color }}>
              <AvatarImage src={consultor.userPhoto ?? ""} />
              <AvatarFallback className="text-white font-bold" style={{ background: "#0a1e5a" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl">{cfg.medal}</span>
          </div>
        </div>
        <p className="font-bold text-sm text-foreground truncate">{consultor.userName}</p>
        <p className={`${cfg.fontSize} font-black mt-1`} style={{ color: cfg.color }}>
          {consultor.score}
        </p>
        <p className="text-xs text-muted-foreground">score</p>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Propostas</span><strong>{consultor.propostasEnviadas}</strong></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Visitas</span><strong>{consultor.visitasRealizadas}</strong></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vendas</span><strong style={{ color: "#059669" }}>{consultor.vendasRealizadas}</strong></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Faturamento</span><strong style={{ color: "#059669" }}>{formatCurrency(consultor.faturamentoTotal)}</strong></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RankingConsultores() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("mes");
  const isAdm = user?.role === "adm" || user?.role === "gerente";

  // Real data from backend
  const { data: rankingReal, isLoading } = trpc.consultorRanking.ranking.useQuery(
    { periodo: period },
    { refetchInterval: 60_000 }
  );
  const ranking = rankingReal?.length ? rankingReal : mockData(period);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  // Metas do período (valores padrão — gestor configura em Metas & KPIs)
  const metas = {
    dia:    { propostas: 3,  visitas: 0,  vendas: 0,  faturamento: 80000 },
    semana: { propostas: 12, visitas: 5,  vendas: 2,  faturamento: 350000 },
    mes:    { propostas: 40, visitas: 20, vendas: 8,  faturamento: 1200000 },
  };
  const meta = metas[period];

  const METRICS = [
    { key: "propostasEnviadas",  label: "Propostas Enviadas",     icon: FileText,    color: "#0a1e5a", meta: meta.propostas,   unit: "" },
    { key: "visitasRealizadas",  label: "Visitas Realizadas",     icon: MapPin,      color: "#7C3AED", meta: meta.visitas,    unit: "" },
    { key: "vendasRealizadas",   label: "Vendas Fechadas",        icon: CheckCircle2, color: "#059669", meta: meta.vendas,     unit: "" },
    { key: "maquinasVendidas",   label: "Máquinas Vendidas",      icon: Zap,         color: "#D97706", meta: 0,               unit: "un" },
    { key: "volumePropostas",    label: "Volume de Propostas",    icon: TrendingUp,  color: "#0891B2", meta: 0,               unit: "R$" },
    { key: "faturamentoTotal",   label: "Faturamento",            icon: DollarSign,  color: "#e21d3c", meta: meta.faturamento, unit: "R$" },
  ] as const;

  const periodLabel = period === "dia" ? "hoje" : period === "semana" ? "esta semana" : "este mês";

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
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Download className="w-4 h-4" /> Exportar PDF
        </Button>
        {isAdm && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.href = "/goals"}>
            <Target className="w-4 h-4" /> Configurar Metas
          </Button>
        )}
      </div>

      {/* Period selector */}
      <div className="flex gap-2 border-b border-border pb-3">
        {PERIOD_TABS.map(t => (
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

      {/* Podium */}
      {top3.length >= 2 && (
        <div className="grid grid-cols-3 gap-4">
          {[top3[1], top3[0], top3[2]].filter(Boolean).map((c, i) => {
            const pos = i === 0 ? 1 : i === 1 ? 0 : 2;
            return c ? <PodiumCard key={c.userId} consultor={c} pos={pos} /> : <div key={i} />;
          })}
        </div>
      )}

      {/* Full ranking table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Classificação Completa — {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-semibold w-8">#</th>
                  <th className="text-left py-2 px-3 text-xs text-muted-foreground font-semibold">Consultor</th>
                  {METRICS.map(m => (
                    <th key={m.key} className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">
                      <div className="flex flex-col items-center gap-0.5">
                        <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                        <span className="whitespace-nowrap">{m.label.split(" ")[0]}</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 text-xs text-muted-foreground font-semibold">Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((c, i) => {
                  const initials = c.userName?.split(" ").map(w => w[0]).join("").slice(0, 2) ?? "?";
                  const isTop = i === 0;
                  return (
                    <tr
                      key={c.userId}
                      className={`border-b border-border/50 last:border-0 transition-colors hover:bg-muted/40 ${isTop ? "bg-red-50/40" : ""}`}
                    >
                      <td className="py-3 px-3">
                        <span className="text-sm font-bold text-muted-foreground">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}°`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={c.userPhoto ?? ""} />
                            <AvatarFallback className="text-xs font-bold text-white" style={{ background: "#0a1e5a" }}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground whitespace-nowrap">{c.userName}</span>
                        </div>
                      </td>
                      {/* Propostas */}
                      <td className="py-3 px-2 text-center">
                        <div>
                          <p className="font-bold" style={{ color: "#0a1e5a" }}>{c.propostasEnviadas}</p>
                          {meta.propostas > 0 && (
                            <div className="w-full h-1 bg-muted rounded mt-1 mx-auto" style={{ maxWidth: 40 }}>
                              <div className="h-full rounded" style={{ width: `${Math.min(c.propostasEnviadas/meta.propostas*100, 100)}%`, background: "#0a1e5a" }} />
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Visitas */}
                      <td className="py-3 px-2 text-center">
                        <div>
                          <p className="font-bold" style={{ color: "#7C3AED" }}>{c.visitasRealizadas}</p>
                          {meta.visitas > 0 && (
                            <div className="w-full h-1 bg-muted rounded mt-1 mx-auto" style={{ maxWidth: 40 }}>
                              <div className="h-full rounded" style={{ width: `${Math.min(c.visitasRealizadas/meta.visitas*100, 100)}%`, background: "#7C3AED" }} />
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Vendas */}
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-green-700">{c.vendasRealizadas}</p>
                      </td>
                      {/* Máquinas */}
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-yellow-700">{c.maquinasVendidas}</p>
                      </td>
                      {/* Volume propostas */}
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-blue-700 text-xs">{formatCurrency(c.volumePropostas)}</p>
                      </td>
                      {/* Faturamento */}
                      <td className="py-3 px-2 text-center">
                        <p className="font-bold text-green-700 text-xs">{formatCurrency(c.faturamentoTotal)}</p>
                      </td>
                      {/* Score */}
                      <td className="py-3 px-2 text-center">
                        <Badge style={{
                          background: c.score >= 80 ? "#e21d3c" : c.score >= 60 ? "#D97706" : "#94A3B8",
                          color: "white",
                        }}>
                          {c.score}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Score legend */}
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Como o Score é calculado</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Propostas Enviadas", peso: "30%", color: "#0a1e5a" },
              { label: "Visitas Realizadas", peso: "20%", color: "#7C3AED" },
              { label: "Vendas Fechadas",    peso: "25%", color: "#059669" },
              { label: "Máquinas Vendidas",  peso: "10%", color: "#D97706" },
              { label: "Volume de Propostas", peso: "5%", color: "#0891B2" },
              { label: "Faturamento Total",  peso: "10%", color: "#e21d3c" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs font-bold ml-auto" style={{ color: s.color }}>{s.peso}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
