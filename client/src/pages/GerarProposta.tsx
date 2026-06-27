import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Download, MessageCircle, Send, CheckCircle2,
  DollarSign, Calendar, Tractor, Building2, Phone, Mail,
  Loader2, ArrowLeft, Printer, Share2
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const MODELOS_LS = [
  { modelo: "MT2.27 / MT2.27E", cv: 27, preco: 95000 },
  { modelo: "J25H", cv: 25, preco: 88000 },
  { modelo: "G40", cv: 40, preco: 135000 },
  { modelo: "R50 Plataformado", cv: 50, preco: 148000 },
  { modelo: "R65 Plataformado", cv: 65, preco: 172000 },
  { modelo: "R65 Cabinado", cv: 65, preco: 195000 },
  { modelo: "MT4 70 Plataformado", cv: 70, preco: 185000 },
  { modelo: "MT4 70 Cabinado", cv: 70, preco: 218000 },
  { modelo: "Plus 80 Plataformado", cv: 80, preco: 205000 },
  { modelo: "Plus 80 Cabinado", cv: 80, preco: 235000 },
  { modelo: "MT7.80F Cabinado", cv: 82, preco: 260000 },
  { modelo: "Plus 100 Plataformado", cv: 100, preco: 248000 },
  { modelo: "Plus 100 Cabinado", cv: 100, preco: 278000 },
  { modelo: "MT7.90F Cabinado", cv: 92, preco: 295000 },
  { modelo: "H125 Plataformado", cv: 125, preco: 395000 },
  { modelo: "H125 Cabinado", cv: 125, preco: 428000 },
  { modelo: "H145 Plataformado", cv: 145, preco: 445000 },
  { modelo: "H145 Cabinado", cv: 149, preco: 485000 },
];

const FORMAS_PAGAMENTO = [
  { label: "FINAME — 60 meses", taxa: "7,5% a.a.", entrada: "10%" },
  { label: "FINAME — 48 meses", taxa: "7,5% a.a.", entrada: "15%" },
  { label: "BNDES — 60 meses", taxa: "8,5% a.a.", entrada: "10%" },
  { label: "À Vista", taxa: "—", entrada: "100%" },
  { label: "Financiamento Banco", taxa: "A combinar", entrada: "20%" },
];

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcParcela(principal: number, taxaAnual: number, meses: number) {
  const i = taxaAnual / 12 / 100;
  return principal * (i * Math.pow(1 + i, meses)) / (Math.pow(1 + i, meses) - 1);
}

function gerarNumeroProposta() {
  const d = new Date();
  return `PROP-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*999)+1).padStart(3,"0")}`;
}

