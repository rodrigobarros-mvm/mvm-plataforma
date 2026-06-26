import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const loginMutation = trpc.users.loginWithPassword.useMutation({
    onSuccess: () => {
      setLocation("/dashboard");
    },
    onError: (err) => {
      setError(err.message || "E-mail ou senha incorretos.");
      setIsLoading(false);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setForgotSent(true);
    setIsLoading(false);
    toast.success("E-mail de recuperação enviado!");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a1e5a 0%, #1c3c8a 60%, #0a1e5a 100%)" }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-white/20" />
          <div className="absolute top-40 left-40 w-96 h-96 rounded-full border border-white/10" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-white/20" />
          <div className="absolute -bottom-10 -right-10 w-72 h-72 rounded-full border border-white/10" />
        </div>
        {/* Yellow accent stripe */}
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#e21d3c" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src="data:image/jpeg;base64,data:image/jpeg;base64,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"
              alt="Gallotti Tractor | LS Tractor"
              className="h-10 object-contain"
            />
          </div>

          {/* Hero Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Plataforma de<br />
                <span style={{ color: "#e21d3c" }}>Prospecção Ativa</span>
              </h1>
              <p className="text-white/70 text-lg leading-relaxed">
                Gerencie leads, acompanhe KPIs e maximize resultados com a equipe de BDRs em tempo real.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "9.791", label: "Leads Mapeados" },
                { value: "5.876", label: "Alta Prioridade" },
                { value: "10", label: "Estados Cobertos" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</div>
                  <div className="text-white/60 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/40 text-sm">
            © 2025 Gallotti Tractor | LS Tractor — Prospecção Ativa
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img
              src="data:image/jpeg;base64,data:image/jpeg;base64,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"
              alt="Gallotti Tractor | LS Tractor"
              className="h-8 object-contain"
            />
          </div>

          {mode === "login" ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground">Entre com suas credenciais para acessar a plataforma</p>
              </div>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-foreground font-medium">E-mail corporativo</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-foreground font-medium">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-sm hover:underline"
                        style={{ color: "#e21d3c" }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #0a1e5a 0%, #1c3c8a 60%, #0a1e5a 100%)" }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                      ) : (
                        "Entrar na Plataforma"
                      )}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => { window.location.href = getLoginUrl(); }}
                    >
                      Entrar com SSO
                    </Button>
                  </form>
                  <div className="mt-4 pt-4 border-t border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      Recebeu um convite?{" "}
                      <a
                        href="/primeiro-acesso"
                        className="font-semibold hover:underline transition-colors"
                        style={{ color: "#e21d3c" }}
                      >
                        Fazer primeiro acesso
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Recuperar senha
                </h2>
                <p className="text-muted-foreground">Informe seu e-mail para receber as instruções</p>
              </div>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  {forgotSent ? (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">E-mail enviado!</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                      </p>
                      <Button variant="outline" onClick={() => { setMode("login"); setForgotSent(false); }}>
                        Voltar ao login
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="forgot-email">E-mail corporativo</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar instruções"}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("login")}>
                        Voltar ao login
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <p className="text-center text-muted-foreground text-xs mt-6">
            Problemas de acesso? Entre em contato com o administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
