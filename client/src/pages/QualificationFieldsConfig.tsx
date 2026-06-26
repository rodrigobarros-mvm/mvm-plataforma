import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Shield,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Lock,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ListChecks,
  Info,
} from "lucide-react";
import { toast } from "sonner";

type FieldType = "text" | "number" | "select" | "multiselect" | "boolean" | "textarea";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto curto",
  number: "Número",
  select: "Seleção única",
  multiselect: "Múltipla escolha",
  boolean: "Sim / Não",
  textarea: "Texto longo",
};

const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "T",
  number: "#",
  select: "▼",
  multiselect: "☑",
  boolean: "◉",
  textarea: "¶",
};

interface FieldForm {
  id?: number;
  label: string;
  fieldKey: string;
  type: FieldType;
  required: boolean;
  active: boolean;
  displayOrder: number;
  options: string; // comma-separated for select/multiselect
  placeholder: string;
  helpText: string;
}

const emptyForm = (): FieldForm => ({
  label: "",
  fieldKey: "",
  type: "text",
  required: false,
  active: true,
  displayOrder: 0,
  options: "",
  placeholder: "",
  helpText: "",
});

function toFieldKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

export default function QualificationFieldsConfig() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const role = (user as any)?.role ?? "";
  const isAdm = role === "adm" || role === "admin";

  if (!isAdm) {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito ao Administrador</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/settings")}>Voltar</Button>
      </div>
    );
  }

  const utils = trpc.useUtils();
  const { data: fields = [], isLoading } = trpc.qualificationFields.list.useQuery({ onlyActive: false });

  const upsertMutation = trpc.qualificationFields.upsert.useMutation({
    onSuccess: () => {
      toast.success("Campo salvo com sucesso!");
      utils.qualificationFields.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.qualificationFields.delete.useMutation({
    onSuccess: () => {
      toast.success("Campo excluído.");
      utils.qualificationFields.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = trpc.qualificationFields.reorder.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const toggleActiveMutation = trpc.qualificationFields.upsert.useMutation({
    onSuccess: () => {
      utils.qualificationFields.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm());
  const [optionsInput, setOptionsInput] = useState("");

  function openCreate() {
    const nextOrder = fields.length > 0 ? Math.max(...fields.map(f => f.displayOrder)) + 1 : 1;
    setForm({ ...emptyForm(), displayOrder: nextOrder });
    setOptionsInput("");
    setDialogOpen(true);
  }

  function openEdit(field: typeof fields[0]) {
    setForm({
      id: field.id,
      label: field.label,
      fieldKey: field.fieldKey,
      type: field.type as FieldType,
      required: field.required,
      active: field.active,
      displayOrder: field.displayOrder,
      options: field.options ?? "",
      placeholder: field.placeholder ?? "",
      helpText: field.helpText ?? "",
    });
    setOptionsInput(field.options ?? "");
    setDialogOpen(true);
  }

  function handleLabelChange(val: string) {
    setForm(f => ({
      ...f,
      label: val,
      fieldKey: f.id ? f.fieldKey : toFieldKey(val),
    }));
  }

  function handleSave() {
    if (!form.label.trim()) { toast.error("O nome do campo é obrigatório"); return; }
    if (!form.fieldKey.trim()) { toast.error("A chave do campo é obrigatória"); return; }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(form.fieldKey)) {
      toast.error("A chave deve começar com letra e conter apenas letras, números e _");
      return;
    }

    const needsOptions = form.type === "select" || form.type === "multiselect";
    const optionsArr = optionsInput.split("\n").map(s => s.trim()).filter(Boolean);
    if (needsOptions && optionsArr.length < 2) {
      toast.error("Informe pelo menos 2 opções (uma por linha)");
      return;
    }

    upsertMutation.mutate({
      id: form.id,
      label: form.label.trim(),
      fieldKey: form.fieldKey.trim(),
      type: form.type,
      required: form.required,
      active: form.active,
      displayOrder: form.displayOrder,
      options: needsOptions ? JSON.stringify(optionsArr) : null,
      placeholder: form.placeholder.trim() || null,
      helpText: form.helpText.trim() || null,
    });
  }

  function handleMove(id: number, direction: "up" | "down") {
    const sorted = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(f => f.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newOrder = sorted.map((f, i) => ({ id: f.id, displayOrder: i + 1 }));
    // Swap
    const tmp = newOrder[idx].displayOrder;
    newOrder[idx].displayOrder = newOrder[swapIdx].displayOrder;
    newOrder[swapIdx].displayOrder = tmp;
    reorderMutation.mutate({ items: newOrder });
    utils.qualificationFields.list.setData({ onlyActive: false }, (old) => {
      if (!old) return old;
      return old.map(f => {
        const found = newOrder.find(n => n.id === f.id);
        return found ? { ...f, displayOrder: found.displayOrder } : f;
      }).sort((a, b) => a.displayOrder - b.displayOrder);
    });
  }

  function handleToggleActive(field: typeof fields[0]) {
    toggleActiveMutation.mutate({
      id: field.id,
      label: field.label,
      fieldKey: field.fieldKey,
      type: field.type as FieldType,
      required: field.required,
      active: !field.active,
      displayOrder: field.displayOrder,
      options: field.options ?? null,
      placeholder: field.placeholder ?? null,
      helpText: field.helpText ?? null,
    });
  }

  const sortedFields = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
  const activeCount = fields.filter(f => f.active).length;
  const requiredCount = fields.filter(f => f.required && f.active).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Campos de Qualificação
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure os campos exibidos no formulário de qualificação de leads
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="text-white shrink-0"
          style={{ background: "oklch(0.55 0.18 30)" }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Campo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold">{fields.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total de campos</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ativos</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <p className="text-2xl font-bold" style={{ color: "#e8621a" }}>{requiredCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Obrigatórios</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-4">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">Como funciona</p>
          <p>Os campos configurados aqui aparecem no formulário de qualificação de leads. Campos <strong>obrigatórios</strong> devem ser preenchidos antes de qualificar um lead. Campos <strong>inativos</strong> ficam ocultos para os BDRs mas preservam dados já registrados. Campos com cadeado <Lock className="w-3 h-3 inline" /> são padrão do sistema e não podem ser excluídos.</p>
        </div>
      </div>

      {/* Fields List */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" style={{ color: "#e8621a" }} />
            Campos Configurados
          </CardTitle>
          <CardDescription>Arranje a ordem usando as setas. Clique em Editar para modificar.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedFields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhum campo configurado ainda.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar primeiro campo
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sortedFields.map((field, idx) => (
                <div
                  key={field.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${!field.active ? "opacity-50 bg-muted/20" : "hover:bg-muted/10"}`}
                >
                  {/* Order controls */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMove(field.id, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(field.id, "down")}
                      disabled={idx === sortedFields.length - 1}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Type badge */}
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold shrink-0 bg-muted text-muted-foreground">
                    {FIELD_TYPE_ICONS[field.type as FieldType]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{field.label}</span>
                      {field.isBuiltIn && (
                        <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                      {field.required && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 shrink-0" style={{ background: "oklch(0.95 0.05 30)", color: "#e8621a" }}>
                          Obrigatório
                        </Badge>
                      )}
                      {!field.active && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 shrink-0 text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">{field.fieldKey}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.type as FieldType]}</span>
                      {field.options && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            {(() => {
                              try { return JSON.parse(field.options).length + " opções"; } catch { return ""; }
                            })()}
                          </span>
                        </>
                      )}
                    </div>
                    {field.helpText && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{field.helpText}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(field)}
                      disabled={toggleActiveMutation.isPending}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      title={field.active ? "Desativar campo" : "Ativar campo"}
                    >
                      {field.active
                        ? <ToggleRight className="w-4 h-4 text-green-600" />
                        : <ToggleLeft className="w-4 h-4" />
                      }
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(field)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
                      title="Editar campo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete — apenas campos não built-in */}
                    {!field.isBuiltIn ? (
                      <button
                        onClick={() => setDeleteId(field.id)}
                        className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 transition-colors"
                        title="Excluir campo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="p-1.5 w-8">
                        <Lock className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Campo" : "Novo Campo de Qualificação"}</DialogTitle>
            <DialogDescription>
              Configure as propriedades do campo que aparecerá no formulário de qualificação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Label */}
            <div className="space-y-1.5">
              <Label>Nome do campo <span className="text-red-500">*</span></Label>
              <Input
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="Ex: Número de funcionários"
              />
            </div>

            {/* Field Key */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Chave interna (fieldKey) <span className="text-red-500">*</span>
                {form.id && <Lock className="w-3 h-3 text-muted-foreground" />}
              </Label>
              <Input
                value={form.fieldKey}
                onChange={(e) => setForm(f => ({ ...f, fieldKey: e.target.value }))}
                placeholder="Ex: numFuncionarios"
                disabled={!!form.id} // não permite alterar a chave de campos existentes
                className={form.id ? "bg-muted/50 cursor-not-allowed" : ""}
              />
              <p className="text-xs text-muted-foreground">
                Identificador único. Gerado automaticamente a partir do nome. {form.id ? "Não pode ser alterado após criação." : "Deve começar com letra."}
              </p>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo de campo <span className="text-red-500">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as FieldType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][]).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{FIELD_TYPE_ICONS[val]}</span>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options (for select/multiselect) */}
            {(form.type === "select" || form.type === "multiselect") && (
              <div className="space-y-1.5">
                <Label>Opções <span className="text-red-500">*</span></Label>
                <Textarea
                  value={optionsInput}
                  onChange={(e) => setOptionsInput(e.target.value)}
                  placeholder={"Uma opção por linha:\nOpção A\nOpção B\nOpção C"}
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Digite uma opção por linha. Mínimo 2 opções.</p>
              </div>
            )}

            {/* Placeholder */}
            <div className="space-y-1.5">
              <Label>Texto de exemplo (placeholder)</Label>
              <Input
                value={form.placeholder}
                onChange={(e) => setForm(f => ({ ...f, placeholder: e.target.value }))}
                placeholder="Ex: Digite o número de funcionários..."
              />
            </div>

            {/* Help text */}
            <div className="space-y-1.5">
              <Label>Texto de ajuda</Label>
              <Input
                value={form.helpText}
                onChange={(e) => setForm(f => ({ ...f, helpText: e.target.value }))}
                placeholder="Descrição curta para orientar o BDR"
              />
            </div>

            <Separator />

            {/* Required & Active toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Campo obrigatório</p>
                  <p className="text-xs text-muted-foreground">BDR deve preencher antes de qualificar</p>
                </div>
                <Switch
                  checked={form.required}
                  onCheckedChange={(v) => setForm(f => ({ ...f, required: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Campo ativo</p>
                  <p className="text-xs text-muted-foreground">Exibir no formulário de qualificação</p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm(f => ({ ...f, active: v }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="text-white"
              style={{ background: "oklch(0.55 0.18 30)" }}
            >
              {upsertMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> {form.id ? "Salvar alterações" : "Criar campo"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. O campo será removido do formulário de qualificação. Dados já registrados para este campo em leads existentes serão mantidos no banco de dados, mas não serão mais exibidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir campo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
