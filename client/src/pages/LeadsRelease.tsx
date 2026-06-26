import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Shield, Unlock, Lock, Filter, CheckSquare, RefreshCw, History, AlertTriangle, Hash, ChevronDown, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// ─── Multi-Select Component ───────────────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Todos",
  maxHeight = 280,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  maxHeight?: number;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm justify-between min-w-[140px] max-w-full font-normal"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
              ? selected[0]
              : `${selected.length} selecionados`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 ml-1 flex-shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            className="h-7 text-xs"
            placeholder={`Buscar ${label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {selected.length > 0 && (
          <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{selected.length} selecionado(s)</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs px-1 text-red-500 hover:text-red-600"
              onClick={() => onChange([])}
            >
              <X className="w-3 h-3 mr-0.5" /> Limpar
            </Button>
          </div>
        )}
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado</p>
          ) : (
            filtered.map((opt) => (
              <div
                key={opt.value}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggle(opt.value)}
              >
                <div className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                  selected.includes(opt.value)
                    ? "bg-primary border-primary"
                    : "border-border"
                )}>
                  {selected.includes(opt.value) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </div>
                <span className="text-sm flex-1 truncate">{opt.label}</span>
                {opt.count !== undefined && (
                  <span className="text-xs text-muted-foreground">{opt.count.toLocaleString("pt-BR")}</span>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadsRelease() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Filtros multi-seleção
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);
  const [selectedClassificacoes, setSelectedClassificacoes] = useState<string[]>([]);
  const [isHighPriority, setIsHighPriority] = useState<boolean | undefined>(undefined);
  const [hasNomeFantasia, setHasNomeFantasia] = useState<boolean | undefined>(undefined);
  const [maxQty, setMaxQty] = useState<number | "">("");

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirmAction, setConfirmAction] = useState<"release" | "revoke" | null>(null);
  const [page, setPage] = useState(1);

  const isAdm = role === "adm" || role === "admin";

  if (!isAdm) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito ao Administrador</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  // Buscar opções de filtro dinâmico
  const { data: filterOpts } = trpc.leads.filterOptions.useQuery({
    ufs: selectedUFs.length > 0 ? selectedUFs : undefined,
    onlyUnreleased: true,
  });

  const ufOptions = useMemo(
    () => (filterOpts?.ufs ?? []).map((uf) => ({ value: uf, label: uf })),
    [filterOpts?.ufs]
  );
  const cidadeOptions = useMemo(
    () => (filterOpts?.cidades ?? []).map((c) => ({ value: c.cidade, label: c.cidade, count: c.count })),
    [filterOpts?.cidades]
  );
  const classificacaoOptions = useMemo(
    () => (filterOpts?.classificacoes ?? []).map((c) => ({ value: c.label, label: c.label, count: c.count })),
    [filterOpts?.classificacoes]
  );

  const { data: releaseStats, isLoading: statsLoading } = trpc.leads.releaseStats.useQuery();
  const { data: releaseLog } = trpc.leads.releaseLog.useQuery();

  // Para a tabela, usamos o primeiro UF/cidade/classificação selecionado como filtro de texto
  // (a API de listagem não suporta arrays ainda — usamos o filterOptions para mostrar contagem)
  const { data: leadsData, isLoading: leadsLoading } = trpc.leads.list.useQuery({
    page,
    limit: 50,
    uf: selectedUFs.length === 1 ? selectedUFs[0] : undefined,
    cidade: selectedCidades.length === 1 ? selectedCidades[0] : undefined,
    segmento: selectedClassificacoes.length === 1 ? selectedClassificacoes[0] : undefined,
    isHighPriority,
    hasNomeFantasia,
    onlyUnreleased: true,
  });

  const releaseMutation = trpc.leads.release.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} leads liberados para o time com sucesso!`);
      setSelectedIds([]);
      utils.leads.list.invalidate();
      utils.leads.releaseStats.invalidate();
      utils.leads.releaseLog.invalidate();
      utils.leads.filterOptions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = trpc.leads.revoke.useMutation({
    onSuccess: (data) => {
      toast.success(`Acesso revogado de ${data.total} leads.`);
      setSelectedIds([]);
      utils.leads.list.invalidate();
      utils.leads.releaseStats.invalidate();
      utils.leads.filterOptions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const undoReleaseMutation = trpc.leads.undoRelease.useMutation({
    onSuccess: (data) => {
      toast.success(`Liberação desfeita: ${data.total} leads removidos do time.`);
      utils.leads.list.invalidate();
      utils.leads.releaseStats.invalidate();
      utils.leads.releaseLog.invalidate();
      utils.leads.filterOptions.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSelectAll = () => {
    const allIds = (leadsData?.data ?? []).map((l) => l.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  const handleToggleId = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (confirmAction === "release") {
      if (selectedIds.length > 0) {
        releaseMutation.mutate({ ids: selectedIds });
      } else {
        releaseMutation.mutate({
          uf: selectedUFs.length === 1 ? selectedUFs[0] : undefined,
          cidade: selectedCidades.length === 1 ? selectedCidades[0] : undefined,
          isHighPriority,
          hasNomeFantasia,
          limit: maxQty !== "" ? maxQty : undefined,
        });
      }
    } else if (confirmAction === "revoke") {
      revokeMutation.mutate({ ids: selectedIds.length > 0 ? selectedIds : undefined });
    }
    setConfirmAction(null);
  };

  const handleClearFilters = () => {
    setSelectedUFs([]);
    setSelectedCidades([]);
    setSelectedClassificacoes([]);
    setIsHighPriority(undefined);
    setHasNomeFantasia(undefined);
    setMaxQty("");
    setSelectedIds([]);
    setPage(1);
  };

  const leads = leadsData?.data ?? [];
  const total = leadsData?.total ?? 0;
  const allSelected = leads.length > 0 && selectedIds.length === leads.length;
  const releaseCount = maxQty !== "" && maxQty > 0 ? Math.min(maxQty, total) : total;
  const hasActiveFilters = selectedUFs.length > 0 || selectedCidades.length > 0 || selectedClassificacoes.length > 0 || isHighPriority !== undefined || hasNomeFantasia !== undefined;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Liberação de Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            Controle quais leads o time (Gerentes e BDRs) pode visualizar e trabalhar
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation("/leads/assign")}
          className="flex items-center gap-2"
        >
          <CheckSquare className="w-4 h-4" />
          Atribuir a BDRs
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.22 0.08 240 / 0.1)" }}>
                    <Shield className="w-5 h-5" style={{ color: "oklch(0.22 0.08 240)" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {(releaseStats?.total ?? 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de Leads</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                    <Unlock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {(releaseStats?.released ?? 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">Liberados para o Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100">
                    <Lock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {(releaseStats?.unreleased ?? 0).toLocaleString("pt-BR")}
                    </p>
                    <p className="text-xs text-muted-foreground">Não Liberados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Aviso importante */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Controle de Acesso ao Banco de Dados</p>
              <p className="text-amber-700 text-xs mt-1">
                Somente o ADM tem acesso completo ao banco. Gerentes e BDRs <strong>não podem importar ou exportar leads</strong>.
                Ao liberar leads, <strong>todos do time</strong> (Gerentes, Diretores, Coordenadores, Supervisores e BDRs) poderão visualizá-los.
                Use "Atribuir a BDRs" para direcionar lotes específicos a vendedores individuais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros para Seleção em Massa
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {[selectedUFs.length, selectedCidades.length, selectedClassificacoes.length].filter(Boolean).reduce((a, b) => a + b, 0) +
                  (isHighPriority !== undefined ? 1 : 0) + (hasNomeFantasia !== undefined ? 1 : 0)} ativo(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Selecione múltiplos estados, cidades e tipos de empresa para liberar lotes estratégicos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Estado (UF)</Label>
              <MultiSelect
                label="Estado"
                options={ufOptions.length > 0 ? ufOptions : [
                  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
                ].map((uf) => ({ value: uf, label: uf }))}
                selected={selectedUFs}
                onChange={(vals) => { setSelectedUFs(vals); setSelectedCidades([]); setPage(1); }}
                placeholder="Todos os estados"
              />
              {selectedUFs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedUFs.map((uf) => (
                    <Badge key={uf} variant="secondary" className="text-xs px-1.5 py-0 h-5 cursor-pointer" onClick={() => setSelectedUFs(selectedUFs.filter((u) => u !== uf))}>
                      {uf} <X className="w-2.5 h-2.5 ml-0.5" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Cidade</Label>
              <MultiSelect
                label="Cidade"
                options={cidadeOptions}
                selected={selectedCidades}
                onChange={(vals) => { setSelectedCidades(vals); setPage(1); }}
                placeholder={selectedUFs.length > 0 ? "Selecionar cidades" : "Selecione UF primeiro"}
                maxHeight={240}
              />
              {selectedCidades.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedCidades.slice(0, 3).map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs px-1.5 py-0 h-5 cursor-pointer" onClick={() => setSelectedCidades(selectedCidades.filter((x) => x !== c))}>
                      {c} <X className="w-2.5 h-2.5 ml-0.5" />
                    </Badge>
                  ))}
                  {selectedCidades.length > 3 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">+{selectedCidades.length - 3}</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tipo de Empresa</Label>
              <MultiSelect
                label="Tipo"
                options={classificacaoOptions}
                selected={selectedClassificacoes}
                onChange={(vals) => { setSelectedClassificacoes(vals); setPage(1); }}
                placeholder="Todos os tipos"
              />
              {selectedClassificacoes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedClassificacoes.map((c) => (
                    <Badge key={c} variant="secondary" className="text-xs px-1.5 py-0 h-5 cursor-pointer" onClick={() => setSelectedClassificacoes(selectedClassificacoes.filter((x) => x !== c))}>
                      {c} <X className="w-2.5 h-2.5 ml-0.5" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Prioridade</Label>
              <MultiSelect
                label="Prioridade"
                options={[
                  { value: "true", label: "Alta Prioridade" },
                  { value: "false", label: "Normal" },
                ]}
                selected={isHighPriority === undefined ? [] : [String(isHighPriority)]}
                onChange={(vals) => {
                  if (vals.length === 0) setIsHighPriority(undefined);
                  else setIsHighPriority(vals[vals.length - 1] === "true");
                  setPage(1);
                }}
                placeholder="Todas"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Hash className="w-3 h-3" /> Qtd. Máxima
              </Label>
              <input
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                type="number"
                min={1}
                placeholder="Sem limite"
                value={maxQty}
                onChange={(e) => {
                  const val = e.target.value;
                  setMaxQty(val === "" ? "" : Math.max(1, parseInt(val, 10)));
                }}
              />
            </div>
          </div>

          {/* Indicador de quantidade a liberar */}
          {maxQty !== "" && maxQty > 0 && (
            <div className="mb-3 p-2 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Com o limite definido, serão liberadas as primeiras{" "}
                <strong>{Math.min(maxQty, total).toLocaleString("pt-BR")}</strong>{" "}
                empresas dos {total.toLocaleString("pt-BR")} disponíveis com estes filtros.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              onClick={() => setConfirmAction("release")}
              disabled={releaseMutation.isPending}
              style={{ background: "oklch(0.22 0.08 240)" }}
              className="text-white"
            >
              <Unlock className="w-4 h-4 mr-2" />
              {maxQty !== "" && maxQty > 0
                ? `Liberar ${releaseCount.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} leads`
                : `Liberar todos (${total.toLocaleString("pt-BR")} leads)`}
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmAction("release")}
                  disabled={releaseMutation.isPending}
                  className="border-green-500 text-green-700 hover:bg-green-50"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Liberar selecionados ({selectedIds.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmAction("revoke")}
                  disabled={revokeMutation.isPending}
                  className="border-red-400 text-red-600 hover:bg-red-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Revogar selecionados ({selectedIds.length})
                </Button>
              </>
            )}
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={handleClearFilters}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de leads não liberados */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Leads Não Liberados
            <Badge variant="secondary" className="ml-2">{total.toLocaleString("pt-BR")}</Badge>
          </CardTitle>
          <CardDescription>
            {selectedUFs.length > 1 || selectedCidades.length > 1
              ? "Prévia parcial — filtros com múltiplos valores mostram apenas o primeiro selecionado na tabela"
              : "Selecione individualmente ou use os filtros acima para liberar em massa"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 pl-4">
                    <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Empresa</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold">UF</TableHead>
                  <TableHead className="text-xs font-semibold">Cidade</TableHead>
                  <TableHead className="text-xs font-semibold">Prioridade</TableHead>
                  <TableHead className="text-xs font-semibold">Nome Fantasia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsLoading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <Unlock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Todos os leads com estes filtros já foram liberados!
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className={`hover:bg-muted/30 cursor-pointer ${selectedIds.includes(lead.id) ? "bg-blue-50" : ""}`}
                      onClick={() => handleToggleId(lead.id)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => handleToggleId(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-[200px] truncate">
                        {lead.nomeFantasia || lead.razaoSocial || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[130px] truncate">
                        {lead.classificacao || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline" className="text-xs">{lead.uf || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.cidade || "—"}</TableCell>
                      <TableCell>
                        {lead.isHighPriority ? (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Alta</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.nomeFantasia ? (
                          <span className="text-green-600 text-xs">Sim</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Não</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Mostrando {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} de {total.toLocaleString("pt-BR")}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Liberações */}
      {releaseLog && releaseLog.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Liberações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold pl-4">Data</TableHead>
                  <TableHead className="text-xs font-semibold">Leads Liberados</TableHead>
                  <TableHead className="text-xs font-semibold">Filtros Utilizados</TableHead>
                  <TableHead className="text-xs font-semibold text-right pr-4">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releaseLog.map((log) => {
                  let filtersStr = "—";
                  try {
                    const f = JSON.parse(log.filters ?? "{}");
                    const parts = [];
                    if (f.uf) parts.push(`UF: ${f.uf}`);
                    if (f.cidade) parts.push(`Cidade: ${f.cidade}`);
                    if (f.segmento) parts.push(`Segmento: ${f.segmento}`);
                    if (f.isHighPriority === true) parts.push("Alta Prioridade");
                    if (f.hasNomeFantasia === true) parts.push("Com Nome Fantasia");
                    if (f.ids?.length) parts.push(`${f.ids.length} IDs específicos`);
                    if (f.limit) parts.push(`Limite: ${f.limit}`);
                    filtersStr = parts.join(" · ") || "Sem filtros";
                  } catch {}
                  const canUndo = !!(log as any).leadIds;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm pl-4">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          +{log.totalReleased.toLocaleString("pt-BR")} leads
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{filtersStr}</TableCell>
                      <TableCell className="text-right pr-4">
                        {canUndo ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            disabled={undoReleaseMutation.isPending}
                            onClick={() => {
                              if (confirm(`Desfazer esta liberação removerá ${log.totalReleased} leads do time. Confirmar?`)) {
                                undoReleaseMutation.mutate({ logId: log.id });
                              }
                            }}
                          >
                            Desfazer
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/D</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "release" ? "Confirmar Liberação" : "Confirmar Revogação"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "release"
                ? selectedIds.length > 0
                  ? `Você está prestes a liberar ${selectedIds.length} leads selecionados para o time.`
                  : maxQty !== "" && maxQty > 0
                    ? `Você está prestes a liberar as primeiras ${releaseCount.toLocaleString("pt-BR")} empresas (de ${total.toLocaleString("pt-BR")} disponíveis) para o time.`
                    : `Você está prestes a liberar ${total.toLocaleString("pt-BR")} leads para o time. Todos (Gerentes, Supervisores e BDRs) poderão visualizá-los.`
                : `Você está prestes a revogar o acesso de ${selectedIds.length > 0 ? selectedIds.length : "todos os"} leads. O time não poderá mais visualizá-los.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              style={{ background: confirmAction === "revoke" ? "#dc2626" : "oklch(0.22 0.08 240)" }}
            >
              {confirmAction === "release" ? "Liberar" : "Revogar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
