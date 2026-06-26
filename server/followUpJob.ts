/**
 * Follow-up notification job
 * Runs every minute to check for due follow-ups and send push notifications.
 */
import { getDb } from "./db";
import { createNotification } from "./db";
import { followUps, users } from "../drizzle/schema";
import { and, eq, lte, isNull } from "drizzle-orm";
import { sendPushToUser } from "./pushSender";

let jobInterval: ReturnType<typeof setInterval> | null = null;

export async function checkAndNotifyFollowUps() {
  try {
    const db = await getDb();
    if (!db) return;
    const now = new Date();

    // Find follow-ups that are due (scheduledAt <= now), not done, and not yet notified
    const dueFollowUps = await db
      .select({
        id: followUps.id,
        userId: followUps.userId,
        leadId: followUps.leadId,
        note: followUps.note,
        scheduledAt: followUps.scheduledAt,
      })
      .from(followUps)
      .where(
        and(
          eq(followUps.isDone, false),
          isNull(followUps.notifiedAt),
          lte(followUps.scheduledAt, now)
        )
      );

    for (const fu of dueFollowUps) {
      // Mark as notified first to avoid duplicate sends
      await db
        .update(followUps)
        .set({ notifiedAt: new Date() })
        .where(eq(followUps.id, fu.id));

      // Send push notification to the BDR
      const scheduledTime = new Date(fu.scheduledAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const pushBody = fu.note
        ? `${scheduledTime} — ${fu.note}`
        : `Você tem um retorno agendado para o lead #${fu.leadId} às ${scheduledTime}`;

      // Send push notification
      await sendPushToUser(fu.userId, {
        title: "⏰ Follow-up agendado!",
        body: pushBody,
        url: `/leads/${fu.leadId}`,
      });

      // Send in-app notification
      await createNotification({
        userId: fu.userId,
        title: "⏰ Follow-up agendado!",
        content: pushBody,
        type: "followup",
      });
    }

    if (dueFollowUps.length > 0) {
      console.log(`[FollowUpJob] Notified ${dueFollowUps.length} follow-up(s)`);
    }
  } catch (err) {
    console.error("[FollowUpJob] Error:", err);
  }
}

export function startFollowUpJob() {
  if (jobInterval) return;
  // Run immediately on start
  checkAndNotifyFollowUps();
  // Then every 60 seconds
  jobInterval = setInterval(checkAndNotifyFollowUps, 60_000);
  console.log("[FollowUpJob] Started — checking every 60s");
}

export function stopFollowUpJob() {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
  }
}
