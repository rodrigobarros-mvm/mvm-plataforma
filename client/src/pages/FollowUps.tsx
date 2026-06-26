import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Bell, CalendarClock, CheckCircle2, Clock, ExternalLink, Trash2
} from "lucide-react";

export default function FollowUps() {
  const [, setLocation] = useLocation();
  const [showDone, setShowDone] = useState(false);

  const { data: followUps, isLoading, refetch } = trpc.followUp.listMine.useQuery({ includesDone: showDone });

  const doneFollowUp = trpc.followUp.done.useMutation({
    onSuccess: () => { toast.success("Follow-up concluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const cancelFollowUp = trpc.followUp.cancel.useMutation({
    onSuccess: () => { toast.success("Follow-up cancelado."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const now = new Date();

  const pending = (followUps ?? []).filter(fu => !fu.isDone && new Date(fu.scheduledAt) > now);
  const overdue = (followUps ?? []).filter(fu => !fu.isDone && new Date(fu.scheduledAt) <= now);
  const done = (followUps ?? []).filter(fu => fu.isDone);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Meus Follow-ups
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Retornos agendados para seus leads
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDone(!showDone)}
          className="gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          {showDone ? "Ocultar concluídos" : "Ver concluídos"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-xs text-red-600 font-medium mt-1">Atrasados</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: "#e21d3c" }}>{pending.length}</p>
            <p className="text-xs font-medium mt-1" style={{ color: "#e21d3c" }}>Agendados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{done.length}</p>
            <p className="text-xs text-green-600 font-medium mt-1">Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Atrasados ({overdue.length})
              </h2>
              {overdue.map(fu => (
                <FollowUpCard
                  key={fu.id}
                  fu={fu}
                  isOverdue
                  onDone={() => doneFollowUp.mutate({ id: fu.id })}
                  onCancel={() => cancelFollowUp.mutate({ id: fu.id })}
                  onNavigate={() => setLocation(`/leads/${fu.leadId}`)}
                />
              ))}
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#e21d3c" }}>
                <CalendarClock className="w-4 h-4" />
                Agendados ({pending.length})
              </h2>
              {pending.map(fu => (
                <FollowUpCard
                  key={fu.id}
                  fu={fu}
                  isOverdue={false}
                  onDone={() => doneFollowUp.mutate({ id: fu.id })}
                  onCancel={() => cancelFollowUp.mutate({ id: fu.id })}
                  onNavigate={() => setLocation(`/leads/${fu.leadId}`)}
                />
              ))}
            </div>
          )}

          {/* Done */}
          {showDone && done.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-green-600 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Concluídos ({done.length})
              </h2>
              {done.map(fu => (
                <FollowUpCard
                  key={fu.id}
                  fu={fu}
                  isOverdue={false}
                  isDone
                  onDone={() => {}}
                  onCancel={() => {}}
                  onNavigate={() => setLocation(`/leads/${fu.leadId}`)}
                />
              ))}
            </div>
          )}

          {(followUps ?? []).length === 0 && (
            <div className="text-center py-16">
              <CalendarClock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum follow-up agendado.</p>
              <p className="text-muted-foreground text-sm mt-1">
                Abra um lead e clique em "Agendar" para criar um retorno.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FollowUpCard({
  fu, isOverdue, isDone, onDone, onCancel, onNavigate
}: {
  fu: any;
  isOverdue: boolean;
  isDone?: boolean;
  onDone: () => void;
  onCancel: () => void;
  onNavigate: () => void;
}) {
  const scheduledDate = new Date(fu.scheduledAt);
  const isToday = scheduledDate.toDateString() === new Date().toDateString();

  return (
    <Card className={`border transition-colors ${
      isDone
        ? "opacity-60 bg-muted/20"
        : isOverdue
          ? "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
          : "border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
            isDone ? "bg-green-100" : isOverdue ? "bg-red-100" : "bg-red-100"
          }`}>
            {isDone
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : isOverdue
                ? <Bell className="w-4 h-4 text-red-600" />
                : <Clock className="w-4 h-4" style={{ color: "#e21d3c" }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={onNavigate}
                className="text-sm font-semibold text-foreground hover:underline truncate flex items-center gap-1"
              >
                {fu.leadName || fu.leadRazao || `Lead #${fu.leadId}`}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
              {fu.leadCidade && (
                <span className="text-xs text-muted-foreground">{fu.leadCidade}, {fu.leadUf}</span>
              )}
              {isToday && !isDone && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Hoje</Badge>
              )}
              {isOverdue && (
                <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Atrasado</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scheduledDate.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
            </p>
            {fu.note && (
              <p className="text-xs text-foreground mt-1 line-clamp-2">{fu.note}</p>
            )}
          </div>
          {!isDone && (
            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onDone}
                title="Marcar como concluído"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onCancel}
                title="Cancelar follow-up"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
