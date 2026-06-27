import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Search, X, Building2, TrendingUp, Package, FileText } from "lucide-react";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const { data: leads } = trpc.leads.list.useQuery(
    { search: query, limit: 4 },
    { enabled: query.length >= 2 }
  );

  const { data: opps } = trpc.oportunidades.list.useQuery(
    { search: query, limit: 3 },
    { enabled: query.length >= 2 }
  );

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasResults = (leads?.data?.length ?? 0) > 0 || (opps?.data?.length ?? 0) > 0;

  const navigate = (path: string) => {
    setLocation(path);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
        style={{ minWidth: "180px" }}
      >
        <Search className="w-3.5 h-3.5" />
        <span>Buscar... </span>
        <kbd className="ml-auto text-xs px-1.5 py-0.5 rounded border border-border bg-background font-mono hidden md:block">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setQuery(""); }} />
          {/* Panel */}
          <div className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar lead, oportunidade, máquina..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            {query.length >= 2 && (
              <div className="max-h-80 overflow-y-auto">
                {!hasResults && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum resultado para "{query}"
                  </p>
                )}

                {(leads?.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-4 py-2 bg-muted/30">
                      Leads
                    </p>
                    {leads!.data.map((lead: any) => (
                      <button
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors border-b border-border/30 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-blue-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {lead.nomeFantasia ?? lead.razaoSocial ?? "Lead sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.cidade}/{lead.uf} · {lead.segmento?.split("/")[0]?.trim() ?? "—"}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{lead.prioridade}</span>
                      </button>
                    ))}
                  </div>
                )}

                {(opps?.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-4 py-2 bg-muted/30">
                      Oportunidades
                    </p>
                    {opps!.data.map((opp: any) => (
                      <button
                        key={opp.id}
                        onClick={() => navigate(`/oportunidades`)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors border-b border-border/30 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#e21d3c20" }}>
                          <TrendingUp className="w-4 h-4" style={{ color: "#e21d3c" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {opp.leadNome ?? opp.leadRazao ?? `Oportunidade #${opp.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {opp.modeloInteresse} · {opp.status?.replace(/_/g, " ")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hints */}
            {!query && (
              <div className="px-4 py-4 space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Atalhos rápidos</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Alta Prioridade", path: "/leads/priority", icon: "⭐" },
                    { label: "Nova Oportunidade", path: "/nova-oportunidade", icon: "⚡" },
                    { label: "Minha Agenda", path: "/agenda-consultor", icon: "📅" },
                    { label: "Work Mode", path: "/work-mode", icon: "🎯" },
                  ].map(s => (
                    <button
                      key={s.path}
                      onClick={() => navigate(s.path)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-left text-sm transition-colors"
                    >
                      <span>{s.icon}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
