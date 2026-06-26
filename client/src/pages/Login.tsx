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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111111 0%, #1a1a1a 60%, #222222 100%)" }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-white/20" />
          <div className="absolute top-40 left-40 w-96 h-96 rounded-full border border-white/10" />
          <div className="absolute bottom-20 right-20 w-48 h-48 rounded-full border border-white/20" />
          <div className="absolute -bottom-10 -right-10 w-72 h-72 rounded-full border border-white/10" />
        </div>
        {/* Yellow accent stripe */}
        <div className="absolute top-0 left-0 w-1 h-full" style={{ background: "#F5A623" }} />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src="/manus-storage/LOGOLN_191337c8.png"
              alt="LN Máquinas"
              className="h-10 object-contain"
            />
          </div>

          {/* Hero Content */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Plataforma de<br />
                <span style={{ color: "#F5A623" }}>Prospecção Ativa</span>
              </h1>
              <p className="text-white/70 text-lg leading-relaxed">
                Gerencie leads, acompanhe KPIs e maximize resultados com a equipe de BDRs em tempo real.
              </p>
            </div>

            {/* Michigan logo badge */}
            <div className="flex items-center gap-3">
              <span className="text-white/50 text-sm">Revendedor autorizado</span>
              <img
                src="/manus-storage/LOGOMICHANGI_d515ada8.png"
                alt="Michigan"
                className="h-8 object-contain rounded"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: "7.989", label: "Empresas Mapeadas" },
                { value: "1.287", label: "Alta Prioridade" },
                { value: "2", label: "Estados (BA/PI)" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl p-4" style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)" }}>
                  <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</div>
                  <div className="text-white/60 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/40 text-sm">
            © 2025 LN Máquinas — Prospecção Ativa
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <img
              src="/manus-storage/LOGOLN_191337c8.png"
              alt="LN Máquinas"
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
                        style={{ color: "#F5A623" }}
                      >
                        Esqueci minha senha
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full font-semibold text-white"
                      style={{ background: "#111111" }}
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
                      Entrar com conta Manus
                    </Button>
                  </form>
                  <div className="mt-4 pt-4 border-t border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      Recebeu um convite?{" "}
                      <a
                        href="/primeiro-acesso"
                        className="font-semibold hover:underline transition-colors"
                        style={{ color: "#F5A623" }}
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
