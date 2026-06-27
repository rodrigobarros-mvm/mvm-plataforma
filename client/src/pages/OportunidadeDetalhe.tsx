import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Phone, MessageCircle, FileText, CheckCircle2,
  Clock, TrendingUp, DollarSign, MapPin, User, Users,
  Plus, XCircle, Zap, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useLocation as useWoeLocation } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_consultor: { label: "Aguardando Consultor", color: "#D97706", bg: "#FEF3C7" },
  em_negociacao:        { label: "Em Negociação",        color: "#0a1e5a", bg: "#EFF6FF" },
  proposta_enviada:     { label: "Proposta Enviada",     color: "#7C3AED", bg: "#F5F3FF" },
  aguardando_decisao:   { label: "Aguard. Decisão",      color: "#0891B2", bg: "#ECFEFF" },
  ganho:                { label: "🏆 Ganho",             color: "#059669", bg: "#F0FDF4" },
  perdido:              { label: "Perdido",               color: "#e21d3c", bg: "#FEF2F2" },
  cancelado:            { label: "Cancelado",             color: "#94A3B8", bg: "#F8FAFC" },
};

const TIPO_EVENT: Record<string, { icon: any; color: string; label: string }> = {
  tentativa:      { icon: Phone,       color: "#94A3B8", label: "Tentativa de contato" },
  contato:        { icon: Phone,       color: "#0a1e5a", label: "Contato realizado" },
  qualificacao:   { icon: CheckCircle2,color: "#059669", label: "Lead qualificado pelo BDR" },
  observacao:     { icon: FileText,    color: "#7C3AED", label: "Observação" },
  whatsapp_share: { icon: MessageCircle,color:"#25D366", label: "WhatsApp enviado" },
  handoff:        { icon: Zap,         color: "#e21d3c", label: "Passou para Consultor" },
  proposta:       { icon: FileText,    color: "#0891B2", label: "Proposta enviada" },
  visita:         { icon: MapPin,      color: "#7C3AED", label: "Visita realizada" },
  reuniao:        { icon: Calendar,    color: "#059669", label: "Reunião" },
  ganho:          { icon: CheckCircle2,color: "#059669", label: "Venda fechada! 🏆" },
};

