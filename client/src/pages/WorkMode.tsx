import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo, useRef } from "react";
import WhatsAppShareModal from "@/components/WhatsAppShareModal";
import { WA_TEMPLATES, getTemplatesForSegmento } from "@/components/WaTemplates";
import CadenciaDisplay from "@/components/CadenciaDisplay";
import LeadScore from "@/components/LeadScore";
import CallTracker from "@/components/CallTracker";
import type { LeadShareData } from "@/components/WhatsAppShareModal";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Phone, MessageCircle, Linkedin, Copy, CheckCircle2, XCircle,
  ChevronRight, Zap, Target, Building2, MapPin, Users, Loader2,
  ArrowLeft, SkipForward, ThumbsUp, ThumbsDown, AlertCircle
} from "lucide-react";

const DISQUALIFICATION_REASONS = [
  "Não tem máquina / não usa",
  "Já tem fornecedor fixo",
  "Sem interesse no momento",
  "Empresa fechada / inativa",
  "Número incorreto / não existe",
  "Não é o decisor",
  "Orçamento insuficiente",
  "Outro",
];

type Lead = {
  id: number;
  nomeFantasia?: string | null;
  razaoSocial?: string | null;
  cnpj?: string | null;
  segmento?: string | null;
  uf?: string | null;
  cidade?: string | null;
  whatsapp?: string | null;
  whatsapp1?: string | null;
  whatsapp2?: string | null;
  email?: string | null;
  linkedin?: string | null;
  prioridade?: string | null;
  frotas?: string | null;
  urgencia?: string | null;
  statusContato?: string | null;
  isQualified?: boolean;
  isDisqualified?: boolean;
  nomeDecissor?: string | null;
  googleMaps?: string | null;
  enderecoCompleto?: string | null;
};