export default function GerarProposta() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1|2|3>(1);
  const [generated, setGenerated] = useState(false);
  const [numeroProposta] = useState(gerarNumeroProposta);

  const [form, setForm] = useState({
    // Cliente
    clienteNome: "", clienteCnpj: "", clienteEndereco: "",
    clienteCidade: "", clienteUf: "", clienteTelefone: "", clienteEmail: "",
    // Produto
    modelo: "MT7.80F Cabinado", qty: "1",
    desconto: "0", chassisSelecionado: "",
    // Condições
    formaPagamento: "FINAME — 60 meses",
    observacoes: "",
    prazoEntrega: "30 dias",
    validade: format(addDays(new Date(), 15), "dd/MM/yyyy"),
  });

  const modeloData = MODELOS_LS.find(m => m.modelo === form.modelo) ?? MODELOS_LS[11];
  const precoBase = modeloData.preco * Number(form.qty || 1);
  const desconto = precoBase * (Number(form.desconto) / 100);
  const precoFinal = precoBase - desconto;
  const pagData = FORMAS_PAGAMENTO.find(p => p.label === form.formaPagamento) ?? FORMAS_PAGAMENTO[0];
  const entradaValor = pagData.entrada !== "100%" && pagData.entrada !== "A combinar"
    ? precoFinal * (parseFloat(pagData.entrada) / 100) : precoFinal;
  const financiado = precoFinal - entradaValor;
  const taxaNum = parseFloat(pagData.taxa.replace(",", ".").replace("% a.a.", ""));
  const meses = parseInt(pagData.label.match(/\d+ meses/)?.[0] ?? "0");
  const parcela = meses > 0 && !isNaN(taxaNum) ? calcParcela(financiado, taxaNum, meses) : 0;

  const handlePrint = () => {
    window.print();
    setGenerated(true);
  };

  const handleWhatsApp = () => {
    const msg = `Olá, *${form.clienteNome.split(" ")[0]}*! 👋

Da *Gallotti Tractor | LS Tractor*, conforme nossa conversa segue a proposta comercial:

*${numeroProposta}*

🚜 *${form.modelo}* (${modeloData.cv}cv)
💰 *Valor: ${formatMoney(precoFinal)}*
${form.desconto !== "0" ? `🎯 Desconto aplicado: ${form.desconto}%
` : ""}
💳 *Condições:* ${form.formaPagamento}
${pagData.entrada !== "100%" ? `• Entrada: ${pagData.entrada} = ${formatMoney(entradaValor)}
` : ""}
${parcela > 0 ? `• Parcela: ${formatMoney(parcela)}/mês
` : ""}
📦 *Prazo de entrega:* ${form.prazoEntrega}
📅 *Validade:* ${form.validade}

✅ Aprovação *FINAME/BNDES* garantida
🇧🇷 Fabricação nacional — Garuva/SC

Qualquer dúvida estou à disposição! 🤝`;

    const phone = form.clienteTelefone.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    toast.success("Mensagem de proposta aberta no WhatsApp!");
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/oportunidades")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: "#e21d3c" }} />
            Gerar Proposta Comercial
          </h1>
          <p className="text-xs text-muted-foreground">{numeroProposta}</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-2">
        {[
          { n: 1, label: "Cliente" },
          { n: 2, label: "Produto" },
          { n: 3, label: "Preview" },
        ].map(s => (
          <button key={s.n} onClick={() => setStep(s.n as 1|2|3)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all border"
            style={{
              background: step === s.n ? "#0a1e5a" : "var(--card)",
              color: step === s.n ? "white" : "var(--muted-foreground)",
              borderColor: step === s.n ? "#0a1e5a" : "var(--border)",
            }}>
            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: step >= s.n ? (step === s.n ? "white" : "#25D366") : "var(--muted)", color: step === s.n ? "#0a1e5a" : "white" }}>
              {step > s.n ? "✓" : s.n}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Cliente */}
      {step === 1 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: "#0a1e5a" }} />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Nome / Razão Social *</Label>
                <Input value={form.clienteNome} onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} placeholder="AGROPECUÁRIA EXEMPLO LTDA" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ / CPF</Label>
                <Input value={form.clienteCnpj} onChange={e => setForm(f => ({ ...f, clienteCnpj: e.target.value }))} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.clienteTelefone} onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} placeholder="(85) 99999-9999" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.clienteEmail} onChange={e => setForm(f => ({ ...f, clienteEmail: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Endereço</Label>
                <Input value={form.clienteEndereco} onChange={e => setForm(f => ({ ...f, clienteEndereco: e.target.value }))} placeholder="Rua, número, bairro" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.clienteCidade} onChange={e => setForm(f => ({ ...f, clienteCidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Input maxLength={2} value={form.clienteUf} onChange={e => setForm(f => ({ ...f, clienteUf: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <Button className="w-full" style={{ background: "#0a1e5a", color: "white" }}
              disabled={!form.clienteNome} onClick={() => setStep(2)}>
              Próximo — Produto →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Produto */}
      {step === 2 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tractor className="w-4 h-4" style={{ color: "#e21d3c" }} />
              Produto e Condições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modelo LS Tractor *</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}>
                {MODELOS_LS.map(m => (
                  <option key={m.modelo} value={m.modelo}>{m.modelo} — {m.cv}cv — {formatMoney(m.preco)}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Desconto (%)</Label>
                <Input type="number" min="0" max="20" value={form.desconto} onChange={e => setForm(f => ({ ...f, desconto: e.target.value }))} />
              </div>
            </div>

            {/* Price summary */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#0a1e5a", color: "white" }}>
              <p className="text-xs font-bold uppercase tracking-wide opacity-70">Resumo de Valores</p>
              <div className="flex justify-between text-sm"><span className="opacity-70">Preço tabela ({form.qty}x)</span><span>{formatMoney(precoBase)}</span></div>
              {Number(form.desconto) > 0 && <div className="flex justify-between text-sm"><span className="opacity-70">Desconto ({form.desconto}%)</span><span className="text-green-400">-{formatMoney(desconto)}</span></div>}
              <div className="flex justify-between text-base font-black border-t border-white/20 pt-2">
                <span>Total</span><span style={{ color: "#4ADE80" }}>{formatMoney(precoFinal)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))}>
                {FORMAS_PAGAMENTO.map(p => <option key={p.label}>{p.label}</option>)}
              </select>
            </div>

            {/* FINAME simulation */}
            {parcela > 0 && (
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: "#f0fdf4", border: "1px solid #6ee7b7" }}>
                <p className="text-xs font-bold text-green-800">💳 Simulação FINAME</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-green-700">Entrada:</span> <strong>{formatMoney(entradaValor)}</strong></div>
                  <div><span className="text-green-700">Financiado:</span> <strong>{formatMoney(financiado)}</strong></div>
                  <div><span className="text-green-700">Taxa:</span> <strong>{pagData.taxa}</strong></div>
                  <div><span className="text-green-700">Parcela:</span> <strong>{formatMoney(parcela)}/mês</strong></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo de Entrega</Label>
                <Input value={form.prazoEntrega} onChange={e => setForm(f => ({ ...f, prazoEntrega: e.target.value }))} placeholder="30 dias" />
              </div>
              <div className="space-y-1.5">
                <Label>Validade da Proposta</Label>
                <Input value={form.validade} onChange={e => setForm(f => ({ ...f, validade: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Implementos incluídos, condições especiais, etc." />
            </div>

            <Button className="w-full" style={{ background: "#0a1e5a", color: "white" }} onClick={() => setStep(3)}>
              Próximo — Preview →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview / Print */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap print:hidden">
            <Button className="gap-2 flex-1" style={{ background: "#0a1e5a", color: "white" }} onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
            </Button>
            <Button className="gap-2 flex-1" style={{ background: "#25D366", color: "white" }} onClick={handleWhatsApp}>
              <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
            </Button>
          </div>

          {/* Proposta document */}
          <div id="proposta-content" className="bg-white text-gray-900 rounded-xl border border-border overflow-hidden"
            style={{ fontFamily: "Georgia, serif" }}>
            {/* Header */}
            <div className="p-6 text-white" style={{ background: "linear-gradient(135deg, #0a1e5a, #1c3c8a)" }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black tracking-tight">🚜 Gallotti Tractor</p>
                  <p className="text-white/70 text-sm mt-0.5">Concessionária Autorizada LS Tractor</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/60 uppercase tracking-widest">Proposta Comercial</p>
                  <p className="font-bold text-lg mt-0.5">{numeroProposta}</p>
                  <p className="text-xs text-white/60">{format(new Date(), "dd/MM/yyyy")}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Cliente</p>
                  <p className="font-bold text-lg">{form.clienteNome || "—"}</p>
                  {form.clienteCnpj && <p className="text-sm text-gray-600">{form.clienteCnpj}</p>}
                  {form.clienteEndereco && <p className="text-sm text-gray-600">{form.clienteEndereco}</p>}
                  {form.clienteCidade && <p className="text-sm text-gray-600">{form.clienteCidade}/{form.clienteUf}</p>}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Consultor</p>
                  <p className="font-bold">{user?.name ?? "—"}</p>
                  <p className="text-sm text-gray-600">Gallotti Tractor | LS Tractor</p>
                  <p className="text-sm text-gray-600">Nordeste — Brasil</p>
                </div>
              </div>

              {/* Product */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Produto</p>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead style={{ background: "#f8fafc" }}>
                      <tr>
                        <th className="text-left px-4 py-3 font-bold">Modelo</th>
                        <th className="text-center px-3 py-3 font-bold">CV</th>
                        <th className="text-center px-3 py-3 font-bold">Qtd</th>
                        <th className="text-right px-4 py-3 font-bold">Valor Unit.</th>
                        <th className="text-right px-4 py-3 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-gray-100">
                        <td className="px-4 py-4">
                          <p className="font-bold">{form.modelo}</p>
                          <p className="text-xs text-gray-500">LS Tractor — Fabricação Nacional</p>
                        </td>
                        <td className="text-center px-3 py-4 font-semibold">{modeloData.cv}</td>
                        <td className="text-center px-3 py-4">{form.qty}</td>
                        <td className="text-right px-4 py-4">{formatMoney(modeloData.preco)}</td>
                        <td className="text-right px-4 py-4 font-bold">{formatMoney(precoBase)}</td>
                      </tr>
                    </tbody>
                    <tfoot style={{ background: "#f8fafc" }}>
                      {Number(form.desconto) > 0 && (
                        <tr className="border-t border-gray-200">
                          <td colSpan={4} className="px-4 py-2 text-right text-sm text-gray-600">Desconto ({form.desconto}%)</td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-green-700">-{formatMoney(desconto)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={4} className="px-4 py-3 text-right font-black text-base">VALOR TOTAL</td>
                        <td className="px-4 py-3 text-right font-black text-xl" style={{ color: "#0a1e5a" }}>{formatMoney(precoFinal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Condições */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Condições de Pagamento</p>
                  <p className="font-bold">{form.formaPagamento}</p>
                  {entradaValor !== precoFinal && <p className="text-sm text-gray-600">Entrada: {formatMoney(entradaValor)} ({pagData.entrada})</p>}
                  {parcela > 0 && <p className="text-sm text-gray-600">{meses}x de {formatMoney(parcela)}</p>}
                  {pagData.taxa !== "—" && <p className="text-sm text-gray-600">Taxa: {pagData.taxa}</p>}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Entrega & Validade</p>
                  <p className="font-bold">Prazo: {form.prazoEntrega}</p>
                  <p className="text-sm text-gray-600">Validade desta proposta: {form.validade}</p>
                </div>
              </div>

              {form.observacoes && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Observações</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{form.observacoes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <p className="font-bold text-gray-700 mb-1">Gallotti Tractor | LS Tractor</p>
                  <p>Concessionária Autorizada — Nordeste</p>
                  <p>✅ Aprovação FINAME e BNDES</p>
                  <p>🇧🇷 Peças e assistência no Nordeste</p>
                </div>
                <div className="text-right">
                  <p>Proposta válida até {form.validade}</p>
                  <p>Preços sujeitos a alteração</p>
                  <div className="mt-6 border-t border-gray-300 pt-2">
                    <p>{user?.name ?? "Consultor"}</p>
                    <p>Consultor Comercial</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print-specific styles */}
          <style>{`
            @media print {
              body > *:not(#proposta-root) { display: none !important; }
              #proposta-content { border: none !important; box-shadow: none !important; }
              .print\:hidden { display: none !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
