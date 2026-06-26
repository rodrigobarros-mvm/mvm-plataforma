import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, Settings, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Commissions() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isAdmOrGerente = role === "adm" || role === "admin" || role === "gerente";
  const utils = trpc.useUtils();

  const { data: myCommissions, isLoading: myLoading } = trpc.commissions.myCommissions.useQuery();
  const { data: allCommissions, isLoading: allLoading } = isAdmOrGerente
    ? trpc.commissions.all.useQuery()
    : { data: undefined, isLoading: false };
  const { data: config } = isAdmOrGerente
    ? trpc.commissions.getConfig.useQuery()
    : { data: undefined };

  const [valuePerLead, setValuePerLead] = useState("");
  const [pct, setPct] = useState("");

  const updateConfig = trpc.commissions.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração de comissão atualizada!");
      utils.commissions.getConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const commissions = isAdmOrGerente ? (allCommissions ?? []) : (myCommissions ?? []);
  const isLoading = isAdmOrGerente ? allLoading : myLoading;

  const total = commissions.reduce((sum: number, c: any) => sum + (c.amount ?? 0), 0);

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Comissões
        </h1>
        <p className="text-muted-foreground mt-1">
          {isAdmOrGerente ? "Comissões de todos os BDRs" : "Suas comissões por leads qualificados"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total a Receber</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Leads Qualificados</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {commissions.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Valor por Lead</p>
                <p className="text-2xl font-bold mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {config
                    ? parseFloat(config.valuePerQualifiedLead).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "—"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#e8621a20" }}>
                <DollarSign className="w-5 h-5" style={{ color: "#e8621a" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Config (ADM/Gerente only) */}
      {isAdmOrGerente && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" style={{ color: "#e8621a" }} />
              Configurar Comissões
            </CardTitle>
            <CardDescription>Defina o valor de comissão por lead qualificado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Valor fixo por lead qualificado (R$)</Label>
                <Input
                  type="number"
                  placeholder={config?.valuePerQualifiedLead ?? "0.00"}
                  value={valuePerLead}
                  onChange={(e) => setValuePerLead(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="space-y-2">
                <Label>% do ticket (opcional)</Label>
                <Input
                  type="number"
                  placeholder={config?.percentageOfTicket ?? "0"}
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="w-32"
                />
              </div>
              <Button
                onClick={() => updateConfig.mutate({ valuePerQualifiedLead: valuePerLead || "0", percentageOfTicket: pct || undefined })}
                disabled={updateConfig.isPending}
                style={{ background: "oklch(0.22 0.08 240)" }}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : commissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhuma comissão registrada ainda</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Lead</th>
                    {isAdmOrGerente && <th className="text-left py-2 px-3 font-semibold text-muted-foreground">BDR</th>}
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Valor</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c: any) => (
                    <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{c.leadName ?? "—"}</td>
                      {isAdmOrGerente && <td className="py-2 px-3 text-muted-foreground">{c.bdrName ?? "—"}</td>}
                      <td className="py-2 px-3 font-semibold text-green-600">
                        {(c.amount ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant={c.status === "pago" ? "default" : "secondary"} className="text-xs">
                          {c.status === "pago" ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
