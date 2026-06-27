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
  Package, Plus, Search, CheckCircle2, XCircle, Clock,
  Upload, Camera, FileText, AlertTriangle, Unlock, Lock,
  ChevronRight, ListChecks, DollarSign, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useCelebration } from "@/hooks/useCelebration";

// ─── Checklist padrão de recebimento ─────────────────────────────────────────
const CHECKLIST_ITEMS = [
  { id: "nf_confere",      label: "Nota Fiscal confere com o chassi", obrigatorio: true },
  { id: "chassi_visivel",  label: "Chassi visível e legível", obrigatorio: true, fotoObrigatoria: true },
  { id: "placa_caminhao",  label: "Placa do caminhão registrada", obrigatorio: true, fotoObrigatoria: true },
  { id: "cnh_motorista",   label: "CNH do motorista registrada", obrigatorio: true, fotoObrigatoria: true },
  { id: "sem_avarias",     label: "Máquina sem avarias externas", obrigatorio: true },
  { id: "implementos",     label: "Todos os implementos/acessórios presentes", obrigatorio: true },
  { id: "manual",          label: "Manual do proprietário presente", obrigatorio: false },
  { id: "chaves",          label: "Chaves entregues", obrigatorio: true },
  { id: "horimetro",       label: "Horímetro zerado / registrado", obrigatorio: true },
  { id: "fluidos",         label: "Fluidos verificados", obrigatorio: true },
  { id: "fotos_geral",     label: "Fotos gerais da máquina (mín. 10)", obrigatorio: true, fotoObrigatoria: true },
  { id: "processo_rec",    label: "Fotos do processo de recebimento", obrigatorio: true, fotoObrigatoria: true },
];

const FOTO_MINIMA = 10;

const LOC_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  loja:     { label: "Loja",     color: "#059669", bg: "#f0fdf4" },
  fabrica:  { label: "Fábrica",  color: "#0891B2", bg: "#ecfeff" },
  transito: { label: "Trânsito", color: "#D97706", bg: "#fef3c7" },
  vendido:  { label: "Vendido",  color: "#94A3B8", bg: "#f8fafc" },
};

