/**
 * Rota de importação de planilha XLSX
 * POST /api/import-spreadsheet
 * Requer autenticação (cookie de sessão) e role adm
 *
 * Usa ExcelJS streaming para suportar arquivos grandes (17MB+, 70k+ linhas)
 * sem timeout de conexão.
 *
 * Comportamento de duplicidade:
 * - CNPJs já existentes no banco são IGNORADOS (não atualizados)
 * - O relatório retorna a lista dos CNPJs duplicados encontrados
 * - Apenas CNPJs novos são inseridos
 */
import { Router } from "express";
import multer from "multer";
import ExcelJS from "exceljs";
import { Readable } from "stream";
import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { inArray } from "drizzle-orm";
import { sdk } from "./_core/sdk";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/octet-stream",
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos .xlsx, .xls ou .csv são aceitos"));
    }
  },
});

// Mapeamento de colunas da planilha para campos do banco
// Suporta variações de nomes de colunas (com/sem acentos, maiúsculas, etc.)
const COL_MAP: Record<string, string> = {
  // Básicos
  "prioridade": "prioridade",
  "classificação": "classificacao",
  "classificacao": "classificacao",
  "nome fantasia": "nomeFantasia",
  "razão social": "razaoSocial",
  "razao social": "razaoSocial",
  "cnpj": "cnpj",
  "segmento": "segmento",
  "uf": "uf",
  "cidade": "cidade",
  // Endereço
  "endereço": "enderecoCompleto",
  "endereco": "enderecoCompleto",
  "logradouro": "logradouro",
  "número": "numero",
  "numero": "numero",
  "complemento": "complemento",
  "bairro": "bairro",
  // Contato
  "whatsapp 1": "whatsapp1",
  "whatsapp1": "whatsapp1",
  "whatsapp 2": "whatsapp2",
  "whatsapp2": "whatsapp2",
  "email": "email",
  // LinkedIn
  "linkedin gerente/diretor/ceo": "linkedinGerente",
  "linkedin gerente": "linkedinGerente",
  "linkedin diretor": "linkedinDiretor",
  "linkedin ceo": "linkedinCeo",
  // Outros
  "google maps": "googleMaps",
  "nome do decisor": "nomeDecissor",
  "conhece a marca?": "conheceMarca",
  "conhece a marca": "conheceMarca",
  "frota atual": "frotaAtual",
  "crédito/forma pagamento": "creditoFormaPagamento",
  "credito/forma pagamento": "creditoFormaPagamento",
  "urgência de compra": "urgenciaCompra",
  "urgencia de compra": "urgenciaCompra",
  "desafio principal": "desafioPrincipal",
  "status contato": "statusContato",
  "data contato": "dataContato",
  "link do card no crm": "linkCrm",
  "link crm": "linkCrm",
  "observações": "observacoes",
  "observacoes": "observacoes",
  // Scripts
  "script abertura": "scriptAbertura",
  "script de abertura": "scriptAbertura",
  "script - abertura": "scriptAbertura",
  "script parceria": "scriptParceria",
  "script de parceria": "scriptParceria",
  "script - parceria": "scriptParceria",
  "script técnico": "scriptTecnico",
  "script tecnico": "scriptTecnico",
  "script de técnico": "scriptTecnico",
  "script de tecnico": "scriptTecnico",
  "script - técnico": "scriptTecnico",
  "script - tecnico": "scriptTecnico",
  // Dados empresariais extras
  "capital social": "capitalSocial",
  "matriz/filial": "matrizFilial",
  "sócios": "socios",
  "socios": "socios",
  "cnae": "cnae",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ");
}

function cleanCnpj(cnpj: string | null | undefined): string | null {
  if (!cnpj) return null;
  const cleaned = String(cnpj).replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  return cleaned.length >= 11 ? cleaned : null;
}

/** Formata CNPJ para exibição: XX.XXX.XXX/XXXX-XX */
function formatCnpj(cnpj: string): string {
  if (cnpj.length !== 14) return cnpj;
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

/** Lê todas as linhas de uma planilha XLSX em memória usando ExcelJS streaming */
async function readAllRowsStreaming(buffer: Buffer): Promise<{
  sheetNames: string[];
  rows: Record<string, unknown>[];
}> {
  const workbook = new ExcelJS.Workbook();
  const stream = Readable.from(buffer);
  await workbook.xlsx.read(stream);

  const sheetNames: string[] = [];
  const allRows: Record<string, unknown>[] = [];

  workbook.eachSheet((worksheet) => {
    sheetNames.push(worksheet.name);

    // Pegar cabeçalhos da primeira linha
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value ?? "").trim());
    });

    if (headers.length === 0) return; // aba sem cabeçalhos

    // Ler linhas de dados (a partir da linha 2)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // pular cabeçalho

      const rowObj: Record<string, unknown> = {};
      let hasData = false;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          const val = cell.value;
          // Tratar fórmulas
          const resolved = val && typeof val === "object" && "result" in val
            ? (val as { result: unknown }).result
            : val;
          rowObj[header] = resolved;
          if (resolved !== null && resolved !== undefined && String(resolved).trim() !== "") {
            hasData = true;
          }
        }
      });

      if (hasData) allRows.push(rowObj);
    });
  });

  return { sheetNames, rows: allRows };
}

