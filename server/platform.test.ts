import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(role: "adm" | "gerente" | "bdr" | "user" = "bdr"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@mvm.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: { protocol: "https", headers: {} } as any,
    res: { clearCookie: () => {} } as any,
  };
}

describe("auth", () => {
  it("me returns user when authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@mvm.com");
  });

  it("logout clears cookie and returns success", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...makeCtx("bdr"),
      res: { clearCookie: (name: string) => cleared.push(name) } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

describe("role-based access", () => {
  it("adm can access kpi.get", async () => {
    const caller = appRouter.createCaller(makeCtx("adm"));
    // Should not throw FORBIDDEN
    await expect(caller.kpi.get()).resolves.toBeDefined();
  });

  it("bdr can access kpi.get", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    await expect(caller.kpi.get()).resolves.toBeDefined();
  });

  it("bdr cannot access dashboard.stats (adm/gerente only)", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    await expect(caller.dashboard.stats({ period: "all" })).rejects.toThrow();
  });

  it("gerente can access dashboard.stats", async () => {
    const caller = appRouter.createCaller(makeCtx("gerente"));
    await expect(caller.dashboard.stats({ period: "all" })).resolves.toBeDefined();
  });

  it("bdr cannot update kpi settings", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    await expect(
      caller.kpi.update({ dailyContactAttempts: 100, dailyQualifiedLeads: 10 })
    ).rejects.toThrow();
  });

  it("adm can update kpi settings", async () => {
    const caller = appRouter.createCaller(makeCtx("adm"));
    await expect(
      caller.kpi.update({ dailyContactAttempts: 80, dailyQualifiedLeads: 5 })
    ).resolves.toMatchObject({ success: true });
  });
});

describe("leads", () => {
  it("can list leads with pagination", async () => {
    const caller = appRouter.createCaller(makeCtx("adm"));
    const result = await caller.leads.list({ page: 1, limit: 10 });
    expect(result).toBeDefined();
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("can list priority leads", async () => {
    const caller = appRouter.createCaller(makeCtx("adm"));
    const result = await caller.leads.list({ page: 1, limit: 5, isHighPriority: true });
    expect(result).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });
});

describe("notifications", () => {
  it("can list notifications", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    const result = await caller.notifications.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("can get unread count", async () => {
    const caller = appRouter.createCaller(makeCtx("bdr"));
    const count = await caller.notifications.unreadCount();
    expect(typeof count).toBe("number");
  });
});
