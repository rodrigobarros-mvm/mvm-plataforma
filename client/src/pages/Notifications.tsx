import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CheckCheck,
  Info,
  AlertTriangle,
  Trophy,
  Star,
  CheckCircle2,
  Target,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";

// Mapeamento de tipo → ícone
const NOTIF_ICONS: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: Trophy,
  alert: AlertTriangle,
  lead_qualificado: CheckCircle2,
  meta_atingida: Target,
  bdr_meta_atingida: Star,
};

// Mapeamento de tipo → cor
const NOTIF_COLORS: Record<string, string> = {
  info: "text-blue-600",
  warning: "text-yellow-600",
  success: "text-green-600",
  alert: "text-red-600",
  lead_qualificado: "text-green-600",
  meta_atingida: "text-orange-500",
  bdr_meta_atingida: "text-orange-500",
};

const NOTIF_BG: Record<string, string> = {
  info: "#eff6ff",
  warning: "#fefce8",
  success: "#f0fdf4",
  alert: "#fef2f2",
  lead_qualificado: "#f0fdf4",
  meta_atingida: "#fff7ed",
  bdr_meta_atingida: "#fff7ed",
};

// Tipos que têm link para lead
const LEAD_NOTIF_TYPES = ["lead_qualificado"];

export default function Notifications() {
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({});

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      toast.success("Todas as notificações marcadas como lidas");
    },
  });

  const unread = (notifications ?? []).filter(n => !n.isRead).length;

  function handleNotifClick(notif: {
    id: number;
    type: string;
    isRead: boolean;
    relatedLeadId?: number | null;
  }) {
    // Marcar como lida
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id });
    }
    // Navegar para o lead se for notificação de lead qualificado
    if (LEAD_NOTIF_TYPES.includes(notif.type) && notif.relatedLeadId) {
      setLocation(`/leads/${notif.relatedLeadId}`);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-foreground"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Todas lidas"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (notifications ?? []).length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma notificação</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(notifications ?? []).map((notif) => {
            const type = notif.type ?? "info";
            const Icon = NOTIF_ICONS[type] ?? Info;
            const colorClass = NOTIF_COLORS[type] ?? "text-blue-600";
            const bgColor = NOTIF_BG[type] ?? "#eff6ff";
            const isLeadNotif = LEAD_NOTIF_TYPES.includes(type) && !!notif.relatedLeadId;

            return (
              <Card
                key={notif.id}
                className={`border-border transition-all ${
                  !notif.isRead ? "bg-blue-50/50 border-blue-100" : ""
                } ${isLeadNotif ? "cursor-pointer hover:shadow-md hover:border-green-200" : "cursor-pointer"}`}
                onClick={() => handleNotifClick(notif)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: bgColor }}
                    >
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            !notif.isRead ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!notif.isRead && (
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: "#e8621a" }}
                            />
                          )}
                        </div>
                      </div>

                      {notif.content && (
                        <p className="text-xs text-muted-foreground mt-1">{notif.content}</p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notif.createdAt), "dd 'de' MMM 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>

                        {/* Badge + seta para notificações de lead qualificado */}
                        {isLeadNotif && (
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-xs py-0 h-5 border-green-300 text-green-700 bg-green-50"
                            >
                              <ExternalLink className="w-2.5 h-2.5 mr-1" />
                              Ver cadastro completo
                            </Badge>
                            <ChevronRight className="w-3.5 h-3.5 text-green-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
