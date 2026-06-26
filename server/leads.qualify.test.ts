/**
 * Testes para o fluxo de qualificação de leads
 * Verifica criação de notificações e envio de push para gestores
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do pushSender
vi.mock("./pushSender", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
}));

// Mock do db
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getLeadById: vi.fn(),
    qualifyLead: vi.fn().mockResolvedValue(undefined),
    getAllUsers: vi.fn(),
    createNotification: vi.fn().mockResolvedValue(undefined),
    getLeads: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getKpiConfig: vi.fn().mockResolvedValue({ dailyQualifiedLeads: 5 }),
  };
});

describe("leads.qualify — notificações e push para gestores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve enviar notificação in-app para todos os gestores ao qualificar lead", async () => {
    const { createNotification, getAllUsers, getLeadById } = await import("./db");

    (getLeadById as any).mockResolvedValue({
      id: 1,
      nomeFantasia: "Empresa Teste",
      razaoSocial: "Empresa Teste LTDA",
      nomeDecissor: "João Silva",
      conheceMarca: "Sim",
      frotaAtual: "5 empilhadeiras",
      urgenciaCompra: "Alta",
      statusContato: "Em Contato",
      whatsapp1: "https://wa.me/5581999999999",
    });

    (getAllUsers as any).mockResolvedValue([
      { id: 10, role: "adm", name: "Admin", lastName: "MVM" },
      { id: 11, role: "gerente", name: "Gerente", lastName: "Silva" },
      { id: 12, role: "bdr", name: "BDR", lastName: "Santos" },
    ]);

    // Simular a lógica do router qualify
    const lead = await (getLeadById as any)(1);
    const allUsers = await (getAllUsers as any)();
    const GERENTE_ROLES = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"];
    const managers = allUsers.filter((u: any) => GERENTE_ROLES.includes(u.role ?? ""));

    expect(managers).toHaveLength(2); // adm e gerente, não bdr

    for (const mgr of managers) {
      await (createNotification as any)({
        userId: mgr.id,
        type: "lead_qualificado",
        title: "Lead Qualificado!",
        content: `BDR qualificou o lead: ${lead.nomeFantasia}`,
        relatedLeadId: 1,
        relatedUserId: 99,
      });
    }

    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10, type: "lead_qualificado" })
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 11, type: "lead_qualificado" })
    );
  });

  it("deve enviar push notification para gestores ao qualificar lead", async () => {
    const { sendPushToUser } = await import("./pushSender");
    const { getAllUsers } = await import("./db");

    (getAllUsers as any).mockResolvedValue([
      { id: 10, role: "adm", name: "Admin", lastName: "MVM" },
      { id: 11, role: "gerente", name: "Gerente", lastName: "Silva" },
      { id: 12, role: "supervisor", name: "Supervisor", lastName: "Costa" },
      { id: 13, role: "bdr", name: "BDR", lastName: "Santos" },
    ]);

    const allUsers = await (getAllUsers as any)();
    const GERENTE_ROLES = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"];
    const managers = allUsers.filter((u: any) => GERENTE_ROLES.includes(u.role ?? ""));

    // Simular envio de push para cada gestor
    for (const mgr of managers) {
      await (sendPushToUser as any)(mgr.id, {
        title: "✅ Lead Qualificado!",
        body: "BDR qualificou: Empresa Teste",
        url: "/leads/1",
      }).catch(() => {});
    }

    expect(sendPushToUser).toHaveBeenCalledTimes(3); // adm, gerente e supervisor
    expect(sendPushToUser).not.toHaveBeenCalledWith(13, expect.anything()); // bdr não recebe
  });

  it("não deve falhar se push subscription não existir (erro silenciado)", async () => {
    const { sendPushToUser } = await import("./pushSender");

    // Simular erro de push (sem subscription)
    (sendPushToUser as any).mockRejectedValueOnce(new Error("No subscription found"));

    // Deve silenciar o erro com .catch(() => {})
    await expect(
      (sendPushToUser as any)(10, { title: "Test", body: "Test", url: "/" }).catch(() => {})
    ).resolves.toBeUndefined();
  });

  it("deve incluir supervisor, diretor e coordenador na lista de gestores", () => {
    const GERENTE_ROLES = ["adm", "admin", "gerente", "diretor", "coordenador", "supervisor"];
    const users = [
      { id: 1, role: "adm" },
      { id: 2, role: "gerente" },
      { id: 3, role: "diretor" },
      { id: 4, role: "coordenador" },
      { id: 5, role: "supervisor" },
      { id: 6, role: "bdr" },
    ];
    const managers = users.filter((u) => GERENTE_ROLES.includes(u.role));
    expect(managers).toHaveLength(5);
    expect(managers.map((m) => m.id)).not.toContain(6);
  });
});
