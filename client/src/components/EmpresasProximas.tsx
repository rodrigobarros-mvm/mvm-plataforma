import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin, Loader2, Phone, MessageCircle, Calendar,
  Navigation, Route, Star, CheckCircle2, Clock
} from "lucide-react";
import { toast } from "sonner";

type Lead = {
  id: number;
  nomeFantasia: string | null;
  razaoSocial: string | null;
  cidade: string | null;
  uf: string | null;
  whatsapp1: string | null;
  segmento: string | null;
  prioridade: string | null;
  distanciaKm?: number;
};

type SugestaoTipo = "visita" | "ligacao";

type LeadSugerido = Lead & {
  sugestao: SugestaoTipo;
  motivoSugestao: string;
};

function sugerirAcao(lead: Lead, distKm: number): SugestaoTipo {
  if (distKm <= 50) return "visita";
  return "ligacao";
}

export default function EmpresasProximas({ onAddToAgenda }: {
  onAddToAgenda?: (items: Array<{ lead: Lead; tipo: SugestaoTipo; dataHora: Date }>) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sugestoes, setSugestoes] = useState<LeadSugerido[]>([]);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"idle" | "found" | "scheduled">("idle");

  const { data: leadsData } = trpc.leads.list.useQuery(
    { limit: 200, isHighPriority: true, status: "Não iniciado" },
    { enabled: coords !== null }
  );

  const buscarProximas = useCallback(async () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });

        // Get reverse geocode
        let cidadeAtual = "";
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { "Accept-Language": "pt-BR" }
          });
          const d = await r.json();
          cidadeAtual = d.address?.city ?? d.address?.town ?? d.address?.state ?? "";
        } catch {}

        // Filter leads by UF within ~400km range
        // States within 400km of Pernambuco: PE, PB, RN, AL, SE, BA, CE, PI, MA
        const ufsProximas = ["PE", "PB", "RN", "AL", "SE", "BA", "CE", "PI", "MA"];

        // Simple distance estimation using lat/lng degrees
        // 1 degree ≈ 111km
        function estimarDistancia(uf: string, cidade: string | null): number {
          // Approx coordinates for NE capitals
          const coords: Record<string, [number, number]> = {
            PE: [-8.05, -34.88], PB: [-7.12, -34.86], RN: [-5.79, -35.21],
            AL: [-9.67, -35.74], SE: [-10.91, -37.07], BA: [-12.97, -38.50],
            CE: [-3.72, -38.54], PI: [-5.09, -42.80], MA: [-2.53, -44.30],
          };
          const c = coords[uf];
          if (!c) return 999;
          const dlat = (c[0] - lat) * 111;
          const dlng = (c[1] - lng) * 111 * Math.cos(lat * Math.PI / 180);
          return Math.round(Math.sqrt(dlat*dlat + dlng*dlng));
        }

        setLoading(false);
        setStep("found");
        toast.success(`Localização obtida! Buscando empresas em até 400km...`);
      },
      () => {
        setLoading(false);
        toast.error("Não foi possível obter localização. Ative o GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Process leads when both coords and leads are available
  const processLeads = useCallback(() => {
    if (!coords || !leadsData?.data) return;
    const { lat, lng } = coords;

    function estimarDistancia(uf: string | null): number {
      const coordsMap: Record<string, [number, number]> = {
        PE: [-8.05, -34.88], PB: [-7.12, -34.86], RN: [-5.79, -35.21],
        AL: [-9.67, -35.74], SE: [-10.91, -37.07], BA: [-12.97, -38.50],
        CE: [-3.72, -38.54], PI: [-5.09, -42.80], MA: [-2.53, -44.30],
        GO: [-16.69, -49.25], DF: [-15.79, -47.88], MG: [-19.93, -43.93],
      };
      const c = coordsMap[uf ?? ""] ?? null;
      if (!c) return 999;
      const dlat = (c[0] - lat) * 111;
      const dlng = (c[1] - lng) * 111 * Math.cos(lat * Math.PI / 180);
      return Math.round(Math.sqrt(dlat*dlat + dlng*dlng));
    }

    const results: LeadSugerido[] = (leadsData.data as Lead[])
      .map(l => ({
        ...l,
        distanciaKm: estimarDistancia(l.uf),
      }))
      .filter(l => l.distanciaKm <= 400)
      .sort((a, b) => (a.distanciaKm ?? 999) - (b.distanciaKm ?? 999))
      .slice(0, 20)
      .map(l => ({
        ...l,
        sugestao: sugerirAcao(l, l.distanciaKm ?? 999),
        motivoSugestao: l.distanciaKm! <= 50
          ? `${l.distanciaKm}km — ideal para visita presencial`
          : `${l.distanciaKm}km — recomendado contato por telefone/WA`,
      }));

    setSugestoes(results);
    setSelecionados(new Set(results.map(r => r.id)));
  }, [coords, leadsData]);

  // Auto-process when data arrives
  if (coords && leadsData?.data && sugestoes.length === 0 && step === "found") {
    processLeads();
  }

  const handleAgendar = () => {
    const selecionadosList = sugestoes.filter(s => selecionados.has(s.id));
    const hoje = new Date();
    const agendamentos = selecionadosList.map((s, i) => {
      const dt = new Date(hoje);
      dt.setHours(8 + Math.floor(i * 1.5), (i * 90) % 60, 0, 0);
      return { lead: s, tipo: s.sugestao, dataHora: dt };
    });
    onAddToAgenda?.(agendamentos);
    setStep("scheduled");
    toast.success(`${agendamentos.length} compromissos adicionados à sua agenda!`);
  };

  if (step === "idle") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2">
          <Route className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="font-semibold text-foreground">Buscar Empresas Próximas</p>
          <p className="text-xs text-muted-foreground">
            O sistema detecta sua localização e sugere empresas em até 400km para visitar ou ligar hoje
          </p>
          <Button
            className="w-full gap-2 mt-2"
            style={{ background: "#0a1e5a", color: "white" }}
            onClick={buscarProximas}
            disabled={loading}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Obtendo localização...</>
              : <><Navigation className="w-4 h-4" /> Buscar Empresas Próximas</>
            }
          </Button>
        </div>
      </div>
    );
  }

  if (step === "found") {
    if (sugestoes.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Carregando empresas próximas...
        </div>
      );
    }

    const visitas = sugestoes.filter(s => s.sugestao === "visita");
    const ligacoes = sugestoes.filter(s => s.sugestao === "ligacao");

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{sugestoes.length} empresas encontradas em até 400km</p>
          <div className="flex gap-2 text-xs">
            <Badge style={{ background: "#0a1e5a20", color: "#0a1e5a" }}>🚗 {visitas.length} visitas</Badge>
            <Badge style={{ background: "#25D36620", color: "#128C7E" }}>📞 {ligacoes.length} ligações</Badge>
          </div>
        </div>

        {/* Visitas sugeridas */}
        {visitas.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
              🚗 Visitas Recomendadas (até 50km)
            </p>
            <div className="space-y-2">
              {visitas.map(s => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: selecionados.has(s.id) ? "#0a1e5a" : "var(--border)",
                    background: selecionados.has(s.id) ? "#EFF6FF" : "var(--card)",
                  }}
                  onClick={() => setSelecionados(prev => {
                    const next = new Set(prev);
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                    return next;
                  })}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5`}
                    style={{ borderColor: selecionados.has(s.id) ? "#0a1e5a" : "var(--border)", background: selecionados.has(s.id) ? "#0a1e5a" : "transparent" }}>
                    {selecionados.has(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{s.nomeFantasia ?? s.razaoSocial}</p>
                    <p className="text-xs text-muted-foreground">{s.cidade}/{s.uf} · {s.segmento?.split("/")[0]?.trim()}</p>
                    <p className="text-xs mt-1 font-semibold" style={{ color: "#0a1e5a" }}>🚗 {s.motivoSugestao}</p>
                  </div>
                  <Badge style={{ background: "#0a1e5a20", color: "#0a1e5a", fontSize: "10px" }}>{s.distanciaKm}km</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ligações sugeridas */}
        {ligacoes.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
              📞 Ligações Recomendadas (50-400km)
            </p>
            <div className="space-y-2">
              {ligacoes.slice(0, 8).map(s => (
                <div
                  key={s.id}
                  className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: selecionados.has(s.id) ? "#25D366" : "var(--border)",
                    background: selecionados.has(s.id) ? "#f0fdf4" : "var(--card)",
                  }}
                  onClick={() => setSelecionados(prev => {
                    const next = new Set(prev);
                    next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                    return next;
                  })}
                >
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                    style={{ borderColor: selecionados.has(s.id) ? "#25D366" : "var(--border)", background: selecionados.has(s.id) ? "#25D366" : "transparent" }}>
                    {selecionados.has(s.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{s.nomeFantasia ?? s.razaoSocial}</p>
                    <p className="text-xs text-muted-foreground">{s.cidade}/{s.uf}</p>
                    <p className="text-xs mt-1 font-semibold text-green-700">📞 {s.motivoSugestao}</p>
                  </div>
                  <Badge style={{ background: "#25D36620", color: "#128C7E", fontSize: "10px" }}>{s.distanciaKm}km</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => setSelecionados(new Set(sugestoes.map(s => s.id)))}>
            Selecionar todos
          </Button>
          <Button variant="outline" size="sm" className="gap-1"
            onClick={() => setSelecionados(new Set())}>
            Limpar
          </Button>
          <Button
            className="flex-1 gap-2 ml-auto"
            style={{ background: "#e21d3c", color: "white" }}
            disabled={selecionados.size === 0}
            onClick={handleAgendar}
          >
            <Calendar className="w-4 h-4" />
            Adicionar {selecionados.size} à Agenda
          </Button>
        </div>
      </div>
    );
  }

  if (step === "scheduled") {
    return (
      <div className="text-center py-6 space-y-2">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
        <p className="font-bold text-green-700">Agenda criada com sucesso!</p>
        <p className="text-sm text-muted-foreground">Acesse "Minha Agenda" para ver os compromissos do dia</p>
        <Button variant="outline" size="sm" onClick={() => { setStep("idle"); setSugestoes([]); }}>
          Buscar novamente
        </Button>
      </div>
    );
  }

  return null;
}
