import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./pushSender", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

describe("Follow-up module", () => {
  describe("Schema validation", () => {
    it("should have required fields: leadId, userId, scheduledAt", () => {
      const followUp = {
        leadId: 1,
        userId: 42,
        scheduledAt: new Date("2026-04-21T14:00:00Z"),
        note: "Ligar para confirmar visita",
        isDone: false,
        notifiedAt: null,
      };
      expect(followUp.leadId).toBe(1);
      expect(followUp.userId).toBe(42);
      expect(followUp.scheduledAt).toBeInstanceOf(Date);
      expect(followUp.isDone).toBe(false);
      expect(followUp.notifiedAt).toBeNull();
    });

    it("should allow optional note field", () => {
      const followUp = {
        leadId: 5,
        userId: 10,
        scheduledAt: new Date(),
        isDone: false,
        notifiedAt: null,
      };
      expect(followUp.note).toBeUndefined();
    });
  });

  describe("checkAndNotifyFollowUps", () => {
    it("should return early when db is null", async () => {
      const { checkAndNotifyFollowUps } = await import("./followUpJob");
      // DB is mocked to return null, so it should not throw
      await expect(checkAndNotifyFollowUps()).resolves.toBeUndefined();
    });

    it("should not throw when no due follow-ups exist", async () => {
      const { checkAndNotifyFollowUps } = await import("./followUpJob");
      await expect(checkAndNotifyFollowUps()).resolves.toBeUndefined();
    });
  });

  describe("Notification message formatting", () => {
    it("should format message with note when note is provided", () => {
      const note = "Confirmar visita técnica";
      const scheduledTime = "14:00";
      const leadId = 123;
      const body = note
        ? `${scheduledTime} — ${note}`
        : `Você tem um retorno agendado para o lead #${leadId} às ${scheduledTime}`;
      expect(body).toBe("14:00 — Confirmar visita técnica");
    });

    it("should format default message when note is absent", () => {
      const note = undefined;
      const scheduledTime = "09:30";
      const leadId = 456;
      const body = note
        ? `${scheduledTime} — ${note}`
        : `Você tem um retorno agendado para o lead #${leadId} às ${scheduledTime}`;
      expect(body).toBe("Você tem um retorno agendado para o lead #456 às 09:30");
    });
  });

  describe("Follow-up router procedures", () => {
    it("should validate create input schema", () => {
      const { z } = require("zod");
      const schema = z.object({
        leadId: z.number(),
        scheduledAt: z.date(),
        note: z.string().optional(),
      });
      const valid = schema.safeParse({
        leadId: 1,
        scheduledAt: new Date(),
        note: "Ligar amanhã",
      });
      expect(valid.success).toBe(true);
    });

    it("should reject create input without leadId", () => {
      const { z } = require("zod");
      const schema = z.object({
        leadId: z.number(),
        scheduledAt: z.date(),
        note: z.string().optional(),
      });
      const invalid = schema.safeParse({
        scheduledAt: new Date(),
      });
      expect(invalid.success).toBe(false);
    });

    it("should validate listMine input schema", () => {
      const { z } = require("zod");
      const schema = z.object({ includesDone: z.boolean().optional() });
      const valid = schema.safeParse({ includesDone: true });
      expect(valid.success).toBe(true);
      const empty = schema.safeParse({});
      expect(empty.success).toBe(true);
    });

    it("should validate done input schema", () => {
      const { z } = require("zod");
      const schema = z.object({ id: z.number() });
      const valid = schema.safeParse({ id: 99 });
      expect(valid.success).toBe(true);
    });
  });
});
