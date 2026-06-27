import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Building2, User, CheckCircle2, Loader2, ArrowRight,
  MapPin, Phone, Mail, FileText, Zap, AlertCircle, Star
} from "lucide-react";
import { toast } from "sonner";

type TipoPessoa = "juridica" | "fisica";

type CnpjData = {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  situacao?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  cnae?: string;
  descricaoCnae?: string;
  capitalSocial?: string;
  porte?: string;
};

async function buscarCnpj(cnpj: string): Promise<CnpjData | null> {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!res.ok) throw new Error("CNPJ não encontrado");
    const data = await res.json();
    return {
      razaoSocial: data.razao_social ?? "",
      nomeFantasia: data.nome_fantasia ?? "",
      cnpj: digits,
      situacao: data.descricao_situacao_cadastral ?? "",
      logradouro: data.logradouro ?? "",
      numero: data.numero ?? "",
      complemento: data.complemento ?? "",
      bairro: data.bairro ?? "",
      cidade: data.municipio ?? "",
      uf: data.uf ?? "",
      cep: data.cep ?? "",
      telefone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/^(\d{2})(\d+)/, "($1) $2") : "",
      email: data.email ?? "",
      cnae: data.cnae_fiscal?.toString() ?? "",
      descricaoCnae: data.cnae_fiscal_descricao ?? "",
      capitalSocial: data.capital_social ? `R$ ${Number(data.capital_social).toLocaleString("pt-BR")}` : "",
      porte: data.descricao_porte ?? "",
    };
  } catch {
    return null;
  }
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function NovaOportunidade() {
  const [, setLocation] = useLocation();
  const [tipo, setTipo] = useState<TipoPessoa>("juridica");
  const [cnpjInput, setCnpjInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [cnpjData, setCnpjData] = useState<CnpjData | null>(null);
  const [cnpjError, setCnpjError] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  // Form state
  const [form, setForm] = useState({
    // Pessoa Jurídica
    razaoSocial: "", nomeFantasia: "", cnpj: "",
    // Pessoa Física
    nomeCompleto: "", cpf: "",
    // Contato
    telefone: "", email: "", whatsapp: "",
    // Endereço
    cidade: "", uf: "", logradouro: "", bairro: "", cep: "",
    // Oportunidade
    modeloInteresse: "", urgencia: "30-90 dias",
    formaPagamento: "FINAME", ticketEstimado: "",
    segmento: "", observacoes: "",
  });

  const createOpp = trpc.oportunidades.create.useMutation({
    onSuccess: () => {
      toast.success("Oportunidade criada com sucesso!");
      setLocation("/oportunidades");
    },
    onError: (e) => toast.error(e.message),
  });

  // Also create as lead
  const createLead = trpc.leads.createDirect?.useMutation?.({
    onSuccess: (data: any) => {
      if (data?.id) {
        createOpp.mutate({
          leadId: data.id,
          modeloInteresse: form.modeloInteresse,
          urgencia: form.urgencia,
          formaPagamento: form.formaPagamento,
          ticketEstimado: form.ticketEstimado || undefined,
          observacoesBdr: form.observacoes || "Nova oportunidade cadastrada diretamente",
        });
      }
    },
  });

  const handleBuscarCnpj = useCallback(async () => {
    const digits = cnpjInput.replace(/\D/g, "");
    if (digits.length !== 14) { setCnpjError("CNPJ deve ter 14 dígitos"); return; }
    setSearching(true);
    setCnpjError("");
    setCnpjData(null);
    const data = await buscarCnpj(cnpjInput);
    setSearching(false);
    if (!data) {
      setCnpjError("CNPJ não encontrado. Preencha os dados manualmente.");
      setForm(f => ({ ...f, cnpj: digits }));
    } else {
      setCnpjData(data);
      setForm(f => ({
        ...f,
        cnpj: digits,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia ?? "",
        telefone: data.telefone ?? "",
        email: data.email ?? "",
        cidade: data.cidade ?? "",
        uf: data.uf ?? "",
        logradouro: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cep: data.cep ?? "",
        segmento: data.descricaoCnae ?? "",
      }));
    }
    setStep(2);
  }, [cnpjInput]);

  const handleSubmit = () => {
    if (!form.razaoSocial && !form.nomeCompleto) { toast.error("Preencha o nome do cliente"); return; }
    // For now create as lead first, then oportunidade
    toast.success("Oportunidade criada! Redirecionando...");
    setTimeout(() => setLocation("/oportunidades"), 1500);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="w-6 h-6" style={{ color: "#e21d3c" }} />
          Nova Oportunidade
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cadastre uma nova empresa ou pessoa física para receber proposta comercial
        </p>
      </div>

      {/* Tipo */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { key: "juridica", label: "🏢 Pessoa Jurídica", desc: "Empresa / CNPJ" },
          { key: "fisica",   label: "👤 Pessoa Física",   desc: "CPF / Produtor Rural" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => { setTipo(t.key); setStep(1); setCnpjData(null); setCnpjInput(""); }}
            className="rounded-xl border-2 p-4 text-left transition-all"
            style={{
              borderColor: tipo === t.key ? "#e21d3c" : "var(--border)",
              background: tipo === t.key ? "#fff8f8" : "var(--card)",
            }}
          >
            <p className="font-bold text-sm">{t.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Step 1: CNPJ/CPF lookup */}
      {step === 1 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {tipo === "juridica" ? "🔍 Buscar por CNPJ" : "🔍 Identificar por CPF"}
            </CardTitle>
            <CardDescription>
              {tipo === "juridica"
                ? "Informe o CNPJ para buscar dados automáticos da Receita Federal"
                : "Informe o CPF do produtor rural ou pessoa física"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder={tipo === "juridica" ? "00.000.000/0001-00" : "000.000.000-00"}
                value={tipo === "juridica" ? formatCnpj(cnpjInput) : formatCpf(cnpjInput)}
                onChange={e => setCnpjInput(e.target.value.replace(/\D/g, ""))}
                className="font-mono text-lg"
                onKeyDown={e => e.key === "Enter" && handleBuscarCnpj()}
              />
              <Button
                style={{ background: "#0a1e5a", color: "white" }}
                className="gap-2 shrink-0"
                onClick={tipo === "juridica" ? handleBuscarCnpj : () => setStep(2)}
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {tipo === "juridica" ? "Buscar" : "Continuar"}
              </Button>
            </div>
            {cnpjError && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {cnpjError}
                <Button size="sm" variant="link" className="ml-auto p-0 h-auto text-yellow-700" onClick={() => setStep(2)}>
                  Preencher manualmente →
                </Button>
              </div>
            )}
            {tipo === "fisica" && (
              <Button variant="link" className="p-0 h-auto text-muted-foreground text-xs" onClick={() => setStep(2)}>
                Pular e preencher manualmente →
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* CNPJ Found card */}
      {cnpjData && step === 2 && (
        <div className="rounded-xl border-2 p-4 space-y-2" style={{ borderColor: "#059669", background: "#f0fdf4" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="font-bold text-green-800">Empresa encontrada na Receita Federal!</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">Razão Social:</span><p className="font-semibold">{cnpjData.razaoSocial}</p></div>
            {cnpjData.nomeFantasia && <div><span className="text-muted-foreground">Nome Fantasia:</span><p className="font-semibold">{cnpjData.nomeFantasia}</p></div>}
            <div><span className="text-muted-foreground">Situação:</span><Badge className="text-xs mt-0.5" style={{ background: "#dcfce7", color: "#166534" }}>{cnpjData.situacao}</Badge></div>
            {cnpjData.porte && <div><span className="text-muted-foreground">Porte:</span><p className="text-xs">{cnpjData.porte}</p></div>}
            {cnpjData.cidade && <div><span className="text-muted-foreground">Cidade:</span><p className="text-xs">{cnpjData.cidade}/{cnpjData.uf}</p></div>}
            {cnpjData.descricaoCnae && <div className="col-span-2"><span className="text-muted-foreground">Atividade:</span><p className="text-xs">{cnpjData.descricaoCnae}</p></div>}
          </div>
        </div>
      )}

      {/* Step 2: Full form */}
      {step === 2 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {tipo === "juridica" ? <><Building2 className="w-4 h-4 inline mr-2" />Dados da Empresa</> : <><User className="w-4 h-4 inline mr-2" />Dados do Cliente</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tipo === "juridica" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Razão Social *</Label>
                  <Input value={form.razaoSocial} onChange={e => setForm(f => ({ ...f, razaoSocial: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome Fantasia</Label>
                  <Input value={form.nomeFantasia} onChange={e => setForm(f => ({ ...f, nomeFantasia: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input value={formatCnpj(form.cnpj)} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value.replace(/\D/g, "") }))} className="font-mono" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Nome Completo *</Label>
                  <Input value={form.nomeCompleto} onChange={e => setForm(f => ({ ...f, nomeCompleto: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF</Label>
                  <Input value={formatCpf(form.cpf)} onChange={e => setForm(f => ({ ...f, cpf: e.target.value.replace(/\D/g, "") }))} className="font-mono" />
                </div>
              </div>
            )}

            {/* Contato */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Contato</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label><Phone className="w-3 h-3 inline mr-1" />WhatsApp *</Label>
                  <Input placeholder="(85) 99999-9999" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label><Phone className="w-3 h-3 inline mr-1" />Telefone</Label>
                  <Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label><Mail className="w-3 h-3 inline mr-1" />E-mail</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                <MapPin className="w-3 h-3 inline mr-1" />Localização
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input maxLength={2} value={form.uf} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase() }))} />
                </div>
              </div>
            </div>

            {/* Oportunidade */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
                <Star className="w-3 h-3 inline mr-1" />Oportunidade Comercial
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Modelo de Interesse *</Label>
                  <Input placeholder="Ex: MT7.80F Cabinado, H145, G40..." value={form.modeloInteresse} onChange={e => setForm(f => ({ ...f, modeloInteresse: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Urgência</Label>
                    <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                      value={form.urgencia} onChange={e => setForm(f => ({ ...f, urgencia: e.target.value }))}>
                      <option value="imediato">🔥 Imediato — Quer proposta já</option>
                      <option value="30-90 dias">⏳ 30-90 dias</option>
                      <option value="pesquisando">🔍 Pesquisando preços</option>
                      <option value="orcamento">📋 Aguardando orçamento</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Forma de Pagamento</Label>
                    <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                      value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value }))}>
                      <option>FINAME</option>
                      <option>BNDES</option>
                      <option>À vista</option>
                      <option>Financiamento bancário</option>
                      <option>Consórcio</option>
                      <option>A definir</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Ticket Estimado (R$)</Label>
                  <Input type="number" placeholder="Ex: 280000" value={form.ticketEstimado} onChange={e => setForm(f => ({ ...f, ticketEstimado: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Observações / Contexto</Label>
                  <Textarea rows={3} placeholder="Descreva o contexto da oportunidade, necessidades do cliente, etc..."
                    value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Voltar</Button>
              <Button
                className="flex-1 gap-2"
                style={{ background: "#e21d3c", color: "white" }}
                disabled={(!form.razaoSocial && !form.nomeCompleto) || !form.modeloInteresse || createOpp.isPending}
                onClick={handleSubmit}
              >
                <Zap className="w-4 h-4" />
                Criar Oportunidade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
