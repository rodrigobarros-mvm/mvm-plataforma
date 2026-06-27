import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRight, CheckCircle2, Clock, DollarSign, MessageCircle, Phone, Search,
  TrendingUp, UserCheck, Users, XCircle, Zap, Plus, FileText, List, LayoutGrid
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG = {
  aguardando_consultor: { label: "Aguardando Consultor", color: "#D97706", bg: "#FEF3C7", icon: Clock },
  em_negociacao:        { label: "Em Negociação",        color: "#0a1e5a", bg: "#EFF6FF", icon: TrendingUp },
  proposta_enviada:     { label: "Proposta Enviada",     color: "#7C3AED", bg: "#F5F3FF", icon: FileText },
  aguardando_decisao:   { label: "Aguard. Decisão",      color: "#0891B2", bg: "#ECFEFF", icon: Clock },
  ganho:                { label: "Ganho 🏆",              color: "#059669", bg: "#F0FDF4", icon: CheckCircle2 },
  perdido:              { label: "Perdido",               color: "#e21d3c", bg: "#FEF2F2", icon: XCircle },
  cancelado:            { label: "Cancelado",             color: "#94A3B8", bg: "#F8FAFC", icon: XCircle },
};

const URGENCIA_CONFIG = {
  "imediato":      { label: "🔥 Imediato",      color: "#e21d3c" },
  "30-90 dias":    { label: "⏳ 30-90 dias",    color: "#D97706" },
  "pesquisando":   { label: "🔍 Pesquisando",   color: "#64748B" },
};

