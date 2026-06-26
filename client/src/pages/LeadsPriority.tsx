import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { ChevronLeft, ChevronRight, Lock, MapPin, Phone, Search, Star, User } from "lucide-react";
import { CityMultiSelect } from "@/components/CityMultiSelect";

const STATUS_COLORS: Record<string, string> = {
  "Não iniciado": "bg-gray-100 text-gray-700",
  "Em contato": "bg-blue-100 text-blue-700",
  "Qualificado": "bg-green-100 text-green-700",
  "Desqualificado": "bg-red-100 text-red-700",
  "Aguardando retorno": "bg-yellow-100 text-red-700",
};

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export default function LeadsPriority() {
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
  const [modeloTrator, setModeloTrator] = useState<string>("");

  // Carrega segmentos disponíveis dinamicamente (filtrado por UFs selecionadas)
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
    status: status || undefined,
    segmento: segmento || undefined,
    modeloTrator: modeloTrator || undefined,
    isHighPriority: true,
  });

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: "#e21d3c" }} />
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Alta Prioridade
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {data ? `${data.total.toLocaleString("pt-BR")} leads prioritários${!isAdm ? " (liberados pelo ADM)" : ""}` : "Carregando..."}
          </p>
        </div>
        <Badge className="text-sm px-3 py-1" style={{ background: "#e21d3c20", color: "#e21d3c", border: "1px solid #e21d3c40" }}>
          🔴 Alta Prioridade
        </Badge>
      </div>

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
            <Button type="submit" style={{ background: "#e21d3c" }}>
              <Search className="w-4 h-4 mr-2" />
              Buscar
            </Button>
            {(selectedUfs.length > 0 || selectedCities.length > 0 || status || segmento || search) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUfs([]);
                  setSelectedCities([]);
                  setStatus("");
                  setSegmento("");
                  setSearch("");
                  setSearchInput("");
                  setPage(1);
                }}
                className="text-muted-foreground"
              >
                Limpar filtros
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (data?.data ?? []).length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {isAdm
                ? "Nenhum lead de alta prioridade encontrado com os filtros aplicados."
                : "Nenhum lead de alta prioridade disponível. Aguarde o Administrador liberar leads para o time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(data?.data ?? []).map((lead) => (
            <Card key={lead.id} className="border-border card-hover cursor-pointer" onClick={() => setLocation(`/leads/${lead.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {lead.nomeFantasia || lead.razaoSocial || "—"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.cnpj}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${STATUS_COLORS[lead.statusContato ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                    {lead.statusContato ?? "Não iniciado"}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  {(lead.cidade || lead.uf) && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lead.cidade}{lead.uf ? `, ${lead.uf}` : ""}</span>
                    </div>
                  )}
                  {lead.nomeDecissor && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lead.nomeDecissor}</span>
                    </div>
                  )}
                  {lead.whatsapp1 && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <a
                        href={lead.whatsapp1}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-green-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5 items-center">
                  {lead.segmento && (
                    <Badge variant="secondary" className="text-xs">{lead.segmento}</Badge>
                  )}
                  {lead.urgenciaCompra && (
                    <Badge variant="outline" className="text-xs">{lead.urgenciaCompra}</Badge>
                  )}
                  {(lead.attemptCount ?? 0) > 0 && (
                    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
                      <Phone className="w-3 h-3" />{lead.attemptCount} {lead.attemptCount === 1 ? "tent." : "tent."}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && data && data.total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
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
    </div>
  );
}
