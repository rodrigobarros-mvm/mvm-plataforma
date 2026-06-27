import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, MapPin, Phone, Clock, CheckCircle2, Plus,
  Navigation, Route, MessageCircle, ChevronRight, Zap
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import VisitaCheckin from "@/components/VisitaCheckin";
import EmpresasProximas from "@/components/EmpresasProximas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Compromisso = {
  id: number;
  tipo: "visita" | "ligacao" | "reuniao_online" | "proposta" | "outro";
  titulo: string;
  dataHora: Date;
  duracaoMinutos: number;
  empresa?: string;
  cidade?: string;
  telefone?: string;
  distanciaKm?: number;
  status: "agendado" | "em_andamento" | "concluido" | "cancelado";
  leadId?: number;
};

const TIPO_CONFIG = {
  visita:         { label: "Visita",          color: "#0a1e5a", icon: MapPin,       bg: "#EFF6FF" },
  ligacao:        { label: "Ligação",          color: "#059669", icon: Phone,        bg: "#F0FDF4" },
  reuniao_online: { label: "Reunião Online",   color: "#7C3AED", icon: Calendar,    bg: "#F5F3FF" },
  proposta:       { label: "Proposta",         color: "#e21d3c", icon: Zap,         bg: "#FEF2F2" },
  outro:          { label: "Outro",            color: "#64748B", icon: Clock,       bg: "#F8FAFC" },
};

const STATUS_CONFIG = {
  agendado:     { label: "Agendado",    color: "#64748B" },
  em_andamento: { label: "Em andamento", color: "#D97706" },
  concluido:    { label: "Concluído",   color: "#059669" },
  cancelado:    { label: "Cancelado",   color: "#e21d3c" },
};

// Mock agenda — será substituída por dados reais do backend
const MOCK_AGENDA: Compromisso[] = [
  { id: 1, tipo: "visita", titulo: "Visita — BRASILAGRO S/A", dataHora: new Date(new Date().setHours(8,30)), duracaoMinutos: 90, empresa: "BRASILAGRO S/A", cidade: "Jaborandi/BA", distanciaKm: 32, status: "agendado", leadId: 4 },
  { id: 2, tipo: "ligacao", titulo: "Ligação — FRUTIAGRO LTDA", dataHora: new Date(new Date().setHours(10,0)), duracaoMinutos: 30, empresa: "FRUTIAGRO LTDA", cidade: "Barreiras/BA", telefone: "(77) 98239315", status: "agendado", leadId: 6 },
  { id: 3, tipo: "proposta", titulo: "Enviar proposta MT7.80F", dataHora: new Date(new Date().setHours(11,30)), duracaoMinutos: 20, empresa: "ACAI JURUA DO JAGUAR", status: "agendado" },
  { id: 4, tipo: "visita", titulo: "Visita — COOPERATIVA CANA", dataHora: new Date(new Date().setHours(14,0)), duracaoMinutos: 60, empresa: "COOP. CANA OESTE", cidade: "Santa Maria/BA", distanciaKm: 48, status: "agendado", leadId: 30 },
  { id: 5, tipo: "ligacao", titulo: "Follow-up — AGROPECUARIA JM", dataHora: new Date(new Date().setHours(16,0)), duracaoMinutos: 20, empresa: "AGROPECUARIA JM LTDA", telefone: "(77) 88240021", status: "agendado" },
];

