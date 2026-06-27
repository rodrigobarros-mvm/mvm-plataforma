import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

export function useSmartNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !("Notification" in window) || Notification.permission !== "granted") return;

    const role = (user as any)?.role ?? "bdr";
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Only schedule if between 7am and 6pm
    if (h < 7 || h >= 18) return;

    // Morning reminder at 8:30 — only if we haven't shown it today
    const morningKey = `notif_morning_${now.toDateString()}`;
    const eveningKey = `notif_evening_${now.toDateString()}`;

    const scheduleMorning = () => {
      const target = new Date();
      target.setHours(8, 30, 0, 0);
      const delay = target.getTime() - now.getTime();
      if (delay > 0 && !localStorage.getItem(morningKey)) {
        setTimeout(() => {
          localStorage.setItem(morningKey, "1");
          if (role === "consultor") {
            new Notification("Gallotti LS — Bom dia! 🚜", {
              body: "Confira sua agenda de hoje antes de sair.",
              icon: "/logo.png",
              tag: "morning",
            });
          } else if (role === "bdr") {
            new Notification("Gallotti LS — Bom dia! 💪", {
              body: "Sua fila de prospecção está pronta. Bora qualificar!",
              icon: "/logo.png",
              tag: "morning",
            });
          } else {
            new Notification("Gallotti LS — Bom dia! 📊", {
              body: "Painel atualizado. Verifique o status da equipe.",
              icon: "/logo.png",
              tag: "morning",
            });
          }
        }, delay);
      }
    };

    const scheduleEvening = () => {
      const target = new Date();
      target.setHours(17, 0, 0, 0);
      const delay = target.getTime() - now.getTime();
      if (delay > 0 && !localStorage.getItem(eveningKey)) {
        setTimeout(() => {
          localStorage.setItem(eveningKey, "1");
          new Notification("Gallotti LS — Boa tarde! ⏰", {
            body: role === "consultor"
              ? "Tem follow-ups pendentes para hoje? Não deixe passar!"
              : "Confira seus follow-ups antes do fim do dia.",
            icon: "/logo.png",
            tag: "evening",
          });
        }, delay);
      }
    };

    scheduleMorning();
    scheduleEvening();
  }, [user]);
}
