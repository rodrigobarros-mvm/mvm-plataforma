import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Zap, CheckCircle2, Loader2, TrendingUp, Award, BarChart3 } from "lucide-react";
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#e21d3c20" }}>
                  <Zap className="w-5 h-5" style={{ color: "#e21d3c" }} />
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
            <Target className="w-4 h-4" style={{ color: "#e21d3c" }} />
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


      {/* ── Metas por Segmento ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" style={{ color: "#0a1e5a" }} />
            Metas por Segmento LS Tractor
          </CardTitle>
          <CardDescription>
            Focos de prospecção por categoria de produto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { seg: "Cafeicultura ☕", modelos: "MT7.80F, MT7.90F", meta: 3, color: "#6F4E37", desc: "Único trator fruteiro com cabine abaixo de 95cv" },
              { seg: "Cana-de-Açúcar 🌾", modelos: "H145, H125, Plus 100", meta: 2, color: "#22c55e", desc: "Maior potência e menor custo de manutenção" },
              { seg: "Fruticultura / Citricultura 🍊", modelos: "MT7.80F, MT4", meta: 2, color: "#f97316", desc: "Rodagem específica e cabine climatizada" },
              { seg: "Pecuária / Grãos 🐄", modelos: "MT4, G40, H125", meta: 2, color: "#3b82f6", desc: "Baixo consumo e versatilidade de implementos" },
              { seg: "Serviços Agrícolas 🚜", modelos: "MT2.27, G40, MT4", meta: 1, color: "#8b5cf6", desc: "Linha compacta ideal para prestadores" },
            ].map((item) => (
              <div key={item.seg} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <p className="text-sm font-semibold">{item.seg}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: item.color + "20", color: item.color }}>
                      Meta: {item.meta} qualif./sem.
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    🚜 {item.modelos}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Dicas de Prospecção ── */}
      <Card className="border-border" style={{ background: "linear-gradient(135deg, #0a1e5a08, #e21d3c05)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Melhores Práticas — LS Tractor Gallotti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: "📞", title: "Horário ideal de ligação", desc: "Seg-Sex das 07h às 09h e das 16h às 18h para produtores rurais" },
              { icon: "💬", title: "WhatsApp antes de ligar", desc: "Envie a mensagem de apresentação e ligue 2-3 minutos depois" },
              { icon: "🎯", title: "Foco em Alta Prioridade", desc: "Priorize os 5.876 leads marcados como Alta antes de trabalhar os demais" },
              { icon: "🔄", title: "Cadência de 5 toques", desc: "Nunca desqualifique antes de 3 tentativas em dias diferentes" },
              { icon: "📋", title: "Script adaptado", desc: "Use o template específico do segmento — converte 40% mais que genérico" },
              { icon: "💳", title: "Sempre mencione FINAME", desc: "Aprovação FINAME e BNDES é o principal diferencial de fechamento" },
            ].map((tip) => (
              <div key={tip.title} className="flex gap-3 p-3 rounded-lg bg-card border border-border">
                <span className="text-xl shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{tip.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
