import XLSX from "xlsx";

const XLSX_PATH = "/home/ubuntu/upload/MVM_EMPILHADEIRAS_v3.xlsx";

const workbook = XLSX.readFile(XLSX_PATH);
console.log("Abas:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
  console.log(`\n=== ${sheetName} ===`);
  console.log(`Registros: ${data.length}`);
  if (data.length > 0) {
    console.log("Colunas:", Object.keys(data[0]));
    console.log("Amostra:", JSON.stringify(data[0]).substring(0, 300));
  }
}
