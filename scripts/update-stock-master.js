// scripts/update-stock-master.js
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// 1. ダウンロードしたExcelファイルを読み込み
const excelPath = path.join(process.cwd(), 'data_j.xls');

if (!fs.existsSync(excelPath)) {
  console.error('❌ data_j.xls がプロジェクトルートに見つかりません。');
  process.exit(1);
}

const workbook = xlsx.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet);

// 2. コードと銘柄名を抽出
const stockMap = {};

rows.forEach((row) => {
  // 東証のExcelカラム名: 「コード」と「銘柄名」
  const code = String(row['コード'] || row['Code'] || '').trim();
  const name = String(row['銘柄名'] || row['Name'] || '').trim();

  // 4桁の通常コード（英字混じり新コードにも対応）
  if (code && name && code.length === 4) {
    stockMap[code] = name;
  }
});

const count = Object.keys(stockMap).length;
console.log(`📊 抽出完了: ${count} 銘柄`);

// 3. app/lib/stockMaster.ts を自動生成
const outputContent = `// app/lib/stockMaster.ts
// 東証上場銘柄マスター（全${count}銘柄 / 自動生成）

export const STOCK_MASTER: Record<string, string> = ${JSON.stringify(stockMap, null, 2)};

/**
 * 証券コード（半角・全角対応）から会社名を取得
 */
export function getCompanyNameByCode(input: string): string | null {
  const trimmed = input.trim();
  const normalized = trimmed.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );
  if (/^\\d{4}$/.test(normalized) || /^[0-9A-Za-z]{4}$/.test(normalized)) {
    return STOCK_MASTER[normalized] || null;
  }
  return null;
}
`;

const outputPath = path.join(process.cwd(), 'app/lib/stockMaster.ts');
fs.writeFileSync(outputPath, outputContent, 'utf8');

console.log(`✅ app/lib/stockMaster.ts を更新しました！（${count}件）`);