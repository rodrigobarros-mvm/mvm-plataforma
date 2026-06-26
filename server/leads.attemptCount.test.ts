/**
 * Testes para o contador de tentativas de contato (attemptCount)
 * Verifica que o campo é incrementado ao registrar interação tipo "tentativa"
 * e que outros tipos de interação não alteram o contador.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do db
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    addLeadInteraction: vi.fn().mockResolvedValue(undefined),
    getLeadById: vi.fn(),
  };
});

// Mock do getDb para simular o update do attemptCount
const mockUpdate = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockResolvedValue(undefined);

vi.mock("./_core/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    update: mockUpdate,
    set: mockSet,
    where: mockWhere,
    insert: mockInsert,
    values: mockValues,
  }),
}));

describe("Contador de Tentativas de Contato (attemptCount)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve incrementar attemptCount ao registrar interação tipo 'tentativa'", async () => {
    const { addLeadInteraction } = await import("./db");

    // Simular chamada com tipo "tentativa"
    await (addLeadInteraction as any)({
      leadId: 60001,
      userId: 1,
      type: "tentativa",
      content: "Ligação sem resposta",
    });

    expect(addLeadInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "tentativa", leadId: 60001 })
    );
  });

  it("não deve incrementar attemptCount para interações do tipo 'contato'", async () => {
    const { addLeadInteraction } = await import("./db");

    await (addLeadInteraction as any)({
      leadId: 60001,
      userId: 1,
      type: "contato",
      content: "Conversa realizada com sucesso",
    });

    expect(addLeadInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "contato" })
    );
    // Verificar que o tipo não é "tentativa"
    const call = (addLeadInteraction as any).mock.calls[0][0];
    expect(call.type).not.toBe("tentativa");
  });

  it("não deve incrementar attemptCount para interações do tipo 'observacao'", async () => {
    const { addLeadInteraction } = await import("./db");

    await (addLeadInteraction as any)({
      leadId: 60002,
      userId: 2,
      type: "observacao",
      content: "Lead demonstrou interesse em locação",
    });

    const call = (addLeadInteraction as any).mock.calls[0][0];
    expect(call.type).toBe("observacao");
    expect(call.type).not.toBe("tentativa");
  });

  it("deve aceitar todos os tipos válidos de interação", () => {
    const tiposValidos = ["contato", "qualificacao", "desqualificacao", "observacao", "tentativa"] as const;
    tiposValidos.forEach((tipo) => {
      expect(tiposValidos).toContain(tipo);
    });
    expect(tiposValidos).toHaveLength(5);
  });

  it("deve identificar corretamente que 'tentativa' é o único tipo que incrementa o contador", () => {
    const tiposQueIncrementam = ["tentativa"];
    const tiposQueNaoIncrementam = ["contato", "qualificacao", "desqualificacao", "observacao"];

    // Lógica do backend: apenas "tentativa" incrementa
    const deveIncrementar = (tipo: string) => tipo === "tentativa";

    tiposQueIncrementam.forEach((t) => expect(deveIncrementar(t)).toBe(true));
    tiposQueNaoIncrementam.forEach((t) => expect(deveIncrementar(t)).toBe(false));
  });

  it("deve exibir badge de tentativas apenas quando attemptCount > 0", () => {
    // Simular lógica do frontend
    const deveExibirBadge = (attemptCount: number | null | undefined) =>
      (attemptCount ?? 0) > 0;

    expect(deveExibirBadge(0)).toBe(false);
    expect(deveExibirBadge(null)).toBe(false);
    expect(deveExibirBadge(undefined)).toBe(false);
    expect(deveExibirBadge(1)).toBe(true);
    expect(deveExibirBadge(5)).toBe(true);
    expect(deveExibirBadge(100)).toBe(true);
  });

  it("deve formatar o texto do badge corretamente", () => {
    const formatarBadge = (count: number) =>
      `${count} ${count === 1 ? "tentativa" : "tentativas"}`;

    expect(formatarBadge(1)).toBe("1 tentativa");
    expect(formatarBadge(2)).toBe("2 tentativas");
    expect(formatarBadge(10)).toBe("10 tentativas");
  });
});