export default function OportunidadeDetalhe() {
  const [, setLocation] = useWoeLocation();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const { user } = useAuth();
  const [novoTipo, setNovoTipo] = useState("observacao");
  const [novaObs, setNovaObs] = useState("");
  const [showAddEvent, setShowAddEvent] = useState(false);

  // Unified timeline mock — will pull from real backend
  const MOCK_TIMELINE = [
    { id: 1, tipo: "tentativa", conteudo: "Ligacao - nao atendeu", data: new Date(Date.now()-86400000*10), autor: "Rodrigo BDR", role: "bdr" },
    { id: 2, tipo: "whatsapp_share", conteudo: "Mensagem de abertura enviada", data: new Date(Date.now()-86400000*9), autor: "Rodrigo BDR", role: "bdr" },
    { id: 3, tipo: "contato", conteudo: "Contato realizado! Cliente demonstrou interesse no MT7.80F para cafeicultura. Tem 3 hectares de cafe. Quer ver proposta.", data: new Date(Date.now()-86400000*8), autor: "Rodrigo BDR", role: "bdr" },
    { id: 4, tipo: "qualificacao", conteudo: "Lead qualificado - interesse confirmado no MT7.80F Cabinado", data: new Date(Date.now()-86400000*7), autor: "Rodrigo BDR", role: "bdr" },
    { id: 5, tipo: "handoff", conteudo: "Modelo: MT7.80F Cabinado | Urgencia: 30-90 dias | FINAME | Ticket: R$260.000. Cliente ja tem JD 5060E e quer trocar. Sensivel ao preco da parcela FINAME. Decisor: Joao Carlos (proprietario).", data: new Date(Date.now()-86400000*7), autor: "Rodrigo BDR", role: "bdr" },
    { id: 6, tipo: "contato", conteudo: "Primeiro contato como consultor. Apresentei comparativo LS vs JD. Cliente receptivo. Agendou visita.", data: new Date(Date.now()-86400000*5), autor: "Carlos Menezes", role: "consultor" },
    { id: 7, tipo: "visita", conteudo: "Visita realizada na propriedade. Check-in GPS validado (320m do local). Demonstracao do MT7.80F. Cliente muito satisfeito com a cabine. Pediu proposta formal.", data: new Date(Date.now()-86400000*3), autor: "Carlos Menezes", role: "consultor" },
    { id: 8, tipo: "proposta", conteudo: "Proposta PROP-2025-001 enviada por WhatsApp: MT7.80F Cab (82cv) - R$255.000 - FINAME 60x - Entrada: R$25.500", data: new Date(Date.now()-86400000*2), autor: "Carlos Menezes", role: "consultor" },
  ];

  const stCfg = STATUS_CONFIG["proposta_enviada"];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/oportunidades")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Oportunidade — BRASILAGRO S/A</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge style={{ background: stCfg.bg, color: stCfg.color }}>Proposta Enviada</Badge>
            <span className="text-xs text-muted-foreground">Aberta há 10 dias · MT7.80F Cabinado</span>
          </div>
        </div>
        <Button style={{ background: "#e21d3c", color: "white" }} className="gap-2 shrink-0"
          onClick={() => setLocation("/gerar-proposta")}>
          <FileText className="w-4 h-4" /> Nova Proposta
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: "#0a1e5a" }} />
                Histórico Unificado — BDR + Consultor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-border z-0" />
                {MOCK_TIMELINE.map((ev, i) => {
                  const cfg = TIPO_EVENT[ev.tipo] ?? TIPO_EVENT.observacao;
                  const Icon = cfg.icon;
                  const isHandoff = ev.tipo === "handoff";
                  return (
                    <div key={ev.id} className="relative flex gap-4 pb-5 last:pb-0">
                      <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2"
                        style={{ background: isHandoff ? "#e21d3c10" : cfg.color + "15", borderColor: cfg.color + "40" }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div className={`flex-1 rounded-xl px-4 py-3 border ${isHandoff ? "border-red-200 bg-red-50/60" : "border-border"}`}>
                        <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                            <Badge variant="outline" className="text-xs py-0"
                              style={{ borderColor: ev.role === "bdr" ? "#059669" : "#0a1e5a", color: ev.role === "bdr" ? "#059669" : "#0a1e5a" }}>
                              {ev.role === "bdr" ? "BDR" : "Consultor"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(ev.data, "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{ev.conteudo}</p>
                        <p className="text-xs text-muted-foreground mt-1">por {ev.autor}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add event */}
              {!showAddEvent ? (
                <Button variant="outline" size="sm" className="w-full mt-4 gap-2" onClick={() => setShowAddEvent(true)}>
                  <Plus className="w-4 h-4" /> Registrar atividade
                </Button>
              ) : (
                <div className="mt-4 space-y-3 border border-border rounded-xl p-4">
                  <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                    value={novoTipo} onChange={e => setNovoTipo(e.target.value)}>
                    <option value="contato">📞 Contato realizado</option>
                    <option value="proposta">📄 Proposta enviada</option>
                    <option value="visita">📍 Visita realizada</option>
                    <option value="reuniao">💻 Reunião</option>
                    <option value="observacao">📝 Observação</option>
                  </select>
                  <Textarea rows={3} placeholder="Descreva o que aconteceu..." value={novaObs} onChange={e => setNovaObs(e.target.value)} className="resize-none text-sm" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowAddEvent(false); setNovaObs(""); }}>Cancelar</Button>
                    <Button size="sm" className="flex-1" style={{ background: "#0a1e5a", color: "white" }}
                      onClick={() => { toast.success("Atividade registrada!"); setShowAddEvent(false); setNovaObs(""); }}>
                      Salvar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Info */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Produto</p>
                <p className="font-bold" style={{ color: "#0a1e5a" }}>🚜 MT7.80F Cabinado</p>
                <p className="text-xs text-muted-foreground">82cv · Fruteiro · LS Tractor</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Financeiro</p>
                <p className="text-xl font-black text-green-700">R$ 260.000</p>
                <p className="text-xs text-muted-foreground">FINAME 60x · Entrada 10%</p>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Equipe</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">R</div>
                    <span>Rodrigo <span className="text-muted-foreground text-xs">BDR</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#0a1e5a" }}>C</div>
                    <span>Carlos <span className="text-muted-foreground text-xs">Consultor</span></span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Urgência</p>
                <Badge style={{ background: "#D97706" + "20", color: "#D97706" }}>⏳ 30-90 dias</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2 text-sm" style={{ background: "#25D366", color: "white" }}>
              <MessageCircle className="w-4 h-4" /> WhatsApp do cliente
            </Button>
            <Button variant="outline" className="w-full gap-2 text-sm" onClick={() => setLocation("/gerar-proposta")}>
              <FileText className="w-4 h-4" /> Gerar/Atualizar Proposta
            </Button>
            <Button variant="outline" className="w-full gap-2 text-sm text-green-700 border-green-200"
              onClick={() => toast.success("Status atualizado para Ganho! 🏆")}>
              <CheckCircle2 className="w-4 h-4" /> Marcar como Ganho 🏆
            </Button>
            <Button variant="outline" className="w-full gap-2 text-sm text-red-600 border-red-200"
              onClick={() => toast("Oportunidade marcada como perdida")}>
              <XCircle className="w-4 h-4" /> Marcar como Perdido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
