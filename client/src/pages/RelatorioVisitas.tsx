import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, CheckCircle2, AlertTriangle, XCircle,
  Clock, User, Calendar, Filter, Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data — will be replaced by real backend data
const MOCK_CHECKINS = [
  { id: 1, userName: "Carlos Menezes", empresa: "BRASILAGRO S/A", cidade: "Jaborandi/BA", lat: -14.03, lng: -44.52, status: "valido", distanciaMetros: 180, durMinutos: 75, createdAt: new Date(Date.now() - 3600000 * 2) },
  { id: 2, userName: "Fernanda Lima", empresa: "FRUTIAGRO LTDA", cidade: "Barreiras/BA", lat: -12.15, lng: -45.00, status: "suspeito", distanciaMetros: 1240, durMinutos: 45, createdAt: new Date(Date.now() - 3600000 * 5) },
  { id: 3, userName: "Carlos Menezes", empresa: "COOP. CANA OESTE", cidade: "Santa Maria/BA", lat: -13.98, lng: -44.21, status: "valido", distanciaMetros: 320, durMinutos: 90, createdAt: new Date(Date.now() - 86400000) },
  { id: 4, userName: "Roberto Vasconcelos", empresa: "AGRO CERRADO LTDA", cidade: "Luís Eduardo Magalhães/BA", lat: -12.09, lng: -45.78, status: "invalido", distanciaMetros: 4200, durMinutos: 30, createdAt: new Date(Date.now() - 86400000 * 2) },
  { id: 5, userName: "Fernanda Lima", empresa: "SEMENTES OURO VERDE", cidade: "Barreiras/BA", lat: -12.14, lng: -44.99, status: "valido", distanciaMetros: 95, durMinutos: 120, createdAt: new Date(Date.now() - 86400000 * 3) },
];

const STATUS_CONFIG = {
  valido:   { label: "✅ Válido",    color: "#059669", bg: "#f0fdf4", icon: CheckCircle2 },
  suspeito: { label: "⚠️ Suspeito", color: "#D97706", bg: "#fef3c7", icon: AlertTriangle },
  invalido: { label: "❌ Inválido",  color: "#e21d3c", bg: "#fef2f2", icon: XCircle },
};

export default function RelatorioVisitas() {
  const { user } = useAuth();
  const [filtroConsultor, setFiltroConsultor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [periodo, setPeriodo] = useState("semana");

  const checkins = MOCK_CHECKINS.filter(c => {
    if (filtroConsultor && !c.userName.toLowerCase().includes(filtroConsultor.toLowerCase())) return false;
    if (filtroStatus && c.status !== filtroStatus) return false;
    return true;
  });

  const stats = {
    total: checkins.length,
    validos: checkins.filter(c => c.status === "valido").length,
    suspeitos: checkins.filter(c => c.status === "suspeito").length,
    invalidos: checkins.filter(c => c.status === "invalido").length,
    durTotal: checkins.reduce((acc, c) => acc + (c.durMinutos || 0), 0),
  };

  const consultores = [...new Set(MOCK_CHECKINS.map(c => c.userName))];

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatório de Visitas</h1>
          <p className="text-muted-foreground text-sm mt-1">Check-ins GPS dos consultores comerciais</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 flex-wrap">
        {[["hoje","Hoje"],["semana","Esta semana"],["mes","Este mês"]].map(([k,l])=>(
          <Button key={k} size="sm" variant={periodo===k?"default":"outline"}
            style={periodo===k?{background:"#0a1e5a"}:{}}
            onClick={()=>setPeriodo(k)}>{l}</Button>
        ))}
        <select className="border border-border rounded-md text-sm px-3 py-1.5 bg-background ml-auto"
          value={filtroConsultor} onChange={e=>setFiltroConsultor(e.target.value)}>
          <option value="">Todos os consultores</option>
          {consultores.map(c=><option key={c}>{c}</option>)}
        </select>
        <select className="border border-border rounded-md text-sm px-3 py-1.5 bg-background"
          value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="valido">✅ Válidos</option>
          <option value="suspeito">⚠️ Suspeitos</option>
          <option value="invalido">❌ Inválidos</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total de Visitas", value: stats.total, color: "#0a1e5a" },
          { label: "✅ Confirmadas", value: stats.validos, color: "#059669" },
          { label: "⚠️ Suspeitas", value: stats.suspeitos, color: "#D97706" },
          { label: "❌ Inválidas", value: stats.invalidos, color: "#e21d3c" },
        ].map(s=>(
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              <p className="text-2xl font-black mt-1" style={{ color:s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map placeholder */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" style={{ color:"#0a1e5a" }} />
            Mapa de Visitas
          </CardTitle>
          <CardDescription>Localização GPS dos check-ins no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl overflow-hidden border border-border" style={{ height: "380px", position: "relative" }}>
            {/* Google Maps embed showing checkin locations */}
            {checkins.length > 0 && localStorage.getItem("maps_api_key") ? (
              <iframe
                title="Mapa de Visitas"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps/embed/v1/search?key=${localStorage.getItem("maps_api_key") ?? ""}&q=${encodeURIComponent(
                  checkins.map(c => c.cidade).filter(Boolean).join("|") || "Luís Eduardo Magalhães, BA"
                )}&zoom=7&language=pt-BR`}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/30 flex-col gap-3">
                <MapPin className="w-12 h-12 text-muted-foreground/30" />
                {!localStorage.getItem("maps_api_key") ? (
                  <div className="text-center px-6">
                    <p className="text-sm font-semibold text-muted-foreground">Chave Google Maps não configurada</p>
                    <p className="text-xs text-muted-foreground mt-1">Acesse <strong>Configurações → Google Maps API</strong> para ativar o mapa</p>
                    <a href="/configuracoes" className="text-xs text-blue-600 underline mt-2 block">Ir para Configurações →</a>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">Nenhum check-in no período</p>
                )}
              </div>
            )}
            {/* Overlay with check-in status summary */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {checkins.slice(0, 5).map((c, i) => {
                const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
                return (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg shadow-md text-xs font-semibold"
                    style={{ background: "white", border: `2px solid ${cfg.color}` }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                    <span className="max-w-[120px] truncate">{c.empresa.split(" ")[0]}</span>
                    <span className="text-muted-foreground">{c.durMinutos}min</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Para ativar o mapa interativo com localização GPS real, adicione sua chave Google Maps API nas configurações.
          </p>
          {/* Legend */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([k,v])=>(
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ background: v.color }} />
                {v.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Check-in list */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Histórico de Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checkins.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhum check-in no período</p>
            ) : checkins.map(c => {
              const cfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG];
              const Icon = cfg.icon;
              return (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border transition-colors hover:bg-muted/30"
                  style={{ borderColor: cfg.color + "30", background: cfg.bg + "40" }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                    <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <p className="text-sm font-bold truncate">{c.empresa}</p>
                      <Badge style={{ background: cfg.bg, color: cfg.color, fontSize: "10px", border: `1px solid ${cfg.color}40` }}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{c.userName}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.cidade}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.durMinutos} min</span>
                      <span>{format(c.createdAt, "dd/MM HH:mm", { locale: ptBR })}</span>
                    </div>
                    {c.distanciaMetros > 500 && (
                      <p className="text-xs mt-1" style={{ color: cfg.color }}>
                        Distância ao cliente: {c.distanciaMetros >= 1000 ? `${(c.distanciaMetros/1000).toFixed(1)}km` : `${c.distanciaMetros}m`}
                        {c.status === "suspeito" && " — revisar localização"}
                        {c.status === "invalido" && " — consultor não estava no local"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
