import { createConnection } from "mysql2/promise";
import XLSX from "xlsx";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const XLSX_PATH = "/home/ubuntu/upload/MVM_EMPILHADEIRAS_v3.xlsx";
const BATCH_SIZE = 200;

function cleanStr(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" || s === "N/A" || s === "-" || s === "null" ? null : s;
}

function mapRow(row, isHighPriority) {
  const g = (key) => cleanStr(row[key]);
  return [
    g("Prioridade"),
    g("Classificação"),
    g("Nome Fantasia"),
    g("Razão Social"),
    g("CNPJ"),
    g("Segmento"),
    g("UF"),
    g("Cidade"),
    g("Endereço Completo"),
    g("WhatsApp 1"),
    g("WhatsApp 2"),
    g("Email"),
    g("LinkedIn Gerente"),
    g("LinkedIn Diretor"),
    g("LinkedIn CEO"),
    g("Google Maps"),
    g("Nome do Decisor"),
    g("Conhece a Marca?"),
    g("Frota Atual"),
    g("Crédito/Forma Pagamento"),
    g("Urgência de Compra"),
    g("Desafio Principal"),
    g("Status Contato") || "Não iniciado",
    g("Data Contato"),
    g("Link do Card no CRM"),
    g("Observações"),
    g("Script - Abertura"),
    g("Script - Parceria"),
    g("Script - Técnico"),
    0, // isQualified
    null, // qualifiedAt
    null, // qualifiedBy
    null, // disqualifiedReason
    null, // disqualifiedAt
    null, // disqualifiedBy
    isHighPriority ? 1 : 0,
    0, // isHidden
    null, // assignedTo
    null, // modeloEmpilhadeira
    null, // ticketEstimado
  ];
}

const INSERT_SQL = `
  INSERT INTO leads (
    prioridade, classificacao, nomeFantasia, razaoSocial, cnpj, segmento, uf, cidade,
    enderecoCompleto, whatsapp1, whatsapp2, email, linkedinGerente, linkedinDiretor,
    linkedinCeo, googleMaps, nomeDecissor, conheceMarca, frotaAtual, creditoFormaPagamento,
    urgenciaCompra, desafioPrincipal, statusContato, dataContato, linkCrm, observacoes,
    scriptAbertura, scriptParceria, scriptTecnico, isQualified, qualifiedAt, qualifiedBy,
    disqualifiedReason, disqualifiedAt, disqualifiedBy, isHighPriority, isHidden,
    assignedTo, modeloEmpilhadeira, ticketEstimado
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE nomeFantasia = VALUES(nomeFantasia)
`;

async function main() {
  console.log("📂 Lendo planilha...");
  const workbook = XLSX.readFile(XLSX_PATH);

  const sheetFull = workbook.Sheets["📋 Lista Completa"];
  const sheetPriority = workbook.Sheets["🔴 Alta Prioridade"];

  const fullData = XLSX.utils.sheet_to_json(sheetFull, { defval: null, raw: false });
  const priorityData = XLSX.utils.sheet_to_json(sheetPriority, { defval: null, raw: false });

  console.log(`📊 Lista Completa: ${fullData.length} registros`);
  console.log(`⭐ Alta Prioridade: ${priorityData.length} registros`);

  // Build set of priority CNPJs
  const priorityCnpjs = new Set(priorityData.map(r => cleanStr(r["CNPJ"])).filter(Boolean));

  const db = await createConnection(process.env.DATABASE_URL);
  console.log("✅ Conectado ao banco de dados");

  // Check if already imported
  const [existing] = await db.execute("SELECT COUNT(*) as cnt FROM leads");
  if (existing[0].cnt > 100) {
    console.log(`⚠️  Banco já tem ${existing[0].cnt} leads. Limpando para reimportar...`);
    await db.execute("DELETE FROM leads");
    console.log("🗑️  Leads removidos.");
  }

  console.log("⬆️  Importando lista completa (34.600 leads)...");
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < fullData.length; i += BATCH_SIZE) {
    const batch = fullData.slice(i, i + BATCH_SIZE);
    for (const row of batch) {
      try {
        const cnpj = cleanStr(row["CNPJ"]);
        const isPriority = cnpj ? priorityCnpjs.has(cnpj) : false;
        const values = mapRow(row, isPriority);
        await db.execute(INSERT_SQL, values);
        imported++;
      } catch (err) {
        skipped++;
      }
    }
    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= fullData.length) {
      process.stdout.write(`\r  Progresso: ${Math.min(i + BATCH_SIZE, fullData.length)}/${fullData.length} (${imported} importados)`);
    }
  }

  console.log(`\n✅ Importados: ${imported} | Ignorados: ${skipped}`);

  const [finalCount] = await db.execute("SELECT COUNT(*) as total, SUM(isHighPriority) as priority FROM leads");
  console.log(`\n🎉 Importação concluída!`);
  console.log(`   Total de leads: ${finalCount[0].total}`);
  console.log(`   Alta prioridade: ${finalCount[0].priority}`);

  await db.end();
}

main().catch(err => {
  console.error("❌ Erro na importação:", err);
  process.exit(1);
});
