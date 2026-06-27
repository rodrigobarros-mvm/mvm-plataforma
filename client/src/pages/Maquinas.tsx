import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Edit, Tractor, Zap } from "lucide-react";
import { toast } from "sonner";

const MARCAS = ["LS Tractor", "ENSIGN"];
const SERIES_LS = ["Série J", "Série MT1", "Série MT2", "Série G", "Série R", "Série U", "Série MT4", "Série MT7", "Série Plus", "Série H"];

export default function Maquinas() {
  const { user } = useAuth();
  const isAdm = user?.role === "adm" || user?.role === "gerente";
  const [search, setSearch] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.maquinas.list.useQuery({
    search: search || undefined,
    marca: marcaFilter || undefined,
  });

  const createMaquina = trpc.maquinas.create.useMutation({
    onSuccess: () => { toast.success("Máquina cadastrada!"); setShowForm(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    marca: "LS Tractor", serie: "", modelo: "", potenciaCv: "",
    tracao: "4x4", transmissao: "", versao: "Cabinado",
    aplicacaoPrincipal: "", culturasSegmentos: "",
    precoFabrica: "", precoTabelaVarejo: "",
    fichaTecnica: "", fotoUrl: "",
  });

  const handleSave = () => {
    createMaquina.mutate({
      ...form,
      potenciaCv: form.potenciaCv ? form.potenciaCv : undefined,
      precoFabrica: form.precoFabrica || undefined,
      precoTabelaVarejo: form.precoTabelaVarejo || undefined,
    });
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Máquinas</h1>
          <p className="text-muted-foreground text-sm mt-1">Linha LS Tractor e Pás ENSIGN disponíveis</p>
        </div>
        {isAdm && (
          <Button style={{ background: "#e21d3c", color: "white" }} className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" /> Nova Máquina
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Modelo, série, aplicação..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {MARCAS.map(m => (
          <Button key={m} size="sm" variant={marcaFilter === m ? "default" : "outline"}
            style={marcaFilter === m ? { background: "#0a1e5a" } : {}}
            onClick={() => setMarcaFilter(marcaFilter === m ? "" : m)}
          >{m}</Button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : !(data?.data ?? []).length ? (
        <div className="text-center py-16">
          <Tractor className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Nenhuma máquina cadastrada</p>
          {isAdm && <Button className="mt-4" style={{ background: "#e21d3c", color: "white" }} onClick={() => setShowForm(true)}>Cadastrar primeira máquina</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data?.data ?? []).map((m: any) => (
            <Card key={m.id} className="border-border hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Badge className="text-xs mb-2" style={{ background: "#0a1e5a20", color: "#0a1e5a" }}>{m.marca}</Badge>
                    <p className="font-bold text-foreground text-lg">{m.modelo}</p>
                    <p className="text-xs text-muted-foreground">{m.serie}</p>
                  </div>
                  <div className="text-right">
                    {m.potenciaCv && <p className="text-2xl font-bold" style={{ color: "#e21d3c" }}>{m.potenciaCv}<span className="text-sm">cv</span></p>}
                    {m.versao && <Badge variant="outline" className="text-xs">{m.versao}</Badge>}
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  {m.tracao && <p className="text-muted-foreground">Tração: <span className="text-foreground font-medium">{m.tracao}</span></p>}
                  {m.transmissao && <p className="text-muted-foreground">Câmbio: <span className="text-foreground font-medium">{m.transmissao}</span></p>}
                  {m.aplicacaoPrincipal && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{m.aplicacaoPrincipal}</p>}
                  {m.culturasSegmentos && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.culturasSegmentos.split(",").slice(0, 3).map((c: string) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted">{c.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
                {(m.precoTabelaVarejo || m.precoFabrica) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {m.precoTabelaVarejo && (
                      <p className="text-sm font-bold text-green-700">
                        Tabela: R$ {Number(m.precoTabelaVarejo).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {m.precoFabrica && (
                      <p className="text-xs text-muted-foreground">
                        Fábrica: R$ {Number(m.precoFabrica).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </div>
                )}
                {isAdm && (
                  <Button variant="outline" size="sm" className="w-full mt-3 gap-1.5 text-xs"
                    onClick={() => { setEditId(m.id); setShowForm(true); }}>
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tractor className="w-5 h-5" style={{ color: "#e21d3c" }} />
              {editId ? "Editar Máquina" : "Nova Máquina"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5 col-span-2">
              <Label>Marca</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}>
                {MARCAS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Série</Label>
              <Input value={form.serie} onChange={e => setForm(f => ({ ...f, serie: e.target.value }))} placeholder="Ex: Série MT7" />
            </div>
            <div className="space-y-1.5">
              <Label>Modelo *</Label>
              <Input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="MT7.80F Cabinado" />
            </div>
            <div className="space-y-1.5">
              <Label>Potência (cv)</Label>
              <Input type="number" value={form.potenciaCv} onChange={e => setForm(f => ({ ...f, potenciaCv: e.target.value }))} placeholder="82" />
            </div>
            <div className="space-y-1.5">
              <Label>Versão</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={form.versao} onChange={e => setForm(f => ({ ...f, versao: e.target.value }))}>
                <option>Cabinado</option><option>Plataformado</option><option>Open Station</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tração</Label>
              <Input value={form.tracao} onChange={e => setForm(f => ({ ...f, tracao: e.target.value }))} placeholder="4x4" />
            </div>
            <div className="space-y-1.5">
              <Label>Transmissão</Label>
              <Input value={form.transmissao} onChange={e => setForm(f => ({ ...f, transmissao: e.target.value }))} placeholder="16Fr x 16Re PowerShuttle" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Aplicação Principal</Label>
              <Textarea rows={2} value={form.aplicacaoPrincipal} onChange={e => setForm(f => ({ ...f, aplicacaoPrincipal: e.target.value }))} placeholder="Cafeicultura, fruticultura, operações em espaços reduzidos..." />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Culturas / Segmentos</Label>
              <Input value={form.culturasSegmentos} onChange={e => setForm(f => ({ ...f, culturasSegmentos: e.target.value }))} placeholder="Café, Citrus, Fruticultura, Fumicultura" />
            </div>
            <div className="space-y-1.5">
              <Label>Preço Fábrica (R$)</Label>
              <Input type="number" value={form.precoFabrica} onChange={e => setForm(f => ({ ...f, precoFabrica: e.target.value }))} placeholder="180000" />
            </div>
            <div className="space-y-1.5">
              <Label>Preço Tabela Varejo (R$)</Label>
              <Input type="number" value={form.precoTabelaVarejo} onChange={e => setForm(f => ({ ...f, precoTabelaVarejo: e.target.value }))} placeholder="245000" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>URL da Foto</Label>
              <Input value={form.fotoUrl} onChange={e => setForm(f => ({ ...f, fotoUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="col-span-2 flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button className="flex-1" style={{ background: "#e21d3c", color: "white" }}
                disabled={!form.modelo || createMaquina.isPending} onClick={handleSave}>
                {createMaquina.isPending ? "Salvando..." : "Salvar Máquina"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
