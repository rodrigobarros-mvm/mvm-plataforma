import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Printer, MessageCircle, FileText, Building2, Tractor } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format, addBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Brand Themes ─────────────────────────────────────────────────────────────
const BRAND_THEMES: Record<string, {
  primary: string; secondary: string;
  logo: string; headerBg: string; badge: string;
}> = {
  "LS Tractor": {
    primary: "#0a1e5a", secondary: "#e21d3c",
    logo: "/logo-ls.png",
    headerBg: "linear-gradient(135deg, #0a1e5a, #1c3c8a)",
    badge: "#e21d3c",
  },
  "ENSIGN": {
    primary: "#1a1a1a", secondary: "#f97316",
    logo: "/logo-ensign.png",
    headerBg: "linear-gradient(135deg, #1a1a1a, #333)",
    badge: "#f97316",
  },
};

// ─── Machine Catalog ─────────────────────────────────────────────────────────
const MACHINES = [
  {
    "marca": "LS Tractor",
    "modelo": "MT2.27 / MT2.27E",
    "cv": 27,
    "tracao": "4x4",
    "transmissao": "12Fr x 12Re",
    "versao": "Compacto",
    "aplicacao": "Horticultura, Jardinagem, Viveiros, Pomares compactos",
    "culturas": "Hortifrúti, Fruticultura, Viveiro",
    "garantia": "2 anos",
    "preco": 95000,
    "fotoUrl": "",
    "specs": {
      "Motor": "Yanmar 3TNV82A",
      "Potência": "27cv (20kW)",
      "Peso": "1.350 kg",
      "Largura": "1.190 mm",
      "Capacidade Hidráulica": "1.850 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "J25H",
    "cv": 25,
    "tracao": "4x4",
    "transmissao": "12Fr x 4Re",
    "versao": "Compacto",
    "aplicacao": "Jardinagem paisagística e propriedades rurais pequenas",
    "culturas": "Jardins, Chácaras",
    "garantia": "2 anos",
    "preco": 88000,
    "fotoUrl": "",
    "specs": {
      "Motor": "Yanmar 3TNV82A",
      "Potência": "25cv",
      "Peso": "1.100 kg",
      "Largura": "1.185 mm"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "G40",
    "cv": 40,
    "tracao": "4x4",
    "transmissao": "12Fr x 12Re",
    "versao": "Plataformado",
    "aplicacao": "Pastagens, Lavouras pequenas, Pomares",
    "culturas": "Pecuária, Fruticultura",
    "garantia": "2 anos",
    "preco": 135000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D902",
      "Potência": "40cv",
      "Peso": "1.980 kg",
      "Largura": "1.560 mm",
      "Capacidade Hidráulica": "2.800 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "R65 Plataformado",
    "cv": 65,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re",
    "versao": "Plataformado",
    "aplicacao": "Lavouras, Pastagens, Canaviais",
    "culturas": "Cana-de-Açúcar, Grãos, Pecuária",
    "garantia": "2 anos",
    "preco": 172000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D35",
      "Potência": "65cv",
      "Peso": "3.180 kg",
      "Largura": "2.000 mm",
      "Capacidade Hidráulica": "4.000 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "R65 Cabinado",
    "cv": 65,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re",
    "versao": "Cabinado",
    "aplicacao": "Lavouras, Pastagens, Canaviais com conforto",
    "culturas": "Cana-de-Açúcar, Grãos, Pecuária",
    "garantia": "2 anos",
    "preco": 195000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D35",
      "Potência": "65cv",
      "Cabine": "Ar-condicionado de série",
      "Peso": "3.520 kg",
      "Capacidade Hidráulica": "4.000 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "MT4 70 Cabinado",
    "cv": 70,
    "tracao": "4x4",
    "transmissao": "12Fr x 12Re PowerShift",
    "versao": "Cabinado",
    "aplicacao": "Canaviais, Pecuária, Lavouras diversas",
    "culturas": "Cana-de-Açúcar, Pecuária, Soja",
    "garantia": "2 anos",
    "preco": 218000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D35T",
      "Potência": "70cv",
      "Cabine": "Ar-condicionado de série",
      "Peso": "3.780 kg",
      "Capacidade Hidráulica": "5.000 kg",
      "Rodagem": "18.4-30 traseiro"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "MT7.80F Cabinado",
    "cv": 82,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re PowerShuttle",
    "versao": "Cabinado Fruteiro",
    "aplicacao": "Cafeicultura, Citricultura, Fruticultura — único trator fruteiro com cabine original abaixo de 95cv",
    "culturas": "Café, Citrus, Fruticultura, Fumicultura",
    "garantia": "2 anos",
    "preco": 260000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D35TF",
      "Potência": "82cv",
      "Cabine": "Ar-condicionado + filtragem de ar",
      "Peso": "3.650 kg",
      "Rodagem Dianteira": "280/70R20",
      "Rodagem Traseira": "380/70R28 / 11.2-28",
      "Altura Engate": "600 mm",
      "Capacidade Hidráulica": "5.500 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "MT7.90F Cabinado",
    "cv": 92,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re PowerShuttle",
    "versao": "Cabinado Fruteiro",
    "aplicacao": "Cafeicultura intensiva, Citrus, Operações de médio porte",
    "culturas": "Café, Citrus, Fruticultura, Milho",
    "garantia": "2 anos",
    "preco": 295000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D40TF",
      "Potência": "92cv",
      "Cabine": "Ar-condicionado + filtragem de ar",
      "Peso": "3.980 kg",
      "Rodagem Dianteira": "280/70R20",
      "Rodagem Traseira": "420/70R28",
      "Capacidade Hidráulica": "6.000 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "Plus 100 Cabinado",
    "cv": 100,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re PowerShuttle",
    "versao": "Cabinado",
    "aplicacao": "Lavouras de grande porte, Canaviais, Serviços agrícolas",
    "culturas": "Soja, Milho, Cana-de-Açúcar, Sorgo",
    "garantia": "2 anos",
    "preco": 278000,
    "fotoUrl": "",
    "specs": {
      "Motor": "LS D45T",
      "Potência": "100cv",
      "Cabine": "Ar-condicionado de série",
      "Peso": "4.250 kg",
      "Capacidade Hidráulica": "6.500 kg"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "H125 Cabinado",
    "cv": 125,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re PowerShuttle",
    "versao": "Cabinado",
    "aplicacao": "Grandes lavouras, Canaviais intensivos, Preparo de solo pesado",
    "culturas": "Soja, Milho, Algodão, Cana-de-Açúcar",
    "garantia": "2 anos",
    "preco": 428000,
    "fotoUrl": "",
    "specs": {
      "Motor": "Cummins QSF3.8T",
      "Potência": "125cv",
      "Cabine": "Ar-condicionado + suspensão frontal",
      "Peso": "5.800 kg",
      "Capacidade Hidráulica": "8.000 kg",
      "Rodagem Traseira": "18.4-38"
    }
  },
  {
    "marca": "LS Tractor",
    "modelo": "H145 Cabinado",
    "cv": 149,
    "tracao": "4x4",
    "transmissao": "16Fr x 16Re PowerShuttle",
    "versao": "Cabinado",
    "aplicacao": "Grandes lavouras, Canaviais de alta produtividade, Incorporação de palha",
    "culturas": "Soja, Milho, Cana-de-Açúcar, Algodão",
    "garantia": "2 anos",
    "preco": 485000,
    "fotoUrl": "",
    "specs": {
      "Motor": "Cummins QSF3.8T Tier 3",
      "Potência": "149cv",
      "Cabine": "Ar-condicionado + suspensão frontal ativa",
      "Peso": "6.350 kg",
      "Capacidade Hidráulica": "9.000 kg",
      "Rodagem Traseira": "520/70R38"
    }
  },
  {
    "marca": "ENSIGN",
    "modelo": "ENSIGN YX 1004-G",
    "cv": 100,
    "tracao": "4x4",
    "transmissao": "16Fr x 8Re",
    "versao": "Cabinado",
    "aplicacao": "Lavouras diversas, Pastagens, Serviços pesados",
    "culturas": "Soja, Milho, Pecuária, Cana",
    "garantia": "1 ano",
    "preco": 220000,
    "fotoUrl": "",
    "specs": {
      "Motor": "ENSIGN 4C",
      "Potência": "100cv",
      "Cabine": "Ar-condicionado",
      "Peso": "4.100 kg",
      "Capacidade Hidráulica": "5.500 kg"
    }
  },
  {
    "marca": "ENSIGN",
    "modelo": "ENSIGN YX 1254-G",
    "cv": 125,
    "tracao": "4x4",
    "transmissao": "16Fr x 8Re",
    "versao": "Cabinado",
    "aplicacao": "Grandes lavouras e canaviais",
    "culturas": "Soja, Milho, Cana",
    "garantia": "1 ano",
    "preco": 265000,
    "fotoUrl": "",
    "specs": {
      "Motor": "ENSIGN 4C Turbo",
      "Potência": "125cv",
      "Cabine": "Ar-condicionado",
      "Peso": "5.200 kg",
      "Capacidade Hidráulica": "7.000 kg"
    }
  }
];

const PAGAMENTOS = [
  { label: "FINAME — 60 meses", taxa: 7.5, meses: 60, entrada: 10 },
  { label: "FINAME — 48 meses", taxa: 7.5, meses: 48, entrada: 15 },
  { label: "BNDES — 60 meses",  taxa: 8.5, meses: 60, entrada: 10 },
  { label: "À Vista",           taxa: 0,   meses: 0,  entrada: 100 },
  { label: "Financiamento Banco", taxa: 0, meses: 0,  entrada: 20 },
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcParcela(p: number, t: number, m: number) {
  const i = t / 12 / 100;
  return p * (i * Math.pow(1+i,m)) / (Math.pow(1+i,m)-1);
}

function genNum(v: number) {
  const d = new Date();
  const b = `PROP-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*999)+1).padStart(3,"0")}`;
  return v > 1 ? `${b}.v${v}` : b;
}

export default function GerarProposta() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1|2|3>(1);
  const [versao, setVersao] = useState(1);
  const [saved, setSaved] = useState(false);
  const saveProposta = trpc.propostas.create.useMutation({
    onSuccess: (data) => {
      setSaved(true);
      toast.success(`Proposta ${data.numero} salva no sistema!`);
    },
    onError: () => toast.error("Erro ao salvar proposta"),
  });
  const [numProposta] = useState(() => genNum(1));
  const dataEmissao = format(new Date(), "dd/MM/yyyy");
  const dataValidade = format(addBusinessDays(new Date(), 3), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const [form, setForm] = useState({
    clienteNome: "", clienteCnpj: "", clienteEndereco: "",
    clienteCidade: "", clienteUf: "", clienteTelefone: "", clienteEmail: "",
    machineIndex: 6, qty: "1", desconto: "0",
    chassis: "", garantia: "",
    tipoFrete: "FOB" as "FOB"|"CIF", valorFrete: "0",
    pagamento: "FINAME — 60 meses",
    observacoes: "", prazoEntrega: "30 dias",
  });

  const M = MACHINES[form.machineIndex] as any;
  const theme = BRAND_THEMES[M?.marca ?? "LS Tractor"] ?? BRAND_THEMES["LS Tractor"];
  const pag = PAGAMENTOS.find(p => p.label === form.pagamento) ?? PAGAMENTOS[0];

  const precoUnit = M?.preco ?? 0;
  const precoBase = precoUnit * Number(form.qty || 1);
  const desc$ = precoBase * Number(form.desconto) / 100;
  const frete$ = form.tipoFrete === "CIF" ? Number(form.valorFrete || 0) : 0;
  const total$ = precoBase - desc$ + frete$;
  const entrada$ = total$ * pag.entrada / 100;
  const parcela$ = pag.meses > 0 ? calcParcela(total$ - entrada$, pag.taxa, pag.meses) : 0;

  const novaVersao = () => { setVersao(v => v+1); toast.success(`Versão ${versao+1} criada!`); };

  const handleWhatsApp = () => {
    const phone = form.clienteTelefone.replace(/\D/g,"");
    const msg = [
      `Olá, *${form.clienteNome.split(" ")[0]}*! 👋`,
      `Da *Gallotti Tractor | ${M?.marca}*:`,
      ``,
      `📋 *${numProposta}${versao>1?` v${versao}`:""}*`,
      `🚜 *${M?.modelo}* (${M?.cv}cv) — ${M?.versao}`,
      `💰 *${fmt(total$)}*`,
      desc$>0?`🎯 Desconto: ${form.desconto}%`:"",
      frete$>0?`🚚 Frete CIF: ${fmt(frete$)}`:"🚚 Frete: FOB (comprador)",
      `💳 ${pag.label}`,
      pag.entrada<100?`Entrada: ${fmt(entrada$)} (${pag.entrada}%)\nParcela: ${fmt(parcela$)}/mês`:"",
      `📦 Prazo: *${form.prazoEntrega}*`,
      `🔒 Garantia: *${form.garantia||M?.garantia}*`,
      `📅 Válida 3 dias úteis até ${dataValidade}`,
      ``,
      `_Preço sujeito a variação cambial_`,
      `✅ Aprovação FINAME/BNDES`,
      ``,
      `${user?.name} — Gallotti Tractor`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${phone?`55${phone}`:""}?text=${encodeURIComponent(msg)}`,"_blank");
  };

  // ── Proposta Document ──────────────────────────────────────────────────────
  function Doc() {
    const s = { fontFamily: "Arial, sans-serif", color: "#1a1a1a", background: "white" };
    return (
      <div id="proposta-doc" style={s}>
        <style>{`
          @media print {
            @page { margin: 10mm; size: A4; }
            body * { visibility: hidden; }
            #proposta-doc, #proposta-doc * { visibility: visible; }
            #proposta-doc { position: fixed; top: 0; left: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* HEADER */}
        <div style={{ background: theme.headerBg, color: "white", padding: "16px 24px", borderRadius: "8px 8px 0 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"12px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"16px" }}>
              <img src={theme.logo} alt={M?.marca} style={{ height:"40px", objectFit:"contain", background: M?.marca==="ENSIGN"?"white":"transparent", padding: M?.marca==="ENSIGN"?"4px":"0", borderRadius:"4px" }} />
              <div style={{ borderLeft:"1px solid rgba(255,255,255,0.3)", paddingLeft:"14px" }}>
                <p style={{ fontSize:"13px", fontWeight:700 }}>Gallotti Tractor</p>
                <p style={{ fontSize:"10px", opacity:0.7 }}>Concessionária Autorizada {M?.marca}</p>
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:"9px", opacity:0.6, textTransform:"uppercase", letterSpacing:"1px" }}>Proposta Comercial</p>
              <p style={{ fontSize:"17px", fontWeight:900 }}>{numProposta}{versao>1?` v${versao}`:""}</p>
              <p style={{ fontSize:"10px", opacity:0.7 }}>Emitida: {dataEmissao}</p>
            </div>
          </div>
        </div>

        <div style={{ padding:"20px 24px", border:"1px solid #e5e7eb", borderTop:"none", borderRadius:"0 0 8px 8px" }}>

          {/* Revenda + Cliente */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"16px" }}>
            <div style={{ padding:"11px", background:"#f8fafc", borderRadius:"6px", borderLeft:`3px solid ${theme.primary}` }}>
              <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:theme.primary, marginBottom:"4px", letterSpacing:"1px" }}>Revenda</p>
              <p style={{ fontWeight:700, fontSize:"12px" }}>Gallotti Tractor Comércio de Tratores e Máquinas Agrícolas LTDA</p>
              <p style={{ fontSize:"10px", color:"#6b7280", marginTop:"2px" }}>CNPJ: 54.931.200/0001-97</p>
              <p style={{ fontSize:"10px", color:"#6b7280" }}>Av. Enedino Alves da Paixão, 1654 — Santa Cruz</p>
              <p style={{ fontSize:"10px", color:"#6b7280" }}>Luís Eduardo Magalhães - BA · CEP: 47855-244</p>
              <p style={{ fontSize:"10px", color:"#6b7280", marginTop:"3px" }}>Consultor: <strong>{user?.name}</strong></p>
            </div>
            <div style={{ padding:"11px", background:"#f8fafc", borderRadius:"6px", borderLeft:`3px solid ${theme.secondary}` }}>
              <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:theme.secondary, marginBottom:"4px", letterSpacing:"1px" }}>Cliente</p>
              <p style={{ fontWeight:700, fontSize:"12px" }}>{form.clienteNome||"—"}</p>
              {form.clienteCnpj&&<p style={{ fontSize:"10px", color:"#6b7280" }}>CNPJ/CPF: {form.clienteCnpj}</p>}
              {form.clienteEndereco&&<p style={{ fontSize:"10px", color:"#6b7280" }}>{form.clienteEndereco}</p>}
              {form.clienteCidade&&<p style={{ fontSize:"10px", color:"#6b7280" }}>{form.clienteCidade}/{form.clienteUf}</p>}
              {form.clienteTelefone&&<p style={{ fontSize:"10px", color:"#6b7280" }}>Tel: {form.clienteTelefone}</p>}
              {form.clienteEmail&&<p style={{ fontSize:"10px", color:"#6b7280" }}>{form.clienteEmail}</p>}
            </div>
          </div>

          {/* Product */}
          <div style={{ marginBottom:"16px" }}>
            <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:theme.primary, marginBottom:"8px", letterSpacing:"1px" }}>Produto</p>
            <div style={{ border:`2px solid ${theme.primary}25`, borderRadius:"8px", overflow:"hidden" }}>
              <div style={{ padding:"12px 14px", background:`${theme.primary}08`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <p style={{ fontWeight:900, fontSize:"16px", color:theme.primary }}>{M?.modelo}</p>
                  <p style={{ fontSize:"11px", color:"#6b7280", marginTop:"2px" }}>{M?.marca} · {M?.versao} · {M?.cv}cv · {M?.tracao} · {M?.transmissao}</p>
                  <p style={{ fontSize:"10px", color:"#9ca3af", marginTop:"3px", maxWidth:"400px" }}>{M?.aplicacao}</p>
                  <p style={{ fontSize:"10px", color:"#9ca3af" }}>🌱 {M?.culturas}</p>
                </div>
                <span style={{ display:"inline-block", padding:"4px 12px", borderRadius:"20px", fontSize:"12px", fontWeight:700, color:"white", background:theme.secondary, whiteSpace:"nowrap" }}>{M?.cv}cv</span>
              </div>
              {M?.specs&&(
                <div style={{ padding:"10px 14px", borderTop:`1px solid ${theme.primary}12` }}>
                  <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:"#9ca3af", marginBottom:"6px" }}>Especificações Técnicas</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"5px" }}>
                    {Object.entries(M.specs).map(([k,v])=>(
                      <div key={k} style={{ padding:"5px 7px", background:"#f9fafb", borderRadius:"5px" }}>
                        <p style={{ fontSize:"8px", color:"#9ca3af", textTransform:"uppercase" }}>{k}</p>
                        <p style={{ fontSize:"10px", fontWeight:600 }}>{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ padding:"10px 14px", borderTop:`1px solid ${theme.primary}12`, background:`${theme.primary}04`, display:"flex", gap:"16px", flexWrap:"wrap", alignItems:"center" }}>
                <div><p style={{ fontSize:"9px", color:"#9ca3af" }}>Qtd</p><p style={{ fontWeight:700 }}>{form.qty}x</p></div>
                <div><p style={{ fontSize:"9px", color:"#9ca3af" }}>Preço Unit.</p><p style={{ fontWeight:700 }}>{fmt(precoUnit)}</p></div>
                {desc$>0&&<div><p style={{ fontSize:"9px", color:"#9ca3af" }}>Desconto</p><p style={{ fontWeight:700, color:"#059669" }}>-{form.desconto}%</p></div>}
                {frete$>0&&<div><p style={{ fontSize:"9px", color:"#9ca3af" }}>Frete CIF</p><p style={{ fontWeight:700 }}>{fmt(frete$)}</p></div>}
                {form.chassis&&<div><p style={{ fontSize:"9px", color:"#9ca3af" }}>Chassis</p><p style={{ fontSize:"10px", fontWeight:600 }}>{form.chassis}</p></div>}
                <div style={{ marginLeft:"auto" }}>
                  <p style={{ fontSize:"9px", color:"#9ca3af" }}>TOTAL</p>
                  <p style={{ fontWeight:900, fontSize:"17px", color:theme.primary }}>{fmt(total$)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"16px" }}>
            <div style={{ padding:"11px", background:"#f0fdf4", borderRadius:"6px", border:"1px solid #6ee7b7" }}>
              <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:"#059669", marginBottom:"4px" }}>💳 Pagamento</p>
              <p style={{ fontWeight:700, fontSize:"12px" }}>{pag.label}</p>
              {pag.entrada<100&&<p style={{ fontSize:"10px", color:"#6b7280", marginTop:"2px" }}>Entrada: <strong>{fmt(entrada$)}</strong> ({pag.entrada}%)</p>}
              {parcela$>0&&<p style={{ fontSize:"10px", color:"#6b7280" }}>{pag.meses}x de <strong>{fmt(parcela$)}</strong></p>}
              {pag.taxa>0&&<p style={{ fontSize:"10px", color:"#6b7280" }}>Taxa FINAME: {pag.taxa}% a.a.</p>}
            </div>
            <div style={{ padding:"11px", background:"#eff6ff", borderRadius:"6px", border:"1px solid #bfdbfe" }}>
              <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:theme.primary, marginBottom:"4px" }}>📦 Entrega & Garantia</p>
              <p style={{ fontSize:"11px" }}>Frete: <strong>{form.tipoFrete}</strong>{form.tipoFrete==="FOB"?" (por conta do comprador)":`— ${fmt(frete$)} incluso`}</p>
              <p style={{ fontSize:"11px", marginTop:"2px" }}>Prazo: <strong>{form.prazoEntrega}</strong></p>
              <p style={{ fontSize:"11px", marginTop:"2px" }}>Garantia: <strong>{form.garantia||M?.garantia}</strong></p>
            </div>
          </div>

          {form.observacoes&&(
            <div style={{ marginBottom:"14px", padding:"10px 12px", background:"#f9fafb", borderRadius:"6px", border:"1px solid #e5e7eb" }}>
              <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:"#9ca3af", marginBottom:"4px" }}>Observações</p>
              <p style={{ fontSize:"11px" }}>{form.observacoes}</p>
            </div>
          )}

          {/* Legal */}
          <div style={{ padding:"11px", background:"#fff7ed", borderRadius:"6px", border:"1px solid #fed7aa", marginBottom:"14px" }}>
            <p style={{ fontSize:"9px", fontWeight:700, textTransform:"uppercase", color:"#c2410c", marginBottom:"4px" }}>⚠️ Avisos Legais & Confidencialidade</p>
            <p style={{ fontSize:"9px", color:"#92400e", lineHeight:"1.7" }}>
              <strong>Confidencialidade:</strong> Este documento contém informações comerciais restritas e preços protegidos por sigilo corporativo. Proibida a reprodução ou repasse a terceiros sem autorização escrita da Gallotti Tractor.{" "}
              <strong>Variação:</strong> Preço sujeito a alteração sem aviso prévio conforme variação cambial, custo de frete e política do fabricante.{" "}
              <strong>Validade:</strong> Esta proposta é válida por <strong>3 (três) dias úteis</strong> a contar da data de emissão, ou seja, até <strong>{dataValidade}</strong>.
            </p>
          </div>

          {/* Footer */}
          <div style={{ borderTop:"1px solid #e5e7eb", paddingTop:"12px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ fontSize:"9px", color:"#9ca3af" }}>
              <p><strong style={{ color:"#374151" }}>Gallotti Tractor</strong> Comércio de Tratores e Máquinas Agrícolas LTDA</p>
              <p>CNPJ: 54.931.200/0001-97 · Luís Eduardo Magalhães - BA · CEP: 47855-244</p>
              <p>Concessionária Autorizada {M?.marca}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ borderTop:"1px solid #374151", paddingTop:"4px", minWidth:"160px" }}>
                <p style={{ fontSize:"10px", fontWeight:700, color:"#374151" }}>{user?.name}</p>
                <p style={{ fontSize:"9px", color:"#9ca3af" }}>Consultor Comercial — Gallotti Tractor</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/oportunidades")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="w-5 h-5" style={{ color:"#e21d3c" }} />Gerar Proposta Comercial</h1>
            <p className="text-xs text-muted-foreground">{numProposta}{versao>1?` — Versão ${versao}`:""}</p>
          </div>
        </div>
        {versao>1&&<span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background:"#D9770620", color:"#D97706" }}>Versão {versao}</span>}
      </div>

      {/* Brand indicator */}
      <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor:theme.primary+"40", background:theme.primary+"06" }}>
        <img src={theme.logo} alt={M?.marca} style={{ height:"28px", objectFit:"contain" }} onError={(e)=>{ (e.target as HTMLImageElement).style.display="none" }} />
        <div>
          <p className="text-sm font-bold" style={{ color:theme.primary }}>{M?.marca} — {M?.modelo}</p>
          <p className="text-xs text-muted-foreground">Layout {M?.marca==="ENSIGN"?"ENSIGN (laranja/preto)":"LS Tractor (azul/vermelho)"}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-2">
        {[{n:1,l:"Cliente"},{n:2,l:"Produto"},{n:3,l:"Preview"}].map(s=>(
          <button key={s.n} onClick={()=>setStep(s.n as 1|2|3)}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2 transition-all"
            style={{ background:step===s.n?theme.primary:"var(--card)", color:step===s.n?"white":"var(--muted-foreground)", borderColor:step===s.n?theme.primary:"var(--border)" }}>
            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background:step>s.n?"#059669":step===s.n?"white":"var(--muted)", color:step===s.n?theme.primary:"white" }}>
              {step>s.n?"✓":s.n}
            </span>{s.l}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step===1&&(
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" style={{ color:theme.primary }} />Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2"><Label>Razão Social / Nome *</Label><Input value={form.clienteNome} onChange={e=>setForm(f=>({...f,clienteNome:e.target.value}))} placeholder="AGROPECUÁRIA EXEMPLO LTDA" /></div>
              <div className="space-y-1.5"><Label>CNPJ / CPF</Label><Input value={form.clienteCnpj} onChange={e=>setForm(f=>({...f,clienteCnpj:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>WhatsApp</Label><Input value={form.clienteTelefone} onChange={e=>setForm(f=>({...f,clienteTelefone:e.target.value}))} placeholder="(77) 99999-9999" /></div>
              <div className="space-y-1.5 col-span-2"><Label>E-mail</Label><Input type="email" value={form.clienteEmail} onChange={e=>setForm(f=>({...f,clienteEmail:e.target.value}))} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Endereço</Label><Input value={form.clienteEndereco} onChange={e=>setForm(f=>({...f,clienteEndereco:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.clienteCidade} onChange={e=>setForm(f=>({...f,clienteCidade:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>UF</Label><Input maxLength={2} value={form.clienteUf} onChange={e=>setForm(f=>({...f,clienteUf:e.target.value.toUpperCase()}))} /></div>
            </div>
            <Button className="w-full mt-2" style={{ background:theme.primary, color:"white" }} disabled={!form.clienteNome} onClick={()=>setStep(2)}>Próximo — Produto →</Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step===2&&(
        <Card className="border-border">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Tractor className="w-4 h-4" style={{ color:theme.secondary }} />Produto e Condições</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modelo *</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.machineIndex} onChange={e=>setForm(f=>({...f,machineIndex:Number(e.target.value)}))}>
                {MACHINES.map((m:any,i:number)=><option key={i} value={i}>{m.marca} — {m.modelo} ({m.cv}cv) — {fmt(m.preco)}</option>)}
              </select>
            </div>
            <div className="rounded-xl p-3 border-2" style={{ borderColor:theme.primary+"40", background:theme.primary+"06" }}>
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-bold text-sm" style={{ color:theme.primary }}>{M?.modelo}</p>
                  <p className="text-xs text-muted-foreground">{M?.versao} · {M?.cv}cv · {M?.tracao}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{M?.aplicacao}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black" style={{ color:theme.primary }}>{fmt(M?.preco??0)}</p>
                  <p className="text-xs text-muted-foreground">Garantia: {M?.garantia}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Quantidade</Label><Input type="number" min="1" value={form.qty} onChange={e=>setForm(f=>({...f,qty:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Desconto (%)</Label><Input type="number" min="0" max="20" value={form.desconto} onChange={e=>setForm(f=>({...f,desconto:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Garantia</Label><Input value={form.garantia||M?.garantia||""} onChange={e=>setForm(f=>({...f,garantia:e.target.value}))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Frete</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["FOB","CIF"] as const).map(t=>(
                  <button key={t} onClick={()=>setForm(f=>({...f,tipoFrete:t}))}
                    className="py-3 rounded-xl border-2 font-bold text-sm transition-all"
                    style={{ borderColor:form.tipoFrete===t?theme.primary:"var(--border)", background:form.tipoFrete===t?theme.primary+"12":"var(--card)", color:form.tipoFrete===t?theme.primary:"var(--muted-foreground)" }}>
                    {t==="FOB"?"🏭 FOB":"🚚 CIF"}
                    <p className="text-xs font-normal mt-0.5">{t==="FOB"?"Por conta do comprador":"Frete incluso no preço"}</p>
                  </button>
                ))}
              </div>
              {form.tipoFrete==="CIF"&&(
                <div className="space-y-1.5"><Label>Valor do Frete (R$)</Label><Input type="number" value={form.valorFrete} onChange={e=>setForm(f=>({...f,valorFrete:e.target.value}))} placeholder="8500" /></div>
              )}
            </div>
            <div className="rounded-xl p-4 text-white space-y-2" style={{ background:theme.primary }}>
              <p className="text-xs font-bold uppercase opacity-70 tracking-wide">Resumo</p>
              <div className="flex justify-between text-sm"><span className="opacity-70">Subtotal ({form.qty}x)</span><span>{fmt(precoBase)}</span></div>
              {desc$>0&&<div className="flex justify-between text-sm"><span className="opacity-70">Desconto</span><span style={{ color:"#4ADE80" }}>-{fmt(desc$)}</span></div>}
              {frete$>0&&<div className="flex justify-between text-sm"><span className="opacity-70">Frete CIF</span><span>{fmt(frete$)}</span></div>}
              <div className="flex justify-between font-black text-lg border-t border-white/20 pt-2"><span>Total</span><span style={{ color:"#4ADE80" }}>{fmt(total$)}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background" value={form.pagamento} onChange={e=>setForm(f=>({...f,pagamento:e.target.value}))}>
                {PAGAMENTOS.map(p=><option key={p.label}>{p.label}</option>)}
              </select>
            </div>
            {parcela$>0&&(
              <div className="rounded-lg p-3 text-xs" style={{ background:"#f0fdf4", border:"1px solid #6ee7b7" }}>
                <p className="font-bold text-green-800 mb-1">💳 Simulação FINAME</p>
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-green-700">Entrada ({pag.entrada}%):</span><strong>{fmt(entrada$)}</strong>
                  <span className="text-green-700">{pag.meses}x de:</span><strong>{fmt(parcela$)}/mês</strong>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Prazo de Entrega</Label><Input value={form.prazoEntrega} onChange={e=>setForm(f=>({...f,prazoEntrega:e.target.value}))} /></div>
              <div className="space-y-1.5"><Label>Chassis (opcional)</Label><Input value={form.chassis} onChange={e=>setForm(f=>({...f,chassis:e.target.value}))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} /></div>
            <Button className="w-full" style={{ background:theme.primary, color:"white" }} onClick={()=>setStep(3)}>Próximo — Preview →</Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step===3&&(
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap no-print">
            <Button className="gap-2 flex-1" style={{ background:theme.primary, color:"white" }} onClick={()=>window.print()}>
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </Button>
            <Button className="gap-2 flex-1" style={{ background:"#25D366", color:"white" }} onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
            </Button>
            <Button variant="outline" className="gap-2 text-xs" onClick={novaVersao}>
              Nova Versão (v{versao+1})
            </Button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden"><Doc /></div>
        </div>
      )}
    </div>
  );
}
