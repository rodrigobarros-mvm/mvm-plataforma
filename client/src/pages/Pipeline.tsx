import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell, PieChart, Pie, Legend
} from "recharts";
import {
  TrendingUp, Users, Target, Clock, ChevronRight, ArrowLeft,
  Filter, BarChart3, Loader2
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = {
  "Não Iniciado": "#94a3b8",
  "Em Contato": "#3b82f6",
  "Aguardando Retorno": "#e21d3c",
  "Qualificado": "#22c55e",
  "Desqualificado": "#ef4444",
};

const STAGE_ICONS: Record<string, string> = {
  "Não Iniciado": "⬜",
  "Em Contato": "📞",
  "Aguardando Retorno": "⏳",
  "Qualificado": "✅",
  "Desqualificado": "❌",
};

export default function Pipeline() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedBdr, setSelectedBdr] = useState<string>("all");

  const isAdm = user?.role === "adm" || user?.role === "admin";
  const isGerente = ["gerente", "diretor", "coordenador", "supervisor"].includes(user?.role ?? "");

  if (!isAdm && !isGerente) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8">
            <p className="text-muted-foreground">Acesso restrito a Gerentes e ADM.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bdrIdParam = selectedBdr !== "all" ? parseInt(selectedBdr) : undefined;

  const { data: pipeline, isLoading } = trpc.dashboard.pipeline.useQuery(
    { bdrUserId: bdrIdParam },
    { enabled: !!user }
  );

  const { data: ranking } = trpc.dashboard.ranking.useQuery({});

  // Lista de BDRs do ranking para o filtro
  const bdrList = useMemo(() => {
    if (!ranking) return [];
    return ranking.map((r: any) => ({ id: r.userId, name: r.name ?? `BDR #${r.userId}` }));
  }, [ranking]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const stages = pipeline?.stages ?? [];
  const totalInFunnel = stages.reduce((s: number, st: any) => s + (st.count ?? 0), 0);

  // Dados para o gráfico de funil (excluindo desqualificados do funil principal)
  const funnelStages = stages.filter((s: any) => s.name !== "Desqualificado");
  const maxCount = Math.max(...funnelStages.map((s: any) => s.count ?? 0), 1);

  // Dados para o gráfico de barras por BDR
  const bdrChartData = (pipeline?.byBdr ?? []).map((b: any) => ({
    name: bdrList.find((r: any) => r.id === b.userId)?.name ?? `BDR #${b.userId ?? "?"}`,
    Qualificados: Number(b.qualified ?? 0),
    "Em Progresso": Number(b.inProgress ?? 0),
    Desqualificados: Number(b.disqualified ?? 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Funil de Pipeline
            </h1>
            <p className="text-muted-foreground text-sm">Visão completa do progresso dos leads por estágio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedBdr} onValueChange={setSelectedBdr}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por BDR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os BDRs</SelectItem>
              {bdrList.map((b: any) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm" style={{ background: "#1a3a5c" }}>
          <CardContent className="p-4">
            <p className="text-white/60 text-xs mb-1">Total no Funil</p>
            <p className="text-white text-2xl font-bold">{totalInFunnel.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm" style={{ background: "#1a3a5c" }}>
          <CardContent className="p-4">
            <p className="text-white/60 text-xs mb-1">Taxa de Conversão</p>
            <p className="text-white text-2xl font-bold">{pipeline?.conversionRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm" style={{ background: "#1a3a5c" }}>
          <CardContent className="p-4">
            <p className="text-white/60 text-xs mb-1">Qualificados</p>
            <p className="text-2xl font-bold" style={{ color: "#22c55e" }}>
              {stages.find((s: any) => s.name === "Qualificado")?.count ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm" style={{ background: "#1a3a5c" }}>
          <CardContent className="p-4">
            <p className="text-white/60 text-xs mb-1">Tempo Médio (dias)</p>
            <p className="text-white text-2xl font-bold">{pipeline?.avgDaysToQualify ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Funil visual */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelStages.map((stage: any, idx: number) => {
              const pct = totalInFunnel > 0 ? (stage.count / totalInFunnel) * 100 : 0;
              const dropOff = idx > 0 ? funnelStages[idx - 1]?.count - stage.count : 0;
              const dropOffPct = idx > 0 && funnelStages[idx - 1]?.count > 0
                ? ((dropOff / funnelStages[idx - 1].count) * 100).toFixed(1)
                : null;

              return (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{STAGE_ICONS[stage.name] ?? "•"}</span>
                      <span className="font-medium">{stage.name}</span>
                      {dropOffPct && (
                        <Badge variant="outline" className="text-xs text-red-500 border-red-200">
                          -{dropOffPct}%
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{pct.toFixed(1)}%</span>
                      <span className="font-bold text-foreground">{stage.count.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                      style={{
                        width: `${Math.max(2, (stage.count / maxCount) * 100)}%`,
                        background: STAGE_COLORS[stage.name] ?? "#94a3b8",
                      }}
                    >
                      {stage.count > 0 && (
                        <span className="text-white text-xs font-semibold">{stage.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Desqualificados separado */}
            {stages.find((s: any) => s.name === "Desqualificado") && (
              <div className="pt-2 border-t border-border mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span>❌</span>
                    <span className="font-medium text-red-600">Desqualificados</span>
                  </div>
                  <span className="font-bold text-red-600">
                    {stages.find((s: any) => s.name === "Desqualificado")?.count ?? 0}
                  </span>
                </div>
                <div className="w-full bg-red-50 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 rounded-full bg-red-400 transition-all duration-700"
                    style={{
                      width: `${Math.max(2, ((stages.find((s: any) => s.name === "Desqualificado")?.count ?? 0) / maxCount) * 100)}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico por BDR */}
      {bdrChartData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: "#e21d3c" }} />
              Performance por BDR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bdrChartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                <Bar dataKey="Qualificados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Em Progresso" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Desqualificados" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de BDRs com drill-down */}
      {bdrChartData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Detalhamento por BDR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">BDR</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Em Progresso</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Qualificados</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Desqualificados</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Conv. %</th>
                    <th className="py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {(pipeline?.byBdr ?? []).map((b: any) => {
                    const name = bdrList.find((r: any) => r.id === b.userId)?.name ?? `BDR #${b.userId ?? "?"}`;
                    const total = Number(b.total ?? 0);
                    const qual = Number(b.qualified ?? 0);
                    const conv = total > 0 ? ((qual / total) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={b.userId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{name}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">{total}</td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{Number(b.inProgress ?? 0)}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">{qual}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs">{Number(b.disqualified ?? 0)}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">{conv}%</td>
                        <td className="py-2.5 px-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedBdr(String(b.userId))}
                            className="h-7 text-xs gap-1"
                          >
                            Filtrar <ChevronRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
