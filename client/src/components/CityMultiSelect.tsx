import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, X, ChevronDown } from "lucide-react";

interface CityMultiSelectProps {
  selectedUfs: string[];          // UFs selecionadas para filtrar cidades
  selectedCities: string[];       // Cidades já selecionadas
  onChange: (cities: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CityMultiSelect({
  selectedUfs,
  selectedCities,
  onChange,
  disabled,
  placeholder = "Filtrar por cidade",
}: CityMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Buscar cidades do backend baseado nas UFs selecionadas
  const { data: filterOpts, isLoading } = trpc.leads.filterOptions.useQuery(
    { ufs: selectedUfs.length > 0 ? selectedUfs : undefined },
    {
      staleTime: 2 * 60 * 1000,
      enabled: true,
    }
  );

  const allCities = filterOpts?.cidades ?? [];

  // Filtrar por busca
  const filteredCities = allCities.filter((c) =>
    c.cidade.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCity = (city: string) => {
    if (selectedCities.includes(city)) {
      onChange(selectedCities.filter((c) => c !== city));
    } else {
      onChange([...selectedCities, city]);
    }
  };

  const removeCity = (city: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedCities.filter((c) => c !== city));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <div
        className={`flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-md border border-input bg-background cursor-pointer hover:border-primary/50 transition-colors flex-wrap ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {selectedCities.length === 0 ? (
          <span className="text-sm text-muted-foreground flex-1">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedCities.slice(0, 3).map((city) => (
              <Badge
                key={city}
                variant="secondary"
                className="text-xs py-0 px-1.5 gap-0.5"
              >
                {city}
                <X
                  className="w-2.5 h-2.5 cursor-pointer hover:text-destructive"
                  onClick={(e) => removeCity(city, e)}
                />
              </Badge>
            ))}
            {selectedCities.length > 3 && (
              <Badge variant="outline" className="text-xs py-0 px-1.5">
                +{selectedCities.length - 3}
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {selectedCities.length > 0 && (
            <X
              className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive"
              onClick={clearAll}
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-md shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cidade..."
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Info se nenhum UF selecionado */}
          {selectedUfs.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              Selecione um estado para filtrar cidades
            </div>
          )}

          {/* Lista de cidades */}
          <div className="max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">Carregando...</div>
            ) : filteredCities.length === 0 ? (
              <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                {search ? "Nenhuma cidade encontrada" : "Nenhuma cidade disponível"}
              </div>
            ) : (
              filteredCities.map((c) => {
                const isSelected = selectedCities.includes(c.cidade);
                return (
                  <div
                    key={`${c.uf}-${c.cidade}`}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => toggleCity(c.cidade)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={isSelected ? "font-medium" : ""}>{c.cidade}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{c.uf}</span>
                      <span className="text-xs text-muted-foreground">({c.count.toLocaleString("pt-BR")})</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selectedCities.length > 0 && (
            <div className="p-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selectedCities.length} cidade{selectedCities.length > 1 ? "s" : ""} selecionada{selectedCities.length > 1 ? "s" : ""}</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
                Limpar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
