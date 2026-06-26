import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Loader2, LogOut, Save, User } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  adm: "Administrador",
  admin: "Administrador",
  gerente: "Gerente",
  bdr: "BDR",
  user: "Usuário",
};

const ROLE_COLORS: Record<string, string> = {
  adm: "bg-purple-100 text-purple-800",
  admin: "bg-purple-100 text-purple-800",
  gerente: "bg-blue-100 text-blue-800",
  bdr: "bg-green-100 text-green-800",
  user: "bg-gray-100 text-gray-800",
};

export default function Profile() {
  const { user, logout } = useAuth();
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    lastName: (user as any)?.lastName ?? "",
    cargo: (user as any)?.cargo ?? "",
    email: user?.email ?? "",
    whatsapp: (user as any)?.whatsapp ?? "",
  });
  const [uploading, setUploading] = useState(false);

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const uploadPhoto = trpc.users.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto atualizada!");
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1] ?? "";
      await uploadPhoto.mutateAsync({ base64, mimeType: file.type });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync(form);
  };

  const initials = `${form.name?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "U";
  const roleKey = (user as any)?.role ?? "user";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Meu Perfil
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e preferências</p>
      </div>

      {/* Profile Card */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                <AvatarImage src={(user as any)?.photoUrl ?? ""} alt={form.name} />
                <AvatarFallback className="text-2xl font-bold" style={{ background: "oklch(0.22 0.08 240)", color: "white" }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
                style={{ background: "oklch(0.63 0.18 40)" }}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {form.name} {form.lastName}
                </h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ROLE_COLORS[roleKey] ?? "bg-gray-100 text-gray-800"}`}>
                  {ROLE_LABELS[roleKey] ?? roleKey}
                </span>
              </div>
              {form.cargo && (
                <p className="text-muted-foreground mt-1">{form.cargo}</p>
              )}
              <p className="text-muted-foreground text-sm mt-1">{form.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Atualize seus dados de contato e perfil profissional</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Seu sobrenome"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="Ex: BDR Sênior, Gerente Comercial..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail corporativo *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="seu@empresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="(81) 9.9999-9999"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateProfile.isPending}
                style={{ background: "oklch(0.22 0.08 240)" }}
              >
                {updateProfile.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="border-border border-destructive/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Sair da conta</h3>
              <p className="text-muted-foreground text-sm mt-1">Encerrar sua sessão atual na plataforma</p>
            </div>
            <Button
              variant="destructive"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
