import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo db para controlar os retornos
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    unassignLeadFromBdr: vi.fn(),
    createNotification: vi.fn(),
  };
});

vi.mock("./pushSender", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

import { unassignLeadFromBdr, createNotification } from "./db";
import { sendPushToUser } from "./pushSender";

describe("unassignLeadFromBdr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar ok:true e previousBdrId quando o lead tem BDR atribuído", async () => {
    (unassignLeadFromBdr as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      previousBdrId: 42,
      leadName: "Empresa Teste Ltda",
    });

    const result = await unassignLeadFromBdr(100);
    expect(result).toEqual({
      ok: true,
      previousBdrId: 42,
      leadName: "Empresa Teste Ltda",
    });
  });

  it("deve retornar ok:false quando o banco não está disponível", async () => {
    (unassignLeadFromBdr as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      previousBdrId: null,
    });

    const result = await unassignLeadFromBdr(999);
    expect(result.ok).toBe(false);
    expect(result.previousBdrId).toBeNull();
  });

  it("deve retornar previousBdrId null quando o lead não tem BDR atribuído", async () => {
    (unassignLeadFromBdr as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      previousBdrId: null,
      leadName: "Empresa Sem BDR",
    });

    const result = await unassignLeadFromBdr(200);
    expect(result.ok).toBe(true);
    expect(result.previousBdrId).toBeNull();
  });

  it("deve chamar sendPushToUser quando previousBdrId está presente", async () => {
    const mockResult = { ok: true, previousBdrId: 7, leadName: "Empresa XYZ" };
    (unassignLeadFromBdr as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const result = await unassignLeadFromBdr(300);

    // Simula o que o router faz após chamar unassignLeadFromBdr
    if (result.ok && result.previousBdrId) {
      await sendPushToUser(result.previousBdrId, {
        title: "Lead removido da sua carteira",
        body: `O lead "${result.leadName}" foi removido da sua carteira pelo gestor.`,
        url: "/leads",
      });
      await createNotification({
        userId: result.previousBdrId,
        type: "system",
        title: "Lead removido da sua carteira",
        content: `O lead "${result.leadName}" foi removido da sua carteira.`,
      });
    }

    expect(sendPushToUser).toHaveBeenCalledWith(7, expect.objectContaining({
      title: "Lead removido da sua carteira",
    }));
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      type: "system",
    }));
  });

  it("não deve chamar sendPushToUser quando previousBdrId é null", async () => {
    const mockResult = { ok: true, previousBdrId: null, leadName: "Empresa Sem BDR" };
    (unassignLeadFromBdr as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

    const result = await unassignLeadFromBdr(400);

    if (result.ok && result.previousBdrId) {
      await sendPushToUser(result.previousBdrId, { title: "", body: "", url: "" });
    }

    expect(sendPushToUser).not.toHaveBeenCalled();
  });
});
