import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, TrendingUp, DollarSign, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_CONFIG = {
  rascunho:  { label: "Rascunho",  color: "#94A3B8", bg: "#F8FAFC" },
  enviada:   { label: "Enviada",   color: "#0891B2", bg: "#ECFEFF" },
  aceita:    { label: "Aceita",    color: "#059669", bg: "#F0FDF4" },
  recusada:  { label: "Recusada",  color: "#e21d3c", bg: "#FEF2F2" },
  expirada:  { label: "Expirada", color: "#94A3B8", bg: "#F8FAFC" },
};

export default function HistoricoPropostas() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const role = (user as any)?.role ?? "bdr";

  const { data, isLoading, refetch } = trpc.propostas.list.useQuery({ limit: 100 });
  const stats = trpc.propostas.stats.useQuery();
  const updateStatus = trpc.propostas.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
  });

  const filtered = (data?.data ?? []).filter((p: any) =>
    !search || p.clienteNome?.toLowerCase().includes(search.toLowerCase()) || p.numero?.includes(search)
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" style={{ color: "#e21d3c" }} />
            Historico de Propostas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Todas as propostas geradas no sistema</p>
        </div>
        <Button style={{ background: "#e21d3c", color: "white" }} className="gap-2"
          onClick={() => setLocation("/gerar-proposta")}>
          <FileText className="w-4 h-4" /> Nova Proposta
        </Button>
      </div>

      {/* Stats */}
      {stats.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total",         value: stats.data.totalGeral, color: "#0a1e5a", icon: FileText },
            { label: "Este mes",      value: stats.data.mesAtual,   color: "#7C3AED", icon: Clock },
            { label: "Aceitas",       value: stats.data.aceitas,    color: "#059669", icon: CheckCircle2 },
            { label: "Volume total",  value: `R$ ${(stats.data.volumeTotal/1000).toFixed(0)}k`, color: "#D97706", icon: DollarSign },
          ].map(s => (
            <Card key={s.label} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por cliente ou numero..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <p className="font-semibold text-muted-foreground">Nenhuma proposta ainda</p>
          <Button className="mt-4" style={{ background: "#e21d3c", color: "white" }} onClick={() => setLocation("/gerar-proposta")}>
            Gerar primeira proposta
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p: any) => {
            const stCfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.enviada;
            return (
              <Card key={p.id} className="border-border hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold">{p.numero}</p>
                        <Badge style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.color}40` }}>
                          {stCfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground font-medium">{p.clienteNome}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                        {p.consultorNome && <span>👤 {p.consultorNome}</span>}
                        {p.condicaoPagamento && <span>💳 {p.condicaoPagamento}</span>}
                        {p.prazoEntrega && <span>📦 {p.prazoEntrega}</span>}
                        <span>📅 {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-black text-green-700">
                          R$ {Number(p.totalGeral).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      {/* Status actions */}
                      {p.status === "enviada" && (
                        <div className="flex gap-1">
                          <Button size="sm" className="h-8 text-xs gap-1" style={{ background: "#059669", color: "white" }}
                            onClick={() => updateStatus.mutate({ id: p.id, status: "aceita" })}>
                            <CheckCircle2 className="w-3 h-3" /> Aceita
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-red-600 border-red-200"
                            onClick={() => updateStatus.mutate({ id: p.id, status: "recusada" })}>
                            <XCircle className="w-3 h-3" /> Recusada
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