export default function Oportunidades() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffLeadId, setHandoffLeadId] = useState<number | null>(null);

  const isBdr = user?.role === "bdr";
  const isConsultor = !isBdr;

  // Load oportunidades
  const { data: opps, isLoading, refetch } = trpc.oportunidades.list.useQuery({
    status: statusFilter || undefined,
    search: search || undefined,
  });

  // Load qualified leads (for BDR handoff)
  const { data: qualifiedLeads } = trpc.leads.list.useQuery({
    isQualified: true,
    limit: 50,
  }, { enabled: showHandoff });

  const createOpp = trpc.oportunidades.create.useMutation({
    onSuccess: () => { toast.success("Oportunidade criada! Consultor notificado."); setShowHandoff(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.oportunidades.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
  });

  // Handoff form state
  const [handoffForm, setHandoffForm] = useState({
    modeloInteresse: "", urgencia: "30-90 dias", formaPagamento: "",
    ticketEstimado: "", observacoesBdr: "",
  });

  const stats = {
    total: opps?.total ?? 0,
    aguardando: opps?.data?.filter((o: any) => o.status === "aguardando_consultor").length ?? 0,
    negociacao: opps?.data?.filter((o: any) => o.status === "em_negociacao").length ?? 0,
    ganhos: opps?.data?.filter((o: any) => o.status === "ganho").length ?? 0,
    perdidos: opps?.data?.filter((o: any) => o.status === "perdido").length ?? 0,
  };

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Comercial</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isBdr ? "Passe leads qualificados para o consultor" : "Gerencie suas oportunidades de venda"}
          </p>
        </div>
        {isBdr && (
          <Button
            style={{ background: "#e21d3c", color: "white" }}
            className="gap-2"
            onClick={() => setShowHandoff(true)}
          >
            <Plus className="w-4 h-4" />
            Passar Lead Qualificado
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#0a1e5a" },
          { label: "Aguardando", value: stats.aguardando, color: "#D97706" },
          { label: "Em Negociação", value: stats.negociacao, color: "#0a1e5a" },
          { label: "Ganhos", value: stats.ganhos, color: "#059669" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "aguardando_consultor", "em_negociacao", "proposta_enviada", "ganho", "perdido"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="text-xs"
              style={statusFilter === s ? { background: "#0a1e5a" } : {}}
              onClick={() => setStatusFilter(s)}
            >
              {s ? STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label : "Todas"}
            </Button>
          ))}
        </div>
      </div>

      {/* Kanban / List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : !opps?.data?.length ? (
        <div className="text-center py-16">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Nenhuma oportunidade ainda</p>
          {isBdr && <p className="text-sm text-muted-foreground mt-1">Qualifique um lead e passe para o consultor</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {(opps?.data ?? []).map((opp: any) => {
            const cfg = STATUS_CONFIG[opp.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.aguardando_consultor;
            const Icon = cfg.icon;
            const urg = URGENCIA_CONFIG[opp.urgencia as keyof typeof URGENCIA_CONFIG];
            return (
              <Card
                key={opp.id}
                className="border-border cursor-pointer hover:shadow-md transition-all"
                onClick={() => setLocation(`/oportunidades/${opp.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Status icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                      <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                    </div>
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="font-bold text-foreground truncate">{opp.leadNome ?? opp.titulo ?? `Oportunidade #${opp.id}`}</p>
                          <p className="text-sm text-muted-foreground">{opp.leadCidade}{opp.leadUf ? ` / ${opp.leadUf}` : ""}</p>
                        </div>
                        <Badge style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {opp.modeloInteresse && (
                          <span className="text-xs flex items-center gap-1 font-semibold" style={{ color: "#0a1e5a" }}>
                            🚜 {opp.modeloInteresse}
                          </span>
                        )}
                        {urg && (
                          <span className="text-xs font-semibold" style={{ color: urg.color }}>{urg.label}</span>
                        )}
                        {opp.ticketEstimado && (
                          <span className="text-xs flex items-center gap-1 text-green-700 font-semibold">
                            <DollarSign className="w-3 h-3" />
                            R$ {Number(opp.ticketEstimado).toLocaleString("pt-BR")}
                          </span>
                        )}
                        {opp.bdrNome && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-3 h-3" /> BDR: {opp.bdrNome.split(" ")[0]}
                          </span>
                        )}
                        {opp.consultorNome && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> {opp.consultorNome.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    {opp.status === "aguardando_consultor" && (
                      <Button
                        size="sm"
                        className="shrink-0"
                        style={{ background: "#059669", color: "white" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ id: opp.id, status: "em_negociacao" });
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Assumir
                      </Button>
                    )}
                    {/* Quick WA button if has phone */}
                    {opp.leadWhatsapp && (
                      <a
                        href={`https://wa.me/55${opp.leadWhatsapp.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá! Da Gallotti Tractor | LS Tractor. Entrando em contato sobre ${opp.modeloInteresse ?? "nossa linha de tratores"}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                        style={{ background: "#25D36618", color: "#128C7E" }}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Handoff Dialog */}
      <Dialog open={showHandoff} onOpenChange={setShowHandoff}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: "#e21d3c" }} />
              Passar Lead para Consultor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Select lead */}
            <div className="space-y-1.5">
              <Label>Lead Qualificado</Label>
              <select
                className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={handoffLeadId ?? ""}
                onChange={e => setHandoffLeadId(Number(e.target.value))}
              >
                <option value="">Selecione o lead qualificado...</option>
                {(qualifiedLeads?.data ?? []).map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.nomeFantasia ?? l.razaoSocial} — {l.cidade}/{l.uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Modelo de Interesse</Label>
              <Input
                placeholder="Ex: MT7.80F Cabinado, H145..."
                value={handoffForm.modeloInteresse}
                onChange={e => setHandoffForm(f => ({ ...f, modeloInteresse: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Urgência</Label>
                <select
                  className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                  value={handoffForm.urgencia}
                  onChange={e => setHandoffForm(f => ({ ...f, urgencia: e.target.value }))}
                >
                  <option value="imediato">🔥 Imediato</option>
                  <option value="30-90 dias">⏳ 30-90 dias</option>
                  <option value="pesquisando">🔍 Pesquisando</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Ticket Estimado (R$)</Label>
                <Input
                  type="number"
                  placeholder="250000"
                  value={handoffForm.ticketEstimado}
                  onChange={e => setHandoffForm(f => ({ ...f, ticketEstimado: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <Input
                placeholder="FINAME / À vista / Financiamento..."
                value={handoffForm.formaPagamento}
                onChange={e => setHandoffForm(f => ({ ...f, formaPagamento: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Resumo para o Consultor *</Label>
              <Textarea
                placeholder="Descreva o contexto: o que o cliente quer, objeções levantadas, próximo passo combinado..."
                rows={4}
                value={handoffForm.observacoesBdr}
                onChange={e => setHandoffForm(f => ({ ...f, observacoesBdr: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowHandoff(false)}>Cancelar</Button>
              <Button
                className="flex-1 gap-2"
                style={{ background: "#e21d3c", color: "white" }}
                disabled={!handoffLeadId || !handoffForm.observacoesBdr || createOpp.isPending}
                onClick={() => {
                  if (!handoffLeadId) return;
                  createOpp.mutate({
                    leadId: handoffLeadId,
                    ...handoffForm,
                    ticketEstimado: handoffForm.ticketEstimado ? handoffForm.ticketEstimado : undefined,
                  });
                }}
              >
                <ArrowRight className="w-4 h-4" />
                Passar para Consultor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
