import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Database,
  Plus,
  FileUp,
  Copy,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  XCircle,
} from "lucide-react";

interface DuplicatedLead {
  cnpj: string;
  cnpjRaw: string;
  nome: string | null;
  cidade: string | null;
  uf: string | null;
}

interface ImportResult {
  success: boolean;
  totalInSheet: number;
  validInSheet: number;
  inserted: number;
  duplicated: number;
  duplicatedLeads: DuplicatedLead[];
  skippedNoCnpj: number;
  duplicatesInSheet: number;
  sheets: string[];
  error?: string;
}

interface PreviewSheet {
  sheet: string;
  columns: string[];
  rowCount: number;
  sample: Record<string, unknown>[];
}

interface PreviewResult {
  success: boolean;
  sheets: string[];
  preview: PreviewSheet[];
  error?: string;
}

export default function ImportLeads() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDuplicateList, setShowDuplicateList] = useState(false);
  const [copiedCnpjs, setCopiedCnpjs] = useState(false);

  const importCountQuery = trpc.leads.importCount.useQuery();
  const utils = trpc.useUtils();

  if (!user || (user.role !== "adm" && user.role !== "admin")) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Acesso restrito</p>
        <p className="text-muted-foreground">Apenas ADM pode importar planilhas.</p>
      </div>
    );
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowDuplicateList(false);
    setCopiedCnpjs(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handlePreview = async () => {
    if (!selectedFile) return;
    setPreviewing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/import-spreadsheet/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Erro ao gerar preview");
      } else {
        setPreview(data);
      }
    } catch {
      setError("Erro de conexão ao gerar preview");
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setShowDuplicateList(false);
    setCopiedCnpjs(false);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/import-spreadsheet", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Erro ao importar planilha");
      } else {
        setResult(data);
        utils.leads.list.invalidate();
        utils.leads.importCount.invalidate();
        utils.leads.filterOptions.invalidate();
      }
    } catch {
      setError("Erro de conexão ao importar planilha");
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowDuplicateList(false);
    setCopiedCnpjs(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyCnpjs = () => {
    if (!result?.duplicatedLeads) return;
    const text = result.duplicatedLeads.map(d => d.cnpj).join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedCnpjs(true);
          setTimeout(() => setCopiedCnpjs(false), 2000);
        })
        .catch(() => {
          // Fallback: selecionar texto em textarea temporária
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setCopiedCnpjs(true);
          setTimeout(() => setCopiedCnpjs(false), 2000);
        });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/leads/lista-completa")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importar Planilha</h1>
          <p className="text-muted-foreground text-sm">Adicione novos leads via XLSX/CSV — CNPJs já cadastrados são ignorados automaticamente</p>
        </div>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de leads no banco</p>
              <p className="text-2xl font-bold">
                {importCountQuery.data?.toLocaleString("pt-BR") ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Como funciona */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Selecione um arquivo <strong>.xlsx</strong>, <strong>.xls</strong> ou <strong>.csv</strong> com os leads.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>O sistema detecta automaticamente as colunas (CNPJ, Nome, WhatsApp, UF, Cidade, Scripts, etc.).</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold">3.</span>
            <span><strong>CNPJs já cadastrados são ignorados</strong> — apenas leads com CNPJ novo são inseridos. Nenhum dado existente é alterado.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>Um relatório detalhado mostra quantos foram inseridos, quantos eram duplicados e a lista completa dos CNPJs ignorados.</span>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {!result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileUp className="w-4 h-4" />
              Selecionar Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : selectedFile
                  ? "border-green-500 bg-green-500/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-green-700 dark:text-green-400">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground">Clique para trocar o arquivo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="font-semibold">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls, .csv — máx. 50MB</p>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePreview}
                  disabled={previewing || importing}
                >
                  {previewing ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analisando...</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4 mr-2" /> Visualizar colunas</>
                  )}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleImport}
                  disabled={importing || previewing}
                  style={{ background: "#e8621a" }}
                >
                  {importing ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Importar Leads</>
                  )}
                </Button>
              </div>
            )}

            {importing && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2 animate-pulse" />
                <p className="text-xs text-center text-muted-foreground">
                  Verificando duplicatas e processando planilha... isso pode levar alguns segundos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && !result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview da Planilha</CardTitle>
            <CardDescription>
              {preview.sheets.length} aba{preview.sheets.length > 1 ? "s" : ""} encontrada{preview.sheets.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.preview.map((sheet) => (
              <div key={sheet.sheet} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{sheet.sheet}</p>
                  <Badge variant="secondary">{sheet.rowCount.toLocaleString("pt-BR")} linhas</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sheet.columns.map((col) => (
                    <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Resumo principal */}
          <Card className="border-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                Importação concluída!
              </CardTitle>
              <CardDescription>
                Planilha processada: {result.sheets.join(", ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cards de métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{result.totalInSheet.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Linhas na planilha</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-200 dark:border-green-900">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.inserted.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Novos cadastrados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-900">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{result.duplicated.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Duplicados ignorados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted">
                  <p className="text-2xl font-bold text-muted-foreground">{result.skippedNoCnpj.toLocaleString("pt-BR")}</p>
                  <p className="text-xs text-muted-foreground">Sem CNPJ (ignorados)</p>
                </div>
              </div>

              {/* Aviso de duplicatas dentro da planilha */}
              {result.duplicatesInSheet > 0 && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700 dark:text-blue-400">
                    <strong>{result.duplicatesInSheet}</strong> linha{result.duplicatesInSheet > 1 ? "s" : ""} com CNPJ repetido dentro da própria planilha {result.duplicatesInSheet > 1 ? "foram ignoradas" : "foi ignorada"}.
                  </AlertDescription>
                </Alert>
              )}

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  <Upload className="w-4 h-4 mr-2" /> Importar outra planilha
                </Button>
                <Button className="flex-1" onClick={() => navigate("/leads/lista-completa")} style={{ background: "#e8621a" }}>
                  Ver Lista Completa
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Seção de CNPJs duplicados */}
          {result.duplicated > 0 && (
            <Card className="border-amber-300 dark:border-amber-800">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    {result.duplicated} CNPJ{result.duplicated > 1 ? "s" : ""} já cadastrado{result.duplicated > 1 ? "s" : ""} — ignorado{result.duplicated > 1 ? "s" : ""}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCnpjs}
                      className="text-xs text-muted-foreground h-7 px-2"
                    >
                      {copiedCnpjs ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-500" /> Copiado!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5 mr-1" /> Copiar lista</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDuplicateList(!showDuplicateList)}
                      className="text-xs text-muted-foreground h-7 px-2"
                    >
                      {showDuplicateList ? (
                        <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Ocultar</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5 mr-1" /> Ver lista</>
                      )}
                    </Button>
                  </div>
                </div>
                <CardDescription className="mt-1">
                  Estes leads já existem na plataforma. Nenhum dado foi alterado.
                </CardDescription>
              </CardHeader>

              {showDuplicateList && (
                <CardContent className="pt-3">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">CNPJ</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden sm:table-cell">Empresa</th>
                            <th className="text-left px-3 py-2 font-semibold text-muted-foreground hidden md:table-cell">Cidade/UF</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.duplicatedLeads.map((d, i) => (
                            <tr key={d.cnpjRaw} className="border-t border-border hover:bg-muted/30">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-mono text-amber-700 dark:text-amber-400">{d.cnpj}</td>
                              <td className="px-3 py-2 text-foreground truncate max-w-[180px] hidden sm:table-cell">
                                {d.nome ?? <span className="text-muted-foreground italic">—</span>}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                                {d.cidade && d.uf ? `${d.cidade}, ${d.uf}` : d.cidade ?? d.uf ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {result.duplicated} registro{result.duplicated > 1 ? "s" : ""} no total
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Sucesso sem duplicatas */}
          {result.duplicated === 0 && result.inserted > 0 && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Nenhum CNPJ duplicado encontrado. Todos os <strong>{result.inserted}</strong> leads foram cadastrados com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso se todos eram duplicados */}
          {result.inserted === 0 && result.duplicated > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
              <XCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                Todos os CNPJs da planilha já estão cadastrados na plataforma. Nenhum novo lead foi inserido.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
