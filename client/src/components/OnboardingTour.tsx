import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, Star, Zap, TrendingUp, Calendar, Trophy } from "lucide-react";

const STEPS_BDR = [
  { icon: Star,      title: "Alta Prioridade",    desc: "Comece sempre pelos leads de Alta Prioridade. Sao os mais propensos a comprar. Acesse em Leads > Alta Prioridade.", action: "/leads/priority", color: "#e21d3c" },
  { icon: Zap,       title: "Modo de Trabalho",   desc: "Use o Modo de Trabalho para prospectar em serie. A fila ja vem organizada por score. Um lead por vez, foco total.", action: "/work-mode", color: "#0a1e5a" },
  { icon: Calendar,  title: "Follow-ups",          desc: "Sempre agende um proximo passo. Leads com follow-up agendado convertem 3x mais que sem retorno definido.", action: "/follow-ups", color: "#7C3AED" },
  { icon: TrendingUp,title: "Passar para Consultor", desc: "Quando o lead demonstrar interesse real, passe para o Consultor Comercial em Pipeline > Passar Lead Qualificado.", action: "/oportunidades", color: "#059669" },
  { icon: Trophy,    title: "Seu Ranking",         desc: "Acompanhe sua posicao no ranking diariamente. Os top BDRs ganham bonus de comissao extra!", action: "/ranking", color: "#D97706" },
];

const STEPS_CONSULTOR = [
  { icon: Calendar,  title: "Minha Agenda",        desc: "Comece o dia pela sua agenda. Voce pode usar Buscar Empresas Proximas para montar a rota de visitas do dia.", action: "/agenda-consultor", color: "#0a1e5a" },
  { icon: Zap,       title: "Nova Oportunidade",   desc: "Cadastre novos clientes diretamente. O sistema busca dados da Receita Federal pelo CNPJ automaticamente.", action: "/nova-oportunidade", color: "#e21d3c" },
  { icon: TrendingUp,title: "Pipeline",            desc: "Acompanhe todas as suas oportunidades. Leads que o BDR qualificou chegam aqui — clique em Assumir para comecar.", action: "/oportunidades", color: "#7C3AED" },
  { icon: Star,      title: "Gerar Proposta",       desc: "Gere propostas profissionais em PDF com layout LS Tractor ou ENSIGN, simulacao FINAME e envio por WhatsApp.", action: "/gerar-proposta", color: "#059669" },
  { icon: Trophy,    title: "Ranking Consultores", desc: "Seu ranking e medido por propostas, visitas, vendas e faturamento. Faca check-in em todas as visitas!", action: "/ranking-consultores", color: "#D97706" },
];

const TOUR_KEY = "onboarding_done_v2";

export default function OnboardingTour() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const role = (user as any)?.role ?? "bdr";
  const isConsultor = role === "consultor";
  const steps = isConsultor ? STEPS_CONSULTOR : STEPS_BDR;

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(TOUR_KEY + "_" + role);
    if (!done) setTimeout(() => setVisible(true), 1500);
  }, [user, role]);

  const handleDone = () => {
    localStorage.setItem(TOUR_KEY + "_" + role, "1");
    setVisible(false);
  };

  const handleGo = () => {
    setLocation(steps[step].action);
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleDone();
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDone} />
      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border overflow-hidden shadow-2xl"
        style={{ background: "var(--card)" }}>
        {/* Progress */}
        <div className="h-1 bg-muted">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: current.color }} />
        </div>
        {/* Close */}
        <button onClick={handleDone} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: current.color + "20" }}>
              <Icon className="w-6 h-6" style={{ color: current.color }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Passo {step + 1} de {steps.length}
              </p>
              <p className="font-bold text-lg">{current.title}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.desc}</p>
          <div className="flex gap-2">
            {step < steps.length - 1 ? (
              <>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep(s => s + 1)}>
                  Pular
                </Button>
                <Button size="sm" className="flex-1 gap-2" style={{ background: current.color, color: "white" }} onClick={handleGo}>
                  Ver agora <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </>
            ) : (
              <Button className="w-full gap-2" style={{ background: current.color, color: "white" }} onClick={handleDone}>
                <Trophy className="w-4 h-4" /> Comecar a usar!
              </Button>
            )}
          </div>
          {/* Step dots */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                style={{ background: i === step ? current.color : "var(--muted)" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
