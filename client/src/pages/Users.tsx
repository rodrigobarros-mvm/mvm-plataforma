import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, Copy, ExternalLink, Loader2, Mail, Plus, Shield, Trash2, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const ROLE_LABELS: Record<string, string> = {
  adm: "Administrador", admin: "Administrador",
  gerente: "Gerente", diretor: "Diretor",
  coordenador: "Coordenador", supervisor: "Supervisor",
  bdr: "BDR", user: "Usuário",
};
const ROLE_COLORS: Record<string, string> = {
  adm: "bg-purple-100 text-purple-700", admin: "bg-purple-100 text-purple-700",
  gerente: "bg-blue-100 text-blue-700", diretor: "bg-blue-100 text-blue-700",
  coordenador: "bg-cyan-100 text-cyan-700", supervisor: "bg-indigo-100 text-indigo-700",
  bdr: "bg-green-100 text-green-700", user: "bg-gray-100 text-gray-700",
};

export default function Users() {
  const { user } = useAuth();
  const role = (user as any)?.role ?? "user";
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  if (role !== "adm" && role !== "admin") {
    return (
      <div className="text-center py-16">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  const { data: users, isLoading } = trpc.users.list.useQuery();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"gerente" | "diretor" | "coordenador" | "supervisor" | "bdr">("bdr");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [blockUserId, setBlockUserId] = useState<number | null>(null);

  const inviteUser = trpc.users.invite.useMutation({
    onSuccess: (data) => {
      utils.users.list.invalidate();
      setInviteLink(data.inviteUrl);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("Usuário removido");
      utils.users.list.invalidate();
      setDeleteUserId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleBlock = trpc.users.toggleBlock.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado");
      utils.users.list.invalidate();
      setBlockUserId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Nível de acesso atualizado");
      utils.users.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCloseInvite = () => {
    setShowInvite(false);
    setInviteLink(null);
    setInviteEmail("");
    setInviteRole("bdr");
  };

  const handleCopyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Gestão de Usuários
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie acessos e permissões da equipe</p>
        </div>
        <Button onClick={() => setShowInvite(true)} style={{ background: "oklch(0.22 0.08 240)" }}>
          <Plus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários Ativos ({(users ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : (users ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum usuário cadastrado</p>
          ) : (
            <div className="space-y-2">
              {(users ?? []).map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={u.photoUrl ?? ""} />
                    <AvatarFallback className="text-sm font-bold" style={{ background: "oklch(0.22 0.08 240)", color: "white" }}>
                      {u.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{u.name} {u.lastName ?? ""}</p>
                      <Badge className={`text-xs ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`} variant="outline">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </Badge>
                      {u.isBlocked && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <Select
                    value={u.role ?? "bdr"}
                    onValueChange={(v) => updateRole.mutate({ id: u.id, role: v as any })}
                    disabled={u.id === user?.id}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adm">Administrador</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="diretor">Diretor</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="bdr">BDR</SelectItem>
                <SelectItem value="consultor">Consultor Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setBlockUserId(u.id)}
                      disabled={u.id === user?.id}
                      title={u.isBlocked ? "Desbloquear" : "Bloquear"}
                    >
                      <UserX className="w-4 h-4 text-red-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setDeleteUserId(u.id)}
                      disabled={u.id === user?.id}
                      title="Excluir usuário"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={handleCloseInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              {inviteLink
                ? "Convite gerado com sucesso! Copie o link abaixo e envie para o usuário."
                : "Informe o e-mail e o nível de acesso do novo usuário."}
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            /* ── Tela de sucesso com link ── */
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-700 font-medium">Convite criado para <strong>{inviteEmail}</strong></p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link de Primeiro Acesso</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteLink}
                    className="text-xs font-mono bg-muted"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleCopyLink}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Este link expira em <strong>7 dias</strong>. Envie por e-mail, WhatsApp ou outro canal de sua preferência.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(inviteLink, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Link
                </Button>
              </div>
            </div>
          ) : (
            /* ── Formulário de convite ── */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="usuario@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nível de acesso</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="coordenador">Coordenador</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="bdr">BDR</SelectItem>
                <SelectItem value="consultor">Consultor Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseInvite}>
              {inviteLink ? "Fechar" : "Cancelar"}
            </Button>
            {!inviteLink && (
              <Button
                onClick={() => inviteUser.mutate({ email: inviteEmail, role: inviteRole, origin: window.location.origin })}
                disabled={!inviteEmail || inviteUser.isPending}
                style={{ background: "oklch(0.22 0.08 240)" }}
              >
                {inviteUser.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {inviteUser.isPending ? "Gerando..." : "Gerar Convite"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário perderá acesso à plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteUserId && deleteUser.mutate({ id: deleteUserId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirm */}
      <AlertDialog open={!!blockUserId} onOpenChange={() => setBlockUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear/Desbloquear usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário terá seu acesso alterado imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => blockUserId && toggleBlock.mutate({ id: blockUserId, isBlocked: !(users ?? []).find((u: any) => u.id === blockUserId)?.isBlocked })}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
