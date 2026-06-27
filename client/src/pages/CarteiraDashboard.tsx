import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, DollarSign, FileText, Target, Zap, BarChart3
} from "lucide-react";
import { useLocation } from "wouter";

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function SaudeIndicador({ label, valor, meta, cor, icone: Icone, formato = "num" }: {
  label: string; valor: number; meta: number; cor: string;
  icone: any; formato?: "num" | "money" | "pct";
}) {
  const pct = meta > 0 ? Math.round((valor / meta) * 100) : 0;
  const status = pct >= 80 ? "ok" : pct >= 50 ? "atencao" : "risco";
  const statusColor = { ok: "#059669", atencao: "#D97706", risco: "#e21d3c" }[status];
  const fmt = formato === "money"
    ? `R$ ${(valor / 1000).toFixed(0)}k`
    : formato === "pct" ? `${valor}%` : String(valor);
  const fmtMeta = formato === "money"
    ? `R$ ${(meta / 1000).toFixed(0)}k`
    : formato === "pct" ? `${meta}%` : String(meta);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icone className="w-3.5 h-3.5" style={{ color: cor }} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Meta: {fmtMeta}</span>
          <span className="text-sm font-bold" style={{ color: statusColor }}>{fmt}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: statusColor + "20", color: statusColor }}>
            {pct}%
          </span>
        </div>
      </div>
      <ProgressBar value={valor} max={meta} color={statusColor} />
    </div>
  );
}

