import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Package, MapPin, Calculator, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const LOC_CONFIG = {
  loja:     { label: "Na Loja",        color: "#059669", bg: "#F0FDF4" },
  fabrica:  { label: "Na Fábrica",     color: "#0a1e5a", bg: "#EFF6FF" },
  transito: { label: "Em Trânsito",    color: "#D97706", bg: "#FEF3C7" },
  vendido:  { label: "Vendido",        color: "#94A3B8", bg: "#F8FAFC" },
};

function calcPreco(custo: number, frete: number, impostos: number, margem: number) {
  const custoTotal = custo + frete + impostos;
  return custoTotal / (1 - margem / 100);
}

export default function Estoque() {
  const { user } = useAuth();
  const isAdm = user?.role === "adm" || user?.role === "gerente";
  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCalc, setShowCalc] = useState(false);

  const { data, isLoading, refetch } = trpc.estoque.list.useQuery({
    search: search || undefined,
    localizacao: locFilter || undefined,
  });

  const { data: maquinas } = trpc.maquinas.list.useQuery({});

  const createEstoque = trpc.estoque.create.useMutation({
    onSuccess: () => { toast.success("Unidade adicionada ao estoque!"); setShowForm(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    maquinaId: "", chassis: "", cor: "", localizacao: "loja",
    anoFabricacao: new Date().getFullYear().toString(),
    anoModelo: new Date().getFullYear().toString(),
    custoAquisicao: "", freteEntrada: "", impostos: "",
    margemPercentual: "12", observacoes: "",
  });

  // Calculator state
  const [calc, setCalc] = useState({
    custo: "", frete: "", impostos: "", margem: "12",
    icms: "12", ipi: "0", pis: "0.65", cofins: "3",
  });

  const custoTotal = Number(calc.custo) + Number(calc.frete);
  const impostosTotal = custoTotal * (Number(calc.icms) + Number(calc.ipi) + Number(calc.pis) + Number(calc.cofins)) / 100;
  const precoCalculado = calcPreco(Number(calc.custo), Number(calc.frete), Number(calc.impostos) || impostosTotal, Number(calc.margem));
  const margemValor = precoCalculado - custoTotal - (Number(calc.impostos) || impostosTotal);

  const stats = {
    total: data?.total ?? 0,
    loja: data?.data?.filter((e: any) => e.localizacao === "loja").length ?? 0,
    fabrica: data?.data?.filter((e: any) => e.localizacao === "fabrica").length ?? 0,
    transito: data?.data?.filter((e: any) => e.localizacao === "transito").length ?? 0,
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Estoque & Chassis</h1>
          <p className="text-muted-foreground text-sm mt-1">Máquinas disponíveis para venda imediata</p>
        </div>
        <div className="flex gap-2">
          {isAdm && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => setShowCalc(true)}>
                <Calculator className="w-4 h-4" /> Calculadora
              </Button>
              <Button style={{ background: "#e21d3c", color: "white" }} className="gap-2" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4" /> Entrada de Estoque
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "#0a1e5a" },
          { label: "Na Loja", value: stats.loja, color: "#059669" },
          { label: "Na Fábrica", value: stats.fabrica, color: "#0a1e5a" },
          { label: "Em Trânsito", value: stats.transito, color: "#D97706" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Modelo, chassis, cor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {Object.entries(LOC_CONFIG).map(([k, v]) => (
          <Button key={k} size="sm" variant={locFilter === k ? "default" : "outline"}
            style={locFilter === k ? { background: v.color } : {}}
            onClick={() => setLocFilter(locFilter === k ? "" : k)}>{v.label}</Button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : !(data?.data ?? []).length ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Estoque vazio</p>
          {isAdm && <Button className="mt-4" style={{ background: "#e21d3c", color: "white" }} onClick={() => setShowForm(true)}>Adicionar primeira unidade</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {(data?.data ?? []).map((item: any) => {
            const loc = LOC_CONFIG[item.localizacao as keyof typeof LOC_CONFIG] ?? LOC_CONFIG.loja;
            const custoTotal = Number(item.custoAquisicao ?? 0) + Number(item.freteEntrada ?? 0) + Number(item.impostos ?? 0);
            const precoVenda = Number(item.precoVendaBruto ?? 0);
            const margem = precoVenda > 0 ? ((precoVenda - custoTotal) / precoVenda * 100).toFixed(1) : null;
            return (
              <Card key={item.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-foreground">{item.maquinaModelo ?? `Máquina #${item.maquinaId}`}</p>
                        <Badge style={{ background: loc.bg, color: loc.color, border: `1px solid ${loc.color}40` }}>{loc.label}</Badge>
                        {item.localizacao === "loja" && <Badge style={{ background: "#e21d3c20", color: "#e21d3c" }}>✅ Pronta Entrega</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        {item.chassis && <span className="font-mono text-xs text-muted-foreground">Chassis: {item.chassis}</span>}
                        {item.cor && <span className="text-muted-foreground">Cor: {item.cor}</span>}
                        {item.anoModelo && <span className="text-muted-foreground">Ano: {item.anoModelo}</span>}
                        {item.maquinaCv && <span className="font-semibold" style={{ color: "#e21d3c" }}>{item.maquinaCv}cv</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {precoVenda > 0 && (
                        <>
                          <p className="text-lg font-bold text-green-700">R$ {precoVenda.toLocaleString("pt-BR")}</p>
                          {margem && <p className="text-xs text-muted-foreground">Margem: {margem}%</p>}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Entry Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: "#e21d3c" }} />
              Entrada de Estoque
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Máquina *</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.maquinaId} onChange={e => setForm(f => ({ ...f, maquinaId: e.target.value }))}>
                <option value="">Selecione o modelo...</option>
                {(maquinas?.data ?? []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.modelo} ({m.potenciaCv}cv)</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Chassis</Label>
                <Input value={form.chassis} onChange={e => setForm(f => ({ ...f, chassis: e.target.value }))} placeholder="LS7800F-2025-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <Input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Verde / Branco" />
              </div>
              <div className="space-y-1.5">
                <Label>Ano Fabricação</Label>
                <Input type="number" value={form.anoFabricacao} onChange={e => setForm(f => ({ ...f, anoFabricacao: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Ano Modelo</Label>
                <Input type="number" value={form.anoModelo} onChange={e => setForm(f => ({ ...f, anoModelo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Localização</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}>
                <option value="loja">Na Loja (Pronta Entrega)</option>
                <option value="fabrica">Na Fábrica (Disponível)</option>
                <option value="transito">Em Trânsito</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Custo Aquisição</Label>
                <Input type="number" value={form.custoAquisicao} onChange={e => setForm(f => ({ ...f, custoAquisicao: e.target.value }))} placeholder="180000" />
              </div>
              <div className="space-y-1.5">
                <Label>Frete Entrada</Label>
                <Input type="number" value={form.freteEntrada} onChange={e => setForm(f => ({ ...f, freteEntrada: e.target.value }))} placeholder="8500" />
              </div>
              <div className="space-y-1.5">
                <Label>Impostos</Label>
                <Input type="number" value={form.impostos} onChange={e => setForm(f => ({ ...f, impostos: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Margem % desejada</Label>
              <Input type="number" value={form.margemPercentual} onChange={e => setForm(f => ({ ...f, margemPercentual: e.target.value }))} />
            </div>
            {form.custoAquisicao && form.margemPercentual && (
              <div className="p-3 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #6ee7b7" }}>
                <p className="text-xs text-green-700 font-semibold mb-1">💰 Preço de Venda Sugerido:</p>
                <p className="text-xl font-bold text-green-800">
                  R$ {calcPreco(Number(form.custoAquisicao), Number(form.freteEntrada)||0, Number(form.impostos)||0, Number(form.margemPercentual)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1" style={{ background: "#e21d3c", color: "white" }}
                disabled={!form.maquinaId || createEstoque.isPending}
                onClick={() => createEstoque.mutate({
                  ...form,
                  maquinaId: Number(form.maquinaId),
                  anoFabricacao: Number(form.anoFabricacao),
                  anoModelo: Number(form.anoModelo),
                  precoVendaBruto: form.custoAquisicao ? String(calcPreco(Number(form.custoAquisicao), Number(form.freteEntrada)||0, Number(form.impostos)||0, Number(form.margemPercentual)).toFixed(2)) : undefined,
                })}>
                {createEstoque.isPending ? "Salvando..." : "Registrar Entrada"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Calculator */}
      <Dialog open={showCalc} onOpenChange={setShowCalc}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" style={{ color: "#0a1e5a" }} />
              Calculadora de Precificação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custo Fábrica (R$)</Label>
                <Input type="number" value={calc.custo} onChange={e => setCalc(c => ({ ...c, custo: e.target.value }))} placeholder="180000" />
              </div>
              <div className="space-y-1.5">
                <Label>Frete até Loja (R$)</Label>
                <Input type="number" value={calc.frete} onChange={e => setCalc(c => ({ ...c, frete: e.target.value }))} placeholder="8500" />
              </div>
              <div className="space-y-1.5">
                <Label>ICMS (%)</Label>
                <Input type="number" value={calc.icms} onChange={e => setCalc(c => ({ ...c, icms: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>IPI (%)</Label>
                <Input type="number" value={calc.ipi} onChange={e => setCalc(c => ({ ...c, ipi: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>PIS (%)</Label>
                <Input type="number" step="0.01" value={calc.pis} onChange={e => setCalc(c => ({ ...c, pis: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>COFINS (%)</Label>
                <Input type="number" step="0.01" value={calc.cofins} onChange={e => setCalc(c => ({ ...c, cofins: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Margem Lucro Desejada (%)</Label>
                <Input type="number" value={calc.margem} onChange={e => setCalc(c => ({ ...c, margem: e.target.value }))} />
              </div>
            </div>
            {calc.custo && (
              <div className="p-4 rounded-xl space-y-2" style={{ background: "#0a1e5a", color: "white" }}>
                <p className="text-xs font-bold uppercase tracking-wide opacity-70">Resultado</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="opacity-70">Custo + Frete</span><span>R$ {(Number(calc.custo)+Number(calc.frete)).toLocaleString("pt-BR")}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Impostos estimados</span><span>R$ {impostosTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span></div>
                  <div className="flex justify-between border-t border-white/20 pt-2 font-bold text-base">
                    <span>Preço de Venda</span>
                    <span style={{ color: "#4ADE80" }}>R$ {precoCalculado.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-xs opacity-70">
                    <span>Margem em R$</span>
                    <span>R$ {margemValor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