import type { Application } from "express";
export function registerImportRoute(app: Application) {
  const router = Router();

  // Aumentar timeout para rotas de importação (10 minutos)
  const IMPORT_TIMEOUT_MS = 10 * 60 * 1000;

  router.post(
    "/api/import-spreadsheet",
    upload.single("file"),
    async (req, res) => {
      // Aumentar timeout da resposta
      req.socket.setTimeout(IMPORT_TIMEOUT_MS);
      res.setTimeout(IMPORT_TIMEOUT_MS);

      try {
        // Auth check
        let sessionUser: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
        try { sessionUser = await sdk.authenticateRequest(req); } catch { /* not authenticated */ }
        if (!sessionUser) {
          return res.status(401).json({ error: "Não autenticado" });
        }
        if (sessionUser.role !== "adm" && sessionUser.role !== "admin") {
          return res.status(403).json({ error: "Apenas ADM pode importar planilhas" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }

        // Parse workbook com ExcelJS streaming
        let sheetNames: string[];
        let allRows: Record<string, unknown>[];
        try {
          const result = await readAllRowsStreaming(req.file.buffer);
          sheetNames = result.sheetNames;
          allRows = result.rows;
        } catch (parseErr) {
          console.error("[ImportRoute] Parse error:", parseErr);
          return res.status(400).json({ error: "Não foi possível ler a planilha. Verifique se o arquivo é um .xlsx válido." });
        }

        if (allRows.length === 0) {
          return res.status(400).json({ error: "Planilha vazia ou sem dados reconhecíveis" });
        }

        // Mapear colunas da primeira linha com dados
        const firstRow = allRows[0];
        const headerMap: Record<string, string> = {};
        for (const key of Object.keys(firstRow)) {
          const normalized = normalizeHeader(key);
          const mapped = COL_MAP[normalized];
          if (mapped) headerMap[key] = mapped;
        }

        // Converter linhas para formato do banco, deduplicando CNPJs dentro da própria planilha
        const leadsFromSheet: (typeof leads.$inferInsert)[] = [];
        const cnpjsInSheet = new Set<string>();
        let rowsWithoutCnpj = 0;
        let duplicatesInSheet = 0;

        for (const row of allRows) {
          const lead: Record<string, unknown> = {};
          for (const [origKey, dbKey] of Object.entries(headerMap)) {
            const val = row[origKey];
            lead[dbKey] = val !== null && val !== undefined && String(val).trim() !== "" ? String(val).trim() : null;
          }

          const cnpj = cleanCnpj(lead.cnpj as string);
          if (!cnpj) {
            rowsWithoutCnpj++;
            continue;
          }
          // Deduplicar dentro da própria planilha
          if (cnpjsInSheet.has(cnpj)) {
            duplicatesInSheet++;
            continue;
          }
          cnpjsInSheet.add(cnpj);

          // Montar endereço completo se não vier pronto
          let enderecoCompleto = (lead.enderecoCompleto as string) ?? null;
          if (!enderecoCompleto) {
            const parts = [
              lead.logradouro,
              lead.numero ? `nº ${lead.numero}` : null,
              lead.complemento,
              lead.bairro,
            ].filter(Boolean);
            if (parts.length > 0) enderecoCompleto = parts.join(", ");
          }

          leadsFromSheet.push({
            cnpj,
            nomeFantasia: (lead.nomeFantasia as string) ?? null,
            razaoSocial: (lead.razaoSocial as string) ?? null,
            prioridade: (lead.prioridade as string) ?? null,
            classificacao: (lead.classificacao as string) ?? null,
            segmento: (lead.segmento as string) ?? null,
            uf: (lead.uf as string) ?? null,
            cidade: (lead.cidade as string) ?? null,
            enderecoCompleto,
            logradouro: (lead.logradouro as string) ?? null,
            numero: (lead.numero as string) ?? null,
            complemento: (lead.complemento as string) ?? null,
            bairro: (lead.bairro as string) ?? null,
            whatsapp1: (lead.whatsapp1 as string) ?? null,
            whatsapp2: (lead.whatsapp2 as string) ?? null,
            email: (lead.email as string) ?? null,
            linkedinGerente: (lead.linkedinGerente as string) ?? null,
            linkedinDiretor: (lead.linkedinDiretor as string) ?? null,
            linkedinCeo: (lead.linkedinCeo as string) ?? null,
            googleMaps: (lead.googleMaps as string) ?? null,
            nomeDecissor: (lead.nomeDecissor as string) ?? null,
            conheceMarca: (lead.conheceMarca as string) ?? null,
            frotaAtual: (lead.frotaAtual as string) ?? null,
            creditoFormaPagamento: (lead.creditoFormaPagamento as string) ?? null,
            urgenciaCompra: (lead.urgenciaCompra as string) ?? null,
            desafioPrincipal: (lead.desafioPrincipal as string) ?? null,
            scriptAbertura: (lead.scriptAbertura as string) ?? null,
            scriptParceria: (lead.scriptParceria as string) ?? null,
            scriptTecnico: (lead.scriptTecnico as string) ?? null,
            capitalSocial: (lead.capitalSocial as string) ?? null,
            matrizFilial: (lead.matrizFilial as string) ?? null,
            socios: (lead.socios as string) ?? null,
            cnae: (lead.cnae as string) ?? null,
            isHighPriority: false,
            isReleasedToTeam: false,
            isHidden: false,
          });
        }

        if (leadsFromSheet.length === 0) {
          return res.status(400).json({ error: "Nenhum lead válido encontrado (CNPJ ausente em todas as linhas)" });
        }

        // ─── CHECAGEM DE DUPLICIDADE NO BANCO ───────────────────────────────
        const db = await getDb();
        if (!db) return res.status(500).json({ error: "Banco de dados indisponível" });

        const cnpjList = leadsFromSheet.map(l => l.cnpj!).filter(Boolean);
        const CHUNK = 500;

        // Coletar todos os CNPJs já existentes no banco (em lotes)
        const existingCnpjsInDb = new Set<string>();
        for (let i = 0; i < cnpjList.length; i += CHUNK) {
          const chunk = cnpjList.slice(i, i + CHUNK);
          const existingRows = await db
            .select({ cnpj: leads.cnpj })
            .from(leads)
            .where(inArray(leads.cnpj, chunk));
          for (const row of existingRows) {
            if (row.cnpj) existingCnpjsInDb.add(row.cnpj);
          }
        }

        // Separar novos (não existem no banco) dos duplicados (já existem)
        const toInsert = leadsFromSheet.filter(l => !existingCnpjsInDb.has(l.cnpj!));
        const duplicatedLeads = leadsFromSheet
          .filter(l => existingCnpjsInDb.has(l.cnpj!))
          .map(l => ({
            cnpj: formatCnpj(l.cnpj!),
            cnpjRaw: l.cnpj!,
            nome: l.nomeFantasia ?? l.razaoSocial ?? null,
            cidade: l.cidade ?? null,
            uf: l.uf ?? null,
          }));

        // Inserir apenas os novos (em lotes)
        let inserted = 0;
        for (let i = 0; i < toInsert.length; i += CHUNK) {
          const chunk = toInsert.slice(i, i + CHUNK);
          if (chunk.length > 0) {
            await db.insert(leads).values(chunk);
            inserted += chunk.length;
          }
        }

        return res.json({
          success: true,
          totalInSheet: allRows.length,
          validInSheet: leadsFromSheet.length,
          inserted,
          duplicated: duplicatedLeads.length,
          duplicatedLeads,
          skippedNoCnpj: rowsWithoutCnpj,
          duplicatesInSheet,
          sheets: sheetNames,
        });
      } catch (err: unknown) {
        console.error("[ImportRoute] Error:", err);
        const message = err instanceof Error ? err.message : "Erro interno";
        return res.status(500).json({ error: message });
      }
    }
  );

  // Endpoint para preview das colunas da planilha (sem importar)
  router.post(
    "/api/import-spreadsheet/preview",
    upload.single("file"),
    async (req, res) => {
      req.socket.setTimeout(5 * 60 * 1000);
      res.setTimeout(5 * 60 * 1000);
      try {
        let sessionUser2: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
        try { sessionUser2 = await sdk.authenticateRequest(req); } catch { /* not authenticated */ }
        if (!sessionUser2) return res.status(401).json({ error: "Não autenticado" });
        if (sessionUser2.role !== "adm" && sessionUser2.role !== "admin") {
          return res.status(403).json({ error: "Apenas ADM pode importar planilhas" });
        }
        if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

        const workbook = new ExcelJS.Workbook();
        const stream = Readable.from(req.file.buffer);
        await workbook.xlsx.read(stream);

        const sheetNames: string[] = [];
        const preview: { sheet: string; columns: string[]; rowCount: number; sample: Record<string, unknown>[] }[] = [];

        workbook.eachSheet((worksheet) => {
          sheetNames.push(worksheet.name);

          const headerRow = worksheet.getRow(1);
          const columns: string[] = [];
          headerRow.eachCell({ includeEmpty: false }, (cell) => {
            const val = String(cell.value ?? "").trim();
            if (val) columns.push(val);
          });

          if (columns.length === 0) return;

          const sample: Record<string, unknown>[] = [];
          let rowCount = 0;

          worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return;
            rowCount++;
            if (sample.length < 3) {
              const rowObj: Record<string, unknown> = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = columns[colNumber - 1];
                if (header) {
                  const val = cell.value;
                  rowObj[header] = val && typeof val === "object" && "result" in val
                    ? (val as { result: unknown }).result
                    : val;
                }
              });
              sample.push(rowObj);
            }
          });

          preview.push({ sheet: worksheet.name, columns, rowCount, sample });
        });

        return res.json({ success: true, sheets: sheetNames, preview });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro interno";
        return res.status(500).json({ error: message });
      }
    }
  );

  app.use(router);
}