export default function AgendaConsultor() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agenda, setAgenda] = useState<Compromisso[]>(MOCK_AGENDA);
  const [showCheckin, setShowCheckin] = useState<Compromisso | null>(null);
  const [showProximas, setShowProximas] = useState(false);
  const [activeTab, setActiveTab] = useState<"hoje" | "proximas">("hoje");

  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const hojeFormatted = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  // Stats do dia
  const stats = {
    total: agenda.length,
    visitas: agenda.filter(a => a.tipo === "visita").length,
    ligacoes: agenda.filter(a => a.tipo === "ligacao").length,
    concluidos: agenda.filter(a => a.status === "concluido").length,
  };

  const handleAddToAgenda = (items: Array<{ lead: any; tipo: "visita"|"ligacao"; dataHora: Date }>) => {
    const novos: Compromisso[] = items.map((item, i) => ({
      id: Date.now() + i,
      tipo: item.tipo,
      titulo: `${item.tipo === "visita" ? "Visita" : "Ligação"} — ${item.lead.nomeFantasia ?? item.lead.razaoSocial ?? "Lead"}`,
      dataHora: item.dataHora,
      duracaoMinutos: item.tipo === "visita" ? 90 : 30,
      empresa: item.lead.nomeFantasia ?? item.lead.razaoSocial,
      cidade: item.lead.cidade && item.lead.uf ? `${item.lead.cidade}/${item.lead.uf}` : undefined,
      telefone: item.lead.whatsapp1 ?? undefined,
      distanciaKm: item.lead.distanciaKm,
      status: "agendado",
      leadId: item.lead.id,
    }));
    setAgenda(prev => [...prev, ...novos].sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime()));
    setShowProximas(false);
  };

  const handleConcluir = (id: number) => {
    setAgenda(prev => prev.map(a => a.id === id ? { ...a, status: "concluido" } : a));
    toast.success("Compromisso concluído!");
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minha Agenda</h1>
          <p className="text-muted-foreground text-sm">{hojeFormatted}</p>
        </div>
        <Button
          style={{ background: "#0a1e5a", color: "white" }}
          className="gap-2"
          onClick={() => setShowProximas(true)}
        >
          <Navigation className="w-4 h-4" />
          Buscar Empresas Próximas
        </Button>
      </div>

      {/* Day stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",     value: stats.total,     color: "#0a1e5a" },
          { label: "Visitas",   value: stats.visitas,   color: "#7C3AED" },
          { label: "Ligações",  value: stats.ligacoes,  color: "#059669" },
          { label: "Concluídos", value: stats.concluidos, color: "#e21d3c" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso do dia</span>
          <span>{stats.concluidos}/{stats.total} concluídos</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: stats.total > 0 ? `${(stats.concluidos/stats.total)*100}%` : "0%",
              background: "#059669"
            }}
          />
        </div>
      </div>

      {/* Agenda list */}
      <div className="space-y-3">
        {agenda.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="font-semibold text-muted-foreground">Agenda vazia</p>
            <p className="text-sm text-muted-foreground mt-1">Use "Buscar Empresas Próximas" para montar sua rota</p>
          </div>
        ) : agenda.map((comp) => {
          const cfg = TIPO_CONFIG[comp.tipo];
          const stCfg = STATUS_CONFIG[comp.status];
          const Icon = cfg.icon;
          const isConcluido = comp.status === "concluido";
          const hora = format(comp.dataHora, "HH:mm");
          return (
            <Card
              key={comp.id}
              className={`border-border transition-all ${isConcluido ? "opacity-60" : "hover:shadow-sm"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Time + icon */}
                  <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                    <span className="text-xs font-bold text-muted-foreground">{hora}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className={`font-semibold text-sm ${isConcluido ? "line-through" : ""}`}>{comp.titulo}</p>
                      <Badge style={{ background: stCfg.color + "20", color: stCfg.color, fontSize: "10px" }}>
                        {stCfg.label}
                      </Badge>
                    </div>
                    {comp.empresa && <p className="text-xs text-muted-foreground mt-0.5">{comp.empresa}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {comp.cidade && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{comp.cidade}
                          {comp.distanciaKm && ` · ${comp.distanciaKm}km`}
                        </span>
                      )}
                      {comp.telefone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />{comp.telefone}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{comp.duracaoMinutos}min
                      </span>
                    </div>
                    {/* Action buttons */}
                    {!isConcluido && (
                      <div className="flex gap-2 mt-2.5 flex-wrap">
                        {comp.tipo === "visita" && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            style={{ background: "#0a1e5a", color: "white" }}
                            onClick={() => setShowCheckin(comp)}
                          >
                            <MapPin className="w-3 h-3" /> Check-in
                          </Button>
                        )}
                        {comp.telefone && (
                          <>
                            <a
                              href={`tel:${comp.telefone.replace(/\D/g,"")}`}
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border border-border bg-card h-7"
                              style={{ color: "#0a1e5a" }}
                            >
                              <Phone className="w-3 h-3" /> Ligar
                            </a>
                            <a
                              href={`https://wa.me/55${comp.telefone.replace(/\D/g,"")}?text=${encodeURIComponent(`Olá! Sou da Gallotti Tractor | LS Tractor. Conforme agendado, estou entrando em contato.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md h-7"
                              style={{ background: "#25D36618", color: "#128C7E" }}
                            >
                              <MessageCircle className="w-3 h-3" /> WA
                            </a>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7 text-green-700 border-green-200"
                          onClick={() => handleConcluir(comp.id)}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Concluir
                        </Button>
                        {comp.leadId && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground"
                            onClick={() => setLocation(`/leads/${comp.leadId}`)}>
                            Ver lead <ChevronRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Check-in Dialog */}
      <Dialog open={!!showCheckin} onOpenChange={() => setShowCheckin(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4" style={{ color: "#e21d3c" }} />
              Check-in — {showCheckin?.empresa}
            </DialogTitle>
          </DialogHeader>
          {showCheckin && (
            <VisitaCheckin
              leadNome={showCheckin.empresa ?? ""}
              leadEndereco={showCheckin.cidade}
              onCheckin={(data) => {
                setAgenda(prev => prev.map(a => a.id === showCheckin!.id
                  ? { ...a, status: "em_andamento" } : a));
                toast.success(`Check-in realizado! ${data.status === "valido" ? "✅ Presença confirmada" : "⚠️ Verifique localização"}`);
              }}
              onCheckout={(dur) => {
                setAgenda(prev => prev.map(a => a.id === showCheckin!.id
                  ? { ...a, status: "concluido" } : a));
                setShowCheckin(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Empresas Próximas Dialog */}
      <Dialog open={showProximas} onOpenChange={setShowProximas}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5" style={{ color: "#0a1e5a" }} />
              Empresas Próximas — Montar Rota
            </DialogTitle>
          </DialogHeader>
          <EmpresasProximas onAddToAgenda={handleAddToAgenda} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
