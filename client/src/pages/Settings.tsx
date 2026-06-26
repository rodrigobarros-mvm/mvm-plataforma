import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Database, Download, Loader2, Settings as SettingsIcon, Shield, Upload, ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function Settings() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "user";
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const isAdm = role === "adm" || role === "admin";
  const isGerente = role === "gerente";
  const canAccess = isAdm || isGerente;

  if (!canAccess) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  const { data: kpi } = trpc.kpi.get.useQuery();
  const { data: commConfig } = trpc.commissions.getConfig.useQuery();

  const [dailyAttempts, setDailyAttempts] = useState("");
  const [dailyLeads, setDailyLeads] = useState("");
  const [valuePerLead, setValuePerLead] = useState("");
  const [pct, setPct] = useState("");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWhatsApp, setNotifWhatsApp] = useState(true);
  const { permission, isSubscribed, isLoading: pushLoading, subscribe, unsubscribe } = usePushNotifications();

  const updateKpi = trpc.kpi.update.useMutation({
    onSuccess: () => { toast.success("Metas atualizadas!"); utils.kpi.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const updateComm = trpc.commissions.updateConfig.useMutation({
    onSuccess: () => { toast.success("Comissões atualizadas!"); utils.commissions.getConfig.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações gerais da plataforma</p>
      </div>

      {/* KPI Settings */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" style={{ color: "#e8621a" }} />
            Metas e KPIs
          </CardTitle>
          <CardDescription>Configure as metas diárias da equipe de BDRs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">Tentativas/dia atual</p>
              <p className="text-2xl font-bold">{kpi?.dailyContactAttempts ?? 80}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads qualificados/dia atual</p>
              <p className="text-2xl font-bold">{kpi?.dailyQualifiedLeads ?? 5}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Tentativas de contato/dia</Label>
              <Input
                type="number"
                placeholder={String(kpi?.dailyContactAttempts ?? 80)}
                value={dailyAttempts}
                onChange={(e) => setDailyAttempts(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="space-y-2">
              <Label>Leads qualificados/dia</Label>
              <Input
                type="number"
                placeholder={String(kpi?.dailyQualifiedLeads ?? 5)}
                value={dailyLeads}
                onChange={(e) => setDailyLeads(e.target.value)}
                className="w-36"
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
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configuração de Comissões</CardTitle>
          <CardDescription>Defina o valor pago por lead qualificado</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
            <div>
              <p className="text-xs text-muted-foreground">Valor por lead atual</p>
              <p className="text-2xl font-bold">
                {commConfig
                  ? parseFloat(commConfig.valuePerQualifiedLead).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">% do ticket atual</p>
              <p className="text-2xl font-bold">{commConfig?.percentageOfTicket ?? "—"}%</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Valor fixo por lead (R$)</Label>
              <Input
                type="number"
                placeholder={commConfig?.valuePerQualifiedLead ?? "0.00"}
                value={valuePerLead}
                onChange={(e) => setValuePerLead(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>% do ticket (opcional)</Label>
              <Input
                type="number"
                placeholder={commConfig?.percentageOfTicket ?? "0"}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              onClick={() => updateComm.mutate({ valuePerQualifiedLead: valuePerLead || "0", percentageOfTicket: pct || undefined })}
              disabled={updateComm.isPending}
              style={{ background: "oklch(0.22 0.08 240)" }}
            >
              {updateComm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Comissões"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campos de Qualificação — Somente ADM */}
      {isAdm && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4" style={{ color: "#e8621a" }} />
              Campos de Qualificação
            </CardTitle>
            <CardDescription>
              Configure os campos obrigatórios e opcionais exibidos no formulário de qualificação de leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg bg-muted/30">
              <div>
                <p className="font-medium text-sm">Formulário de Qualificação</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adicione, edite, reordene ou desative campos que os BDRs preenchem ao qualificar um lead.
                </p>
              </div>
              <Button
                size="sm"
                className="text-white shrink-0"
                style={{ background: "oklch(0.55 0.18 30)" }}
                onClick={() => setLocation("/settings/qualification-fields")}
              >
                <ListChecks className="w-4 h-4 mr-2" />
                Gerenciar Campos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import / Export — Somente ADM */}
      {isAdm && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: "#e8621a" }} />
              Importação e Exportação de Dados
            </CardTitle>
            <CardDescription>
              Acesso exclusivo do Administrador. Gerentes e BDRs <strong>não têm acesso</strong> a estas funções.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <p className="font-medium text-sm">Liberar Leads para o Time</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione quais leads do banco de dados serão visíveis para Gerentes e BDRs.
                  Use filtros por estado, cidade, segmento e prioridade.
                </p>
                <Button
                  size="sm"
                  className="w-full text-white"
                  style={{ background: "oklch(0.22 0.08 240)" }}
                  onClick={() => setLocation("/leads/release")}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Gerenciar Liberação de Leads
                </Button>
              </div>
              <div className="p-4 rounded-lg border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-green-600" />
                  <p className="font-medium text-sm">Exportar Relatórios</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exporte relatórios completos em PDF ou Excel com todos os dados de leads, KPIs e performance dos BDRs.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setLocation("/reports")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Ir para Relatórios
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notificações</CardTitle>
          <CardDescription>Configure os canais de envio de alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notificações por E-mail</p>
              <p className="text-xs text-muted-foreground">Enviar alertas para o e-mail corporativo</p>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notificações por WhatsApp</p>
              <p className="text-xs text-muted-foreground">Enviar alertas via WhatsApp Business</p>
            </div>
            <Switch checked={notifWhatsApp} onCheckedChange={setNotifWhatsApp} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Notificações na Plataforma</p>
              <p className="text-xs text-muted-foreground">Alertas internos sempre ativos</p>
            </div>
            <Switch checked={true} disabled />
          </div>
          <Separator />
          {/* Web Push */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2">
                {isSubscribed ? <Bell className="w-4 h-4 text-orange-500" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                <p className="font-medium text-sm">Notificações Push (Mobile)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {permission === "unsupported"
                  ? "Seu navegador não suporta notificações push"
                  : permission === "denied"
                  ? "Notificações bloqueadas — habilite nas configurações do navegador"
                  : isSubscribed
                  ? "Você receberá alertas ao receber novos leads atribuídos"
                  : "Ative para receber alertas mesmo com o app fechado"}
              </p>
            </div>
            <Button
              size="sm"
              variant={isSubscribed ? "outline" : "default"}
              disabled={pushLoading || permission === "unsupported" || permission === "denied"}
              onClick={async () => {
                if (isSubscribed) {
                  await unsubscribe();
                  toast.success("Notificações push desativadas.");
                } else {
                  await subscribe();
                  if (Notification.permission === "granted") {
                    toast.success("Notificações push ativadas!");
                  }
                }
              }}
              style={!isSubscribed && permission !== "denied" && permission !== "unsupported" ? { background: "oklch(0.63 0.18 40)", color: "white" } : {}}
            >
              {pushLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isSubscribed ? "Desativar" : "Ativar"}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Preferências de notificação salvas!")}
          >
            Salvar Preferências
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
