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
              Bem-vindo à plataforma Gallotti Tractor | LS Tractor. Agora você pode fazer login com seu e-mail e senha.
            </p>
            <Button onClick={() => setLocation("/")} className="w-full" style={{ background: "#0a1e5a" }}>
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
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10" style={{ background: "#0a1e5a" }}>
        <div className="flex items-center gap-3">
          <img src="data:image/jpeg;base64,data:image/jpeg;base64,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" alt="Gallotti Tractor | LS Tractor" className="h-8 object-contain" />
        </div>
        <div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Primeiro<br />
            <span style={{ color: "#e21d3c" }}>Acesso</span>
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Complete seu cadastro para acessar a plataforma de prospecção ativa Gallotti Tractor | LS Tractor.
          </p>
        </div>
        <p className="text-white/40 text-xs">© 2025 Gallotti Tractor | LS Tractor — Prospecção Ativa</p>
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
                style={{ background: "#0a1e5a" }}
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
