import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Phone, MessageCircle, CheckCircle2, XCircle,
  FileText, Clock, CalendarClock, Send
} from "lucide-react";

type Interaction = {
  id: number;
  type: string;
  content?: string | null;
  createdAt: Date | string;
  userName?: string | null;
};

const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  tentativa:     { icon: Phone,          color: "#718096", bg: "#F7F9FC", border: "#E2E8F0", label: "Tentativa de Contato" },
  contato:       { icon: Phone,          color: "#0a1e5a", bg: "#EFF6FF", border: "#BFDBFE", label: "Contato Realizado" },
  qualificacao:  { icon: CheckCircle2,   color: "#059669", bg: "#F0FDF4", border: "#6EE7B7", label: "Lead Qualificado" },
  desqualificacao:{ icon: XCircle,       color: "#e21d3c", bg: "#FEF2F2", border: "#FECACA", label: "Desqualificado" },
  observacao:    { icon: FileText,       color: "#7C3AED", bg: "#F5F3FF", border: "#C4B5FD", label: "Observação" },
  whatsapp_share:{ icon: Send,           color: "#25D366", bg: "#F0FDF4", border: "#6EE7B7", label: "Enviado via WhatsApp" },
};

export default function InteractionTimeline({ interactions }: { interactions: Interaction[] }) {
  if (!interactions || interactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
        <p className="text-xs text-muted-foreground mt-1">As interações aparecerão aqui conforme o BDR trabalhar o lead.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Linha vertical */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-border z-0" />
      {interactions.map((inter, idx) => {
        const cfg = TYPE_CONFIG[inter.type] ?? TYPE_CONFIG.observacao;
        const Icon = cfg.icon;
        const dt = format(new Date(inter.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        const isFirst = idx === 0;
        return (
          <div key={inter.id} className="relative flex gap-4 pb-5 last:pb-0">
            {/* Ícone na linha */}
            <div
              className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <Icon className="w-4 h-4" style={{ color: cfg.color }} />
            </div>
            {/* Conteúdo */}
            <div
              className="flex-1 rounded-xl px-4 py-3 border"
              style={{ background: isFirst ? cfg.bg : "var(--card)", borderColor: isFirst ? cfg.border : "var(--border)" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground">{dt}</span>
              </div>
              {inter.content && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{inter.content}</p>
              )}
              {inter.userName && (
                <p className="text-xs text-muted-foreground mt-1">por {inter.userName}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
