import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { UserCheck, ArrowLeft, ChevronDown, X, Check, Hash, Users, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

// ─── Multi-Select (reutilizado) ───────────────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Todos",
  maxHeight = 280,
  disabled = false,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  maxHeight?: number;
  disabled?: boolean;
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
          disabled={disabled}
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
                  selected.includes(opt.value) ? "bg-primary border-primary" : "border-border"
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
export default function LeadsAssign() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const GERENTE_ROLES = ["gerente", "diretor", "coordenador", "supervisor"];
  const canAccess = role === "adm" || role === "admin" || GERENTE_ROLES.includes(role);

  // Filtros
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [selectedCidades, setSelectedCidades] = useState<string[]>([]);
  const [selectedClassificacoes, setSelectedClassificacoes] = useState<string[]>([]);
  const [isHighPriority, setIsHighPriority] = useState<boolean | undefined>(undefined);
  const [maxQty, setMaxQty] = useState<number | "">("");
  const [selectedBdrId, setSelectedBdrId] = useState<string>("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);

  if (!canAccess) {
    return (
      <div className="text-center py-16">
        <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito ao ADM e Gerência</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  // Buscar BDRs disponíveis
  const { data: allUsers } = trpc.users.list.useQuery();
  const bdrs = useMemo(
    () => (allUsers ?? []).filter((u: any) => u.role === "bdr" && !u.isBlocked),
    [allUsers]
  );

  // Carga de leads por BDR
  const { data: workloadData } = trpc.leads.bdrWorkload.useQuery();
  const workloadMap = useMemo(() => {
    const map: Record<number, number> = {};
    (workloadData ?? []).forEach((w: any) => { if (w.bdrId) map[w.bdrId] = w.assignedCount; });
    return map;
  }, [workloadData]);

  // Buscar opções de filtro (somente leads liberados)
  const { data: filterOpts } = trpc.leads.filterOptions.useQuery({
    ufs: selectedUFs.length > 0 ? selectedUFs : undefined,
    onlyReleased: true,
  });

  const ALL_UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
  const releasedUFs = new Set(filterOpts?.ufs ?? []);
  const ufOptions = useMemo(
    () => ALL_UFS.map((uf) => ({ value: uf, label: releasedUFs.has(uf) ? `${uf} ✓` : uf })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Preview dos leads que serão atribuídos (somente liberados)
  const { data: previewData, isLoading: previewLoading } = trpc.leads.list.useQuery({
    page,
    limit: 50,
    ufs: selectedUFs.length > 0 ? selectedUFs : undefined,
    cidades: selectedCidades.length > 0 ? selectedCidades : undefined,
    classificacoes: selectedClassificacoes.length > 0 ? selectedClassificacoes : undefined,
    isHighPriority,
    onlyReleased: true,
    onlyUnassigned: onlyUnassigned || undefined,
  });

  const assignMutation = trpc.leads.assignBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} leads atribuídos ao BDR com sucesso!`);
      utils.leads.list.invalidate();
      utils.leads.filterOptions.invalidate();
      setConfirmOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAssign = () => {
    if (!selectedBdrId) {
      toast.error("Selecione um BDR para atribuir os leads.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    assignMutation.mutate({
      bdrId: parseInt(selectedBdrId, 10),
      ufs: selectedUFs.length > 0 ? selectedUFs : undefined,
      cidades: selectedCidades.length > 0 ? selectedCidades : undefined,
      classificacoes: selectedClassificacoes.length > 0 ? selectedClassificacoes : undefined,
      isHighPriority,
      limit: maxQty !== "" ? maxQty : undefined,
    });
  };

  const handleClearFilters = () => {
    setSelectedUFs([]);
    setSelectedCidades([]);
    setSelectedClassificacoes([]);
    setIsHighPriority(undefined);
    setMaxQty("");
    setOnlyUnassigned(false);
    setPage(1);
  };

  const leads = previewData?.data ?? [];
  const total = previewData?.total ?? 0;
  const releaseCount = maxQty !== "" && maxQty > 0 ? Math.min(maxQty, total) : total;
  const selectedBdr = bdrs.find((b: any) => String(b.id) === selectedBdrId);
  const hasActiveFilters = selectedUFs.length > 0 || selectedCidades.length > 0 || selectedClassificacoes.length > 0 || isHighPriority !== undefined || onlyUnassigned;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/leads/release")} className="gap-1">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Atribuir Leads a BDRs
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Direcione lotes de leads liberados para BDRs específicos
          </p>
        </div>
      </div>

      {/* Seleção do BDR */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            1. Selecione o BDR de Destino
          </CardTitle>
          <CardDescription>Escolha qual BDR receberá os leads filtrados abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          {bdrs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum BDR cadastrado. Convide BDRs na tela de Usuários.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {bdrs.map((bdr: any) => (
                <button
                  key={bdr.id}
                  onClick={() => setSelectedBdrId(String(bdr.id))}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    selectedBdrId === String(bdr.id)
                      ? "border-primary bg-primary/5 text-primary font-medium"
                      : "border-border hover:border-muted-foreground hover:bg-muted/30"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold uppercase">
                    {(bdr.name ?? bdr.email ?? "?").charAt(0)}
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium leading-tight">{bdr.name ?? bdr.email}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{bdr.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      (workloadMap[bdr.id] ?? 0) === 0
                        ? "bg-muted text-muted-foreground"
                        : (workloadMap[bdr.id] ?? 0) < 50
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : (workloadMap[bdr.id] ?? 0) < 150
                        ? "bg-yellow-100 text-red-700 dark:bg-yellow-900/30 dark:text-red-500"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                      {workloadMap[bdr.id] ?? 0} leads
                    </span>
                    {selectedBdrId === String(bdr.id) && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            2. Defina os Filtros dos Leads
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {[selectedUFs.length, selectedCidades.length, selectedClassificacoes.length].filter(Boolean).reduce((a, b) => a + b, 0) +
                  (isHighPriority !== undefined ? 1 : 0)} ativo(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Selecione os critérios dos leads que serão atribuídos ao BDR escolhido acima.
            Somente leads já liberados pelo ADM podem ser atribuídos.
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
                disabled={cidadeOptions.length === 0}
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

          {/* Toggle: apenas não atribuídos */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              role="switch"
              aria-checked={onlyUnassigned}
              onClick={() => { setOnlyUnassigned(!onlyUnassigned); setPage(1); }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                onlyUnassigned ? "bg-primary" : "bg-muted"
              )}
            >
              <span className={cn(
                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg transform transition-transform",
                onlyUnassigned ? "translate-x-4" : "translate-x-0"
              )} />
            </button>
            <Label className="text-sm cursor-pointer" onClick={() => { setOnlyUnassigned(!onlyUnassigned); setPage(1); }}>
              Apenas leads sem BDR atribuído
            </Label>
          </div>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={handleClearFilters} className="mb-3">
              <RefreshCw className="w-4 h-4 mr-1" />
              Limpar filtros
            </Button>
          )}

          {/* Resumo da atribuição */}
          <div className={cn(
            "p-3 rounded-lg border flex items-center justify-between gap-4",
            selectedBdrId ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
          )}>
            <div>
              <p className="text-sm font-medium">
                {selectedBdrId
                  ? <>Atribuir <strong>{maxQty !== "" && maxQty > 0 ? releaseCount.toLocaleString("pt-BR") : total.toLocaleString("pt-BR")}</strong> leads para <strong>{selectedBdr?.name ?? selectedBdr?.email}</strong></>
                  : <span className="text-muted-foreground">Selecione um BDR e defina os filtros para atribuir leads</span>
                }
              </p>
              {total > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {total.toLocaleString("pt-BR")} leads disponíveis com estes filtros
                  {maxQty !== "" && maxQty > 0 && ` (limite: ${maxQty.toLocaleString("pt-BR")})`}
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={!selectedBdrId || total === 0 || assignMutation.isPending}
              style={{ background: "oklch(0.22 0.08 240)" }}
              className="text-white flex-shrink-0"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Atribuir Leads
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview dos leads */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            3. Prévia dos Leads
            <Badge variant="secondary" className="ml-2">{total.toLocaleString("pt-BR")}</Badge>
          </CardTitle>
          <CardDescription>
            Leads liberados que correspondem aos filtros acima
            {selectedUFs.length > 1 || selectedCidades.length > 1
              ? " (prévia parcial — mostra apenas o primeiro valor selecionado)"
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold pl-4">Empresa</TableHead>
                  <TableHead className="text-xs font-semibold">Tipo</TableHead>
                  <TableHead className="text-xs font-semibold">UF</TableHead>
                  <TableHead className="text-xs font-semibold">Cidade</TableHead>
                  <TableHead className="text-xs font-semibold">Prioridade</TableHead>
                  <TableHead className="text-xs font-semibold">Atribuído a</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewLoading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Nenhum lead liberado encontrado com estes filtros
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm font-medium max-w-[200px] truncate pl-4">
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
                          <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Alta</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Normal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {(lead as any).assignedTo ? (
                          <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                            BDR #{(lead as any).assignedTo}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não atribuído</span>
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

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atribuição de Leads</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atribuir{" "}
              <strong>{maxQty !== "" && maxQty > 0 ? releaseCount.toLocaleString("pt-BR") : total.toLocaleString("pt-BR")}</strong>{" "}
              leads para o BDR <strong>{selectedBdr?.name ?? selectedBdr?.email}</strong>.
              {selectedUFs.length > 0 && ` Estados: ${selectedUFs.join(", ")}.`}
              {selectedCidades.length > 0 && ` Cidades: ${selectedCidades.join(", ")}.`}
              {" "}O BDR poderá visualizar e prospectar esses leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              style={{ background: "oklch(0.22 0.08 240)" }}
            >
              Confirmar Atribuição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