export default function WorkMode() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [showDisqualify, setShowDisqualify] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [interactionNote, setInteractionNote] = useState("");
  const [showScript, setShowScript] = useState(true);
  const [showWhatsAppShare, setShowWhatsAppShare] = useState(false);
  const qualifiedLeadRef = useRef<LeadShareData | null>(null);

  const excludeIdsMemo = useMemo(() => excludeIds, [excludeIds.join(",")]);

  const { data: currentLead, isLoading, refetch } = trpc.leads.nextForWork.useQuery(
    { excludeIds: excludeIdsMemo },
    { enabled: !!user }
  );

  const { data: stats } = trpc.dashboard.bdrStats.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const addInteraction = trpc.leads.addInteraction.useMutation({
    onSuccess: () => {
      toast.success("Tentativa registrada!");
    },
  });

  const disqualifyMutation = trpc.leads.disqualify.useMutation({
    onSuccess: () => {
      toast.success("Lead desqualificado.");
      goToNext();
    },
    onError: (err) => toast.error(err.message),
  });

  const qualifyMutation = trpc.leads.qualify.useMutation({
    onSuccess: () => {
      // Salvar dados do lead qualificado antes de avançar para o próximo
      if (lead) {
        const l = lead as any;
        qualifiedLeadRef.current = {
          id: lead.id,
          nomeFantasia: lead.nomeFantasia,
          razaoSocial: lead.razaoSocial,
          cnpj: lead.cnpj,
          cidade: lead.cidade,
          uf: lead.uf,
          enderecoCompleto: lead.enderecoCompleto ?? null,
          googleMaps: lead.googleMaps ?? null,
          // Contato (obrigatórios)
          whatsapp1: lead.whatsapp1 ?? lead.whatsapp ?? null,
          whatsapp2: lead.whatsapp2 ?? null,
          email: lead.email ?? null,
          nomeDecissor: lead.nomeDecissor ?? null,
          // Qualificação (obrigatórios)
          conheceMarca: l.conheceMarca ?? null,
          frotaAtual: l.frotaAtual ?? lead.frotas ?? null,
          urgenciaCompra: l.urgenciaCompra ?? lead.urgencia ?? null,
          statusContato: lead.statusContato ?? null,
          // Empresa
          segmento: lead.segmento,
          classificacao: l.classificacao ?? null,
          prioridade: lead.prioridade ?? null,
          // Comercial
          modeloTrator: l.modeloTrator ?? null,
          ticketEstimado: l.ticketEstimado ?? null,
          creditoFormaPagamento: l.creditoFormaPagamento ?? null,
          desafioPrincipal: l.desafioPrincipal ?? null,
          observacoes: l.observacoes ?? null,
        };
      }
      setQualifiedCount(q => q + 1);
      goToNext();
      // Mostrar modal de compartilhamento após avançar
      setTimeout(() => setShowWhatsAppShare(true), 300);
    },
    onError: (err) => toast.error(err.message),
  });

  const lead = currentLead as Lead | null | undefined;

  const goToNext = () => {
    if (lead?.id) {
      setExcludeIds(prev => [...prev, lead.id]);
    }
    setSessionCount(s => s + 1);
    setShowDisqualify(false);
    setDisqualifyReason("");
    setCustomReason("");
    setInteractionNote("");
  };

  const handleAttempt = () => {
    if (!lead?.id) return;
    addInteraction.mutate({ leadId: lead.id, type: "tentativa", content: interactionNote || undefined });
    setInteractionNote("");
  };

  const [selectedWaTemplate, setSelectedWaTemplate] = useState("abertura_geral");

  const handleWhatsApp = () => {
    const rawPhone = lead?.whatsapp1 ?? lead?.whatsapp ?? lead?.whatsapp2;
    if (!rawPhone) return toast.error("Número de WhatsApp não disponível");
    const phone = rawPhone.replace(/\D/g, "");
    const finalPhone = phone.startsWith("55") ? phone : `55${phone}`;
    // Get message from selected template
    const templates = getTemplatesForSegmento(lead?.segmento);
    const tpl = templates.find(t => t.id === selectedWaTemplate) ?? templates[0];
    const empresa = lead?.nomeFantasia ?? lead?.razaoSocial ?? "sua empresa";
    const rawMsg = tpl
      ? tpl.message({ empresa, modelo: lead?.modeloTrator ?? undefined, decisor: lead?.nomeDecissor ?? undefined })
      : `Olá! Sou da Gallotti Tractor | LS Tractor. Posso apresentar nossa linha de tratores para ${empresa}?`;
    const msg = encodeURIComponent(rawMsg);
    window.open(`https://wa.me/${finalPhone}?text=${msg}`, "_blank");
    handleAttempt();
  };

  const handleCopyPhone = () => {
    if (!lead?.whatsapp) return;
    navigator.clipboard.writeText(lead.whatsapp);
    toast.success("Número copiado!");
  };

  const handleDisqualify = () => {
    if (!lead?.id) return;
    const reason = disqualifyReason === "Outro" ? customReason : disqualifyReason;
    if (!reason) return toast.error("Selecione ou informe o motivo da desqualificação");
    disqualifyMutation.mutate({ id: lead.id, reason });
  };

  const handleQualify = () => {
    if (!lead?.id) return;
    qualifyMutation.mutate({ id: lead.id });
  };

  const attemptsGoal = stats?.dailyAttemptsGoal ?? 80;
  const leadsGoal = stats?.dailyGoal ?? 5;
  const attempts = stats?.todayAttempts ?? 0;
  const contacts = (stats as any)?.todayContacts ?? 0;
  const totalContactActivity = attempts + contacts;
  const qualified = stats?.totalQualified ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando próximo lead...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Parabéns! Você trabalhou todos os leads disponíveis.</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Sessão: {sessionCount} leads trabalhados · {qualifiedCount} qualificados
            </p>
            <Button onClick={() => setLocation("/leads")} style={{ background: "#0a1e5a" }}>
              Ver Lista Completa
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header da sessão */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Sair
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: "#e21d3c" }} />
            <h1 className="text-lg font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Modo de Prospecção
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sessão: <strong>{sessionCount}</strong> leads</span>
          <span>·</span>
          <span className="text-green-600 font-semibold">{qualifiedCount} qualificados</span>
        </div>
      </div>

      {/* Progresso do dia */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm" style={{ background: "#0a1e5a" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-white/70" />
                <span className="text-white/70 text-xs">Tentativas hoje</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold text-sm">{totalContactActivity}/{attemptsGoal}</span>
                {contacts > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-[10px] font-medium px-1 py-0.5 rounded-full"
                    style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}
                    title={`${contacts} contato${contacts > 1 ? "s" : ""} realizado${contacts > 1 ? "s" : ""}`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {contacts}
                  </span>
                )}
              </div>
            </div>
            {/* Barra segmentada: tentativas (azul) + contatos realizados (verde) */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden flex">
              {(() => {
                const totalPct = Math.min(100, Math.round((totalContactActivity / attemptsGoal) * 100));
                const contactsPct = Math.min(totalPct, Math.round((contacts / attemptsGoal) * 100));
                const attemptsPct = Math.max(0, totalPct - contactsPct);
                return (
                  <>
                    {attemptsPct > 0 && (
                      <div className="h-2 bg-blue-400 transition-all"
                        style={{ width: `${attemptsPct}%`, borderRadius: contactsPct > 0 ? "9999px 0 0 9999px" : "9999px" }} />
                    )}
                    {contactsPct > 0 && (
                      <div className="h-2 bg-green-500 transition-all"
                        style={{ width: `${contactsPct}%`, borderRadius: attemptsPct > 0 ? "0 9999px 9999px 0" : "9999px" }} />
                    )}
                  </>
                );
              })()}
            </div>
            {contacts > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-white/50">
                  <span className="inline-block w-2 h-1 rounded-full bg-blue-400" />
                  {attempts} tent.
                </span>
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <span className="inline-block w-2 h-1 rounded-full bg-green-500" />
                  {contacts} contatos
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm" style={{ background: "#0a1e5a" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-white/70" />
                <span className="text-white/70 text-xs">Qualificados hoje</span>
              </div>
              <span className="text-white font-bold text-sm">{qualified}/{leadsGoal}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (qualified / leadsGoal) * 100)}%`,
                  background: qualified >= leadsGoal ? "#22c55e" : "#e21d3c"
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card do Lead */}
      <Card className="shadow-md border-border">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {lead.prioridade && (
                  <Badge
                    className="text-xs"
                    style={{
                      background: lead.prioridade === "Alta" ? "#fef2f2" : "#f0fdf4",
                      color: lead.prioridade === "Alta" ? "#dc2626" : "#16a34a",
                      border: `1px solid ${lead.prioridade === "Alta" ? "#fecaca" : "#bbf7d0"}`
                    }}
                  >
                    {lead.prioridade} Prioridade
                  </Badge>
                )}
                {lead.urgencia && (
                  <Badge variant="outline" className="text-xs">{lead.urgencia}</Badge>
                )}
              </div>
              <CardTitle className="text-lg leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {lead.nomeFantasia ?? lead.razaoSocial ?? "Empresa sem nome"}
              </CardTitle>
              {lead.nomeFantasia && lead.razaoSocial && (
                <p className="text-muted-foreground text-sm mt-0.5">{lead.razaoSocial}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={goToNext} className="shrink-0">
              <SkipForward className="w-4 h-4 mr-1" /> Pular
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Informações do lead */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {lead.segmento && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{lead.segmento}</span>
              </div>
            )}
            {(lead.cidade || lead.uf) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{[lead.cidade, lead.uf].filter(Boolean).join(" - ")}</span>
              </div>
            )}
            {lead.frotas && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">Frota: {lead.frotas}</span>
              </div>
            )}
            {lead.cnpj && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate text-xs">{lead.cnpj}</span>
              </div>
            )}
          </div>

          {/* Click-to-Call com registro automático */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ligação</p>
            <CallTracker
              phone={lead.whatsapp1 ?? lead.whatsapp ?? lead.whatsapp2}
              leadName={lead.nomeFantasia ?? lead.razaoSocial ?? "Lead"}
              onCallEnd={(result, duration, note) => {
                if (!lead.id) return;
                const tipo = result === "contato" ? "contato" : "tentativa";
                const content = [
                  result === "nao_existe" ? "Número inválido/inexistente" : null,
                  duration > 0 ? `Duração: ${Math.floor(duration/60)}m${duration%60}s` : null,
                  note || null,
                ].filter(Boolean).join(" · ");
                addInteraction.mutate({ leadId: lead.id, type: tipo, content: content || undefined });
              }}
            />
          </div>

          {/* Template WA Selector */}
          {(lead.whatsapp ?? lead.whatsapp1) && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Template WhatsApp</p>
              <select
                className="w-full border border-border rounded-md text-xs px-2 py-1.5 bg-background text-foreground"
                value={selectedWaTemplate}
                onChange={(e) => setSelectedWaTemplate(e.target.value)}
              >
                {getTemplatesForSegmento(lead.segmento).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Ações de contato rápido */}
          <div className="flex gap-2 flex-wrap">
            {(lead.whatsapp ?? lead.whatsapp1) && (
              <Button
                size="sm"
                onClick={handleWhatsApp}
                className="gap-1.5"
                style={{ background: "#25d366", color: "white" }}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
            )}
            {(lead.whatsapp ?? lead.whatsapp1) && (
              <Button size="sm" variant="outline" onClick={handleCopyPhone} className="gap-1.5">
                <Copy className="w-4 h-4" /> Copiar
              </Button>
            )}
            {lead.linkedin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(lead.linkedin!, "_blank")}
                className="gap-1.5"
              >
                <Linkedin className="w-4 h-4" /> LinkedIn
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setLocation(`/leads/${lead.id}`)} className="gap-1.5">
              <ChevronRight className="w-4 h-4" /> Ver Detalhes
            </Button>
          </div>

          {/* Script de abordagem */}
          <div className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setShowScript(s => !s)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span>📋 Script de Abordagem</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${showScript ? "rotate-90" : ""}`} />
            </button>
            {showScript && (
              <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground bg-muted/30 space-y-2">
                <p><strong>Abertura:</strong> "Olá, bom dia! Falo com o responsável pela área de logística/operações?"</p>
                <p><strong>Apresentação:</strong> "Sou {user?.name} da Gallotti Tractor | LS Tractor. Somos revendedores autorizados ENSIGN para o segmento {lead.segmento ?? "industrial"}."</p>
                <p><strong>Gancho:</strong> "Identifiquei que a {lead.nomeFantasia ?? lead.razaoSocial} pode se beneficiar das nossas máquinas. Vocês utilizam máquinas pesadas na operação atualmente?"</p>
                <p><strong>Objetivo:</strong> Qualificar necessidade, frota atual e urgência. Agendar reunião com consultor.</p>
              </div>
            )}
          </div>

          {/* Observação rápida */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observação (opcional)</label>
            <Textarea
              placeholder="Registre o que aconteceu nesta tentativa..."
              value={interactionNote}
              onChange={e => setInteractionNote(e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Score + Cadência */}
          <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/30">
            <LeadScore lead={lead as any} />
            <div className="border-t border-border pt-3">
              <CadenciaDisplay
                attemptCount={lead.attemptCount ?? 0}
              />
            </div>
          </div>

          {/* Ações principais */}
          {!showDisqualify ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Button
                onClick={handleAttempt}
                variant="outline"
                className="gap-2 w-full"
                disabled={addInteraction.isPending}
              >
                <Phone className="w-4 h-4" />
                Registrar Tentativa
              </Button>
              <Button
                onClick={() => setShowDisqualify(true)}
                variant="outline"
                className="gap-2 w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <ThumbsDown className="w-4 h-4" />
                Desqualificar
              </Button>
              <Button
                onClick={handleQualify}
                className="gap-2 w-full"
                style={{ background: "#16a34a", color: "white" }}
                disabled={qualifyMutation.isPending}
              >
                <ThumbsUp className="w-4 h-4" />
                Qualificar Lead
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-lg border border-red-200 bg-red-50">
              <p className="text-sm font-medium text-red-800">Motivo da desqualificação:</p>
              <div className="flex flex-wrap gap-2">
                {DISQUALIFICATION_REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setDisqualifyReason(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      disqualifyReason === r
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-red-700 border-red-200 hover:bg-red-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {disqualifyReason === "Outro" && (
                <Textarea
                  placeholder="Descreva o motivo..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDisqualify(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDisqualify}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={disqualifyMutation.isPending}
                >
                  {disqualifyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Desqualificação"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Compartilhar lead qualificado via WhatsApp */}
      <WhatsAppShareModal
        show={showWhatsAppShare}
        lead={qualifiedLeadRef.current}
        onClose={() => setShowWhatsAppShare(false)}
      />
    </div>
  );
}
