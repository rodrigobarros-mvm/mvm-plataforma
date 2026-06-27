import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User, FileText, MapPin, TrendingUp, Trophy,
  DollarSign, Target, CheckCircle2, Phone, Star
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  adm: "Administrador", admin: "Administrador", gerente: "Gerente",
  bdr: "BDR", consultor: "Consultor Comercial", user: "Usuario",
};

export default function MeuPerfil() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isConsultor = role === "consultor";
  const isBdr = role === "bdr";
  const { data: bdrStats } = trpc.dashboard.bdrStats.useQuery(undefined, { enabled: isBdr });
  const { data: propostasStats } = trpc.propostas.stats.useQuery(undefined, { enabled: isConsultor });
  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0,2).toUpperCase() ?? "??";

  const kpis = isConsultor ? [
    { icon: FileText,    label: "Propostas este mes",  value: propostasStats?.mesAtual ?? 0,  color: "#0a1e5a" },
    { icon: DollarSign,  label: "Volume este mes",      value: `R$ ${((propostasStats?.volumeMes ?? 0)/1000).toFixed(0)}k`, color: "#059669" },
    { icon: CheckCircle2,label: "Propostas aceitas",   value: propostasStats?.aceitas ?? 0,   color: "#059669" },
    { icon: TrendingUp,  label: "Total de propostas",  value: propostasStats?.totalGeral ?? 0, color: "#7C3AED" },
  ] : [
    { icon: Phone,       label: "Tentativas hoje",     value: bdrStats?.todayAttempts ?? 0,   color: "#0a1e5a" },
    { icon: CheckCircle2,label: "Qualificados hoje",   value: bdrStats?.todayQualified ?? 0,  color: "#059669" },
    { icon: Target,      label: "Meta tentativas",     value: bdrStats?.dailyAttemptsGoal ?? 80, color: "#D97706" },
    { icon: Star,        label: "Total qualificados",  value: bdrStats?.totalQualified ?? 0,  color: "#e21d3c" },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>

      {/* Profile card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 border-4" style={{ borderColor: "#0a1e5a40" }}>
              <AvatarFallback className="text-2xl font-black text-white" style={{ background: "#0a1e5a" }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-muted-foreground text-sm">{user?.email}</p>
              <Badge className="mt-2" style={{ background: "#0a1e5a20", color: "#0a1e5a" }}>
                {ROLE_LABELS[role] ?? role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <k.icon className="w-4 h-4" style={{ color: k.color }} />
                <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
              </div>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card className="border-border" style={{ background: "linear-gradient(135deg, #0a1e5a08, #e21d3c05)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4" style={{ color: "#e21d3c" }} />
            Dica do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isConsultor
              ? "Consultores que fazem check-in em todas as visitas tem 40% mais credibilidade com o gestor. Nunca esqueca de fazer o check-in ao chegar no cliente!"
              : "BDRs que ligam entre 7h-9h tem 2x mais chance de contato que em outros horarios. Comece o dia com as ligacoes!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
