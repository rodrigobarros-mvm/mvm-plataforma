import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Phone, Target, TrendingUp, Users, Zap } from "lucide-react";

type BdrStatus = {
  id: number;
  name: string | null;
  email: string | null;
  todayAttempts: number;
  attemptsGoal: number;
  todayQualified: number;
  leadsGoal: number;
  attemptsPercent: number;
  leadsPercent: number;
  isAtRisk: boolean;
};

function Semaforo({ pct }: { pct: number }) {
  const color = pct >= 75 ? "#059669" : pct >= 40 ? "#D97706" : "#e21d3c";
  const label = pct >= 75 ? "No ritmo" : pct >= 40 ? "Atenção" : "Risco";
  const Icon = pct >= 75 ? CheckCircle2 : pct >= 40 ? Clock : AlertTriangle;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: color }} />
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

export default function GestorPanel() {
  const { data: bdrsAtRisk, isLoading: loadingRisk } = trpc.dashboard.bdrsAtRisk.useQuery(
    undefined, { refetchInterval: 60_000 }
  );
  const { data: ranking } = trpc.dashboard.ranking.useQuery({}, { refetchInterval: 60_000 });
  const { data: stagnant } = trpc.dashboard.stagnantLeads.useQuery(
    { daysThreshold: 3, limit: 6 }, { refetchInterval: 120_000 }
  );
  const { data: releaseStats } = trpc.leads.releaseStats.useQuery(undefined, { refetchInterval: 120_000 });

  return (
    <div className="space-y-4">

      {/* ── Visão Geral Rápida ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4" style={{ color: "#0a1e5a" }} />
              <span className="text-xs text-muted-foreground font-medium">BDRs em risco</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: (bdrsAtRisk?.length ?? 0) > 0 ? "#e21d3c" : "#059669" }}>
              {loadingRisk ? "…" : bdrsAtRisk?.length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-muted-foreground font-medium">Leads estagnados</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stagnant?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4" style={{ color: "#059669" }} />
              <span className="text-xs text-muted-foreground font-medium">Top BDR hoje</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {ranking?.[0]?.userName?.split(" ")[0] ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{ranking?.[0]?.qualifiedCount ?? 0} qualificados</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4" style={{ color: "#0a1e5a" }} />
              <span className="text-xs text-muted-foreground font-medium">Leads liberados</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#0a1e5a" }}>
              {(releaseStats as any)?.totalReleased ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── BDRs em Risco + Estagnados ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* BDRs Semáforo */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
              </div>
              Status da Equipe — Hoje
            </CardTitle>
            <CardDescription>Atualiza a cada 60 segundos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRisk ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : !bdrsAtRisk || bdrsAtRisk.length === 0 ? (
              <div className="flex items-center gap-3 py-4 text-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Equipe no ritmo!</p>
                  <p className="text-xs text-muted-foreground">Todos os BDRs acima de 50% da meta</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {(bdrsAtRisk as BdrStatus[]).map((bdr) => (
                  <div key={bdr.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs font-bold" style={{ background: "#0a1e5a", color: "white" }}>
                            {bdr.name?.[0] ?? "B"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold">{bdr.name}</span>
                      </div>
                      <Semaforo pct={Math.min(bdr.attemptsPercent, bdr.leadsPercent)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Tentativas
                          </span>
                          <span className="font-semibold">{bdr.todayAttempts}/{bdr.attemptsGoal}</span>
                        </div>
                        <Progress value={bdr.attemptsPercent} className="h-1.5" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Target className="w-3 h-3" /> Qualif.
                          </span>
                          <span className="font-semibold">{bdr.todayQualified}/{bdr.leadsGoal}</span>
                        </div>
                        <Progress value={bdr.leadsPercent} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Estagnados */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Leads Parados (+3 dias)
            </CardTitle>
            <CardDescription>Requerem ação imediata</CardDescription>
          </CardHeader>
          <CardContent>
            {!stagnant || stagnant.length === 0 ? (
              <div className="flex items-center gap-3 py-4 text-center justify-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-700">Nenhum lead parado!</p>
                  <p className="text-xs text-muted-foreground">Todos os leads com interação recente</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {stagnant.map((lead: any) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {lead.nomeFantasia || lead.razaoSocial || "Lead sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.cidade}{lead.uf ? `, ${lead.uf}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {lead.statusContato || "Sem status"}
                        </Badge>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Ranking hoje ── */}
      {ranking && ranking.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">🏆 Ranking de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(ranking ?? []).slice(0, 5).map((r, i) => (
                <div key={r.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-sm font-bold w-6 text-center"
                    style={{ color: i === 0 ? "#e21d3c" : i === 1 ? "#94a3b8" : i === 2 ? "#c8102e" : "#64748b" }}>
                    {i + 1}°
                  </span>
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={r.userPhoto ?? ""} />
                    <AvatarFallback className="text-xs font-bold" style={{ background: "#0a1e5a", color: "white" }}>
                      {r.userName?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1 truncate">{r.userName}</span>
                  <Badge style={{ background: i === 0 ? "#e21d3c" : "var(--muted)", color: i === 0 ? "white" : "var(--muted-foreground)" }}>
                    {r.qualifiedCount} leads
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
