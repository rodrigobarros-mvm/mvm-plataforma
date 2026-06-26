import { useMemo } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

// ── Lightweight competitor → LS lookup ───────────────────────────────────────
type CompEntry = {
  brand: string;
  comp_modelo: string;
  comp_cv: number | null;
  ls_alts: string[];
  ls_cvs: (number | null)[];
};

const COMP_LOOKUP: Record<string, CompEntry> = {"3036en": {"brand": "John Deere", "comp_modelo": "3036EN", "comp_cv": 36.0, "ls_alts": ["MT1.25", "MT2.27 / MT2 27E"], "ls_cvs": [25.0, 25.0]}, "5060e": {"brand": "John Deere", "comp_modelo": "5060E", "comp_cv": 60.0, "ls_alts": ["R50 Plataformado", "R65 Plataformado"], "ls_cvs": [50.0, 65.0]}, "5075e": {"brand": "John Deere", "comp_modelo": "5075E", "comp_cv": 75.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "5075ecabinado": {"brand": "John Deere", "comp_modelo": "5075E Cabinado", "comp_cv": 75.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "5080ecabinado": {"brand": "John Deere", "comp_modelo": "5080E Cabinado", "comp_cv": 80.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "5090ecabinado": {"brand": "John Deere", "comp_modelo": "5090E Cabinado", "comp_cv": 90.0, "ls_alts": ["Plus 100 Plataformado", "Plus 80 Plataformado"], "ls_cvs": [110.0, 82.0]}, "5enestreito": {"brand": "John Deere", "comp_modelo": "5EN Estreito", "comp_cv": null, "ls_alts": [], "ls_cvs": []}, "6110j": {"brand": "John Deere", "comp_modelo": "6110J", "comp_cv": 110.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "6125j": {"brand": "John Deere", "comp_modelo": "6125J", "comp_cv": 125.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "6145j": {"brand": "John Deere", "comp_modelo": "6145J", "comp_cv": 145.0, "ls_alts": ["H 125 Cabinado", "H 145 Cabinado"], "ls_cvs": [134.0, 149.0]}, "6120m": {"brand": "John Deere", "comp_modelo": "6120M", "comp_cv": 120.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "6145m": {"brand": "John Deere", "comp_modelo": "6145M", "comp_cv": 145.0, "ls_alts": ["H 125 Cabinado", "H 145 Cabinado"], "ls_cvs": [134.0, 149.0]}, "6175m": {"brand": "John Deere", "comp_modelo": "6175M", "comp_cv": 175.0, "ls_alts": [], "ls_cvs": []}, "7j175": {"brand": "John Deere", "comp_modelo": "7J175", "comp_cv": 175.0, "ls_alts": [], "ls_cvs": []}, "7j200": {"brand": "John Deere", "comp_modelo": "7J200", "comp_cv": 200.0, "ls_alts": [], "ls_cvs": []}, "7m200": {"brand": "John Deere", "comp_modelo": "7M200", "comp_cv": 200.0, "ls_alts": [], "ls_cvs": []}, "7m215": {"brand": "John Deere", "comp_modelo": "7M215", "comp_cv": 215.0, "ls_alts": [], "ls_cvs": []}, "7m230": {"brand": "John Deere", "comp_modelo": "7M230", "comp_cv": 230.0, "ls_alts": [], "ls_cvs": []}, "8250r": {"brand": "John Deere", "comp_modelo": "8250R", "comp_cv": 250.0, "ls_alts": [], "ls_cvs": []}, "8295r": {"brand": "John Deere", "comp_modelo": "8295R", "comp_cv": 295.0, "ls_alts": [], "ls_cvs": []}, "8345r": {"brand": "John Deere", "comp_modelo": "8345R", "comp_cv": 345.0, "ls_alts": [], "ls_cvs": []}, "9570r": {"brand": "John Deere", "comp_modelo": "9570R", "comp_cv": 570.0, "ls_alts": [], "ls_cvs": []}, "9620rx": {"brand": "John Deere", "comp_modelo": "9620RX", "comp_cv": 620.0, "ls_alts": [], "ls_cvs": []}, "sa221": {"brand": "Yanmar", "comp_modelo": "SA221", "comp_cv": 22.0, "ls_alts": ["J25H", "J25H Garden"], "ls_cvs": [25.0, 25.0]}, "sa324": {"brand": "Yanmar", "comp_modelo": "SA324", "comp_cv": 24.0, "ls_alts": ["MT1.25", "MT2.27 / MT2 27E"], "ls_cvs": [25.0, 25.0]}, "ef453t": {"brand": "Yanmar", "comp_modelo": "EF453T", "comp_cv": 43.0, "ls_alts": ["G40", "R50 Plataformado"], "ls_cvs": [38.0, 50.0]}, "ef514t": {"brand": "Yanmar", "comp_modelo": "EF514T", "comp_cv": 50.0, "ls_alts": ["G40", "MT4 70 Plataformado"], "ls_cvs": [38.0, 70.0]}, "yt359": {"brand": "Yanmar", "comp_modelo": "YT359", "comp_cv": 59.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "yt359cabinado": {"brand": "Yanmar", "comp_modelo": "YT359 Cabinado", "comp_cv": 59.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "yt374": {"brand": "Yanmar", "comp_modelo": "YT374", "comp_cv": 74.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "yt374cabinado": {"brand": "Yanmar", "comp_modelo": "YT374 Cabinado", "comp_cv": 74.0, "ls_alts": ["Plus 80 Plataformado", "Plus 80 Cabinado"], "ls_cvs": [82.0, 82.0]}, "yt490": {"brand": "Yanmar", "comp_modelo": "YT490", "comp_cv": 89.0, "ls_alts": ["Plus 80 Plataformado", "Plus 80 Cabinado"], "ls_cvs": [82.0, 82.0]}, "yt4110": {"brand": "Yanmar", "comp_modelo": "YT4110", "comp_cv": 110.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "yt5113a": {"brand": "Yanmar", "comp_modelo": "YT5113A", "comp_cv": 113.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "yt5125a": {"brand": "Yanmar", "comp_modelo": "YT5125A", "comp_cv": 125.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "farmall75a": {"brand": "Case IH", "comp_modelo": "Farmall 75A", "comp_cv": 75.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "farmall75acabinado": {"brand": "Case IH", "comp_modelo": "Farmall 75A Cabinado", "comp_cv": 75.0, "ls_alts": ["R65 Plataformado", "R65 Cabinado"], "ls_cvs": [65.0, 65.0]}, "farmall95a": {"brand": "Case IH", "comp_modelo": "Farmall 95A", "comp_cv": 95.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "farmall110a": {"brand": "Case IH", "comp_modelo": "Farmall 110A", "comp_cv": 110.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "farmall130c": {"brand": "Case IH", "comp_modelo": "Farmall 130C", "comp_cv": 130.0, "ls_alts": ["Plus 100 Plataformado", "Plus 100 Cabinado"], "ls_cvs": [110.0, 110.0]}, "farmall150c": {"brand": "Case IH", "comp_modelo": "Farmall 150C", "comp_cv": 150.0, "ls_alts": ["H 125 Cabinado", "H 145 Cabinado"], "ls_cvs": [134.0, 149.0]}, "maxxum145": {"brand": "Case IH", "comp_modelo": "Maxxum 145", "comp_cv": 145.0, "ls_alts": ["H 125 Cabinado", "H 145 Cabinado"], "ls_cvs": [134.0, 149.0]}, "puma185": {"brand": "Case IH", "comp_modelo": "Puma 185", "comp_cv": 185.0, "ls_alts": [], "ls_cvs": []}, "puma220": {"brand": "Case IH", "comp_modelo": "Puma 220", "comp_cv": 220.0, "ls_alts": [], "ls_cvs": []}, "magnum280": {"brand": "Case IH", "comp_modelo": "Magnum 280", "comp_cv": 280.0, "ls_alts": [], "ls_cvs": []}, "magnum340": {"brand": "Case IH", "comp_modelo": "Magnum 340", "comp_cv": 340.0, "ls_alts": [], "ls_cvs": []}, "steiger370": {"brand": "Case IH", "comp_modelo": "Steiger 370", "comp_cv": 370.0, "ls_alts": [], "ls_cvs": []}};

const BRAND_COLORS: Record<string, string> = {
  "John Deere": "#009900",
  "Yanmar": "#cc6600",
  "Case IH": "#cc0000",
};

const BRAND_FLAGS: Record<string, string> = {
  "John Deere": "🟢",
  "Yanmar": "🟠",
  "Case IH": "🔴",
};

function findMatch(frota: string): CompEntry | null {
  if (!frota) return null;
  const normalized = frota.toLowerCase().replace(/[^a-z0-9]/g, "");
  
  // Exact match
  if (COMP_LOOKUP[normalized]) return COMP_LOOKUP[normalized];
  
  // Partial match - check if any keyword is contained
  for (const [key, entry] of Object.entries(COMP_LOOKUP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return entry;
    }
  }
  
  return null;
}

interface FrotaAltSuggestionProps {
  frotaAtual?: string | null;
  compact?: boolean;
}

export default function FrotaAltSuggestion({ frotaAtual, compact = false }: FrotaAltSuggestionProps) {
  const [, setLocation] = useLocation();
  const match = useMemo(() => frotaAtual ? findMatch(frotaAtual) : null, [frotaAtual]);

  if (!match || match.ls_alts.length === 0) return null;

  const brandColor = BRAND_COLORS[match.brand] ?? "#64748b";
  const brandFlag = BRAND_FLAGS[match.brand] ?? "⬜";

  if (compact) {
    // Inline chip for WorkMode / lists
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs cursor-pointer hover:opacity-90 transition-opacity"
        style={{ background: "#0a1e5a12", border: "1px solid #0a1e5a30" }}
        onClick={() => setLocation("/comparativos")}
        title="Ver comparativo completo"
      >
        <span style={{ color: brandColor }}>{brandFlag} {match.comp_modelo}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
        <span className="font-bold" style={{ color: "#e21d3c" }}>
          🚜 {match.ls_alts[0]}
        </span>
        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
      </div>
    );
  }

  // Full card for LeadDetail
  return (
    <div
      className="rounded-xl border-2 p-3 space-y-2"
      style={{ borderColor: "#e21d3c40", background: "#fff8f8" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#0a1e5a" }}>
          💡 Alternativa LS Tractor identificada
        </p>
        <button
          className="text-xs underline"
          style={{ color: "#e21d3c" }}
          onClick={() => setLocation("/comparativos")}
        >
          Ver comparativo completo
        </button>
      </div>

      {/* Competitor */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span style={{ color: brandColor }}>{brandFlag} Frota atual: <strong>{match.comp_modelo}</strong> ({match.brand})</span>
        {match.comp_cv && <span className="font-mono">{match.comp_cv}cv</span>}
      </div>

      {/* Arrow + LS alternatives */}
      <div className="flex items-start gap-2">
        <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#e21d3c" }} />
        <div className="space-y-1 flex-1">
          {match.ls_alts.map((modelo, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: "#0a1e5a" }}>
                🚜 {modelo}
              </span>
              {match.ls_cvs[i] && (
                <span className="text-xs text-muted-foreground font-mono">{match.ls_cvs[i]}cv</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick WA button */}
      <button
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
        style={{ background: "#25D366" }}
        onClick={() => {
          const empresa = "vocês";
          const msg = `Olá! Da Gallotti Tractor | LS Tractor.\n\nIdentifiquei que vocês utilizam o *${match.comp_modelo}* (${match.brand}).\n\nTemos uma alternativa com custo-benefício superior: o *${match.ls_alts[0]}* da LS Tractor — mesma faixa de potência, fabricação nacional em Garuva/SC, aprovado FINAME/BNDES.\n\nPosso enviar uma comparação técnica detalhada?`;
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
        }}
      >
        💬 Enviar comparativo por WhatsApp
      </button>
    </div>
  );
}