function formatMoney(v: number | string | null | undefined) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Sub-component: Checklist Modal ─────────────────────────────────────────
function ChecklistModal({
  item, onClose, onSave,
}: {
  item: any;
  onClose: () => void;
  onSave: (data: { checklist: Record<string, boolean>; fotos: string[]; obs: string }) => void;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(item.checklistData || "{}"); } catch { return {}; }
  });
  const [fotos, setFotos] = useState<string[]>(() => {
    try { return JSON.parse(item.fotosRecebimento || "[]"); } catch { return []; }
  });
  const [obs, setObs] = useState(item.observacoes || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const allObrigatorios = CHECKLIST_ITEMS.filter(i => i.obrigatorio).every(i => checklist[i.id]);
  const fotosOk = fotos.length >= FOTO_MINIMA;
  const canFinish = allObrigatorios && fotosOk;

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        setFotos(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" style={{ color: "#0a1e5a" }} />
            Checklist de Recebimento — Chassi {item.chassis}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {Object.values(checklist).filter(Boolean).length} / {CHECKLIST_ITEMS.length} itens
            </span>
            <span className={`font-bold ${fotosOk ? "text-green-700" : "text-red-600"}`}>
              📷 {fotos.length} / {FOTO_MINIMA} fotos
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Object.values(checklist).filter(Boolean).length / CHECKLIST_ITEMS.length * 100}%`, background: "#0a1e5a" }} />
          </div>

          {/* Checklist items */}
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(ci => (
              <div key={ci.id}
                className="flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                style={{
                  borderColor: checklist[ci.id] ? "#059669" : ci.obrigatorio ? "#e21d3c40" : "var(--border)",
                  background: checklist[ci.id] ? "#f0fdf4" : "var(--card)",
                }}
                onClick={() => setChecklist(prev => ({ ...prev, [ci.id]: !prev[ci.id] }))}>
                <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                  style={{ borderColor: checklist[ci.id] ? "#059669" : "var(--border)", background: checklist[ci.id] ? "#059669" : "transparent" }}>
                  {checklist[ci.id] && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{ci.label}</p>
                  <div className="flex gap-2 mt-0.5">
                    {ci.obrigatorio && <Badge className="text-xs" style={{ background: "#e21d3c20", color: "#e21d3c" }}>Obrigatório</Badge>}
                    {ci.fotoObrigatoria && <Badge className="text-xs" style={{ background: "#D9770620", color: "#D97706" }}>📷 Foto</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Foto upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">
                Fotos do Recebimento <span className="text-red-500">*mín. {FOTO_MINIMA}</span>
              </Label>
              <Button size="sm" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Camera className="w-4 h-4" /> Adicionar Fotos
              </Button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhoto} />
            </div>

            {fotos.length === 0 ? (
              <div
                className="border-2 border-dashed border-red-200 rounded-xl p-8 text-center cursor-pointer hover:bg-red-50 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <Camera className="w-10 h-10 mx-auto mb-2 text-red-300" />
                <p className="text-sm font-semibold text-red-400">Clique para adicionar fotos</p>
                <p className="text-xs text-muted-foreground mt-1">Chassi · Placa do caminhão · CNH · Processo completo</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    <img src={f} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">
                      {i+1}
                    </div>
                  </div>
                ))}
                <div
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileRef.current?.click()}>
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            )}

            {fotos.length > 0 && fotos.length < FOTO_MINIMA && (
              <p className="text-xs text-red-600 font-semibold">
                ⚠️ Faltam {FOTO_MINIMA - fotos.length} foto(s) para completar o mínimo obrigatório
              </p>
            )}
            {fotos.length >= FOTO_MINIMA && (
              <p className="text-xs text-green-700 font-semibold">✅ Fotos suficientes — {fotos.length} registradas</p>
            )}
          </div>

          {/* Observations */}
          <div className="space-y-1.5">
            <Label>Observações do recebimento</Label>
            <Textarea rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Alguma avaria, item faltando ou observação importante..." className="resize-none" />
          </div>

          {/* Actions */}
          {!canFinish && (
            <div className="rounded-xl p-3 border border-orange-200 bg-orange-50 text-xs text-orange-800 space-y-1">
              <p className="font-bold">Para concluir o checklist:</p>
              {!allObrigatorios && <p>• Marque todos os itens obrigatórios</p>}
              {!fotosOk && <p>• Adicione pelo menos {FOTO_MINIMA - fotos.length} foto(s) a mais</p>}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1 gap-2"
              style={{ background: canFinish ? "#059669" : "#94A3B8", color: "white" }}
              disabled={!canFinish || saving}
              onClick={() => { setSaving(true); onSave({ checklist, fotos, obs }); }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {canFinish ? "Concluir Checklist" : `Faltam ${FOTO_MINIMA - fotos.length} foto(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Estoque() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isGestor = ["adm", "admin", "gerente"].includes(role);
  const { celebrate } = useCelebration();

  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [checklistTarget, setChecklistTarget] = useState<any>(null);
  const [showPrecificar, setShowPrecificar] = useState<any>(null);
  const nfRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = trpc.estoque.list.useQuery({
    search: search || undefined,
    localizacao: locFilter || undefined,
  });

  const updateEstoque = trpc.estoque.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Estoque atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const createEstoque = trpc.estoque.create.useMutation({
    onSuccess: () => { refetch(); setShowAdd(false); toast.success("Máquina cadastrada no estoque!"); },
  });

  const items = data?.data ?? [];

  // New machine form
  const [newForm, setNewForm] = useState({
    maquinaId: "", chassis: "", cor: "", localizacao: "loja",
    anoFabricacao: "", anoModelo: "", observacoes: "",
  });

  const { data: maquinas } = trpc.maquinas.list.useQuery({ ativo: true });

  const handleSaveChecklist = (item: any, data: { checklist: Record<string, boolean>; fotos: string[]; obs: string }) => {
    updateEstoque.mutate({
      id: item.id,
      checklistConcluido: true,
      checklistData: JSON.stringify(data.checklist),
      fotosRecebimento: JSON.stringify(data.fotos),
      observacoes: data.obs,
    });
    setChecklistTarget(null);
    toast.success("Checklist concluído! Agora faça a precificação para liberar para venda.");
  };

  const handleNFUpload = (item: any, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      updateEstoque.mutate({
        id: item.id,
        notaFiscalUrl: ev.target?.result as string,
      });
      toast.success("Nota Fiscal enviada!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleLiberarVenda = (item: any) => {
    if (!item.checklistConcluido) {
      toast.error("Conclua o checklist de recebimento primeiro!");
      return;
    }
    if (!item.precoVendaBruto) {
      toast.error("Faça a precificação primeiro!");
      return;
    }
    updateEstoque.mutate({ id: item.id, disponivel: true, aprovadoPor: (user as any)?.id });
    celebrate();
    toast.success("🎉 Máquina liberada para venda!");
  };

  const handleBloquearVenda = (item: any) => {
    updateEstoque.mutate({ id: item.id, disponivel: false, aprovadoPor: undefined });
    toast.success("Máquina removida da venda");
  };

  const getStatus = (item: any) => {
    if (item.localizacao === "vendido") return { label: "Vendida", color: "#94A3B8", icon: XCircle };
    if (item.disponivel) return { label: "Disponível para Venda", color: "#059669", icon: CheckCircle2 };
    if (item.precoVendaBruto && item.checklistConcluido) return { label: "Aguardando Liberação", color: "#D97706", icon: Clock };
    if (item.checklistConcluido) return { label: "Aguardando Precificação", color: "#0891B2", icon: DollarSign };
    return { label: "Em Recebimento", color: "#7C3AED", icon: ListChecks };
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" style={{ color: "#0a1e5a" }} />
            Estoque & Chassi
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gestão de entrada, recebimento e liberação para venda</p>
        </div>
        {isGestor && (
          <Button style={{ background: "#0a1e5a", color: "white" }} className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Cadastrar Máquina
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: items.length, color: "#0a1e5a" },
          { label: "Disponíveis", value: items.filter(i => i.disponivel).length, color: "#059669" },
          { label: "Em Recebimento", value: items.filter(i => !i.checklistConcluido && i.localizacao !== "vendido").length, color: "#7C3AED" },
          { label: "Vendidas", value: items.filter(i => i.localizacao === "vendido").length, color: "#94A3B8" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por chassi, modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select className="border border-border rounded-md text-sm px-3 py-2 bg-background"
          value={locFilter} onChange={e => setLocFilter(e.target.value)}>
          <option value="">Todos os locais</option>
          <option value="loja">Loja</option>
          <option value="fabrica">Fábrica</option>
          <option value="transito">Trânsito</option>
          <option value="vendido">Vendido</option>
        </select>
      </div>

      {/* Machine list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Nenhuma máquina no estoque</p>
          {isGestor && <Button className="mt-4" style={{ background: "#0a1e5a", color: "white" }} onClick={() => setShowAdd(true)}>Cadastrar primeira máquina</Button>}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item: any) => {
            const st = getStatus(item);
            const StIcon = st.icon;
            const locCfg = LOC_LABELS[item.localizacao] ?? LOC_LABELS.loja;
            const fotosCount = (() => { try { return JSON.parse(item.fotosRecebimento || "[]").length; } catch { return 0; } })();
            const checklistCount = (() => { try { return Object.values(JSON.parse(item.checklistData || "{}")).filter(Boolean).length; } catch { return 0; } })();

            return (
              <Card key={item.id} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4 flex-wrap">
                    {/* Main info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <p className="font-black text-lg">{item.maquinaModelo ?? `Máquina #${item.maquinaId}`}</p>
                          <p className="text-sm text-muted-foreground font-mono">Chassi: {item.chassis ?? "—"}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge style={{ background: locCfg.bg, color: locCfg.color, border: `1px solid ${locCfg.color}40` }}>
                            {locCfg.label}
                          </Badge>
                          <Badge style={{ background: st.color + "20", color: st.color, border: `1px solid ${st.color}40` }}>
                            <StIcon className="w-3 h-3 mr-1" />
                            {st.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress steps */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {[
                          { label: "NF", done: !!item.notaFiscalUrl, color: "#0891B2" },
                          { label: `Checklist (${checklistCount}/${CHECKLIST_ITEMS.length})`, done: item.checklistConcluido, color: "#7C3AED" },
                          { label: `Fotos (${fotosCount}/${FOTO_MINIMA})`, done: fotosCount >= FOTO_MINIMA, color: "#D97706" },
                          { label: "Precificação", done: !!item.precoVendaBruto, color: "#059669" },
                          { label: "Liberada", done: item.disponivel, color: "#e21d3c" },
                        ].map((s, i) => (
                          <div key={s.label} className="flex items-center gap-1.5">
                            {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold`}
                              style={{ background: s.done ? s.color + "20" : "var(--muted)", color: s.done ? s.color : "var(--muted-foreground)" }}>
                              {s.done ? "✓" : "○"} {s.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Price */}
                      {item.precoVendaBruto && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Preço de venda:</span>
                          <span className="text-lg font-black" style={{ color: "#0a1e5a" }}>{formatMoney(item.precoVendaBruto)}</span>
                          {item.margemPercentual && <span className="text-xs text-green-700">Margem: {item.margemPercentual}%</span>}
                          <span className="text-xs text-muted-foreground">Desc. máx. consultor: {item.descontoMaxConsultor ?? "3"}%</span>
                        </div>
                      )}
                    </div>

                    {/* Actions (gestor only) */}
                    {isGestor && (
                      <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
                        {/* NF Upload */}
                        <input type="file" accept=".pdf,image/*" className="hidden"
                          id={`nf-${item.id}`} onChange={e => handleNFUpload(item, e)} />
                        <Button size="sm" variant="outline" className="gap-2 w-full justify-start"
                          style={item.notaFiscalUrl ? { borderColor: "#059669", color: "#059669" } : {}}
                          onClick={() => document.getElementById(`nf-${item.id}`)?.click()}>
                          <FileText className="w-3.5 h-3.5" />
                          {item.notaFiscalUrl ? "NF Enviada ✓" : "Upload NF"}
                        </Button>

                        {/* Checklist */}
                        <Button size="sm" variant="outline" className="gap-2 w-full justify-start"
                          style={item.checklistConcluido ? { borderColor: "#059669", color: "#059669" } : {}}
                          onClick={() => setChecklistTarget(item)}>
                          <ListChecks className="w-3.5 h-3.5" />
                          {item.checklistConcluido ? "Checklist ✓" : "Fazer Checklist"}
                        </Button>

                        {/* Precificação */}
                        <Button size="sm" variant="outline" className="gap-2 w-full justify-start"
                          style={item.precoVendaBruto ? { borderColor: "#059669", color: "#059669" } : {}}
                          onClick={() => setShowPrecificar(item)}>
                          <DollarSign className="w-3.5 h-3.5" />
                          {item.precoVendaBruto ? "Repreçar" : "Precificar"}
                        </Button>

                        {/* Liberar / Bloquear */}
                        {item.localizacao !== "vendido" && (
                          item.disponivel ? (
                            <Button size="sm" className="gap-2 w-full" variant="outline"
                              style={{ borderColor: "#e21d3c", color: "#e21d3c" }}
                              onClick={() => handleBloquearVenda(item)}>
                              <Lock className="w-3.5 h-3.5" /> Bloquear Venda
                            </Button>
                          ) : (
                            <Button size="sm" className="gap-2 w-full font-bold"
                              style={{
                                background: item.checklistConcluido && item.precoVendaBruto ? "#059669" : "#94A3B8",
                                color: "white"
                              }}
                              disabled={!item.checklistConcluido || !item.precoVendaBruto}
                              onClick={() => handleLiberarVenda(item)}>
                              <Unlock className="w-3.5 h-3.5" />
                              {!item.checklistConcluido ? "Checklist pendente" :
                               !item.precoVendaBruto ? "Precificação pendente" :
                               "LIBERAR PARA VENDA"}
                            </Button>
                          )
                        )}
                      </div>
                    )}

                    {/* Consultor view */}
                    {!isGestor && (
                      <div className="shrink-0">
                        {item.disponivel ? (
                          <div className="text-center p-3 rounded-xl" style={{ background: "#f0fdf4", border: "2px solid #6ee7b7" }}>
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-1 text-green-600" />
                            <p className="text-xs font-bold text-green-700">Disponível</p>
                            <p className="text-sm font-black text-green-800 mt-1">{formatMoney(item.precoVendaBruto)}</p>
                          </div>
                        ) : (
                          <div className="text-center p-3 rounded-xl bg-muted/50 border border-border">
                            <Lock className="w-8 h-8 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground">Indisponível</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add machine dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Máquina no Estoque</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Modelo *</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={newForm.maquinaId} onChange={e => setNewForm(f => ({ ...f, maquinaId: e.target.value }))}>
                <option value="">Selecione o modelo...</option>
                {(maquinas?.data ?? []).map((m: any) => (
                  <option key={m.id} value={m.id}>{m.marca} — {m.modelo}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Chassi *</Label><Input value={newForm.chassis} onChange={e => setNewForm(f => ({ ...f, chassis: e.target.value }))} placeholder="9BM..." /></div>
              <div className="space-y-1.5"><Label>Cor</Label><Input value={newForm.cor} onChange={e => setNewForm(f => ({ ...f, cor: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Localização</Label>
                <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                  value={newForm.localizacao} onChange={e => setNewForm(f => ({ ...f, localizacao: e.target.value }))}>
                  <option value="loja">Loja</option>
                  <option value="fabrica">Fábrica</option>
                  <option value="transito">Trânsito</option>
                </select>
              </div>
              <div className="space-y-1.5"><Label>Ano Fabricação</Label><Input type="number" value={newForm.anoFabricacao} onChange={e => setNewForm(f => ({ ...f, anoFabricacao: e.target.value }))} placeholder="2025" /></div>
            </div>
            <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={2} value={newForm.observacoes} onChange={e => setNewForm(f => ({ ...f, observacoes: e.target.value }))} className="resize-none" /></div>
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Após cadastrar, faça o <strong>checklist de recebimento</strong>, <strong>upload da NF</strong> e <strong>precificação</strong> para liberar para venda.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button className="flex-1" style={{ background: "#0a1e5a", color: "white" }}
                disabled={!newForm.maquinaId || !newForm.chassis || createEstoque.isPending}
                onClick={() => createEstoque.mutate({
                  maquinaId: Number(newForm.maquinaId),
                  chassis: newForm.chassis,
                  cor: newForm.cor || undefined,
                  localizacao: newForm.localizacao as any,
                  anoFabricacao: newForm.anoFabricacao ? Number(newForm.anoFabricacao) : undefined,
                  observacoes: newForm.observacoes || undefined,
                })}>
                {createEstoque.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cadastrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Precificar dialog */}
      {showPrecificar && (
        <PrecificarDialog item={showPrecificar} onClose={() => setShowPrecificar(null)}
          onSave={(data) => { updateEstoque.mutate({ id: showPrecificar.id, ...data }); setShowPrecificar(null); }} />
      )}

      {/* Checklist modal */}
      {checklistTarget && (
        <ChecklistModal item={checklistTarget} onClose={() => setChecklistTarget(null)}
          onSave={(data) => handleSaveChecklist(checklistTarget, data)} />
      )}
    </div>
  );
}

// ─── Precificar Dialog ────────────────────────────────────────────────────────
function PrecificarDialog({ item, onClose, onSave }: { item: any; onClose: () => void; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    custoAquisicao: item.custoAquisicao ?? "",
    freteEntrada: item.freteEntrada ?? "",
    impostos: item.impostos ?? "",
    margemPercentual: item.margemPercentual ?? "15",
    descontoMaxConsultor: item.descontoMaxConsultor ?? "3",
  });

  const custo = Number(form.custoAquisicao) + Number(form.freteEntrada) + Number(form.impostos);
  const margem = Number(form.margemPercentual) / 100;
  const precoVenda = custo > 0 ? custo * (1 + margem) : 0;

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "#0a1e5a" }} />
            Precificação — Chassi {item.chassis}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Custo de Aquisição (R$)</Label>
              <Input type="number" value={form.custoAquisicao} onChange={e => setForm(f => ({ ...f, custoAquisicao: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Frete de Entrada (R$)</Label>
              <Input type="number" value={form.freteEntrada} onChange={e => setForm(f => ({ ...f, freteEntrada: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Impostos / Taxas (R$)</Label>
              <Input type="number" value={form.impostos} onChange={e => setForm(f => ({ ...f, impostos: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Margem (%)</Label>
              <Input type="number" value={form.margemPercentual} onChange={e => setForm(f => ({ ...f, margemPercentual: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Desconto máximo para o consultor (%)</Label>
            <Input type="number" min="0" max="20" value={form.descontoMaxConsultor}
              onChange={e => setForm(f => ({ ...f, descontoMaxConsultor: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Acima deste % o gestor receberá notificação para aprovar</p>
          </div>
          {custo > 0 && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "#0a1e5a", color: "white" }}>
              <p className="text-xs font-bold uppercase opacity-70">Resultado da Precificação</p>
              <div className="flex justify-between text-sm"><span className="opacity-70">Custo total</span><span>{fmt(custo)}</span></div>
              <div className="flex justify-between text-sm"><span className="opacity-70">Margem ({form.margemPercentual}%)</span><span>{fmt(custo * margem)}</span></div>
              <div className="flex justify-between text-lg font-black border-t border-white/20 pt-2">
                <span>Preço de Venda</span><span style={{ color: "#4ADE80" }}>{fmt(precoVenda)}</span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" style={{ background: "#0a1e5a", color: "white" }}
              disabled={!form.custoAquisicao}
              onClick={() => onSave({
                custoAquisicao: form.custoAquisicao,
                freteEntrada: form.freteEntrada || undefined,
                impostos: form.impostos || undefined,
                margemPercentual: form.margemPercentual,
                precoVendaBruto: String(precoVenda.toFixed(2)),
                descontoMaxConsultor: form.descontoMaxConsultor,
              })}>
              Salvar Precificação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
