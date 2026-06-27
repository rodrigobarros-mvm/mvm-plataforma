import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Plus, X, Phone, MessageCircle, MapPin, FileText, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

const CONSULTOR_ACTIONS = [
  { icon: FileText,     label: "Proposta enviada",  tipo: "proposta_enviada",  color: "#0a1e5a" },
  { icon: MapPin,       label: "Visita realizada",  tipo: "visita_realizada",  color: "#7C3AED" },
  { icon: CheckCircle2, label: "Venda fechada",     tipo: "venda_realizada",   color: "#059669" },
  { icon: MessageCircle,label: "WhatsApp enviado",  tipo: "whatsapp",          color: "#25D366" },
];

const BDR_ACTIONS = [
  { icon: Phone,        label: "Tentativa",         tipo: "tentativa",         color: "#0a1e5a" },
  { icon: CheckCircle2, label: "Contato feito",     tipo: "contato",           color: "#059669" },
  { icon: MessageCircle,label: "WhatsApp enviado",  tipo: "whatsapp_share",    color: "#25D366" },
  { icon: FileText,     label: "Observação",        tipo: "observacao",        color: "#7C3AED" },
];

export default function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const role = (user as any)?.role ?? "bdr";
  const isConsultor = role === "consultor";
  const actions = isConsultor ? CONSULTOR_ACTIONS : BDR_ACTIONS;

  const handleAction = (tipo: string) => {
    setConfirming(tipo);
    setTimeout(() => {
      setConfirming(null);
      setOpen(false);
      toast.success("Atividade registrada!", {
        icon: "✅",
        duration: 2000,
      });
    }, 800);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6 flex flex-col items-end gap-3">
      {/* Action buttons — appear when open */}
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((action) => {
            const Icon = action.icon;
            const isConfirming = confirming === action.tipo;
            return (
              <button
                key={action.tipo}
                onClick={() => handleAction(action.tipo)}
                className="flex items-center gap-3 pl-4 pr-3 h-12 rounded-full shadow-lg text-white font-semibold text-sm transition-all active:scale-95"
                style={{
                  background: isConfirming ? "#059669" : action.color,
                  minWidth: "180px",
                }}
              >
                <span className="flex-1 text-left">
                  {isConfirming ? "✅ Registrado!" : action.label}
                </span>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  {isConfirming
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Icon className="w-4 h-4" />
                  }
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95"
        style={{ background: open ? "#64748b" : "#e21d3c", color: "white" }}
      >
        {open
          ? <X className="w-6 h-6" />
          : <Plus className="w-6 h-6" />
        }
      </button>
    </div>
  );
}
