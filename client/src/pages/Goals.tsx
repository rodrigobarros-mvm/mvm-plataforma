import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Goals() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isAdmOrGerente = role === "adm" || role === "admin" || role === "gerente";
  const utils = trpc.useUtils();

  const { data: kpi, isLoading } = trpc.kpi.get.useQuery();
  const { data: bdrStats } = trpc.dashboard.bdrStats.useQuery();

  const [dailyAttempts, setDailyAttempts] = useState("");
  const [dailyLeads, setDailyLeads] = useState("");

  const updateKpi = trpc.kpi.update.useMutation({
    onSuccess: () => {
      toast.success("Metas atualizadas com sucesso!");
      utils.kpi.get.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const attemptsGoal = kpi?.dailyContactAttempts ?? 80;
  const leadsGoal = kpi?.dailyQualifiedLeads ?? 5;
  const todayAttempts = bdrStats?.todayAttempts ?? 0;
  const totalQualified = bdrStats?.totalQualified ?? 0;

  const attemptsProgress = Math.min((todayAttempts / attemptsGoal) * 100, 100);
  const leadsProgress = Math.min((totalQualified / leadsGoal) * 100, 100);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Metas & KPIs
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmOrGerente ? "Defina e acompanhe as metas da equipe" : "Acompanhe seu progresso diário"}
        </p>
      </div>

      {/* Current Progress (BDR view) */}
      {!isAdmOrGerente && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#e8621a20" }}>
                  <Zap className="w-5 h-5" style={{ color: "#e8621a" }} />
                </div>
                <div>
                  <p className="font-semibold">Tentativas de Contato</p>
                  <p className="text-sm text-muted-foreground">Meta: {attemptsGoal}/dia</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Hoje: {todayAttempts}</span>
                  <span className="font-semibold">{Math.round(attemptsProgress)}%</span>
                </div>
                <Progress value={attemptsProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Leads Qualificados</p>
                  <p className="text-sm text-muted-foreground">Meta: {leadsGoal}/dia</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total: {totalQualified}</span>
                  <span className="font-semibold">{Math.round(leadsProgress)}%</span>
                </div>
                <Progress value={leadsProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Config */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" style={{ color: "#e8621a" }} />
            Configuração de Metas
          </CardTitle>
          <CardDescription>
            {isAdmOrGerente ? "Defina as metas diárias para a equipe de BDRs" : "Metas definidas pelo gestor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Tentativas de contato/dia</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {kpi?.dailyContactAttempts ?? 80}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Leads qualificados/dia</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {kpi?.dailyQualifiedLeads ?? 5}
                  </p>
                </div>
              </div>

              {isAdmOrGerente && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-semibold mb-3">Atualizar Metas</p>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Tentativas/dia</Label>
                      <Input
                        type="number"
                        placeholder={String(kpi?.dailyContactAttempts ?? 80)}
                        value={dailyAttempts}
                        onChange={(e) => setDailyAttempts(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Leads qualificados/dia</Label>
                      <Input
                        type="number"
                        placeholder={String(kpi?.dailyQualifiedLeads ?? 5)}
                        value={dailyLeads}
                        onChange={(e) => setDailyLeads(e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <Button
                      onClick={() => updateKpi.mutate({
                        dailyContactAttempts: parseInt(dailyAttempts) || (kpi?.dailyContactAttempts ?? 80),
                        dailyQualifiedLeads: parseInt(dailyLeads) || (kpi?.dailyQualifiedLeads ?? 5),
                      })}
                      disabled={updateKpi.isPending}
                      style={{ background: "oklch(0.22 0.08 240)" }}
                    >
                      {updateKpi.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Metas"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