export default function CarteiraDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const role = (user as any)?.role ?? "consultor";
  const isGestor = ["adm", "admin", "gerente"].includes(role);
  const [periodoSel, setPeriodoSel] = useState<"dia"|"semana"|"mes">("mes");

  const { data: rankingData } = trpc.consultorRanking.ranking.useQuery({ periodo: periodoSel }, { refetchInterval: 120_000 });
  const { data: propostasStats } = trpc.propostas.stats.useQuery();
  const { data: opps } = trpc.oportunidades.list.useQuery({ limit: 100 });

  const myStats = rankingData?.find(r => r.userId === (user as any)?.id);

  // Pipeline health analysis
  const oппsList = opps?.data ?? [];
  const now = Date.now();
  const DAY = 86400000;
  const paradas = oппsList.filter((o: any) => {
    const dias = Math.floor((now - new Date(o.updatedAt).getTime()) / DAY);
    return dias >= 7 && !["ganho","perdido","cancelado"].includes(o.status);
  });
  const emNegociacao = oппsList.filter((o: any) => o.status === "em_negociacao").length;
  const propostasEnviadas = oппsList.filter((o: any) => o.status === "proposta_enviada").length;
  const ganhos = oппsList.filter((o: any) => o.status === "ganho").length;
  const totalFaturamento = oппsList
    .filter((o: any) => o.status === "ganho")
    .reduce((acc: number, o: any) => acc + Number(o.ticketEstimado || 0), 0);
  const taxaConversao = oппsList.length > 0 ? Math.round(ganhos / oппsList.length * 100) : 0;

  const METAS_MES = { propostas: 40, visitas: 20, vendas: 8, faturamento: 1200000, conversao: 20 };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" style={{ color: "#0a1e5a" }} />
            Saúde da Carteira
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isGestor ? "Visão consolidada da equipe de consultores" : "Sua performance comercial"}
          </p>
        </div>
        <div className="flex gap-2">
          {(["dia","semana","mes"] as const).map(p => (
            <Button key={p} size="sm" variant={periodoSel === p ? "default" : "outline"}
              style={periodoSel === p ? { background: "#0a1e5a" } : {}}
              onClick={() => setPeriodoSel(p)}>
              {p === "dia" ? "Hoje" : p === "semana" ? "Semana" : "Mês"}
            </Button>
          ))}
        </div>
      </div>

      {/* Semaforo cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Em Negociação", value: emNegociacao, color: "#0a1e5a", icon: TrendingUp, action: "/oportunidades" },
          { label: "Propostas Enviadas", value: propostasEnviadas, color: "#7C3AED", icon: FileText, action: "/historico-propostas" },
          { label: "Paradas +7 dias", value: paradas.length, color: paradas.length > 0 ? "#e21d3c" : "#059669", icon: paradas.length > 0 ? AlertTriangle : CheckCircle2, action: "/oportunidades" },
          { label: "Vendas Fechadas", value: ganhos, color: "#059669", icon: CheckCircle2, action: "/oportunidades" },
        ].map(c => (
          <Card key={c.label} className="border-border cursor-pointer hover:shadow-md transition-all"
            onClick={() => setLocation(c.action)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
                <p className="text-xs text-muted-foreground font-medium truncate">{c.label}</p>
              </div>
              <p className="text-2xl font-black" style={{ color: c.color }}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metas vs Realizado */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: "#0a1e5a" }} />
            Metas vs Realizado — {periodoSel === "dia" ? "Hoje" : periodoSel === "semana" ? "Esta semana" : "Este mês"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SaudeIndicador label="Propostas enviadas" valor={myStats?.propostasEnviadas ?? propostasStats?.mesAtual ?? 0} meta={METAS_MES.propostas} cor="#0a1e5a" icone={FileText} />
          <SaudeIndicador label="Visitas realizadas (GPS)" valor={myStats?.visitasRealizadas ?? 0} meta={METAS_MES.visitas} cor="#7C3AED" icone={Target} />
          <SaudeIndicador label="Vendas fechadas" valor={myStats?.vendasRealizadas ?? ganhos} meta={METAS_MES.vendas} cor="#059669" icone={CheckCircle2} />
          <SaudeIndicador label="Faturamento" valor={myStats?.faturamentoTotal ?? totalFaturamento} meta={METAS_MES.faturamento} cor="#D97706" icone={DollarSign} formato="money" />
          <SaudeIndicador label="Taxa de conversão" valor={taxaConversao} meta={METAS_MES.conversao} cor="#0891B2" icone={Zap} formato="pct" />
        </CardContent>
      </Card>

      {/* Faturamento card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border" style={{ background: "linear-gradient(135deg, #0a1e5a, #1c3c8a)", color: "white" }}>
          <CardContent className="p-5">
            <p className="text-sm opacity-70 mb-1">Volume de Propostas</p>
            <p className="text-3xl font-black">
              R$ {((myStats?.volumePropostas ?? propostasStats?.volumeMes ?? 0) / 1000).toFixed(0)}k
            </p>
            <p className="text-xs opacity-60 mt-1">propostas enviadas no período</p>
            <div className="mt-3 h-1 bg-white/20 rounded-full">
              <div className="h-full rounded-full bg-white/60" style={{ width: "65%" }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border" style={{ background: "linear-gradient(135deg, #059669, #047857)", color: "white" }}>
          <CardContent className="p-5">
            <p className="text-sm opacity-70 mb-1">Faturamento Fechado</p>
            <p className="text-3xl font-black">
              R$ {((myStats?.faturamentoTotal ?? totalFaturamento) / 1000).toFixed(0)}k
            </p>
            <p className="text-xs opacity-60 mt-1">vendas concluídas no período</p>
            <div className="mt-3 h-1 bg-white/20 rounded-full">
              <div className="h-full rounded-full bg-white/60" style={{ width: `${taxaConversao * 3}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paradas alert */}
      {paradas.length > 0 && (
        <Card className="border-red-200" style={{ background: "#fff5f5" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {paradas.length} oportunidade{paradas.length > 1 ? "s" : ""} parada{paradas.length > 1 ? "s" : ""} há +7 dias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paradas.slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-red-100 cursor-pointer hover:bg-red-50"
                onClick={() => setLocation(`/oportunidades/${o.id}`)}>
                <div>
                  <p className="text-sm font-semibold">{o.leadNome ?? o.leadRazao ?? `Opp #${o.id}`}</p>
                  <p className="text-xs text-red-600">{o.status?.replace(/_/g, " ")} · {o.modeloInteresse ?? "—"}</p>
                </div>
                <Badge style={{ background: "#e21d3c20", color: "#e21d3c", fontSize: "10px" }}>
                  {Math.floor((now - new Date(o.updatedAt).getTime()) / DAY)}d parada
                </Badge>
              </div>
            ))}
            {paradas.length > 5 && (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setLocation("/oportunidades")}>
                Ver todas as {paradas.length} oportunidades paradas
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team ranking (gestores only) */}
      {isGestor && rankingData && rankingData.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🏆 Ranking da Equipe — {periodoSel === "dia" ? "Hoje" : periodoSel === "semana" ? "Semana" : "Mês"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankingData.slice(0, 5).map((r, i) => (
                <div key={r.userId} className="flex items-center gap-3">
                  <span className="text-sm font-black w-6 text-center" style={{ color: i === 0 ? "#e21d3c" : "#94a3b8" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}°`}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{r.userName}</span>
                      <span className="text-muted-foreground">{r.propostasEnviadas} prop · {r.visitasRealizadas} vis</span>
                    </div>
                    <ProgressBar value={r.score} max={100} color={i === 0 ? "#e21d3c" : "#0a1e5a"} />
                  </div>
                  <span className="text-sm font-black w-10 text-right" style={{ color: i === 0 ? "#e21d3c" : "#0a1e5a" }}>
                    {r.score}
                  </span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setLocation("/ranking-consultores")}>
              Ver ranking completo →
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
