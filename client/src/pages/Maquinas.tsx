import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tractor, Plus, Search, Upload, FileText, Loader2,
  Edit, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  AlertTriangle, Sparkles, Save, X, PlusCircle, Eye
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(v: number | string | null | undefined) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BRAND_COLORS: Record<string, { primary: string; secondary: string }> = {
  "LS Tractor": { primary: "#0a1e5a", secondary: "#e21d3c" },
  "ENSIGN":     { primary: "#1a1a1a", secondary: "#f97316" },
};

// ─── PDF Extractor via Claude API ─────────────────────────────────────────────
async function extractPDFWithClaude(base64: string): Promise<{
  marca?: string; modelo?: string; serie?: string; potenciaCv?: string;
  tracao?: string; transmissao?: string; versao?: string;
  aplicacaoPrincipal?: string; culturasSegmentos?: string;
  descricaoCompleta?: string;
  fichaTecnica: Record<string, string>;
}> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 }
          },
          {
            type: "text",
            text: `Analise esta ficha técnica de trator/máquina agrícola e extraia TODOS os dados.
Responda SOMENTE com JSON válido, sem texto adicional, sem markdown, sem explicações.

Formato exato:
{
  "marca": "LS Tractor ou ENSIGN",
  "modelo": "nome exato do modelo",
  "serie": "série se houver",
  "potenciaCv": "número em cv",
  "tracao": "4x4 ou 4x2",
  "transmissao": "descrição da transmissão",
  "versao": "Plataformado ou Cabinado ou outro",
  "aplicacaoPrincipal": "principais usos da máquina",
  "culturasSegmentos": "culturas e segmentos recomendados",
  "descricaoCompleta": "descrição técnica completa do produto em 2-3 parágrafos",
  "fichaTecnica": {
    "Motor": "...",
    "Potência Máxima": "...",
    "Torque": "...",
    "Cilindros": "...",
    "Capacidade do Tanque": "...",
    "Peso": "...",
    "Dimensões": "...",
    "Bitola Dianteira": "...",
    "Bitola Traseira": "...",
    "Rodagem Dianteira": "...",
    "Rodagem Traseira": "...",
    "Capacidade Hidráulica": "...",
    "Engate": "...",
    "Tomada de Força": "...",
    "Cabine": "..."
  }
}

Inclua TODOS os campos encontrados na ficha técnica, mesmo que não estejam listados acima.
Se não encontrar um campo, omita-o do JSON.`
          }
        ]
      }]
    })
  });

  const data = await response.json();
  const text = data.content?.[0]?.text ?? "{}";
  try {
    // Strip any markdown if present
    const clean = text.replace(/```json\n?|```\n?/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { fichaTecnica: {} };
  }
}

