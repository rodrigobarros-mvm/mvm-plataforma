import { describe, it, expect } from "vitest";

describe("VAPID Configuration", () => {
  it("deve ter VAPID_PUBLIC_KEY configurada no ambiente", () => {
    const key = process.env.VAPID_PUBLIC_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("deve ter VAPID_PRIVATE_KEY configurada no ambiente", () => {
    const key = process.env.VAPID_PRIVATE_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("deve ter VITE_VAPID_PUBLIC_KEY configurada no ambiente", () => {
    const key = process.env.VITE_VAPID_PUBLIC_KEY;
    expect(key).toBeDefined();
    expect(key!.length).toBeGreaterThan(10);
  });

  it("VAPID_PUBLIC_KEY e VITE_VAPID_PUBLIC_KEY devem ser iguais", () => {
    expect(process.env.VAPID_PUBLIC_KEY).toBe(process.env.VITE_VAPID_PUBLIC_KEY);
  });

  it("deve importar web-push sem erros", async () => {
    const webpush = await import("web-push");
    expect(webpush).toBeDefined();
    expect(typeof webpush.default.sendNotification).toBe("function");
  });
});
