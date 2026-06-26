import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageCircle, Mail, Clock, CheckCircle2 } from "lucide-react";

type CadenciaStep = {
  dia: number;
  canal: "ligacao" | "whatsapp" | "email";
  label: string;
  descricao: string;
};

const CADENCIA: CadenciaStep[] = [
  { dia: 1,  canal: "ligacao",   label: "Dia 1 — Ligação",         descricao: "Primeira abordagem por telefone" },
  { dia: 2,  canal: "whatsapp",  label: "Dia 2 — WhatsApp",        descricao: "Mensagem de apresentação com material" },
  { dia: 4,  canal: "ligacao",   label: "Dia 4 — 2ª Ligação",      descricao: "Retorno se não houve resposta" },
  { dia: 7,  canal: "email",     label: "Dia 7 — E-mail",          descricao: "Proposta detalhada por e-mail" },
  { dia: 10, canal: "whatsapp",  label: "Dia 10 — Follow-up Final", descricao: "Última tentativa de contato" },
];

const CANAL_ICONS = {
  ligacao:  Phone,
  whatsapp: MessageCircle,
  email:    Mail,
};

const CANAL_COLORS = {
  ligacao:  "#0a1e5a",
  whatsapp: "#25D366",
  email:    "#7C3AED",
};

export default function CadenciaDisplay({
  attemptCount = 0,
  onNextStep,
}: {
  attemptCount?: number;
  onNextStep?: (step: CadenciaStep) => void;
}) {
  const currentStep = Math.min(attemptCount, CADENCIA.length - 1);
  const nextStep = CADENCIA[currentStep];
  const isComplete = attemptCount >= CADENCIA.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cadência de Prospecção
        </p>
        <Badge variant="outline" className="text-xs">
          {isComplete ? "Concluída" : `Passo ${attemptCount + 1} de ${CADENCIA.length}`}
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1">
        {CADENCIA.map((step, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all"
            style={{
              background: i < attemptCount ? CANAL_COLORS[step.canal]
                : i === attemptCount ? CANAL_COLORS[step.canal] + "60"
                : "var(--border)"
            }}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-1.5">
        {CADENCIA.map((step, i) => {
          const Icon = CANAL_ICONS[step.canal];
          const isDone = i < attemptCount;
          const isCurrent = i === attemptCount && !isComplete;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                isCurrent ? "ring-1 ring-offset-1" : ""
              }`}
              style={{
                background: isCurrent ? CANAL_COLORS[step.canal] + "10" : "transparent",
                ringColor: isCurrent ? CANAL_COLORS[step.canal] : "transparent",
                opacity: isDone ? 0.5 : 1,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDone ? "#F0FDF4" : isCurrent ? CANAL_COLORS[step.canal] + "20" : "var(--muted)",
                }}
              >
                {isDone
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  : <Icon className="w-3.5 h-3.5" style={{ color: CANAL_COLORS[step.canal] }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.descricao}</p>
              </div>
              {isCurrent && onNextStep && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 px-2 shrink-0"
                  style={{ borderColor: CANAL_COLORS[step.canal], color: CANAL_COLORS[step.canal] }}
                  onClick={() => onNextStep(step)}
                >
                  Executar
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="rounded-lg p-3 text-center" style={{ background: "#FEF2F2" }}>
          <p className="text-xs font-semibold text-red-700">Cadência concluída</p>
          <p className="text-xs text-red-600 mt-0.5">Considere desqualificar este lead ou criar um follow-up manual.</p>
        </div>
      )}
    </div>
  );
}
