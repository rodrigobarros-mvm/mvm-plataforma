import { useMemo } from "react";

type Lead = {
  prioridade?: string | null;
  segmento?: string | null;
  whatsapp1?: string | null;
  email?: string | null;
  modeloTrator?: string | null;
  attemptCount?: number | null;
  nomeDecissor?: string | null;
  statusContato?: string | null;
  updatedAt?: Date | string | null;
};

const HIGH_CONV_SEGMENTOS = [
  "Cafeicultura", "Citricultura", "Cana-de-Açúcar", "Fruticultura",
  "Grãos", "Pecuária", "Serviços Agrícolas"
];

function calcScore(lead: Lead): { score: number; label: string; color: string; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Prioridade base
  if (lead.prioridade === "Alta") { score += 30; factors.push("+30 Alta prioridade"); }
  else if (lead.prioridade === "Média") { score += 15; factors.push("+15 Média prioridade"); }

  // Segmento de alta conversão
  const seg = lead.segmento ?? "";
  if (HIGH_CONV_SEGMENTOS.some(s => seg.includes(s))) {
    score += 20; factors.push("+20 Segmento alta conversão");
  }

  // Tem telefone/WhatsApp
  if (lead.whatsapp1) { score += 15; factors.push("+15 WhatsApp disponível"); }

  // Tem e-mail
  if (lead.email) { score += 10; factors.push("+10 E-mail disponível"); }

  // Tem modelo LS recomendado
  if (lead.modeloTrator) { score += 10; factors.push("+10 Modelo LS mapeado"); }

  // Tem nome do decisor
  if (lead.nomeDecissor) { score += 10; factors.push("+10 Decisor identificado"); }

  // Penalidade por muitas tentativas sem sucesso
  const attempts = lead.attemptCount ?? 0;
  if (attempts >= 5) { score -= 20; factors.push("-20 5+ tentativas sem resposta"); }
  else if (attempts >= 3) { score -= 10; factors.push("-10 3+ tentativas sem resposta"); }

  // Status contato
  if (lead.statusContato === "Em contato") { score += 5; factors.push("+5 Em contato"); }
  if (lead.statusContato === "Aguardando retorno") { score += 8; factors.push("+8 Aguardando retorno"); }

  // Dias sem atividade (penalidade)
  if (lead.updatedAt) {
    const days = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / 86400000);
    if (days > 30) { score -= 10; factors.push("-10 Sem atividade há 30+ dias"); }
  }

  const finalScore = Math.max(0, Math.min(100, score));

  let label = "Frio";
  let color = "#94A3B8";
  if (finalScore >= 75) { label = "Quente 🔥"; color = "#e21d3c"; }
  else if (finalScore >= 55) { label = "Morno ♨️"; color = "#D97706"; }
  else if (finalScore >= 35) { label = "Morno ✓"; color = "#0a1e5a"; }

  return { score: finalScore, label, color, factors };
}

export default function LeadScore({ lead }: { lead: Lead }) {
  const { score, label, color, factors } = useMemo(() => calcScore(lead), [
    lead.prioridade, lead.segmento, lead.whatsapp1, lead.email,
    lead.modeloTrator, lead.nomeDecissor, lead.attemptCount, lead.statusContato
  ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score de Temperatura</p>
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, background: color }}
          />
        </div>
        <span className="text-sm font-bold tabular-nums" style={{ color, minWidth: "36px", textAlign: "right" }}>
          {score}
        </span>
      </div>
      <details className="text-xs">
        <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
          Ver fatores de pontuação
        </summary>
        <ul className="mt-2 space-y-0.5 pl-2">
          {factors.map((f, i) => (
            <li key={i} className="text-muted-foreground">{f}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
