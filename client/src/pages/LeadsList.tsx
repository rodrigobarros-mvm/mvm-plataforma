import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ExternalLink, FileUp, Filter, Lock, MapPin, Phone, Search, Unlock, User } from "lucide-react";
import { CityMultiSelect } from "@/components/CityMultiSelect";

const STATUS_COLORS: Record<string, string> = {
  "Não iniciado": "bg-gray-100 text-gray-700",
  "Em contato": "bg-blue-100 text-blue-700",
  "Qualificado": "bg-green-100 text-green-700",
  "Desqualificado": "bg-red-100 text-red-700",
  "Aguardando retorno": "bg-yellow-100 text-red-700",
};

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function LeadsList() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const role = (user as any)?.role ?? "bdr";
  const isAdm = role === "adm" || role === "admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedUfs, setSelectedUfs] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("");
  const [segmento, setSegmento] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("");
  const [modeloTrator, setModeloTrator] = useState<string>("");

  // Carrega segmentos disponíveis dinamicamente
  const { data: filterOpts } = trpc.leads.filterOptions.useQuery(
    { ufs: selectedUfs.length > 0 ? selectedUfs : undefined },
    { staleTime: 2 * 60 * 1000 }
  );

  const { data, isLoading } = trpc.leads.list.useQuery({
    page,
    limit: 50,
    search: search || undefined,
    ufs: selectedUfs.length > 0 ? selectedUfs : undefined,
    cidades: selectedCities.length > 0 ? selectedCities : undefined,
    segmento: segmento || undefined,
    modeloTrator: modeloTrator || undefined,
    status: status || undefined,
    isHighPriority: prioridade === "" ? undefined : prioridade === "true",
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Lista Completa
          </h1>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.total.toLocaleString("pt-BR")} empresas encontradas` : "Carregando..."}
          </p>
        </div>
        {/* Somente ADM pode importar/exportar e liberar leads */}
        {isAdm && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/leads/importar")}
              className="text-xs"
            >
              <FileUp className="w-3.5 h-3.5 mr-1.5" />
              Importar Planilha
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/leads/release")}
              style={{ background: "oklch(0.22 0.08 240)" }}
              className="text-white text-xs"
            >
              <Unlock className="w-3.5 h-3.5 mr-1.5" />
              Liberar Leads para o Time
            </Button>
          </div>
        )}
      </div>

      {/* Aviso de acesso restrito para Gerente e BDR */}
      {!isAdm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-red-800 text-sm">
                Você está visualizando apenas os leads liberados pelo Administrador.
                {role === "bdr" && " Somente leads atribuídos a você são exibidos."}
                {" "}Importação e exportação de dados são restritas ao ADM.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            {/* Multi-seleção de UF */}
            <div className="relative">
              <Select
                value=""
                onValueChange={(v) => {
                  if (v === "all") {
                    setSelectedUfs([]);
                    setSelectedCities([]);
                  } else {
                    setSelectedUfs((prev) =>
                      prev.includes(v) ? prev.filter((u) => u !== v) : [...prev, v]
                    );
                    setSelectedCities([]);
                  }
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder={selectedUfs.length > 0 ? `${selectedUfs.length} estado${selectedUfs.length > 1 ? "s" : ""}` : "Estado"} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {UF_LIST.map(u => (
                    <SelectItem key={u} value={u}>
                      <span className="flex items-center gap-2">
                        {selectedUfs.includes(u) && <span className="text-primary font-bold">✓</span>}
                        {u}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Multi-seleção de Cidade (dinâmica por UF) */}
            <div className="min-w-[180px] max-w-[260px]">
              <CityMultiSelect
                selectedUfs={selectedUfs}
                selectedCities={selectedCities}
                onChange={(cities) => { setSelectedCities(cities); setPage(1); }}
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Não iniciado">Não iniciado</SelectItem>
                <SelectItem value="Em contato">Em contato</SelectItem>
                <SelectItem value="Qualificado">Qualificado</SelectItem>
                <SelectItem value="Desqualificado">Desqualificado</SelectItem>
                <SelectItem value="Aguardando retorno">Aguardando retorno</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioridade} onValueChange={(v) => { setPrioridade(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Alta Prioridade</SelectItem>
                <SelectItem value="false">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmento} onValueChange={(v) => { setSegmento(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Atividade principal" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todas as atividades</SelectItem>
                {(filterOpts?.segmentos ?? []).map((s) => (
                  <SelectItem key={s.label} value={s.label}>
                    {s.label} ({s.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={modeloTrator} onValueChange={(v) => { setModeloTrator(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Modelo de Máquina" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Todos os modelos</SelectItem>
                {(filterOpts?.modelos ?? []).map((m) => (
                  <SelectItem key={m.label} value={m.label}>
                    {m.label} ({m.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" style={{ background: "oklch(0.22 0.08 240)" }} className="text-white">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Segmento</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden lg:table-cell">Localização</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden xl:table-cell">Contato</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden sm:table-cell">Tentativas</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Prioridade</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-12" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-16" /></td>
                  </tr>
                ))
              ) : (data?.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-muted-foreground">
                    <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {isAdm
                        ? "Nenhum lead encontrado com os filtros aplicados."
                        : "Nenhum lead disponível. Aguarde o Administrador liberar leads para o time."}
                    </p>
                    {isAdm && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setLocation("/leads/release")}
                      >
                        Ir para Liberação de Leads
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (data?.data ?? []).map((lead) => (
                <tr key={lead.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground truncate max-w-[200px]">
                        {lead.nomeFantasia || lead.razaoSocial || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{lead.cnpj}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-muted-foreground">{lead.segmento ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{lead.cidade}, {lead.uf}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="space-y-0.5">
                      {lead.nomeDecissor && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{lead.nomeDecissor}</span>
                        </div>
                      )}
                      {lead.whatsapp1 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.statusContato ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.statusContato ?? "Não iniciado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {(lead.attemptCount ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        <Phone className="w-3 h-3" />{lead.attemptCount}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.isHighPriority ? (
                      <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Alta</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Normal</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation(`/leads/${lead.id}`)}
                      className="h-7 text-xs"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && data && data.total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} — {data.total.toLocaleString("pt-BR")} registros
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
