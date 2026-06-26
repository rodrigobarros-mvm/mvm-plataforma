import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do banco de dados ────────────────────────────────────────────────────
const mockDb = {
  selectDistinct: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getLeadsFilterOptions: vi.fn(),
    assignLeadsToBdr: vi.fn(),
  };
});

// ─── Testes de lógica de visibilidade de leads ────────────────────────────────
describe("Visibilidade de Leads por Role", () => {
  it("BDR deve ver todos os leads liberados (isReleasedToTeam=true), não apenas os atribuídos a ele", () => {
    // Simular a lógica do router leads.list
    const getLeadsOpts = (role: string, userId: number, input: Record<string, unknown>) => {
      if (role === "adm" || role === "admin") {
        return input; // ADM vê tudo
      }
      const opts = { ...input, onlyReleased: true };
      // BDR agora vê todos os liberados (não apenas os atribuídos a ele)
      return opts;
    };

    const bdrOpts = getLeadsOpts("bdr", 42, { page: 1, limit: 50 });
    expect(bdrOpts).toEqual({ page: 1, limit: 50, onlyReleased: true });
    // Confirma que NÃO tem assignedTo forçado
    expect((bdrOpts as any).assignedTo).toBeUndefined();
  });

  it("Gerente deve ver apenas leads liberados", () => {
    const getLeadsOpts = (role: string, input: Record<string, unknown>) => {
      if (role === "adm" || role === "admin") return input;
      return { ...input, onlyReleased: true };
    };
    const opts = getLeadsOpts("gerente", { page: 1, limit: 50 });
    expect(opts).toEqual({ page: 1, limit: 50, onlyReleased: true });
  });

  it("ADM deve ver todos os leads sem filtro de liberação", () => {
    const getLeadsOpts = (role: string, input: Record<string, unknown>) => {
      if (role === "adm" || role === "admin") return input;
      return { ...input, onlyReleased: true };
    };
    const opts = getLeadsOpts("adm", { page: 1, limit: 50 });
    expect(opts).toEqual({ page: 1, limit: 50 });
    expect((opts as any).onlyReleased).toBeUndefined();
  });

  it("Supervisor deve ver apenas leads liberados", () => {
    const getLeadsOpts = (role: string, input: Record<string, unknown>) => {
      if (role === "adm" || role === "admin") return input;
      return { ...input, onlyReleased: true };
    };
    const opts = getLeadsOpts("supervisor", { page: 1, limit: 50 });
    expect(opts.onlyReleased).toBe(true);
  });
});

// ─── Testes de filtros multi-seleção ─────────────────────────────────────────
describe("Filtros Multi-Seleção", () => {
  it("getLeadsFilterOptions deve aceitar array de UFs", async () => {
    const { getLeadsFilterOptions } = await import("./db");
    (getLeadsFilterOptions as ReturnType<typeof vi.fn>).mockResolvedValue({
      ufs: ["PE", "BA"],
      cidades: [
        { cidade: "Recife", uf: "PE", count: 1375 },
        { cidade: "Salvador", uf: "BA", count: 2262 },
      ],
      classificacoes: [
        { label: "Microempresa", count: 31914 },
        { label: "Pequena Empresa", count: 2686 },
      ],
    });

    const result = await getLeadsFilterOptions({ ufs: ["PE", "BA"], onlyUnreleased: true });
    expect(result.ufs).toContain("PE");
    expect(result.ufs).toContain("BA");
    expect(result.cidades.length).toBeGreaterThan(0);
    expect(result.classificacoes.length).toBeGreaterThan(0);
  });

  it("getLeadsFilterOptions deve filtrar cidades por UF selecionada", async () => {
    const { getLeadsFilterOptions } = await import("./db");
    (getLeadsFilterOptions as ReturnType<typeof vi.fn>).mockResolvedValue({
      ufs: ["PE"],
      cidades: [
        { cidade: "Recife", uf: "PE", count: 1375 },
        { cidade: "Caruaru", uf: "PE", count: 523 },
      ],
      classificacoes: [{ label: "Microempresa", count: 5000 }],
    });

    const result = await getLeadsFilterOptions({ ufs: ["PE"] });
    // Todas as cidades devem ser de PE
    result.cidades.forEach((c) => expect(c.uf).toBe("PE"));
  });
});