// ─── Machine Detail Modal ─────────────────────────────────────────────────────
function MaquinaDetalheModal({ maquina, onClose, onUpdate, isGestor }: {
  maquina: any; onClose: () => void;
  onUpdate: (data: any) => void; isGestor: boolean;
}) {
  const [fichaTecnica, setFichaTecnica] = useState<Record<string, string>>(() => {
    try { return JSON.parse(maquina.fichaTecnica || "{}"); } catch { return {}; }
  });
  const [camposCustom, setCamposCustom] = useState<Record<string, string>>(() => {
    try { return JSON.parse(maquina.camposCustom || "{}"); } catch { return {}; }
  });
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldVal, setNewFieldVal] = useState("");
  const [showAddField, setShowAddField] = useState(false);
  const [editingBase, setEditingBase] = useState(false);
  const [baseForm, setBaseForm] = useState({
    marca: maquina.marca ?? "",
    modelo: maquina.modelo ?? "",
    serie: maquina.serie ?? "",
    potenciaCv: maquina.potenciaCv ?? "",
    tracao: maquina.tracao ?? "",
    transmissao: maquina.transmissao ?? "",
    versao: maquina.versao ?? "",
    aplicacaoPrincipal: maquina.aplicacaoPrincipal ?? "",
    culturasSegmentos: maquina.culturasSegmentos ?? "",
    descricaoCompleta: maquina.descricaoCompleta ?? "",
    precoTabelaVarejo: maquina.precoTabelaVarejo ?? "",
    precoFabrica: maquina.precoFabrica ?? "",
  });

  const brandColor = BRAND_COLORS[maquina.marca]?.primary ?? "#0a1e5a";
  const allSpecs = { ...fichaTecnica, ...camposCustom };

  const addCustomField = () => {
    if (!newFieldKey.trim()) return;
    setCamposCustom(prev => ({ ...prev, [newFieldKey.trim()]: newFieldVal.trim() }));
    setNewFieldKey("");
    setNewFieldVal("");
    setShowAddField(false);
    toast.success(`Campo "${newFieldKey}" adicionado!`);
  };

  const removeCustomField = (key: string) => {
    setCamposCustom(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleSave = () => {
    onUpdate({
      id: maquina.id,
      ...baseForm,
      potenciaCv: baseForm.potenciaCv || undefined,
      precoTabelaVarejo: baseForm.precoTabelaVarejo || undefined,
      precoFabrica: baseForm.precoFabrica || undefined,
      fichaTecnica: JSON.stringify(fichaTecnica),
      camposCustom: JSON.stringify(camposCustom),
    });
    setEditingBase(false);
    toast.success("Máquina atualizada!");
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: brandColor + "20" }}>
              <Tractor className="w-4 h-4" style={{ color: brandColor }} />
            </div>
            <div>
              <p className="font-black" style={{ color: brandColor }}>{maquina.modelo}</p>
              <p className="text-xs text-muted-foreground font-normal">{maquina.marca} · {maquina.versao}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Foto */}
          {maquina.fotoUrl && (
            <img src={maquina.fotoUrl} alt={maquina.modelo}
              className="w-full max-h-48 object-contain rounded-xl border border-border" />
          )}

          {/* Dados base */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Dados do Produto</p>
              {isGestor && (
                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7"
                  onClick={() => setEditingBase(v => !v)}>
                  <Edit className="w-3 h-3" /> {editingBase ? "Cancelar" : "Editar"}
                </Button>
              )}
            </div>

            {editingBase ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label className="text-xs">Marca</Label>
                  <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                    value={baseForm.marca} onChange={e => setBaseForm(f => ({ ...f, marca: e.target.value }))}>
                    <option>LS Tractor</option><option>ENSIGN</option>
                  </select>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Modelo</Label>
                  <Input className="h-8 text-sm" value={baseForm.modelo} onChange={e => setBaseForm(f => ({ ...f, modelo: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Série</Label>
                  <Input className="h-8 text-sm" value={baseForm.serie} onChange={e => setBaseForm(f => ({ ...f, serie: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Potência (cv)</Label>
                  <Input className="h-8 text-sm" value={baseForm.potenciaCv} onChange={e => setBaseForm(f => ({ ...f, potenciaCv: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Tração</Label>
                  <Input className="h-8 text-sm" value={baseForm.tracao} onChange={e => setBaseForm(f => ({ ...f, tracao: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Transmissão</Label>
                  <Input className="h-8 text-sm" value={baseForm.transmissao} onChange={e => setBaseForm(f => ({ ...f, transmissao: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Versão</Label>
                  <Input className="h-8 text-sm" value={baseForm.versao} onChange={e => setBaseForm(f => ({ ...f, versao: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label className="text-xs">Preço Tabela Varejo</Label>
                  <Input className="h-8 text-sm" type="number" value={baseForm.precoTabelaVarejo} onChange={e => setBaseForm(f => ({ ...f, precoTabelaVarejo: e.target.value }))} /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs">Aplicação Principal</Label>
                  <Textarea className="text-sm resize-none" rows={2} value={baseForm.aplicacaoPrincipal} onChange={e => setBaseForm(f => ({ ...f, aplicacaoPrincipal: e.target.value }))} /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs">Culturas / Segmentos</Label>
                  <Input className="h-8 text-sm" value={baseForm.culturasSegmentos} onChange={e => setBaseForm(f => ({ ...f, culturasSegmentos: e.target.value }))} /></div>
                <div className="space-y-1.5 col-span-2"><Label className="text-xs">Descrição Técnica Completa</Label>
                  <Textarea className="text-sm resize-none" rows={4} value={baseForm.descricaoCompleta} onChange={e => setBaseForm(f => ({ ...f, descricaoCompleta: e.target.value }))} /></div>
                <div className="col-span-2">
                  <Button className="gap-2" style={{ background: brandColor, color: "white" }} onClick={handleSave}>
                    <Save className="w-4 h-4" /> Salvar Alterações
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Marca", maquina.marca], ["Modelo", maquina.modelo],
                  ["Série", maquina.serie], ["Potência", maquina.potenciaCv ? `${maquina.potenciaCv}cv` : "—"],
                  ["Tração", maquina.tracao], ["Transmissão", maquina.transmissao],
                  ["Versão", maquina.versao],
                  ["Preço Tabela", maquina.precoTabelaVarejo ? fmt(Number(maquina.precoTabelaVarejo)) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="p-2.5 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-sm font-semibold">{v || "—"}</p>
                  </div>
                ))}
                {maquina.aplicacaoPrincipal && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground">Aplicação Principal</p>
                    <p className="text-sm">{maquina.aplicacaoPrincipal}</p>
                  </div>
                )}
                {maquina.descricaoCompleta && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-muted/40">
                    <p className="text-xs text-muted-foreground mb-1">Descrição Técnica</p>
                    <p className="text-sm leading-relaxed">{maquina.descricaoCompleta}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ficha Técnica (specs) */}
          {Object.keys(allSpecs).length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Especificações Técnicas</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(fichaTecnica).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between p-2.5 rounded-lg bg-muted/30 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{k}</p>
                      {isGestor ? (
                        <input className="text-sm font-semibold w-full bg-transparent border-b border-transparent hover:border-border focus:border-border outline-none"
                          value={v} onChange={e => setFichaTecnica(prev => ({ ...prev, [k]: e.target.value }))} />
                      ) : (
                        <p className="text-sm font-semibold">{v}</p>
                      )}
                    </div>
                    {isGestor && (
                      <button className="text-muted-foreground hover:text-red-500 shrink-0 mt-1"
                        onClick={() => setFichaTecnica(prev => { const n = { ...prev }; delete n[k]; return n; })}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {/* Custom fields */}
                {Object.entries(camposCustom).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between p-2.5 rounded-lg gap-2"
                    style={{ background: "#0a1e5a08", border: "1px dashed #0a1e5a40" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold" style={{ color: "#0a1e5a" }}>{k} <span className="font-normal text-muted-foreground">(personalizado)</span></p>
                      {isGestor ? (
                        <input className="text-sm font-semibold w-full bg-transparent border-b border-transparent hover:border-border focus:border-border outline-none"
                          value={v} onChange={e => setCamposCustom(prev => ({ ...prev, [k]: e.target.value }))} />
                      ) : (
                        <p className="text-sm font-semibold">{v}</p>
                      )}
                    </div>
                    {isGestor && (
                      <button className="text-muted-foreground hover:text-red-500 shrink-0 mt-1" onClick={() => removeCustomField(k)}>
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add custom field */}
          {isGestor && (
            <div className="space-y-2">
              {!showAddField ? (
                <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setShowAddField(true)}>
                  <PlusCircle className="w-4 h-4" /> Adicionar Novo Campo
                </Button>
              ) : (
                <div className="p-3 rounded-xl border-2 border-dashed space-y-2" style={{ borderColor: "#0a1e5a40" }}>
                  <p className="text-xs font-bold" style={{ color: "#0a1e5a" }}>Novo campo personalizado</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do campo</Label>
                      <Input className="h-8 text-sm" placeholder="ex: Capacidade do Reservatório" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor</Label>
                      <Input className="h-8 text-sm" placeholder="ex: 120 litros" value={newFieldVal} onChange={e => setNewFieldVal(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAddField(false)}>Cancelar</Button>
                    <Button size="sm" className="flex-1 gap-1.5" style={{ background: "#0a1e5a", color: "white" }}
                      disabled={!newFieldKey.trim()} onClick={addCustomField}>
                      <Save className="w-3.5 h-3.5" /> Salvar Campo
                    </Button>
                  </div>
                </div>
              )}

              {/* Save all changes button */}
              {(Object.keys(camposCustom).length > 0 || Object.keys(fichaTecnica).length > 0) && (
                <Button className="w-full gap-2" style={{ background: "#059669", color: "white" }} onClick={handleSave}>
                  <CheckCircle2 className="w-4 h-4" /> Salvar Todas as Alterações
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Maquinas() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isGestor = ["adm", "admin", "gerente"].includes(role);

  const [search, setSearch] = useState("");
  const [marcaFilter, setMarcaFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [detalheTarget, setDetalheTarget] = useState<any>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  // PDF extraction state
  const [pdfState, setPdfState] = useState<"idle"|"reading"|"extracting"|"done"|"error">("idle");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [newForm, setNewForm] = useState<any>({
    marca: "LS Tractor", modelo: "", serie: "", potenciaCv: "", tracao: "4x4",
    transmissao: "", versao: "", aplicacaoPrincipal: "", culturasSegmentos: "",
    precoTabelaVarejo: "", precoFabrica: "", descricaoCompleta: "",
    fichaTecnica: {}, camposCustom: {},
  });
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldVal, setNewFieldVal] = useState("");

  const { data, isLoading, refetch } = trpc.maquinas.list.useQuery({
    search: search || undefined,
    marca: marcaFilter || undefined,
    ativo: true,
  });

  const createMaquina = trpc.maquinas.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); resetForm(); toast.success("Máquina cadastrada!"); },
    onError: e => toast.error(e.message),
  });

  const updateMaquina = trpc.maquinas.update.useMutation({
    onSuccess: () => { refetch(); setDetalheTarget(null); toast.success("Máquina atualizada!"); },
  });

  const deleteMaquina = trpc.maquinas.delete?.useMutation?.({
    onSuccess: () => { refetch(); toast.success("Máquina removida!"); },
  });

  const items = data?.data ?? [];

  const resetForm = () => {
    setNewForm({ marca: "LS Tractor", modelo: "", serie: "", potenciaCv: "", tracao: "4x4", transmissao: "", versao: "", aplicacaoPrincipal: "", culturasSegmentos: "", precoTabelaVarejo: "", precoFabrica: "", descricaoCompleta: "", fichaTecnica: {}, camposCustom: {} });
    setExtractedData(null);
    setPdfState("idle");
  };

  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Selecione um arquivo PDF"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF muito grande. Máximo 10MB"); return; }

    setPdfState("reading");
    toast.info("Lendo PDF...");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setPdfState("extracting");
      toast.info("🤖 Claude está extraindo os dados da ficha técnica...");
      try {
        const extracted = await extractPDFWithClaude(base64);
        setExtractedData(extracted);
        setNewForm((prev: any) => ({
          ...prev,
          marca: extracted.marca || prev.marca,
          modelo: extracted.modelo || prev.modelo,
          serie: extracted.serie || prev.serie,
          potenciaCv: extracted.potenciaCv || prev.potenciaCv,
          tracao: extracted.tracao || prev.tracao,
          transmissao: extracted.transmissao || prev.transmissao,
          versao: extracted.versao || prev.versao,
          aplicacaoPrincipal: extracted.aplicacaoPrincipal || prev.aplicacaoPrincipal,
          culturasSegmentos: extracted.culturasSegmentos || prev.culturasSegmentos,
          descricaoCompleta: extracted.descricaoCompleta || prev.descricaoCompleta,
          fichaTecnica: extracted.fichaTecnica || {},
        }));
        setPdfState("done");
        const count = Object.keys(extracted.fichaTecnica || {}).length;
        toast.success(`✅ ${count} campos extraídos automaticamente! Revise e salve.`);
      } catch {
        setPdfState("error");
        toast.error("Erro ao extrair PDF. Preencha os campos manualmente.");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setNewForm((f: any) => ({ ...f, fotoUrl: ev.target?.result as string }));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCreate = () => {
    createMaquina.mutate({
      ...newForm,
      potenciaCv: newForm.potenciaCv || undefined,
      precoTabelaVarejo: newForm.precoTabelaVarejo || undefined,
      precoFabrica: newForm.precoFabrica || undefined,
      fichaTecnica: JSON.stringify(newForm.fichaTecnica),
      camposCustom: JSON.stringify(newForm.camposCustom),
    });
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tractor className="w-6 h-6" style={{ color: "#0a1e5a" }} />
            Catálogo de Máquinas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Modelos cadastrados com ficha técnica completa
          </p>
        </div>
        {isGestor && (
          <Button style={{ background: "#0a1e5a", color: "white" }} className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Cadastrar Máquina
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select className="border border-border rounded-md text-sm px-3 py-2 bg-background"
          value={marcaFilter} onChange={e => setMarcaFilter(e.target.value)}>
          <option value="">Todas as marcas</option>
          <option>LS Tractor</option>
          <option>ENSIGN</option>
        </select>
      </div>

      {/* Machine grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Tractor className="w-16 h-16 mx-auto text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Nenhuma máquina cadastrada</p>
          <p className="text-sm text-muted-foreground">Clique em "Cadastrar Máquina" e faça upload da ficha técnica em PDF</p>
          {isGestor && <Button style={{ background: "#0a1e5a", color: "white" }} onClick={() => setShowAdd(true)}>Cadastrar primeira máquina</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((m: any) => {
            const bc = BRAND_COLORS[m.marca] ?? BRAND_COLORS["LS Tractor"];
            const specs = (() => { try { return { ...JSON.parse(m.fichaTecnica || "{}"), ...JSON.parse(m.camposCustom || "{}") }; } catch { return {}; } })();
            const specCount = Object.keys(specs).length;
            return (
              <Card key={m.id} className="border-border hover:shadow-md transition-all overflow-hidden">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${bc.primary}, ${bc.secondary})` }} />
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {m.fotoUrl ? (
                      <img src={m.fotoUrl} alt={m.modelo} className="w-20 h-20 object-contain rounded-lg border border-border shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center shrink-0" style={{ background: bc.primary + "08" }}>
                        <Tractor className="w-8 h-8" style={{ color: bc.primary + "60" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge className="text-xs mb-1" style={{ background: bc.primary + "15", color: bc.primary }}>{m.marca}</Badge>
                          <p className="font-black text-base leading-tight">{m.modelo}</p>
                          <p className="text-xs text-muted-foreground">{m.versao} · {m.potenciaCv}cv · {m.tracao}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {m.precoTabelaVarejo && (
                            <p className="text-sm font-black" style={{ color: bc.primary }}>{fmt(Number(m.precoTabelaVarejo))}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{specCount} specs</p>
                        </div>
                      </div>
                      {m.aplicacaoPrincipal && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{m.aplicacaoPrincipal}</p>
                      )}
                    </div>
                  </div>

                  {/* Spec preview */}
                  {specCount > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {Object.entries(specs).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded-md bg-muted/40 text-center">
                          <p className="text-xs text-muted-foreground truncate">{k}</p>
                          <p className="text-xs font-bold truncate">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                      onClick={() => setDetalheTarget(m)}>
                      <Eye className="w-3.5 h-3.5" /> Ver ficha completa
                    </Button>
                    {isGestor && (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs text-red-600 border-red-200"
                        onClick={() => { if (confirm("Remover máquina do catálogo?")) deleteMaquina?.mutate({ id: m.id }); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD MACHINE DIALOG */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) { setShowAdd(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: "#0a1e5a" }} />
              Cadastrar Máquina — Upload de Ficha Técnica
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* PDF Upload — primary action */}
            <div className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${pdfState === "done" ? "border-green-400 bg-green-50" : pdfState === "extracting" || pdfState === "reading" ? "border-blue-300 bg-blue-50" : "border-border hover:border-primary/40"}`}>
              <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={handlePDFUpload} />

              {pdfState === "idle" && (
                <>
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="font-bold text-base">Upload da Ficha Técnica (PDF)</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    O sistema extrai automaticamente todos os dados técnicos usando IA
                  </p>
                  <Button className="gap-2" style={{ background: "#0a1e5a", color: "white" }}
                    onClick={() => pdfRef.current?.click()}>
                    <Upload className="w-4 h-4" /> Selecionar PDF
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">Máximo 10MB · Preencha manualmente se preferir</p>
                </>
              )}

              {(pdfState === "reading" || pdfState === "extracting") && (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 mx-auto animate-spin text-blue-600" />
                  <p className="font-bold text-blue-800">
                    {pdfState === "reading" ? "Lendo PDF..." : "🤖 Extraindo dados com IA..."}
                  </p>
                  <p className="text-sm text-blue-600">Aguarde alguns segundos</p>
                </div>
              )}

              {pdfState === "done" && (
                <div className="space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-600" />
                  <p className="font-bold text-green-800">
                    ✅ {Object.keys(newForm.fichaTecnica).length} campos extraídos!
                  </p>
                  <p className="text-sm text-green-700">Revise os dados abaixo e ajuste se necessário</p>
                  <Button size="sm" variant="outline" onClick={() => pdfRef.current?.click()}>Trocar PDF</Button>
                </div>
              )}

              {pdfState === "error" && (
                <div className="space-y-2">
                  <AlertTriangle className="w-10 h-10 mx-auto text-red-500" />
                  <p className="font-bold text-red-700">Não foi possível extrair o PDF</p>
                  <p className="text-sm text-muted-foreground">Preencha os campos manualmente abaixo</p>
                  <Button size="sm" variant="outline" onClick={() => pdfRef.current?.click()}>Tentar novamente</Button>
                </div>
              )}
            </div>

            {/* Base form fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marca *</Label>
                <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                  value={newForm.marca} onChange={e => setNewForm((f: any) => ({ ...f, marca: e.target.value }))}>
                  <option>LS Tractor</option><option>ENSIGN</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Modelo *</Label>
                <Input value={newForm.modelo} onChange={e => setNewForm((f: any) => ({ ...f, modelo: e.target.value }))} placeholder="MT7.80F Cabinado" />
              </div>
              <div className="space-y-1.5">
                <Label>Série</Label>
                <Input value={newForm.serie} onChange={e => setNewForm((f: any) => ({ ...f, serie: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Potência (cv)</Label>
                <Input type="number" value={newForm.potenciaCv} onChange={e => setNewForm((f: any) => ({ ...f, potenciaCv: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tração</Label>
                <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                  value={newForm.tracao} onChange={e => setNewForm((f: any) => ({ ...f, tracao: e.target.value }))}>
                  <option>4x4</option><option>4x2</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Versão</Label>
                <Input value={newForm.versao} onChange={e => setNewForm((f: any) => ({ ...f, versao: e.target.value }))} placeholder="Cabinado / Plataformado" />
              </div>
              <div className="space-y-1.5">
                <Label>Preço Tabela Varejo (R$)</Label>
                <Input type="number" value={newForm.precoTabelaVarejo} onChange={e => setNewForm((f: any) => ({ ...f, precoTabelaVarejo: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Transmissão</Label>
                <Input value={newForm.transmissao} onChange={e => setNewForm((f: any) => ({ ...f, transmissao: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Aplicação Principal</Label>
                <Textarea rows={2} className="resize-none text-sm" value={newForm.aplicacaoPrincipal} onChange={e => setNewForm((f: any) => ({ ...f, aplicacaoPrincipal: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Culturas / Segmentos</Label>
                <Input value={newForm.culturasSegmentos} onChange={e => setNewForm((f: any) => ({ ...f, culturasSegmentos: e.target.value }))} placeholder="Cafeicultura, Pecuaria, Soja..." />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Descrição Técnica Completa</Label>
                <Textarea rows={3} className="resize-none text-sm" value={newForm.descricaoCompleta} onChange={e => setNewForm((f: any) => ({ ...f, descricaoCompleta: e.target.value }))} />
              </div>
            </div>

            {/* Foto */}
            <div className="space-y-2">
              <Label>Foto da Máquina</Label>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              {newForm.fotoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={newForm.fotoUrl} alt="preview" className="w-24 h-24 object-contain rounded-lg border border-border" />
                  <Button size="sm" variant="outline" onClick={() => pdfRef.current?.click()}>Trocar foto</Button>
                </div>
              ) : (
                <Button variant="outline" className="gap-2 w-full" onClick={() => fotoRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Upload da foto
                </Button>
              )}
            </div>

            {/* Specs extracted */}
            {Object.keys(newForm.fichaTecnica).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Especificações extraídas ({Object.keys(newForm.fichaTecnica).length} campos)
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(newForm.fichaTecnica).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{k}</p>
                        <input className="text-xs font-semibold w-full bg-transparent outline-none"
                          value={String(v)}
                          onChange={e => setNewForm((f: any) => ({ ...f, fichaTecnica: { ...f.fichaTecnica, [k]: e.target.value } }))} />
                      </div>
                      <button onClick={() => setNewForm((f: any) => { const ft = { ...f.fichaTecnica }; delete ft[k]; return { ...f, fichaTecnica: ft }; })}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add custom field */}
            {!showAddField ? (
              <Button variant="outline" size="sm" className="gap-2 w-full" onClick={() => setShowAddField(true)}>
                <PlusCircle className="w-4 h-4" /> Adicionar Novo Campo
              </Button>
            ) : (
              <div className="p-3 rounded-xl border-2 border-dashed space-y-2" style={{ borderColor: "#0a1e5a40" }}>
                <p className="text-xs font-bold" style={{ color: "#0a1e5a" }}>Novo campo personalizado</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input className="h-8 text-sm" placeholder="Nome do campo" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} />
                  <Input className="h-8 text-sm" placeholder="Valor" value={newFieldVal} onChange={e => setNewFieldVal(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowAddField(false)}>Cancelar</Button>
                  <Button size="sm" className="flex-1" style={{ background: "#0a1e5a", color: "white" }}
                    disabled={!newFieldKey.trim()}
                    onClick={() => {
                      setNewForm((f: any) => ({ ...f, camposCustom: { ...f.camposCustom, [newFieldKey]: newFieldVal } }));
                      setNewFieldKey(""); setNewFieldVal(""); setShowAddField(false);
                    }}>
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            {/* Save */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); resetForm(); }}>Cancelar</Button>
              <Button className="flex-1 gap-2" style={{ background: "#0a1e5a", color: "white" }}
                disabled={!newForm.modelo || createMaquina.isPending}
                onClick={handleCreate}>
                {createMaquina.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Salvar Máquina
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal */}
      {detalheTarget && (
        <MaquinaDetalheModal
          maquina={detalheTarget}
          onClose={() => setDetalheTarget(null)}
          onUpdate={(data) => updateMaquina.mutate(data)}
          isGestor={isGestor}
        />
      )}
    </div>
  );
}
