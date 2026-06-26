import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Target, Phone, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function BdrProgressBar() {
  const { user } = useAuth();
  const isBdr = user?.role === "bdr";
  const isGerente = ["gerente", "diretor", "coordenador", "supervisor"].includes(user?.role ?? "");

  const { data: stats } = trpc.dashboard.bdrStats.useQuery(undefined, {
    enabled: !!user && (isBdr || isGerente),
    refetchInterval: 60_000,
  });

  if (!stats || (!isBdr && !isGerente)) return null;

  const attemptsGoal = stats.dailyAttemptsGoal ?? 80;
  const leadsGoal = stats.dailyGoal ?? 5;

  // Total de atividade = tentativas simples + contatos realizados (ambos contam para a meta)
  const attempts = stats.todayAttempts ?? 0;
  const contacts = (stats as any).todayContacts ?? 0;
  const totalContactActivity = attempts + contacts;
  const qualified = stats.todayQualified ?? 0;

  // Percentuais para a barra unificada
  const totalPercent = Math.min(100, Math.round((totalContactActivity / attemptsGoal) * 100));
  const contactsPercent = Math.min(totalPercent, Math.round((contacts / attemptsGoal) * 100));
  const attemptsOnlyPercent = Math.max(0, totalPercent - contactsPercent);
  const leadsPercent = Math.min(100, Math.round((qualified / leadsGoal) * 100));

  const barBaseColor =
    totalPercent >= 100 ? "#22c55e"
    : totalPercent >= 60 ? "#3b82f6"
    : totalPercent >= 30 ? "#eab308"
    : "#ef4444";

  const leadsColor =
    leadsPercent >= 100 ? "#22c55e"
    : leadsPercent >= 60 ? "#3b82f6"
    : leadsPercent >= 30 ? "#eab308"
    : "#ef4444";

  return (
    <div
      className="w-full px-4 py-2 flex items-center gap-6 border-b border-border text-sm"
      style={{ background: "oklch(0.17 0.06 240)", minHeight: 52 }}
    >
      {/* ── Bloco unificado: Tentativas + Contatos Realizados ── */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Phone className="w-4 h-4 text-white/70 shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Linha de texto */}
          <div className="flex items-center justify-between mb-0.5 gap-1">
            <span className="text-white/70 text-xs truncate">Tentativas hoje</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-white font-semibold text-xs">
                {totalContactActivity}/{attemptsGoal}
              </span>
              {contacts > 0 && (
                <span
                  className="flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(34,197,94,0.18)", color: "#4ade80" }}
                  title={`${contacts} contato${contacts > 1 ? "s" : ""} realizado${contacts > 1 ? "s" : ""}`}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {contacts}
                </span>
              )}
            </div>
          </div>

          {/* Barra segmentada: tentativas (cor dinâmica) + contatos realizados (verde) */}
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden flex">
            {attemptsOnlyPercent > 0 && (
              <div
                className="h-2 transition-all duration-500"
                style={{
                  width: `${attemptsOnlyPercent}%`,
                  background: barBaseColor,
                  borderRadius: contactsPercent > 0 ? "9999px 0 0 9999px" : "9999px",
                }}
              />
            )}
            {contactsPercent > 0 && (
              <div
                className="h-2 transition-all duration-500"
                style={{
                  width: `${contactsPercent}%`,
                  background: "#22c55e",
                  borderRadius: attemptsOnlyPercent > 0 ? "0 9999px 9999px 0" : "9999px",
                }}
              />
            )}
          </div>

          {/* Legenda compacta (apenas quando há contatos realizados) */}
          {contacts > 0 && (
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-white/50">
                <span className="inline-block w-2 h-1.5 rounded-full" style={{ background: barBaseColor }} />
                {attempts} tentativas
              </span>
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="inline-block w-2 h-1.5 rounded-full bg-green-500" />
                {contacts} contatos realizados
              </span>
            </div>
          )}
        </div>
        {totalPercent >= 100 && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">
            ✓ Meta
          </Badge>
        )}
      </div>

      {/* Divisor */}
      <div className="w-px h-8 bg-white/10 shrink-0" />

      {/* ── Leads qualificados ── */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Target className="w-4 h-4 text-white/70 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-white/70 text-xs truncate">Leads qualificados hoje</span>
            <span className="text-white font-semibold text-xs ml-2 shrink-0">
              {qualified}/{leadsGoal}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${leadsPercent}%`, background: leadsColor }}
            />
          </div>
        </div>
        {leadsPercent >= 100 && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">
            🏆 Meta
          </Badge>
        )}
      </div>

      {/* Divisor */}
      <div className="w-px h-8 bg-white/10 shrink-0" />

      {/* Botão modo de trabalho — visível em todas as telas */}
      {isBdr && (
        <Link href="/work-mode">
          <button
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shrink-0"
            style={{ background: "#e21d3c", color: "white" }}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Iniciar Prospecção</span>
            <span className="sm:hidden">Prospectar</span>
          </button>
        </Link>
      )}
    </div>
  );
}