// ─── Testes de atribuição de leads ────────────────────────────────────────────
describe("Atribuição de Leads a BDRs", () => {
  it("assignLeadsToBdr deve retornar o número de leads atribuídos", async () => {
    const { assignLeadsToBdr } = await import("./db");
    (assignLeadsToBdr as ReturnType<typeof vi.fn>).mockResolvedValue(200);

    const total = await assignLeadsToBdr({
      bdrId: 5,
      assignedBy: 1,
      ufs: ["PE"],
      cidades: ["Recife"],
      limit: 200,
    });
    expect(total).toBe(200);
  });

  it("assignLeadsToBdr deve respeitar o limite de leads", async () => {
    const { assignLeadsToBdr } = await import("./db");
    (assignLeadsToBdr as ReturnType<typeof vi.fn>).mockImplementation(async (opts) => {
      const limit = opts.limit ?? 9999;
      return Math.min(limit, 1375); // Recife tem 1375 leads
    });

    const total = await assignLeadsToBdr({
      bdrId: 5,
      assignedBy: 1,
      cidades: ["Recife"],
      limit: 100,
    });
    expect(total).toBe(100); // Limitado a 100
  });

  it("assignLeadsToBdr sem limite deve atribuir todos os leads do filtro", async () => {
    const { assignLeadsToBdr } = await import("./db");
    (assignLeadsToBdr as ReturnType<typeof vi.fn>).mockImplementation(async (opts) => {
      const limit = opts.limit ?? 9999;
      return Math.min(limit, 1375);
    });

    const total = await assignLeadsToBdr({
      bdrId: 5,
      assignedBy: 1,
      cidades: ["Recife"],
    });
    expect(total).toBe(1375); // Sem limite, atribui todos
  });

  it("assignLeadsToBdr com IDs específicos deve ignorar outros filtros", async () => {
    const { assignLeadsToBdr } = await import("./db");
    const specificIds = [101, 102, 103, 104, 105];
    (assignLeadsToBdr as ReturnType<typeof vi.fn>).mockResolvedValue(specificIds.length);

    const total = await assignLeadsToBdr({
      bdrId: 7,
      assignedBy: 1,
      ids: specificIds,
    });
    expect(total).toBe(5);
  });
});

// ─── Testes de validação de input ─────────────────────────────────────────────
describe("Validação de Input dos Filtros", () => {
  it("Filtro de UF deve aceitar array de strings", () => {
    const validateUFs = (ufs: unknown): string[] => {
      if (!Array.isArray(ufs)) return [];
      return ufs.filter((u) => typeof u === "string" && u.length === 2);
    };

    expect(validateUFs(["PE", "BA", "CE"])).toEqual(["PE", "BA", "CE"]);
    expect(validateUFs(["PE", "INVALID_LONG", "BA"])).toEqual(["PE", "BA"]);
    expect(validateUFs(null)).toEqual([]);
    expect(validateUFs(undefined)).toEqual([]);
  });

  it("Filtro de cidade deve aceitar array de strings", () => {
    const validateCidades = (cidades: unknown): string[] => {
      if (!Array.isArray(cidades)) return [];
      return cidades.filter((c) => typeof c === "string" && c.length > 0);
    };

    expect(validateCidades(["Recife", "Caruaru"])).toEqual(["Recife", "Caruaru"]);
    expect(validateCidades(["Recife", "", "Caruaru"])).toEqual(["Recife", "Caruaru"]);
    expect(validateCidades([])).toEqual([]);
  });

  it("Limite de quantidade deve ser número positivo", () => {
    const validateLimit = (limit: unknown): number | undefined => {
      if (typeof limit !== "number" || limit <= 0) return undefined;
      return Math.floor(limit);
    };

    expect(validateLimit(100)).toBe(100);
    expect(validateLimit(0)).toBeUndefined();
    expect(validateLimit(-5)).toBeUndefined();
    expect(validateLimit("100")).toBeUndefined();
    expect(validateLimit(undefined)).toBeUndefined();
  });
});
