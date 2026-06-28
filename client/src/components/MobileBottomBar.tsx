import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { QuickReleaseDrawer } from "@/components/QuickReleaseDrawer";
import {
  Award, Bell, BellOff, Calendar,
  LayoutDashboard, Lock, MapPin,
  Plus, Star, TrendingUp, UserCheck, Zap,
} from "lucide-react";
import { toast } from "sonner";

const GERENTE_ROLES = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"];

// ─── GESTOR: 4 ações + Alertas (sem Liberar — vira FAB ou menu) ──────────────
const MANAGER_ACTIONS = [
  { label: "Dashboard",  icon: LayoutDashboard, path: "/dashboard" },
  { label: "Liberar",    icon: Lock,            path: "/leads/release" },
  { label: "Atribuir",   icon: UserCheck,       path: "/leads/assign" },
  { label: "Ranking",    icon: Award,           path: "/ranking" },
];

// ─── BDR: 4 ações + Alertas ───────────────────────────────────────────────────
const BDR_ACTIONS = [
  { label: "Início",     icon: LayoutDashboard, path: "/dashboard" },
  { label: "Fila",       icon: Zap,             path: "/work-mode" },
  { label: "Follow-ups", icon: Bell,            path: "/follow-ups" },
  { label: "Ranking",    icon: Award,           path: "/ranking" },
];

// ─── CONSULTOR: 4 ações + Alertas ─────────────────────────────────────────────
const CONSULTOR_ACTIONS = [
  { label: "Agenda",     icon: Calendar,        path: "/agenda-consultor" },
  { label: "Nova Oport", icon: Plus,            path: "/nova-oportunidade" },
  { label: "Pipeline",   icon: TrendingUp,      path: "/oportunidades" },
  { label: "Ranking",    icon: Award,           path: "/ranking-consultores" },
];

export function MobileBottomBar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [quickReleaseOpen, setQuickReleaseOpen] = useState(false);

  if (!user) return null;

  const role = (user as any)?.role ?? "bdr";
  const isManager = GERENTE_ROLES.includes(role);
  const isAdm = role === "adm" || role === "admin";
  const isConsultor = role === "consultor";

  // 4 ações por role + 1 Alertas = sempre 5 botões. Limpo e consistente.
  const actions = isManager ? MANAGER_ACTIONS : isConsultor ? CONSULTOR_ACTIONS : BDR_ACTIONS;

  const handlePushToggle = async () => {
    if (permission === "unsupported") {
      toast.error("Seu navegador não suporta notificações push.");
      return;
    }
    if (permission === "denied") {
      toast.error("Notificações bloqueadas. Habilite nas configurações do navegador.");
      return;
    }
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Notificações push desativadas.");
    } else {
      await subscribe();
      if (permission === "granted" || Notification.permission === "granted") {
        toast.success("Alertas ativados! Você será notificado em tempo real.");
      }
    }
  };

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 px-1">

          {/* 4 ações do role atual */}
          {actions.map((action) => {
            const isActive =
              location === action.path || location.startsWith(action.path + "/");
            return (
              <button
                key={action.path}
                onClick={() => setLocation(action.path)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors ${
                  isActive
                    ? "text-red-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <action.icon
                  className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`}
                />
                <span className="text-[10px] font-medium leading-tight">
                  {action.label}
                </span>
              </button>
            );
          })}

          {/* 5º botão: Alertas push — sempre presente */}
          <button
            onClick={handlePushToggle}
            disabled={isLoading || permission === "unsupported"}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full rounded-lg transition-colors disabled:opacity-40 ${
              isSubscribed
                ? "text-red-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isSubscribed ? "Desativar alertas push" : "Ativar alertas push"}
          >
            {isSubscribed ? (
              <Bell className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium leading-tight">
              {isLoading ? "..." : isSubscribed ? "Alertas ✓" : "Alertas"}
            </span>
          </button>

        </div>
      </div>

      {/* Quick Release Drawer — ADM acessa pelo menu lateral ou FAB */}
      {isAdm && (
        <QuickReleaseDrawer
          open={quickReleaseOpen}
          onClose={() => setQuickReleaseOpen(false)}
        />
      )}
    </>
  );
}
