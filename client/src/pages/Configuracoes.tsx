import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Building2, Bell, Moon, Sun, Palette, Save, CheckCircle2, MapPin, Store } from "lucide-react";
import { UNIDADES } from "@/lib/unidades";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function Configuracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const role = (user as any)?.role ?? "bdr";
  const isAdm = ["adm", "admin", "gerente"].includes(role);
  const [saved, setSaved] = useState(false);

  const [empresa, setEmpresa] = useState({
    nome: "Gallotti Tractor Comercio de Tratores e Maquinas Agricolas LTDA",
    cnpj: "54.931.200/0001-97",
    endereco: "Av. Enedino Alves da Paixao, 1654 — Santa Cruz",
    cidade: "Luis Eduardo Magalhaes",
    uf: "BA",
    cep: "47855-244",
    telefone: "",
    email: "",
  });

  const [alertas, setAlertas] = useState({
    propostas: true,
    followups: true,
    ranking: true,
    handoff: true,
    metas: false,
  });

  const handleSave = () => {
    setSaved(true);
    toast.success("Configuracoes salvas!");
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" style={{ color: "#0a1e5a" }} />
          Configuracoes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Personalize a plataforma Gallotti Tractor</p>
      </div>

      {/* Dados da Revenda — ADM only */}
      {isAdm && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: "#0a1e5a" }} />
              Dados da Revenda
            </CardTitle>
            <CardDescription>Aparecem no cabecalho das propostas comerciais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Razao Social</Label>
              <Input value={empresa.nome} onChange={e => setEmpresa(v => ({ ...v, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={empresa.cnpj} onChange={e => setEmpresa(v => ({ ...v, cnpj: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={empresa.telefone} onChange={e => setEmpresa(v => ({ ...v, telefone: e.target.value }))} placeholder="(77) 99999-9999" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Endereco</Label>
              <Input value={empresa.endereco} onChange={e => setEmpresa(v => ({ ...v, endereco: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Cidade</Label>
                <Input value={empresa.cidade} onChange={e => setEmpresa(v => ({ ...v, cidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <Input value={empresa.cep} onChange={e => setEmpresa(v => ({ ...v, cep: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail comercial</Label>
              <Input type="email" value={empresa.email} onChange={e => setEmpresa(v => ({ ...v, email: e.target.value }))} placeholder="contato@gallottitractor.com.br" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tema */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" style={{ color: "#0a1e5a" }} />
            Aparencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "light", label: "Claro", icon: Sun },
              { key: "dark",  label: "Escuro", icon: Moon },
              { key: "system", label: "Sistema", icon: Settings },
            ].map(t => {
              const Icon = t.icon;
              const isSelected = theme === t.key;
              return (
                <button key={t.key} onClick={() => setTheme(t.key as any)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all"
                  style={{ borderColor: isSelected ? "#0a1e5a" : "var(--border)", background: isSelected ? "#0a1e5a08" : "var(--card)" }}>
                  <Icon className="w-5 h-5" style={{ color: isSelected ? "#0a1e5a" : "var(--muted-foreground)" }} />
                  <span className="text-sm font-semibold" style={{ color: isSelected ? "#0a1e5a" : "var(--muted-foreground)" }}>{t.label}</span>
                  {isSelected && <Badge className="text-xs" style={{ background: "#0a1e5a", color: "white" }}>Ativo</Badge>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            O modo automatico alterna para escuro apos as 18h e claro apos as 7h.
          </p>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: "#0a1e5a" }} />
            Alertas e Notificacoes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "propostas", label: "Propostas prestes a vencer (2 dias)", desc: "Avisa quando uma proposta enviada esta perto de expirar" },
            { key: "followups", label: "Follow-ups atrasados", desc: "Avisa ao entrar no sistema se ha follow-ups pendentes" },
            { key: "handoff", label: "Novo lead qualificado (consultor)", desc: "Notifica consultores quando BDR passa um lead" },
            { key: "ranking", label: "Ranking diario", desc: "Receba um resumo do ranking ao final do dia" },
            { key: "metas", label: "Alertas de meta", desc: "Avisa quando a meta diaria esta abaixo de 50%" },
          ].map(a => (
            <div key={a.key} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
              <button
                onClick={() => setAlertas(v => ({ ...v, [a.key]: !v[a.key as keyof typeof v] }))}
                className="relative w-10 h-5 rounded-full transition-all shrink-0 mt-0.5"
                style={{ background: alertas[a.key as keyof typeof alertas] ? "#0a1e5a" : "var(--muted)" }}>
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: alertas[a.key as keyof typeof alertas] ? "calc(100% - 18px)" : "2px" }} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Mapa info */}
      <Card className="border-border" style={{ background: "#f0fdf4", borderColor: "#6ee7b7" }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-800">Mapa de Visitas — Gratuito ✅</p>
              <p className="text-xs text-green-700 mt-1 leading-relaxed">
                O mapa do Relatório de Visitas usa <strong>OpenStreetMap</strong> — 100% gratuito,
                sem necessidade de chave de API ou pagamento. Funciona automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Info conta */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Minha Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Badge style={{ background: "#0a1e5a20", color: "#0a1e5a" }}>{role.toUpperCase()}</Badge>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
            <p><strong>Plataforma:</strong> Gallotti Tractor | LS Tractor — Prospecção Comercial</p>
            <p><strong>Versao:</strong> v13.0 · Deploy Railway</p>
            <p><strong>Leads carregados:</strong> 9.791</p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" style={{ background: "#0a1e5a", color: "white" }} onClick={handleSave}>
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Salvo!</> : <><Save className="w-4 h-4" /> Salvar Configuracoes</>}
      </Button>
    </div>
  );
}
