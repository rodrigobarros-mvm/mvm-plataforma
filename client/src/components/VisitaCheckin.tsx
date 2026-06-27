import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, CheckCircle2, XCircle, AlertTriangle, Loader2, Camera, Clock
} from "lucide-react";
import { toast } from "sonner";

type CheckinStatus = "idle" | "locating" | "confirmed" | "checkedout";

interface VisitaCheckinProps {
  leadNome: string;
  leadEndereco?: string | null;
  leadLat?: number | null;
  leadLng?: number | null;
  onCheckin?: (data: {
    lat: number; lng: number; endereco: string;
    distanciaMetros: number; status: "valido" | "suspeito" | "invalido";
    observacoes: string;
  }) => void;
  onCheckout?: (durMinutos: number) => void;
}

function distancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function statusFromDistance(m: number): "valido" | "suspeito" | "invalido" {
  if (m <= 500) return "valido";
  if (m <= 2000) return "suspeito";
  return "invalido";
}

const STATUS_CONFIG = {
  valido:   { label: "✅ Presença confirmada",   color: "#059669", bg: "#f0fdf4" },
  suspeito: { label: "⚠️ Suspeito — revise",     color: "#D97706", bg: "#fef3c7" },
  invalido: { label: "❌ Fora do local indicado", color: "#e21d3c", bg: "#fef2f2" },
};

export default function VisitaCheckin({
  leadNome, leadEndereco, leadLat, leadLng, onCheckin, onCheckout,
}: VisitaCheckinProps) {
  const [status, setStatus] = useState<CheckinStatus>("idle");
  const [checkinStatus, setCheckinStatus] = useState<"valido"|"suspeito"|"invalido"|null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [endereco, setEndereco] = useState("");
  const [distanciaM, setDistanciaM] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState("");
  const [checkinTime, setCheckinTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = { current: null as any };

  const handleCheckin = useCallback(async () => {
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });

        // Reverse geocode via nominatim (free)
        let addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "pt-BR" } }
          );
          const d = await r.json();
          addr = d.display_name ?? addr;
        } catch {}
        setEndereco(addr);

        // Calculate distance if client has coords
        let dist = 0;
        if (leadLat && leadLng) {
          dist = Math.round(distancia(lat, lng, leadLat, leadLng));
          setDistanciaM(dist);
        }

        const s = leadLat ? statusFromDistance(dist) : "valido";
        setCheckinStatus(s);
        setStatus("confirmed");
        setCheckinTime(new Date());

        // Start timer
        const interval = setInterval(() => setElapsed(e => e + 1), 60000);
        timerRef.current = interval;

        onCheckin?.({ lat, lng, endereco: addr, distanciaMetros: dist, status: s, observacoes });
        toast.success(`Check-in realizado! ${STATUS_CONFIG[s].label}`);
      },
      (err) => {
        setStatus("idle");
        toast.error("Não foi possível obter sua localização. Ative o GPS e tente novamente.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [leadLat, leadLng, observacoes, onCheckin]);

  const handleCheckout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("checkedout");
    const dur = Math.max(elapsed, 1);
    onCheckout?.(dur);
    toast.success(`Check-out registrado! Visita de ${dur} minuto${dur !== 1 ? "s" : ""}.`);
  }, [elapsed, onCheckout]);

  if (status === "idle") {
    return (
      <div className="space-y-3">
        {leadEndereco && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{leadEndereco}</span>
          </div>
        )}
        <div className="space-y-1.5">
          <Textarea
            placeholder="Observações antes de fazer check-in (opcional)..."
            rows={2}
            value={observacoes}
            onChange={e => setObservacoes(e.target.value)}
            className="text-xs resize-none"
          />
        </div>
        <Button
          className="w-full gap-2 font-bold"
          style={{ background: "#0a1e5a", color: "white" }}
          onClick={handleCheckin}
        >
          <MapPin className="w-4 h-4" />
          Fazer Check-in neste Local
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Sua localização será capturada e validada automaticamente
        </p>
      </div>
    );
  }

  if (status === "locating") {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0a1e5a" }} />
        <p className="text-sm font-semibold">Obtendo sua localização...</p>
        <p className="text-xs text-muted-foreground">Certifique-se de que o GPS está ativo</p>
      </div>
    );
  }

  if (status === "confirmed" && checkinStatus) {
    const cfg = STATUS_CONFIG[checkinStatus];
    return (
      <div className="space-y-3">
        {/* Status */}
        <div className="rounded-xl border-2 p-3 space-y-2" style={{ borderColor: cfg.color + "60", background: cfg.bg }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
            {checkinTime && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="w-3 h-3" />
                {checkinTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            )}
          </div>
          {distanciaM !== null && (
            <p className="text-xs" style={{ color: cfg.color }}>
              Distância do cliente: <strong>{distanciaM >= 1000 ? `${(distanciaM/1000).toFixed(1)}km` : `${distanciaM}m`}</strong>
            </p>
          )}
          {endereco && (
            <p className="text-xs text-muted-foreground truncate">📍 {endereco.split(",").slice(0, 3).join(",")}</p>
          )}
          {elapsed > 0 && (
            <p className="text-xs font-semibold" style={{ color: "#059669" }}>
              ⏱ {elapsed} minuto{elapsed !== 1 ? "s" : ""} de visita
            </p>
          )}
        </div>

        {/* Checkout */}
        <Button
          className="w-full gap-2 font-bold"
          style={{ background: "#059669", color: "white" }}
          onClick={handleCheckout}
        >
          <CheckCircle2 className="w-4 h-4" />
          Encerrar Visita (Check-out)
        </Button>
      </div>
    );
  }

  if (status === "checkedout") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
        <p className="font-bold text-green-700">Visita encerrada!</p>
        <p className="text-xs text-muted-foreground">Duração registrada: {elapsed} minutos</p>
      </div>
    );
  }

  return null;
}
