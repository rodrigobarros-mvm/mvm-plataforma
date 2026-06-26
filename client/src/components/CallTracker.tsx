import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, Clock, CheckCircle2, XCircle, PhoneMissed } from "lucide-react";

type CallState = "idle" | "calling" | "connected" | "ended";

type CallResult = "contato" | "tentativa" | "nao_existe" | null;

interface CallTrackerProps {
  phone: string | null | undefined;
  leadName: string;
  onCallEnd?: (result: CallResult, duration: number, note: string) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CallTracker({ phone, leadName, onCallEnd }: CallTrackerProps) {
  const [state, setState] = useState<CallState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<CallResult>(null);
  const [note, setNote] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleCall = () => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, "");
    window.location.href = `tel:${digits}`;
    setState("calling");
    setElapsed(0);
    setResult(null);
    setNote("");
    // Start timer after short delay (time to pick up)
    setTimeout(() => {
      setState("connected");
      startTimer();
    }, 2000);
  };

  const handleEndCall = (r: CallResult) => {
    stopTimer();
    setResult(r);
    setState("ended");
    const duration = elapsed;
    if (onCallEnd) onCallEnd(r, duration, note);
  };

  const handleReset = () => {
    setState("idle");
    setElapsed(0);
    setResult(null);
    setNote("");
  };

  if (!phone) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed border-border">
        <PhoneMissed className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sem telefone cadastrado</span>
      </div>
    );
  }

  const digits = phone.replace(/\D/g, "");
  const formatted = digits.length === 11
    ? `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
    : digits.length === 10
    ? `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
    : phone;

  return (
    <div className="space-y-3">
      {/* Phone display */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4" style={{ color: "#0a1e5a" }} />
          <span className="font-mono text-sm font-semibold">{formatted}</span>
        </div>
        {state === "connected" && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-bold tabular-nums text-green-600">
              {formatDuration(elapsed)}
            </span>
          </div>
        )}
        {state === "calling" && (
          <Badge variant="outline" className="text-xs animate-pulse">Chamando...</Badge>
        )}
      </div>

      {/* Call button */}
      {state === "idle" && (
        <Button
          className="w-full gap-2 font-semibold"
          style={{ background: "#0a1e5a", color: "white" }}
          onClick={handleCall}
        >
          <Phone className="w-4 h-4" />
          Ligar para {leadName.split(" ")[0]}
        </Button>
      )}

      {/* Active call controls */}
      {(state === "calling" || state === "connected") && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            {state === "calling" ? "Chamando..." : "Em ligação — registre o resultado ao terminar:"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleEndCall("tentativa")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <PhoneMissed className="w-5 h-5 text-gray-500" />
              <span className="text-xs text-center leading-tight">Não<br/>Atendeu</span>
            </button>
            <button
              onClick={() => handleEndCall("contato")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-xs text-center leading-tight text-green-700">Contato<br/>Realizado</span>
            </button>
            <button
              onClick={() => handleEndCall("nao_existe")}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-xs text-center leading-tight text-red-600">Número<br/>Inválido</span>
            </button>
          </div>
        </div>
      )}

      {/* Post-call summary */}
      {state === "ended" && result && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
            <div>
              <p className="text-xs font-semibold text-foreground">
                {result === "contato" ? "✅ Contato realizado!" : result === "tentativa" ? "📵 Não atendeu" : "❌ Número inválido"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Duração: {formatDuration(elapsed)} · Registrado automaticamente
              </p>
            </div>
          </div>
          <textarea
            className="w-full border border-border rounded-lg text-xs px-3 py-2 resize-none bg-background"
            rows={2}
            placeholder="Adicionar observação sobre a ligação..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleReset}>
            Nova ligação
          </Button>
        </div>
      )}
    </div>
  );
}
