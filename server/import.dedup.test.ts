/**
 * Testes de checagem de duplicidade na importação de planilhas
 * Valida que CNPJs já existentes no banco são ignorados (não inseridos nem atualizados)
 * e que o relatório retorna os dados corretos.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Helpers de lógica de deduplicação (extraídos do importRoute) ─────────────

function cleanCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  return String(cnpj).replace(/\D/g, "").padStart(14, "0").slice(0, 14) || null;
}

function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

interface SheetRow {
  cnpj?: string | null;
  nomeFantasia?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

interface LeadRecord {
  cnpj: string;
  nomeFantasia?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

/**
 * Simula a lógica de deduplicação do importRoute:
 * 1. Remove linhas sem CNPJ
 * 2. Deduplica CNPJs repetidos dentro da própria planilha
 * 3. Compara com CNPJs existentes no banco
 * 4. Retorna apenas os novos para inserção + relatório
 */
function processImport(
  rows: SheetRow[],
  existingCnpjsInDb: Set<string>
) {
  const leadsFromSheet: LeadRecord[] = [];
  const cnpjsInSheet = new Set<string>();
  let rowsWithoutCnpj = 0;
  let duplicatesInSheet = 0;

  for (const row of rows) {
    const cnpj = cleanCnpj(row.cnpj);
    if (!cnpj) {
      rowsWithoutCnpj++;
      continue;
    }
    if (cnpjsInSheet.has(cnpj)) {
      duplicatesInSheet++;
      continue;
    }
    cnpjsInSheet.add(cnpj);
    leadsFromSheet.push({ cnpj, nomeFantasia: row.nomeFantasia ?? null, cidade: row.cidade ?? null, uf: row.uf ?? null });
  }

  const toInsert = leadsFromSheet.filter(l => !existingCnpjsInDb.has(l.cnpj));
  const duplicatedLeads = leadsFromSheet
    .filter(l => existingCnpjsInDb.has(l.cnpj))
    .map(l => ({
      cnpj: formatCnpj(l.cnpj),
      cnpjRaw: l.cnpj,
      nome: l.nomeFantasia ?? null,
      cidade: l.cidade ?? null,
      uf: l.uf ?? null,
    }));

  return {
    totalInSheet: rows.length,
    validInSheet: leadsFromSheet.length,
    toInsert,
    inserted: toInsert.length,
    duplicated: duplicatedLeads.length,
    duplicatedLeads,
    skippedNoCnpj: rowsWithoutCnpj,
    duplicatesInSheet,
  };
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Checagem de Duplicidade na Importação", () => {
  describe("cleanCnpj", () => {
    it("deve limpar CNPJ formatado e retornar apenas dígitos", () => {
      expect(cleanCnpj("12.345.678/0001-95")).toBe("12345678000195");
    });

    it("deve retornar null para CNPJ vazio", () => {
      expect(cleanCnpj("")).toBeNull();
      expect(cleanCnpj(null)).toBeNull();
      expect(cleanCnpj(undefined)).toBeNull();
    });

    it("deve preencher com zeros à esquerda se necessário", () => {
      expect(cleanCnpj("123")).toBe("00000000000123");
    });
  });

  describe("formatCnpj", () => {
    it("deve formatar CNPJ de 14 dígitos corretamente", () => {
      expect(formatCnpj("12345678000195")).toBe("12.345.678/0001-95");
    });

    it("deve retornar o valor original se não tiver 14 dígitos", () => {
      expect(formatCnpj("123")).toBe("123");
    });
  });

  describe("processImport — sem duplicatas no banco", () => {
    it("deve inserir todos os leads quando nenhum CNPJ existe no banco", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A", cidade: "São Paulo", uf: "SP" },
        { cnpj: "98.765.432/0001-10", nomeFantasia: "Empresa B", cidade: "Recife", uf: "PE" },
      ];
      const existingCnpjs = new Set<string>();
      const result = processImport(rows, existingCnpjs);

      expect(result.inserted).toBe(2);
      expect(result.duplicated).toBe(0);
      expect(result.duplicatedLeads).toHaveLength(0);
      expect(result.skippedNoCnpj).toBe(0);
    });
  });

  describe("processImport — com duplicatas no banco", () => {
    it("deve ignorar CNPJs já existentes no banco e inserir apenas os novos", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A" },  // já existe
        { cnpj: "98.765.432/0001-10", nomeFantasia: "Empresa B" },  // novo
        { cnpj: "11.111.111/0001-11", nomeFantasia: "Empresa C" },  // já existe
      ];
      const existingCnpjs = new Set(["12345678000195", "11111111000111"]);
      const result = processImport(rows, existingCnpjs);

      expect(result.inserted).toBe(1);
      expect(result.duplicated).toBe(2);
      expect(result.toInsert[0].cnpj).toBe("98765432000110");
      expect(result.duplicatedLeads.map(d => d.cnpjRaw)).toContain("12345678000195");
      expect(result.duplicatedLeads.map(d => d.cnpjRaw)).toContain("11111111000111");
    });

    it("deve retornar os dados de nome/cidade/uf dos leads duplicados para exibição", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A", cidade: "São Paulo", uf: "SP" },
      ];
      const existingCnpjs = new Set(["12345678000195"]);
      const result = processImport(rows, existingCnpjs);

      expect(result.duplicatedLeads[0].nome).toBe("Empresa A");
      expect(result.duplicatedLeads[0].cidade).toBe("São Paulo");
      expect(result.duplicatedLeads[0].uf).toBe("SP");
      expect(result.duplicatedLeads[0].cnpj).toBe("12.345.678/0001-95");
    });

    it("deve retornar inserted=0 quando todos os CNPJs já existem no banco", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95" },
        { cnpj: "98.765.432/0001-10" },
      ];
      const existingCnpjs = new Set(["12345678000195", "98765432000110"]);
      const result = processImport(rows, existingCnpjs);

      expect(result.inserted).toBe(0);
      expect(result.duplicated).toBe(2);
    });
  });

  describe("processImport — duplicatas dentro da própria planilha", () => {
    it("deve ignorar CNPJs repetidos dentro da mesma planilha", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A" },
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A (duplicada)" }, // repetida
        { cnpj: "98.765.432/0001-10", nomeFantasia: "Empresa B" },
      ];
      const existingCnpjs = new Set<string>();
      const result = processImport(rows, existingCnpjs);

      expect(result.duplicatesInSheet).toBe(1);
      expect(result.validInSheet).toBe(2);
      expect(result.inserted).toBe(2);
    });
  });

  describe("processImport — linhas sem CNPJ", () => {
    it("deve ignorar linhas sem CNPJ e contabilizar no skippedNoCnpj", () => {
      const rows: SheetRow[] = [
        { cnpj: null, nomeFantasia: "Sem CNPJ" },
        { cnpj: "", nomeFantasia: "CNPJ vazio" },
        { cnpj: "12.345.678/0001-95", nomeFantasia: "Empresa A" },
      ];
      const existingCnpjs = new Set<string>();
      const result = processImport(rows, existingCnpjs);

      expect(result.skippedNoCnpj).toBe(2);
      expect(result.inserted).toBe(1);
    });
  });

  describe("processImport — contadores totais", () => {
    it("deve calcular totalInSheet e validInSheet corretamente", () => {
      const rows: SheetRow[] = [
        { cnpj: "12.345.678/0001-95" },  // válido
        { cnpj: "98.765.432/0001-10" },  // válido
        { cnpj: null },                   // sem CNPJ
        { cnpj: "12.345.678/0001-95" },  // duplicado na planilha
      ];
      const existingCnpjs = new Set<string>();
      const result = processImport(rows, existingCnpjs);

      expect(result.totalInSheet).toBe(4);
      expect(result.validInSheet).toBe(2);
      expect(result.skippedNoCnpj).toBe(1);
      expect(result.duplicatesInSheet).toBe(1);
      expect(result.inserted).toBe(2);
    });
  });
});
