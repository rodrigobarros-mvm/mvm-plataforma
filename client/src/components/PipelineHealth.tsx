import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function PipelineHealth() {
  const [, setLocation] = useLocation();
  const { data: opps } = trpc.oportunidades.list.useQuery({ limit: 100 });

  if (!opps?.data?.length) return null;

  const now = Date.now();
  const DAY = 86400000;

  const analise = opps.data.map((o: any) => {
    const dias = Math.floor((now - new Date(o.updatedAt).getTime()) / DAY);
    return { ...o, diasParado: dias };
  });

  const paradas7            = analise.filter((o: any) => o.diasParado >= 7 && !["ganho","perdido","cancelado"].includes(o.status));
  const propostaSemResposta = analise.filter((o: any) => o.status === "proposta_enviada" && o.diasParado >= 5);
  const aguardandoConsultor = analise.filter((o: any) => o.status === "aguardando_consultor" && o.diasParado >= 2);
  const ganhos              = analise.filter((o: any) => o.status === "ganho");
  const conversao           = analise.length > 0 ? Math.round((ganhos.length / analise.length) * 100) : 0;

  const alertas = [
    ...paradas7.map((o: any)            => ({ tipo: "parada",    opp: o, msg: `Parada há ${o.diasParado} dias`,                    color: "#e21d3c" })),
    ...propostaSemResposta.map((o: any) => ({ tipo: "proposta",  opp: o, msg: `Proposta sem resposta há ${o.diasParado} dias`,      color: "#D97706" })),
    ...aguardandoConsultor.map((o: any) => ({ tipo: "aguardando",opp: o, msg: `Aguardando consultor há ${o.diasParado} dias`,       color: "#7C3AED" })),
  ].sort((a, b) => b.opp.diasParado - a.opp.diasParado).slice(0, 8);

  if (alertas.length === 0 && conversao >= 20) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          Saúde do Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl border border-border">
            <p className="text-2xl font-black text-green-700">{ganhos.length}</p>
            <p className="text-xs text-muted-foreground">Ganhos</p>
          </div>
          <div className="text-center p-3 rounded-xl border border-border">
            <p className="text-2xl font-black" style={{ color: alertas.length > 0 ? "#e21d3c" : "#059669" }}>
              {alertas.length}
            </p>
            <p className="text-xs text-muted-foreground">Alertas</p>
          </div>
          <div className="text-center p-3 rounded-xl border border-border">
            <p className="text-2xl font-black" style={{ color: conversao >= 20 ? "#059669" : "#D97706" }}>
              {conversao}%
            </p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </div>
        </div>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <button
                key={i}
                onClick={() => setLocation("/oportunidades")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:bg-muted/50 transition-colors"
                style={{ borderColor: a.color + "40", background: a.color + "06" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: a.color + "20" }}
                >
                  <Clock className="w-4 h-4" style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {a.opp.leadNome ?? a.opp.leadRazao ?? `Opp #${a.opp.id}`}
                  </p>
                  <p className="text-xs" style={{ color: a.color }}>{a.msg}</p>
                </div>
                <Badge style={{ background: a.color + "20", color: a.color, fontSize: "10px" }}>
                  {a.opp.modeloInteresse ?? "—"}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
