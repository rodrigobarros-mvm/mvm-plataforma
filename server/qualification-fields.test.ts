import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do db
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// Mock do getDb
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock do schema
vi.mock("../drizzle/schema", () => ({
  qualificationFields: { id: "id", label: "label", fieldKey: "fieldKey", type: "type", required: "required", active: "active", displayOrder: "displayOrder", options: "options", placeholder: "placeholder", helpText: "helpText", isBuiltIn: "isBuiltIn", createdBy: "createdBy", updatedBy: "updatedBy" },
  leadQualificationData: { id: "id", leadId: "leadId", fieldId: "fieldId", value: "value" },
}));

// Testa a lógica de validação do fieldKey no frontend
describe("QualificationFields - fieldKey validation", () => {
  function toFieldKey(label: string): string {
    return label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join("");
  }

  it("should generate camelCase fieldKey from label", () => {
    expect(toFieldKey("Nome do Decisor")).toBe("nomeDoDecisor");
    expect(toFieldKey("Frota Atual")).toBe("frotaAtual");
    expect(toFieldKey("Urgência de Compra")).toBe("urgenciaDeCompra");
  });

  it("should handle single word labels", () => {
    expect(toFieldKey("Segmento")).toBe("segmento");
    expect(toFieldKey("CNPJ")).toBe("cnpj");
  });

  it("should remove special characters", () => {
    expect(toFieldKey("E-mail de Contato")).toBe("emailDeContato");
    // Cel/WhatsApp: o "/" é removido, resultando em "CelWhatsApp" que vira "celwhatsapp" (tudo junto sem espaço)
    expect(toFieldKey("Cel/WhatsApp")).toBe("celwhatsapp");
  });

  it("should validate fieldKey regex pattern", () => {
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    expect(validPattern.test("nomeDecissor")).toBe(true);
    expect(validPattern.test("frotaAtual")).toBe(true);
    expect(validPattern.test("campo_123")).toBe(true);
    expect(validPattern.test("123campo")).toBe(false);
    expect(validPattern.test("campo-especial")).toBe(false);
    expect(validPattern.test("")).toBe(false);
  });
});

// Testa a lógica de opções para select/multiselect
describe("QualificationFields - options parsing", () => {
  it("should parse options from newline-separated string", () => {
    const optionsInput = "Sim\nNão\nParcialmente";
    const optionsArr = optionsInput.split("\n").map(s => s.trim()).filter(Boolean);
    expect(optionsArr).toEqual(["Sim", "Não", "Parcialmente"]);
    expect(JSON.parse(JSON.stringify(optionsArr))).toEqual(["Sim", "Não", "Parcialmente"]);
  });

  it("should require at least 2 options for select fields", () => {
    const validateOptions = (input: string, type: string) => {
      if (type !== "select" && type !== "multiselect") return true;
      const arr = input.split("\n").map(s => s.trim()).filter(Boolean);
      return arr.length >= 2;
    };
    expect(validateOptions("Sim\nNão", "select")).toBe(true);
    expect(validateOptions("Apenas uma", "select")).toBe(false);
    expect(validateOptions("", "select")).toBe(false);
    expect(validateOptions("qualquer coisa", "text")).toBe(true);
  });

  it("should not require options for non-select types", () => {
    const needsOptions = (type: string) => type === "select" || type === "multiselect";
    expect(needsOptions("text")).toBe(false);
    expect(needsOptions("number")).toBe(false);
    expect(needsOptions("boolean")).toBe(false);
    expect(needsOptions("textarea")).toBe(false);
    expect(needsOptions("select")).toBe(true);
    expect(needsOptions("multiselect")).toBe(true);
  });
});

// Testa os tipos de campo disponíveis
describe("QualificationFields - field types", () => {
  const VALID_TYPES = ["text", "number", "select", "multiselect", "boolean", "textarea"] as const;

  it("should have all expected field types", () => {
    expect(VALID_TYPES).toContain("text");
    expect(VALID_TYPES).toContain("number");
    expect(VALID_TYPES).toContain("select");
    expect(VALID_TYPES).toContain("multiselect");
    expect(VALID_TYPES).toContain("boolean");
    expect(VALID_TYPES).toContain("textarea");
    expect(VALID_TYPES.length).toBe(6);
  });

  it("should have human-readable labels for all types", () => {
    const FIELD_TYPE_LABELS: Record<string, string> = {
      text: "Texto curto",
      number: "Número",
      select: "Seleção única",
      multiselect: "Múltipla escolha",
      boolean: "Sim / Não",
      textarea: "Texto longo",
    };
    for (const type of VALID_TYPES) {
      expect(FIELD_TYPE_LABELS[type]).toBeDefined();
      expect(FIELD_TYPE_LABELS[type].length).toBeGreaterThan(0);
    }
  });
});

// Testa lógica de ordenação
describe("QualificationFields - ordering", () => {
  it("should sort fields by displayOrder ascending", () => {
    const fields = [
      { id: 3, displayOrder: 3, label: "C" },
      { id: 1, displayOrder: 1, label: "A" },
      { id: 2, displayOrder: 2, label: "B" },
    ];
    const sorted = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(sorted[0].label).toBe("A");
    expect(sorted[1].label).toBe("B");
    expect(sorted[2].label).toBe("C");
  });

  it("should swap orders correctly when moving up", () => {
    const fields = [
      { id: 1, displayOrder: 1 },
      { id: 2, displayOrder: 2 },
      { id: 3, displayOrder: 3 },
    ];
    // Move item at index 1 (id=2) up
    const idx = 1;
    const swapIdx = 0;
    const newOrder = fields.map((f, i) => ({ id: f.id, displayOrder: i + 1 }));
    const tmp = newOrder[idx].displayOrder;
    newOrder[idx].displayOrder = newOrder[swapIdx].displayOrder;
    newOrder[swapIdx].displayOrder = tmp;
    expect(newOrder.find(n => n.id === 2)?.displayOrder).toBe(1);
    expect(newOrder.find(n => n.id === 1)?.displayOrder).toBe(2);
  });
});
