import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Search, CheckCircle2, Users, Send, Filter, Zap } from "lucide-react";
import { toast } from "sonner";
import { WA_TEMPLATES, getTemplatesForSegmento } from "@/components/WaTemplates";

const SEGMENTOS = [
  "Cafeicultura", "Cana-de-Açúcar", "Fruticultura / Lavoura Permanente",
  "Pecuária de Corte / Mista", "Grãos / Lavouras Temporárias",
  "Serviços Agrícolas / Pós-Colheita", "Citricultura",
];

export default function WhatsAppMassa() {
  const { user } = useAuth();
  const [segmento, setSegmento] = useState("");
  const [uf, setUf] = useState("");
  const [templateId, setTemplateId] = useState("abertura_geral");
  const [msgCustom, setMsgCustom] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<1|2|3>(1);
  const [sent, setSent] = useState(0);

  const { data: leadsData, isLoading } = trpc.leads.list.useQuery({
    segmento: segmento || undefined,
    ufs: uf ? [uf] : undefined,
    search: search || undefined,
    limit: 100,
    status: "Não iniciado",
  }, { enabled: step >= 1 });

  const leads = (leadsData?.data ?? []).filter((l: any) => l.whatsapp1);

  const tpl = WA_TEMPLATES.find(t => t.id === templateId);
  const templates = segmento ? getTemplatesForSegmento(segmento) : WA_TEMPLATES;

  const preview = useMemo(() => {
    if (!tpl) return "";
    return tpl.message({
      empresa: "EXEMPLO AGRO LTDA",
      modelo: "MT7.80F Cabinado",
      cidade: uf || "Barreiras",
      decisor: "João",
    });
  }, [tpl, uf]);

  const handleSelectAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(leads.map((l: any) => l.id)));
    }
  };

  const handleSendAll = async () => {
    const selectedLeads = leads.filter((l: any) => selected.has(l.id));
    let count = 0;
    for (const lead of selectedLeads) {
      const phone = lead.whatsapp1?.replace(/\D/g, "");
      if (!phone || phone.length < 10) continue;
      const msg = tpl ? tpl.message({
        empresa: lead.nomeFantasia ?? lead.razaoSocial ?? "sua empresa",
        modelo: lead.modeloTrator ?? undefined,
        cidade: lead.cidade ?? undefined,
        decisor: lead.nomeDecissor ?? undefined,
      }) : msgCustom;
      const finalPhone = phone.startsWith("55") ? phone : `55${phone}`;
      window.open(`https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      count++;
      setSent(count);
      // Small delay between opens to avoid browser blocking
      await new Promise(r => setTimeout(r, 800));
    }
    toast.success(`${count} mensagens abertas no WhatsApp!`);
    setStep(3);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="w-6 h-6" style={{ color: "#25D366" }} />
          WhatsApp em Massa
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione leads por segmento e envie mensagens personalizadas em sequência
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[{n:1,l:"Filtrar Leads"},{n:2,l:"Compor Mensagem"},{n:3,l:"Enviar"}].map(s => (
          <button key={s.n} onClick={() => step >= s.n && setStep(s.n as 1|2|3)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold border flex items-center justify-center gap-2 transition-all"
            style={{
              background: step === s.n ? "#25D366" : step > s.n ? "#f0fdf4" : "var(--card)",
              color: step === s.n ? "white" : step > s.n ? "#059669" : "var(--muted-foreground)",
              borderColor: step === s.n ? "#25D366" : step > s.n ? "#6ee7b7" : "var(--border)",
            }}>
            <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
              style={{ background: step > s.n ? "#059669" : step === s.n ? "white" : "var(--muted)", color: step === s.n ? "#25D366" : "white" }}>
              {step > s.n ? "✓" : s.n}
            </span>
            {s.l}
          </button>
        ))}
      </div>

      {/* STEP 1: Filtrar */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" style={{ color: "#0a1e5a" }} />
                Filtrar Leads
              </CardTitle>
              <CardDescription>Selecione o segmento e estado para filtrar os leads com WhatsApp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Segmento</Label>
                  <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                    value={segmento} onChange={e => setSegmento(e.target.value)}>
                    <option value="">Todos os segmentos</option>
                    {SEGMENTOS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado (UF)</Label>
                  <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                    value={uf} onChange={e => setUf(e.target.value)}>
                    <option value="">Todos</option>
                    {["PE","BA","CE","RN","PB","AL","SE","PI","MA","GO","MG","SP"].map(u => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>

          {/* Lead list */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {isLoading ? "Carregando..." : `${leads.length} leads com WhatsApp`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleSelectAll}>
                    {selected.size === leads.length ? "Desmarcar todos" : `Selecionar todos (${leads.length})`}
                  </Button>
                  <Badge style={{ background: "#25D366", color: "white" }}>{selected.size} selecionados</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {leads.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    {isLoading ? "Buscando leads..." : "Nenhum lead com WhatsApp neste filtro"}
                  </p>
                ) : leads.map((lead: any) => {
                  const isSel = selected.has(lead.id);
                  return (
                    <div key={lead.id}
                      className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                      style={{ borderColor: isSel ? "#25D366" : "var(--border)", background: isSel ? "#f0fdf4" : "var(--card)" }}
                      onClick={() => {
                        const next = new Set(selected);
                        isSel ? next.delete(lead.id) : next.add(lead.id);
                        setSelected(next);
                      }}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all`}
                        style={{ borderColor: isSel ? "#25D366" : "var(--border)", background: isSel ? "#25D366" : "transparent" }}>
                        {isSel && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{lead.nomeFantasia ?? lead.razaoSocial}</p>
                        <p className="text-xs text-muted-foreground">{lead.cidade}/{lead.uf} · {lead.segmento?.split("/")[0]?.trim()}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono text-green-700">{lead.whatsapp1?.substring(0, 15)}</p>
                        <Badge variant="outline" className="text-xs">{lead.prioridade}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button className="w-full mt-4 gap-2" style={{ background: "#0a1e5a", color: "white" }}
                disabled={selected.size === 0} onClick={() => setStep(2)}>
                Próximo — Compor Mensagem ({selected.size} leads) →
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Mensagem */}
      {step === 2 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4" style={{ color: "#25D366" }} />
              Compor Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Template de Mensagem</Label>
              <select className="w-full border border-border rounded-md text-sm px-3 py-2 bg-background"
                value={templateId} onChange={e => setTemplateId(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label>Preview da Mensagem</Label>
              <div className="rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap"
                style={{ background: "#e5ddd5", color: "#303030", fontFamily: "system-ui", minHeight: "120px" }}>
                {preview}
              </div>
              <p className="text-xs text-muted-foreground">
                Os campos [empresa], [modelo] e [decisor] são preenchidos automaticamente com os dados de cada lead.
              </p>
            </div>

            {/* Warning */}
            <div className="rounded-xl p-3 border border-yellow-200 bg-yellow-50">
              <p className="text-xs font-bold text-yellow-800 mb-1">⚠️ Importante antes de enviar</p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• O sistema abrirá uma aba do WhatsApp para cada lead selecionado</li>
                <li>• Aguarde cada aba abrir antes de fechar</li>
                <li>• Recomendado: máximo de 30 leads por vez para evitar bloqueio</li>
                <li>• Leads sem WhatsApp válido serão pulados automaticamente</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Voltar</Button>
              <Button className="flex-1 gap-2" style={{ background: "#25D366", color: "white" }} onClick={() => setStep(3)}>
                <Send className="w-4 h-4" /> Revisar e Enviar ({selected.size} leads)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Enviar */}
      {step === 3 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" style={{ color: "#25D366" }} />
              Confirmar Envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent === 0 ? (
              <>
                <div className="rounded-xl p-4 border-2 border-green-200 bg-green-50 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-semibold">Leads selecionados</span>
                    <span className="font-bold text-green-800">{selected.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-semibold">Template</span>
                    <span className="font-bold text-green-800">{tpl?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700 font-semibold">Segmento</span>
                    <span className="font-bold text-green-800">{segmento || "Todos"}</span>
                  </div>
                </div>
                <Button className="w-full gap-2 h-14 text-base font-bold" style={{ background: "#25D366", color: "white" }}
                  onClick={handleSendAll}>
                  <MessageCircle className="w-5 h-5" />
                  Enviar {selected.size} mensagens agora
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setStep(2)}>← Voltar</Button>
              </>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center" style={{ background: "#25D36620" }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: "#25D366" }} />
                </div>
                <div>
                  <p className="text-xl font-black text-green-700">{sent} mensagens enviadas!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verifique o WhatsApp — cada conversa foi aberta em uma aba.
                  </p>
                </div>
                <Button variant="outline" onClick={() => { setSent(0); setSelected(new Set()); setStep(1); }}>
                  Nova campanha
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
