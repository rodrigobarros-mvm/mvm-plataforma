import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, Loader2, UserPlus, AlertCircle } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  adm: "Administrador",
  admin: "Administrador",
  gerente: "Gerente",
  diretor: "Diretor",
  coordenador: "Coordenador",
  supervisor: "Supervisor",
  bdr: "BDR",
};

const CARGO_SUGGESTIONS: Record<string, string[]> = {
  adm: ["Administrador", "Diretor Geral"],
  admin: ["Administrador", "Diretor Geral"],
  gerente: ["Gerente Comercial", "Gerente de Vendas"],
  diretor: ["Diretor Comercial", "Diretor de Vendas", "Diretor Regional"],
  coordenador: ["Coordenador Comercial", "Coordenador de Vendas"],
  supervisor: ["Supervisor Comercial", "Supervisor de Vendas"],
  bdr: ["BDR", "Representante Comercial", "Prospector"],
};

export default function FirstAccess() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"validating" | "form" | "success" | "error">("validating");
  const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    cargo: "",
    whatsapp: "",
    password: "",
    confirmPassword: "",
  });

  // Extract token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) {
      setToken(t);
    } else {
      setStep("error");
    }
  }, []);

  const { data: acceptData, error: acceptError } = trpc.users.acceptInvite.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  useEffect(() => {
    if (acceptData) {
      setInviteData({ email: acceptData.email, role: acceptData.role });
      const suggestions = CARGO_SUGGESTIONS[acceptData.role] ?? [];
      setForm(f => ({ ...f, cargo: suggestions[0] ?? "" }));
      setStep("form");
    }
    if (acceptError) {
      setStep("error");
    }
  }, [acceptData, acceptError]);

  const completeMutation = trpc.users.completeFirstAccess.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("Conta criada com sucesso! Você já pode fazer login.");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar conta. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    if (!form.lastName.trim()) return toast.error("Sobrenome é obrigatório");
    if (form.password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (form.password !== form.confirmPassword) return toast.error("As senhas não coincidem");

    completeMutation.mutate({
      token,
      name: form.name.trim(),
      lastName: form.lastName.trim(),
      cargo: form.cargo.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      password: form.password,
    });
  };

  if (step === "validating" && token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando seu convite...</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Convite inválido ou expirado</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Este link de convite não é válido, já foi utilizado ou expirou. Solicite um novo convite ao administrador.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full">
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Conta criada com sucesso!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Bem-vindo à plataforma LN Máquinas. Agora você pode fazer login com seu e-mail e senha.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full" style={{ background: "#111111" }}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10" style={{ background: "#111111" }}>
        <div className="flex items-center gap-3">
          <img src="/manus-storage/LOGOLN_191337c8.png" alt="LN Máquinas" className="h-8 object-contain" />
        </div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Primeiro<br />
            <span style={{ color: "#F5A623" }}>Acesso</span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Complete seu cadastro para acessar a plataforma de prospecção ativa LN Máquinas.
          </p>
        </div>
        <p className="text-white/40 text-xs">© 2025 LN Máquinas — Prospecção Ativa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Complete seu cadastro
              </CardTitle>
              {inviteData && (
                <Badge variant="secondary" className="text-xs">
                  {ROLE_LABELS[inviteData.role] ?? inviteData.role}
                </Badge>
              )}
            </div>
            {inviteData && (
              <CardDescription>
                Convite enviado para <strong>{inviteData.email}</strong>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="João"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-sm font-medium">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    placeholder="Silva"
                    value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cargo" className="text-sm font-medium">Cargo</Label>
                <Input
                  id="cargo"
                  placeholder={CARGO_SUGGESTIONS[inviteData?.role ?? "bdr"]?.[0] ?? "Seu cargo"}
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                />
                {inviteData && (CARGO_SUGGESTIONS[inviteData.role] ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(CARGO_SUGGESTIONS[inviteData.role] ?? []).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, cargo: s }))}
                        className="text-xs px-2 py-0.5 rounded-full border border-border hover:bg-muted transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(81) 9.9999-9999"
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                style={{ background: "#111111" }}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...</>
                ) : (
                  "Criar minha conta"
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Já tem conta?{" "}
                <button type="button" onClick={() => setLocation("/")} className="text-primary hover:underline font-medium">
                  Fazer login
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
