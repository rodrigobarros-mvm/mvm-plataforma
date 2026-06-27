import { useAuth } from "@/_core/hooks/useAuth";
import TeamProgressBar from "@/components/TeamProgressBar";
import { MobileBottomBar } from "@/components/MobileBottomBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Award,
  BarChart3,
  Bell,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  DollarSign,
  Tractor,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MessageCircle,
  Moon,
  PanelLeft,
  Settings,
  Star,
  Sun,
  Target,
  TrendingUp,
  Unlock,
  User,
  UserCheck,
  Users,
  FileUp,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 380;

const ROLE_LABELS: Record<string, string> = {
  adm: "Administrador",
  admin: "Administrador",
  gerente: "Gerente",
  bdr: "BDR",
  user: "Usuário",
};

const ROLE_COLORS: Record<string, string> = {
  adm: "bg-purple-500/20 text-purple-300",
  admin: "bg-purple-500/20 text-purple-300",
  gerente: "bg-blue-500/20 text-blue-300",
  bdr: "bg-green-500/20 text-green-300",
  user: "bg-gray-500/20 text-gray-300",
};

type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  roles?: string[];
  badge?: number;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

function getMenuGroups(role: string): MenuGroup[] {
  const isAdm = role === "adm" || role === "admin";
  const isGerente = role === "gerente";
  const isBdr = role === "bdr";

  const groups: MenuGroup[] = [
    {
      label: "Principal",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        { icon: Bell, label: "Notificações", path: "/notifications" },
      ],
    },
    {
      label: "Leads",
      items: [
        { icon: Star, label: "Alta Prioridade", path: "/leads/priority" },
        { icon: ListFilter, label: "Lista Completa", path: "/leads" },
        { icon: CalendarClock, label: "Follow-ups", path: "/follow-ups" },
      { icon: BarChart3, label: "Comparativos", path: "/comparativos" },
      ],
    },
  ];

  if (isAdm || isGerente) {
    groups.push({
      label: "Comercial",
      items: [
        { icon: TrendingUp, label: "Oportunidades", path: "/oportunidades" },
        { icon: Package, label: "Catálogo / Máquinas", path: "/maquinas" },
        { icon: Package, label: "Estoque & Chassis", path: "/estoque" },
      ],
    },
    {
    label: "Gestão",
      items: [
        { icon: BarChart3, label: "Relatórios", path: "/reports" },
        { icon: TrendingUp, label: "Funil de Pipeline", path: "/pipeline" },
        { icon: Target, label: "Metas & KPIs", path: "/goals" },
        { icon: DollarSign, label: "Comissões", path: "/commissions" },
        { icon: Award, label: "Ranking BDRs", path: "/ranking" },
      ],
    });
  }

  if (isBdr) {
    groups.push({
      label: "Prospecção",
      items: [
        { icon: Zap, label: "Iniciar Prospecção", path: "/work-mode" },
      ],
    });
    groups.push({
      label: "Minha Performance",
      items: [
        { icon: Award, label: "Meu Ranking", path: "/ranking" },
        { icon: DollarSign, label: "Minhas Comissões", path: "/commissions" },
        { icon: Target, label: "Minhas Metas", path: "/goals" },
      ],
    });
  }

  if (isAdm) {
    groups.push({
      label: "Administração",
      items: [
        { icon: Users, label: "Usuários", path: "/users" },
        { icon: Unlock, label: "Liberar Leads", path: "/leads/release" },
        { icon: UserCheck, label: "Atribuir a BDRs", path: "/leads/assign" },
        { icon: FileUp, label: "Importar Planilha", path: "/leads/importar" },
        { icon: Settings, label: "Configurações", path: "/settings" },
      ],
    });
  } else if (isGerente) {
    groups.push({
      label: "Administração",
      items: [
        { icon: UserCheck, label: "Atribuir a BDRs", path: "/leads/assign" },
      ],
    });
  }

  groups.push({
    label: "Suporte",
    items: [
      { icon: MessageCircle, label: "SAC / Suporte", path: "/sac" },
    ],
  });

  return groups;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.24 0.09 248)" }}>
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Acesso Restrito
            </h1>
            <p className="text-muted-foreground">
              Faça login para acessar a plataforma Gallotti Tractor | LS Tractor.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full"
            style={{ background: "#0a1e5a" }}
          >
            Entrar na Plataforma
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const role = (user as any)?.role ?? "bdr";
  const menuGroups = getMenuGroups(role);
  const { theme, toggleTheme } = useTheme();

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const initials = `${user?.name?.[0] ?? ""}${(user as any)?.lastName?.[0] ?? ""}`.toUpperCase() || "U";

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors focus:outline-none shrink-0"
                style={{ background: "rgba(226,29,60,0.15)" }}
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4" style={{ color: "#e21d3c" }} />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 flex items-center shrink-0">
                    
                  </div>
                  <div className="min-w-0">
                    <div className="text-sidebar-foreground font-bold text-sm leading-tight truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Gallotti Tractor | LS Tractor
                    </div>
                    <div className="text-sidebar-foreground/50 text-xs truncate">Prospecção Ativa</div>
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Content — usando div nativo para evitar sobreposição de labels no mobile */}
          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {menuGroups.map((group, groupIdx) => (
              <div key={group.label} className={`${groupIdx > 0 ? "mt-1 pt-2 border-t border-sidebar-border/30" : ""}`}>
                {!isCollapsed && (
                  <div className="px-3 pt-1 pb-0.5">
                    <span className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest font-semibold select-none">
                      {group.label}
                    </span>
                  </div>
                )}
                <div className="px-2 pb-1">
                  {group.items.map((item) => {
                    const isActive = location === item.path || location.startsWith(item.path + "/");
                    const isNotif = item.path === "/notifications";
                    return (
                      <button
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors text-left mb-0.5 ${
                          isActive
                            ? "text-sidebar-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}
                        style={isActive ? { background: "oklch(0.22 0.08 248)", color: "oklch(0.52 0.22 27)" } : {}}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
                        {isNotif && unreadCount && unreadCount > 0 && !isCollapsed && (
                          <span className="text-xs rounded-full px-1.5 py-0.5 font-medium" style={{ background: "oklch(0.52 0.22 27)", color: "white" }}>
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={(user as any)?.photoUrl ?? ""} />
                    <AvatarFallback className="text-xs font-bold" style={{ background: "oklch(0.52 0.22 27)", color: "white" }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
                        {user?.name} {(user as any)?.lastName ?? ""}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 truncate mt-1">
                        {ROLE_LABELS[role] ?? role}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && <ChevronDown className="h-3 w-3 text-sidebar-foreground/40 shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as any)?.photoUrl ?? ""} />
                      <AvatarFallback className="text-xs font-bold" style={{ background: "oklch(0.52 0.22 27)", color: "white" }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{user?.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLORS[role] ?? ""}`}>
                        {ROLE_LABELS[role] ?? role}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                {toggleTheme && (
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setLocation("/notifications")} className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  Notificações
                  {unreadCount && unreadCount > 0 && (
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.63 0.18 40)", color: "white" }}>
                      {unreadCount}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Mobile header */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="h-7 flex items-center shrink-0">
                  
                </div>
                <span className="font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Gallotti Tractor | LS Tractor</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <Moon className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              )}
              <button onClick={() => setLocation("/notifications")} className="relative p-2">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center" style={{ background: "oklch(0.63 0.18 40)", color: "white" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
        <TeamProgressBar />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        <MobileBottomBar />
      </SidebarInset>
    </>
  );
}
