import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import LeadsList from "./pages/LeadsList";
import LeadsPriority from "./pages/LeadsPriority";
import LeadsRelease from "./pages/LeadsRelease";
import LeadsAssign from "./pages/LeadsAssign";
import ImportLeads from "./pages/ImportLeads";
import LeadDetail from "./pages/LeadDetail";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Users from "./pages/Users";
import Goals from "./pages/Goals";
import Commissions from "./pages/Commissions";
import Ranking from "./pages/Ranking";
import Reports from "./pages/Reports";
import SAC from "./pages/SAC";
import Settings from "./pages/Settings";
import FirstAccess from "./pages/FirstAccess";
import WorkMode from "./pages/WorkMode";
import Pipeline from "./pages/Pipeline";
import FollowUps from "./pages/FollowUps";
import Comparativos from "./pages/Comparativos";
import QualificationFieldsConfig from "./pages/QualificationFieldsConfig";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/primeiro-acesso" component={FirstAccess} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      {/* Rotas específicas ANTES de /leads/:id para evitar conflito de parâmetro */}
      <Route path="/leads/priority" component={() => <ProtectedRoute component={LeadsPriority} />} />
      <Route path="/leads/release" component={() => <ProtectedRoute component={LeadsRelease} />} />
      <Route path="/leads/assign" component={() => <ProtectedRoute component={LeadsAssign} />} />
      <Route path="/leads/importar" component={() => <ProtectedRoute component={ImportLeads} />} />
      <Route path="/leads/:id" component={() => <ProtectedRoute component={LeadDetail} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={LeadsList} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} />} />
      <Route path="/goals" component={() => <ProtectedRoute component={Goals} />} />
      <Route path="/commissions" component={() => <ProtectedRoute component={Commissions} />} />
      <Route path="/ranking" component={() => <ProtectedRoute component={Ranking} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/sac" component={() => <ProtectedRoute component={SAC} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/settings/qualification-fields" component={() => <ProtectedRoute component={QualificationFieldsConfig} />} />
      <Route path="/work-mode" component={() => <ProtectedRoute component={WorkMode} />} />
      <Route path="/pipeline" component={() => <ProtectedRoute component={Pipeline} />} />
      <Route path="/comparativos" component={() => <ProtectedRoute component={Comparativos} />} />
      <Route path="/follow-ups" component={() => <ProtectedRoute component={FollowUps} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
