import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import QualificationCelebration from "@/components/QualificationCelebration";
import WhatsAppShareModal from "@/components/WhatsAppShareModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowLeft, Bell, Building2, CalendarClock, CheckCircle2, Clock, Copy,
  ExternalLink, Loader2, MapPin, MessageSquare, Pencil, Phone, Plus, Save, Send, Trash2, User, XCircle
} from "lucide-react";

const REQUIRED_FIELDS = ["nomeDecissor", "conheceMarca", "frotaAtual", "urgenciaCompra", "statusContato", "whatsapp1", "email"] as const;
const FIELD_LABELS: Record<string, string> = {
  nomeDecissor: "Nome do Decisor",
  conheceMarca: "Conhece a Marca?",
  frotaAtual: "Frota Atual",
  urgenciaCompra: "Urgência de Compra",
  statusContato: "Status do Contato",
  whatsapp1: "WhatsApp / Cel 1",
  email: "E-mail de Contato",
};

type ScriptTab = "abertura" | "parceria" | "tecnico";

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const utils = trpc.useUtils();

  const leadId = parseInt(params.id ?? "0");
  const { data: lead, isLoading } = trpc.leads.getById.useQuery({ id: leadId });
  const { data: interactions } = trpc.leads.getInteractions.useQuery({ leadId });

  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showQualifyDialog, setShowQualifyDialog] = useState(false);
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ commission?: number; isGoalReached?: boolean }>({});
  const [showWhatsAppShare, setShowWhatsAppShare] = useState(false);
  const [interactionContent, setInteractionContent] = useState("");
  const [interactionType, setInteractionType] = useState<"contato" | "observacao" | "tentativa">("contato");

  // Scripts tab
  const [activeScript, setActiveScript] = useState<ScriptTab>("abertura");

  // WhatsApp dialog state
  const [showWaDialog, setShowWaDialog] = useState(false);
  const [waTarget, setWaTarget] = useState<"wa1" | "wa2">("wa1");
  const [waMessage, setWaMessage] = useState("");

  // Follow-up state
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("09:00");
  const [followUpNote, setFollowUpNote] = useState("");

  const { data: followUps, refetch: refetchFollowUps } = trpc.followUp.listByLead.useQuery({ leadId });
  const { data: assignmentHistory } = trpc.leads.assignmentHistory.useQuery(
    { leadId },
    { enabled: role === "adm" || role === "admin" || role === "gerente" }
  );
  const createFollowUp = trpc.followUp.create.useMutation({
    onSuccess: () => {
      toast.success("Follow-up agendado!");
      refetchFollowUps();
      setShowFollowUpDialog(false);
      setFollowUpDate("");
      setFollowUpTime("09:00");
      setFollowUpNote("");
    },
    onError: (e) => toast.error(e.message),
  });
  const doneFollowUp = trpc.followUp.done.useMutation({
    onSuccess: () => { toast.success("Follow-up concluído!"); refetchFollowUps(); },
  });
  const cancelFollowUp = trpc.followUp.cancel.useMutation({
    onSuccess: () => { toast.success("Follow-up cancelado."); refetchFollowUps(); },
  });

  const handleCreateFollowUp = () => {
    if (!followUpDate) return toast.error("Selecione a data do follow-up");
    const dt = new Date(`${followUpDate}T${followUpTime}:00`);
    createFollowUp.mutate({ leadId, scheduledAt: dt, note: followUpNote || undefined });
  };

  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Lead atualizado!");
      utils.leads.getById.invalidate({ id: leadId });
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: commConfig } = trpc.commissions.getConfig.useQuery();
  const { data: bdrStats } = trpc.dashboard.bdrStats.useQuery(undefined, { enabled: role === "bdr" });
  const qualifyLead = trpc.leads.qualify.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: leadId });
      utils.dashboard.bdrStats.invalidate();
      setShowQualifyDialog(false);
      const commValue = parseFloat(commConfig?.valuePerQualifiedLead ?? "0");
      const todayAfter = (bdrStats?.todayQualified ?? 0) + 1;
      const goalReached = todayAfter >= (bdrStats?.dailyGoal ?? 5);
      setCelebrationData({ commission: commValue, isGoalReached: goalReached });
      setShowCelebration(true);
    },
    onError: (e) => toast.error(e.message),
  });

  const disqualifyLead = trpc.leads.disqualify.useMutation({
    onSuccess: () => {
      toast.success("Lead desqualificado.");
      utils.leads.getById.invalidate({ id: leadId });
      setShowDisqualifyDialog(false);
      setDisqualifyReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const unassignLead = trpc.leads.unassignLead.useMutation({
    onSuccess: () => {
      toast.success("Lead desatribuído do BDR.");
      utils.leads.getById.invalidate({ id: leadId });
      utils.leads.list.invalidate();
      utils.leads.assignmentHistory.invalidate({ leadId });
    },
    onError: (e) => toast.error(e.message),
  });

  const addInteraction = trpc.leads.addInteraction.useMutation({
    onSuccess: () => {
      toast.success("Interação registrada!");
      utils.leads.getInteractions.invalidate({ leadId });
      setInteractionContent("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = async () => {
    await updateLead.mutateAsync({ id: leadId, data: editForm as any });
  };

  const handleAddInteraction = async () => {
    if (!interactionContent.trim()) return;
    await addInteraction.mutateAsync({ leadId, type: interactionType, content: interactionContent });
  };

  // Build default WhatsApp message from scriptAbertura or fallback
  const buildDefaultMessage = (l: typeof lead) => {
    if (!l) return "";
    if (l.scriptAbertura) return l.scriptAbertura;
    const empresa = l.nomeFantasia || l.razaoSocial || "sua empresa";
    const decisor = l.nomeDecissor ? `, ${l.nomeDecissor}` : "";
    return `Olá${decisor}! Tudo bem?\n\nSou da Gallotti Tractor | LS Tractor — revendedores autorizados ENSIGN. Vi que a ${empresa} pode se beneficiar das nossas soluções em máquinas pesadas.\n\nPosso te apresentar nossas opções? Leva só 5 minutos! 😊`;
  };

  const openWaDialog = (target: "wa1" | "wa2") => {
    setWaTarget(target);
    setWaMessage(buildDefaultMessage(lead));
    setShowWaDialog(true);
  };

  const sendWhatsApp = () => {
    const rawUrl = waTarget === "wa1" ? lead?.whatsapp1 : lead?.whatsapp2;
    if (!rawUrl) return;
    // Build proper wa.me URL from phone number
    const digits = rawUrl.replace(/\D/g, "");
    const phone = digits.startsWith("55") ? digits : `55${digits}`;
    const finalUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(finalUrl, "_blank", "noopener,noreferrer");
    setShowWaDialog(false);
  };

  const copyScript = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Script copiado!"));
  };

  const missingFields = lead
    ? REQUIRED_FIELDS.filter(f => !lead[f as keyof typeof lead])
    : [];

  const canEdit = role === "bdr" || role === "adm" || role === "admin" || role === "gerente";
  const canQualify = role === "bdr" || role === "adm" || role === "admin";
  const canManage = role === "adm" || role === "admin" || role === "gerente";

  const hasScripts = lead && (lead.scriptAbertura || lead.scriptParceria || lead.scriptTecnico);

  const scriptTabs: { key: ScriptTab; label: string; content: string | null | undefined }[] = lead ? [
    { key: "abertura", label: "Abertura", content: lead.scriptAbertura },
    { key: "parceria", label: "Parceria", content: lead.scriptParceria },
    { key: "tecnico", label: "Técnico", content: lead.scriptTecnico },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Lead não encontrado.</p>
        <Button variant="outline" onClick={() => setLocation("/leads")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const currentForm = { ...lead, ...editForm };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {lead.nomeFantasia || lead.razaoSocial || "Lead sem nome"}
            </h1>
            {lead.isQualified && (
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Qualificado
              </Badge>
            )}
            {lead.statusContato === "Desqualificado" && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" /> Desqualificado
              </Badge>
            )}
            {lead.isHighPriority && (
              <Badge style={{ background: "#e21d3c20", color: "#e21d3c", border: "1px solid #e21d3c40" }}>
                🔴 Alta Prioridade
              </Badge>
            )}
            {(lead.attemptCount ?? 0) > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                <Phone className="w-3 h-3" />
                {lead.attemptCount} {lead.attemptCount === 1 ? "tentativa" : "tentativas"}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-1">{lead.cnpj} · {lead.cidade}, {lead.uf}</p>
        </div>
        {canEdit && !lead.isQualified && lead.statusContato !== "Desqualificado" && (
          <div className="flex gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Editar</Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={updateLead.isPending} style={{ background: "oklch(0.22 0.08 240)" }}>
                  {updateLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Salvar</>}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Missing fields alert */}
      {canQualify && !lead.isQualified && lead.statusContato !== "Desqualificado" && missingFields.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-700">
            <strong>Campos obrigatórios faltando:</strong> {missingFields.map(f => FIELD_LABELS[f]).join(", ")}.
            Preencha todos antes de qualificar.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Company Info */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" style={{ color: "#e21d3c" }} />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoField label="Nome Fantasia" value={lead.nomeFantasia} />
              <InfoField label="Razão Social" value={lead.razaoSocial} />
              <InfoField label="CNPJ" value={lead.cnpj} />
              <InfoField label="Segmento" value={lead.segmento} />
              <InfoField label="Classificação" value={lead.classificacao} />
              <InfoField label="Prioridade" value={lead.prioridade} />
              <InfoField label="UF" value={lead.uf} />
              <InfoField label="Cidade" value={lead.cidade} />
              <div className="md:col-span-2">
                <InfoField label="Endereço" value={lead.enderecoCompleto} />
              </div>
            </CardContent>
          </Card>

          {/* Contact & Qualification */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: "#e21d3c" }} />
                Dados de Qualificação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField
                label="Nome do Decisor *"
                field="nomeDecissor"
                value={currentForm.nomeDecissor ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, nomeDecissor: v }))}
              />
              <EditableField
                label="Conhece a Marca? *"
                field="conheceMarca"
                value={currentForm.conheceMarca ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, conheceMarca: v }))}
                type="select"
                options={["Sim", "Não", "Parcialmente"]}
              />
              <EditableField
                label="Frota Atual *"
                field="frotaAtual"
                value={currentForm.frotaAtual ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, frotaAtual: v }))}
              />
              <EditableField
                label="Urgência de Compra *"
                field="urgenciaCompra"
                value={currentForm.urgenciaCompra ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, urgenciaCompra: v }))}
                type="select"
                options={["Imediata", "30 dias", "60 dias", "90 dias", "Sem urgência"]}
              />
              <EditableField
                label="Status do Contato *"
                field="statusContato"
                value={currentForm.statusContato ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, statusContato: v }))}
                type="select"
                options={["Não iniciado", "Em contato", "Aguardando retorno", "Qualificado", "Desqualificado"]}
              />
              <EditableField
                label="WhatsApp / Cel 1 *"
                field="whatsapp1"
                value={currentForm.whatsapp1 ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, whatsapp1: v }))}
              />
              <EditableField
                label="E-mail de Contato *"
                field="email"
                value={currentForm.email ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, email: v }))}
                type="email"
              />
              <EditableField
                label="Crédito / Forma Pagamento"
                field="creditoFormaPagamento"
                value={currentForm.creditoFormaPagamento ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, creditoFormaPagamento: v }))}
              />
              <EditableField
                label="Modelo de Máquina"
                field="modeloTrator"
                value={currentForm.modeloTrator ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, modeloTrator: v }))}
              />
              <EditableField
                label="Ticket Estimado (R$)"
                field="ticketEstimado"
                value={currentForm.ticketEstimado?.toString() ?? ""}
                isEditing={isEditing}
                onChange={(v) => setEditForm(f => ({ ...f, ticketEstimado: v }))}
              />
              <div className="md:col-span-2">
                <EditableField
                  label="Desafio Principal"
                  field="desafioPrincipal"
                  value={currentForm.desafioPrincipal ?? ""}
                  isEditing={isEditing}
                  onChange={(v) => setEditForm(f => ({ ...f, desafioPrincipal: v }))}
                  multiline
                />
              </div>
              <div className="md:col-span-2">
                <EditableField
                  label="Observações"
                  field="observacoes"
                  value={currentForm.observacoes ?? ""}
                  isEditing={isEditing}
                  onChange={(v) => setEditForm(f => ({ ...f, observacoes: v }))}
                  multiline
                />
              </div>
            </CardContent>
          </Card>

          {/* Scripts de Abordagem com abas */}
          {hasScripts && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: "#e21d3c" }} />
                  Scripts de Abordagem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tabs */}
                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                  {scriptTabs.filter(t => t.content).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveScript(tab.key)}
                      className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-all ${
                        activeScript === tab.key
                          ? "bg-background shadow-sm text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                      {tab.key === "abertura" && (
                        <span className="ml-1 text-[10px] px-1 rounded" style={{ background: "#e21d3c20", color: "#e21d3c" }}>
                          WhatsApp
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Script content */}
                {scriptTabs.map(tab => tab.key === activeScript && tab.content ? (
                  <div key={tab.key} className="relative">
                    <div className="text-sm bg-muted/40 rounded-lg p-4 leading-relaxed whitespace-pre-wrap border border-border/50">
                      {tab.content}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => copyScript(tab.content!)}
                      >
                        <Copy className="w-3 h-3" />
                        Copiar script
                      </Button>
                      {tab.key === "abertura" && lead.whatsapp1 && (
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs h-8"
                          style={{ background: "#25D366", color: "#fff" }}
                          onClick={() => openWaDialog("wa1")}
                        >
                          <Phone className="w-3 h-3" />
                          Enviar via WhatsApp
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null)}
              </CardContent>
            </Card>
          )}

          {/* Add Interaction */}
          {canEdit && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Registrar Interação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <Select value={interactionType} onValueChange={(v) => setInteractionType(v as any)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tentativa">Tentativa de contato</SelectItem>
                      <SelectItem value="contato">Contato realizado</SelectItem>
                      <SelectItem value="observacao">Observação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Descreva a interação..."
                  value={interactionContent}
                  onChange={(e) => setInteractionContent(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleAddInteraction}
                  disabled={!interactionContent.trim() || addInteraction.isPending}
                  style={{ background: "oklch(0.22 0.08 240)" }}
                >
                  {addInteraction.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          {canQualify && !lead.isQualified && lead.statusContato !== "Desqualificado" && (
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <Button
                  className="w-full"
                  style={{ background: "#16a34a" }}
                  onClick={() => setShowQualifyDialog(true)}
                  disabled={missingFields.length > 0}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Qualificar Lead
                </Button>
                {missingFields.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Preencha os campos obrigatórios para qualificar
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDisqualifyDialog(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Desqualificar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Desatribuir BDR */}
          {canManage && (lead as any)?.assignedTo && (
            <AssignedBdrCard leadId={leadId} onUnassign={() => unassignLead.mutate({ leadId })} isPending={unassignLead.isPending} />
          )}

          {/* Contact Links */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Links de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lead.whatsapp1 && (
                <button
                  onClick={() => openWaDialog("wa1")}
                  className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-lg w-full transition-colors text-left"
                  style={{ background: "#25D36618", color: "#128C7E", border: "1px solid #25D36630" }}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="flex-1">WhatsApp 1</span>
                  <span className="text-xs opacity-60 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> editar msg
                  </span>
                </button>
              )}
              {lead.whatsapp2 && lead.whatsapp2 !== "https://wa.me/55000000000000" && (
                <button
                  onClick={() => openWaDialog("wa2")}
                  className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-lg w-full transition-colors text-left"
                  style={{ background: "#25D36618", color: "#128C7E", border: "1px solid #25D36630" }}
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span className="flex-1">WhatsApp 2</span>
                  <span className="text-xs opacity-60 flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> editar msg
                  </span>
                </button>
              )}
              {lead.googleMaps && (
                <a href={lead.googleMaps} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                  <MapPin className="w-4 h-4" /> Google Maps
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                  <ExternalLink className="w-4 h-4 shrink-0" /> {lead.email}
                </a>
              )}
              {lead.linkedinGerente && (
                <a href={lead.linkedinGerente} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                  <ExternalLink className="w-4 h-4 shrink-0" /> 🔍 LinkedIn Gerente
                </a>
              )}
              {lead.linkedinDiretor && (
                <a href={lead.linkedinDiretor} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                  <ExternalLink className="w-4 h-4 shrink-0" /> 🔍 LinkedIn Diretor
                </a>
              )}
              {lead.linkedinCeo && (
                <a href={lead.linkedinCeo} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline truncate">
                  <ExternalLink className="w-4 h-4 shrink-0" /> 🔍 LinkedIn CEO
                </a>
              )}
            </CardContent>
          </Card>

          {/* Follow-ups */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" style={{ color: "#e21d3c" }} />
                  Follow-ups ({(followUps ?? []).length})
                </CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowFollowUpDialog(true)}>
                  <Plus className="w-3 h-3" /> Agendar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(followUps ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-3">Nenhum follow-up agendado</p>
                ) : (
                  (followUps ?? []).map((fu) => (
                    <div key={fu.id} className={`flex items-start gap-2 p-2 rounded-lg border ${
                      fu.isDone ? "opacity-50 bg-muted/30" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                    }`}>
                      <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: fu.isDone ? "#888" : "#e21d3c" }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">
                          {new Date(fu.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        {fu.note && <p className="text-xs text-muted-foreground truncate">{fu.note}</p>}
                        <p className="text-xs text-muted-foreground">{fu.userName} {fu.userLastName}</p>
                      </div>
                      {!fu.isDone && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => doneFollowUp.mutate({ id: fu.id })}>
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => cancelFollowUp.mutate({ id: fu.id })}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignment History — visível apenas para ADM/Gerente */}
          {canManage && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" style={{ color: "#e21d3c" }} />
                  Histórico de Atribuições ({(assignmentHistory ?? []).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(assignmentHistory ?? []).length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-3">Nenhuma atribuição registrada</p>
                  ) : (
                    (assignmentHistory ?? []).map((log) => (
                      <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg border border-border bg-muted/20">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          log.action === "assigned" ? "bg-green-500" : "bg-red-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">
                            {log.action === "assigned" ? "Atribuído" : "Desatribuído"}
                            {log.action === "assigned" && log.toName && (
                              <span className="text-muted-foreground font-normal"> → {log.toName} {log.toLastName ?? ""}</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            por {log.byName ?? "Sistema"} · {new Date(log.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interactions History */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico ({(interactions ?? []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(interactions ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-xs text-center py-4">Nenhuma interação registrada</p>
                ) : (
                  (interactions ?? []).map((inter) => {
                    const typeLabels: Record<string, string> = {
                      contato: "Contato realizado",
                      tentativa: "Tentativa",
                      observacao: "Observação",
                      qualificacao: "Qualificação",
                      desqualificacao: "Desqualificação",
                      whatsapp_share: "📲 Compartilhado via WhatsApp",
                    };
                    const typeColors: Record<string, string> = {
                      contato: "#16a34a",
                      tentativa: "#e21d3c",
                      observacao: "#6366f1",
                      qualificacao: "#0ea5e9",
                      desqualificacao: "#dc2626",
                      whatsapp_share: "#25D366",
                    };
                    const borderColor = typeColors[inter.type] ?? "#e21d3c";
                    const label = typeLabels[inter.type] ?? inter.type;
                    return (
                      <div key={inter.id} className="border-l-2 pl-3 py-1" style={{ borderColor }}>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor, color: borderColor }}
                          >
                            {label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(inter.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        {inter.content && inter.type !== "whatsapp_share" && (
                          <p className="text-xs mt-1 text-foreground">{inter.content}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* WhatsApp Dialog */}
      <Dialog open={showWaDialog} onOpenChange={setShowWaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" style={{ color: "#25D366" }} />
              Mensagem para {lead.nomeFantasia || lead.razaoSocial}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Esta é a mensagem de <strong>abertura</strong> pré-preenchida. Você pode editá-la antes de enviar.
            </p>
            <Textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              rows={8}
              className="text-sm leading-relaxed resize-none"
              placeholder="Digite a mensagem..."
            />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground"
                onClick={() => setWaMessage(buildDefaultMessage(lead))}
              >
                Restaurar original
              </Button>
              <span className="text-xs text-muted-foreground">{waMessage.length} caracteres</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaDialog(false)}>Cancelar</Button>
            <Button
              onClick={sendWhatsApp}
              disabled={!waMessage.trim()}
              style={{ background: "#25D366", color: "#fff" }}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Abrir WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Qualify Dialog */}
      <Dialog open={showQualifyDialog} onOpenChange={setShowQualifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Qualificação</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Ao qualificar este lead, os dados serão registrados no CRM e encaminhados ao consultor comercial.
            Confirma a qualificação de <strong>{lead.nomeFantasia || lead.razaoSocial}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQualifyDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => qualifyLead.mutate({ id: leadId })}
              disabled={qualifyLead.isPending}
              style={{ background: "#16a34a" }}
            >
              {qualifyLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Qualificação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disqualify Dialog */}
      <Dialog open={showDisqualifyDialog} onOpenChange={setShowDisqualifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desqualificar Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Informe o motivo da desqualificação de <strong>{lead.nomeFantasia || lead.razaoSocial}</strong>.
            </p>
            <Textarea
              placeholder="Descreva o motivo da desqualificação (mínimo 10 caracteres)..."
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisqualifyDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => disqualifyLead.mutate({ id: leadId, reason: disqualifyReason })}
              disabled={disqualifyReason.length < 10 || disqualifyLead.isPending}
            >
              {disqualifyLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Desqualificar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" style={{ color: "#e21d3c" }} />
              Agendar Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Agende um retorno para <strong>{lead.nomeFantasia || lead.razaoSocial}</strong>.
              Você receberá uma notificação no horário agendado.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Data *</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Horário *</Label>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Observação (opcional)</Label>
              <Textarea
                placeholder="Ex: Ligar para confirmar interesse na proposta..."
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancelar</Button>
            <Button
              onClick={handleCreateFollowUp}
              disabled={createFollowUp.isPending || !followUpDate}
              style={{ background: "#e21d3c" }}
            >
              {createFollowUp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agendar Follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Celebração de qualificação */}
      <QualificationCelebration
        show={showCelebration}
        leadName={lead?.nomeFantasia || lead?.razaoSocial || "Lead"}
        commission={celebrationData.commission}
        isGoalReached={celebrationData.isGoalReached}
        onClose={() => {
          setShowCelebration(false);
          setShowWhatsAppShare(true);
        }}
      />
      {/* Compartilhar lead qualificado via WhatsApp */}
      <WhatsAppShareModal
        show={showWhatsAppShare}
        lead={lead ?? null}
        onClose={() => setShowWhatsAppShare(false)}
      />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Não informado</span>}</p>
    </div>
  );
}

function EditableField({
  label, field, value, isEditing, onChange, type = "text", options, multiline
}: {
  label: string; field: string; value: string; isEditing: boolean;
  onChange: (v: string) => void; type?: "text" | "select" | "email"; options?: string[]; multiline?: boolean;
}) {
  if (!isEditing) return <InfoField label={label} value={value} />;
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</Label>
      {type === "select" && options ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="text-sm" />
      ) : (
        <Input type={type === "email" ? "email" : "text"} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
      )}
    </div>
  );
}

function AssignedBdrCard({ leadId, onUnassign, isPending }: { leadId: number; onUnassign: () => void; isPending: boolean }) {
  const { data: bdr, isLoading } = trpc.leads.getAssignedBdr.useQuery({ leadId });
  return (
    <Card className="border-red-200">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">BDR Atribuído</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground italic">Carregando...</p>
        ) : bdr ? (
          <p className="text-sm font-medium text-foreground mb-2">
            {bdr.name} {bdr.lastName ?? ""}
            {bdr.cargo && <span className="text-xs text-muted-foreground ml-1">· {bdr.cargo}</span>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic mb-2">BDR não encontrado</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-red-300 text-red-700 hover:bg-red-50"
          onClick={onUnassign}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Desatribuir BDR
        </Button>
      </CardContent>
    </Card>
  );
}
