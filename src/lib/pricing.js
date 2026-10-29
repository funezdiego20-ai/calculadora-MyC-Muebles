import * as XLSX from 'xlsx';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('es');
const cleanPrice = value => {
  if (typeof value === 'number') return value;
  let text = String(value ?? '').replace(/[^\d.,-]/g, '');
  if (!text) return 0;
  if (text.includes(',') && text.includes('.')) text = text.replace(/\./g, '').replace(',', '.');
  else if (text.includes(',')) text = text.replace(',', '.');
  else if (/\.\d{3}$/.test(text)) text = text.replace('.', '');
  return Number(text) || 0;
};

function categoryFromFile(name) {
  const file = normalize(name);
  if (/filo|canto|tapacanto/.test(file)) return 'canto';
  if (/herra/.test(file)) return 'herrajes';
  return 'placa';
}

function parseSheet(sheet, type, fileName) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
  const headerIndex = rows.findIndex(row => row.some(value => /^(nombre|material|producto|item|descripci[oó]n)$/i.test(normalize(value))) && row.some(value => /^(precio|costo|valor)$/i.test(normalize(value))));
  if (headerIndex >= 0) {
    const headers = rows[headerIndex].map(normalize);
    const nameIndex = headers.findIndex(value => /^(nombre|material|producto|item|descripci[oó]n)$/.test(value));
    const priceIndex = headers.findIndex(value => /^(precio|costo|valor)$/.test(value));
    const typeIndex = headers.findIndex(value => /^(tipo|categor[ií]a)$/.test(value));
    const thicknessIndex = headers.findIndex(value => /^(espesor|grosor|mm)$/.test(value));
    return rows.slice(headerIndex + 1).flatMap(row => {
      const name = String(row[nameIndex] ?? '').trim();
      const price = cleanPrice(row[priceIndex]);
      if (!name || price <= 0) return [];
      const rowType = typeIndex >= 0 ? normalize(row[typeIndex]) : '';
      const category = /herra|unidad/.test(rowType) ? 'herrajes' : /canto|filo|metro|mts/.test(rowType) ? 'canto' : type;
      const thickness = Number(row[thicknessIndex] || (name.match(/(\d+)\s*mm/i) || [])[1] || 0);
      return [{ name, type: category, price, thickness, source: fileName }];
    });
  }
  const items = [];
  for (const row of rows) {
    const name = String(row[0] ?? '').trim();
    if (!name || /^lista de precios|^material$|^filos$/i.test(name)) continue;
    const rawPrice = row.slice(1).reverse().find(value => typeof value === 'number' || (typeof value === 'string' && /\d/.test(value)));
    if (rawPrice === undefined) continue;
    const price = cleanPrice(rawPrice);
    if (!Number.isFinite(price) || price <= 0) continue;
    const thickness = Number((name.match(/(\d+)\s*mm/i) || [])[1] || 0);
    items.push({ name, type, price, thickness, source: fileName });
  }
  return items;
}

export async function importPriceFile(file) {
  const data = await file.arrayBuffer();
  const book = XLSX.read(data, { type: 'array' });
  const type = categoryFromFile(file.name);
  const items = book.SheetNames.flatMap(sheetName => parseSheet(book.Sheets[sheetName], type, file.name));
  const unique = new Map(items.map(item => [normalize(item.name), item]));
  return [...unique.values()];
}

export function priceFor(item, priceList) {
  const exact = priceList.find(price => normalize(price.name) === normalize(item.material));
  return exact?.price ?? 0;
}
