import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Loader2, Lock, MapPin, Sliders } from "lucide-react";
import { toast } from "sonner";

interface QuickReleaseDrawerProps {
  open: boolean;
  onClose: () => void;
}

const UF_OPTIONS = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"];

export function QuickReleaseDrawer({ open, onClose }: QuickReleaseDrawerProps) {
  const [step, setStep] = useState(1);
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [isHighPriority, setIsHighPriority] = useState(false);
  const [maxQty, setMaxQty] = useState("500");
  const [confirmed, setConfirmed] = useState(false);

  const utils = trpc.useUtils();

  const { data: stats } = trpc.leads.releaseStats.useQuery(undefined, { enabled: open });

  const releaseMutation = trpc.leads.release.useMutation({
    onSuccess: (data) => {
      setConfirmed(true);
      toast.success(`${data.total} leads liberados com sucesso!`);
      utils.leads.releaseStats.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    setStep(1);
    setSelectedUFs([]);
    setIsHighPriority(false);
    setMaxQty("500");
    setConfirmed(false);
    onClose();
  };

  const toggleUF = (uf: string) => {
    setSelectedUFs((prev) =>
      prev.includes(uf) ? prev.filter((u) => u !== uf) : [...prev, uf]
    );
  };

  const handleRelease = () => {
    releaseMutation.mutate({
      ufs: selectedUFs.length > 0 ? selectedUFs : undefined,
      isHighPriority: isHighPriority || undefined,
      limit: maxQty ? parseInt(maxQty) : undefined,
    });
  };

  const estimatedQty = Math.min(
    parseInt(maxQty) || 500,
    stats?.unreleased ?? 0
  );

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
        {confirmed ? (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#16a34a20" }}>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">Leads Liberados!</p>
              <p className="text-sm text-muted-foreground mt-1">O time já pode começar a prospectar.</p>
            </div>
            <Button onClick={handleClose} className="w-full" style={{ background: "oklch(0.63 0.18 40)", color: "white" }}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <SheetHeader className="mb-6">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" style={{ color: "#e8621a" }} />
                <SheetTitle>Liberar Leads Rápido</SheetTitle>
              </div>
              <SheetDescription>
                {stats ? (
                  <span><strong className="text-foreground">{stats.unreleased.toLocaleString("pt-BR")}</strong> leads disponíveis para liberar</span>
                ) : "Carregando..."}
              </SheetDescription>
            </SheetHeader>

            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                    style={{
                      background: step >= s ? "#e8621a" : "oklch(0.22 0.08 240 / 0.1)",
                      color: step >= s ? "white" : "oklch(0.5 0 0)",
                    }}
                  >
                    {s}
                  </div>
                  {s < 3 && <div className="flex-1 h-0.5 w-8" style={{ background: step > s ? "#e8621a" : "oklch(0.22 0.08 240 / 0.15)" }} />}
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {step === 1 ? "Filtrar" : step === 2 ? "Quantidade" : "Confirmar"}
              </span>
            </div>

            {/* Step 1: Filtros */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4" style={{ color: "#e8621a" }} />
                    <Label className="font-semibold">Estados (opcional)</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {UF_OPTIONS.map((uf) => (
                      <button
                        key={uf}
                        onClick={() => toggleUF(uf)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
                        style={{
                          background: selectedUFs.includes(uf) ? "#e8621a" : "transparent",
                          color: selectedUFs.includes(uf) ? "white" : undefined,
                          borderColor: selectedUFs.includes(uf) ? "#e8621a" : undefined,
                        }}
                      >
                        {uf}
                      </button>
                    ))}
                  </div>
                  {selectedUFs.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">Nenhum selecionado = todos os estados</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sliders className="w-4 h-4" style={{ color: "#e8621a" }} />
                    <Label className="font-semibold">Prioridade</Label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsHighPriority(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                      style={{
                        background: !isHighPriority ? "#e8621a" : "transparent",
                        color: !isHighPriority ? "white" : undefined,
                        borderColor: !isHighPriority ? "#e8621a" : undefined,
                      }}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setIsHighPriority(true)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                      style={{
                        background: isHighPriority ? "#e8621a" : "transparent",
                        color: isHighPriority ? "white" : undefined,
                        borderColor: isHighPriority ? "#e8621a" : undefined,
                      }}
                    >
                      ⭐ Alta Prioridade
                    </button>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-semibold"
                  style={{ background: "oklch(0.63 0.18 40)", color: "white" }}
                  onClick={() => setStep(2)}
                >
                  Próximo <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}

            {/* Step 2: Quantidade */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <Label className="font-semibold text-base mb-3 block">Quantos leads liberar?</Label>
                  <Input
                    type="number"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    className="h-14 text-2xl font-bold text-center"
                    min={1}
                    max={stats?.unreleased ?? 99999}
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Disponíveis com esses filtros: <strong>{(stats?.unreleased ?? 0).toLocaleString("pt-BR")}</strong>
                  </p>
                </div>

                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMaxQty(String(n))}
                      className="py-2 rounded-lg text-sm font-semibold border transition-colors"
                      style={{
                        background: maxQty === String(n) ? "#e8621a" : "transparent",
                        color: maxQty === String(n) ? "white" : undefined,
                        borderColor: maxQty === String(n) ? "#e8621a" : undefined,
                      }}
                    >
                      {n >= 1000 ? "1k" : n}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 h-12 font-semibold"
                    style={{ background: "oklch(0.63 0.18 40)", color: "white" }}
                    onClick={() => setStep(3)}
                    disabled={!maxQty || parseInt(maxQty) < 1}
                  >
                    Próximo <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmar */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Resumo da liberação</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Estados</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {selectedUFs.length > 0
                        ? selectedUFs.map((uf) => <Badge key={uf} variant="secondary" className="text-xs">{uf}</Badge>)
                        : <Badge variant="secondary" className="text-xs">Todos</Badge>
                      }
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Prioridade</span>
                    <Badge variant="secondary" className="text-xs">{isHighPriority ? "⭐ Alta" : "Todos"}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quantidade</span>
                    <span className="font-bold text-lg" style={{ color: "#e8621a" }}>
                      até {parseInt(maxQty).toLocaleString("pt-BR")} leads
                    </span>
                  </div>
                </div>

                <div className="rounded-xl p-4 text-center" style={{ background: "oklch(0.63 0.18 40 / 0.1)" }}>
                  <p className="text-sm text-muted-foreground">Serão liberados aproximadamente</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#e8621a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {estimatedQty.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-sm text-muted-foreground">leads para o time prospectar</p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 h-12 font-semibold"
                    style={{ background: "oklch(0.63 0.18 40)", color: "white" }}
                    onClick={handleRelease}
                    disabled={releaseMutation.isPending}
                  >
                    {releaseMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Liberar Agora
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
