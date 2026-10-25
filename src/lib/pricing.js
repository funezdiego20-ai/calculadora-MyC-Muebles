import * as XLSX from 'xlsx';

const normalize = value => String(value ?? '').trim().toLocaleLowerCase('es');
const aliases = { nombre:['nombre','material','producto','item','descripción','descripcion'], tipo:['tipo','unidad','categoria','categoría'], precio:['precio','costo','valor'], espesor:['espesor','mm','grosor'] };
function pick(row, keys) { const entry=Object.entries(row).find(([key])=>keys.includes(normalize(key))); return entry?.[1]; }
export async function importPriceFile(file) {
  const data=await file.arrayBuffer(); const book=XLSX.read(data,{type:'array'}); const sheet=book.Sheets[book.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{defval:''});
  return rows.map((row,index)=>({id:`price-${index}`,name:String(pick(row,aliases.nombre)||'').trim(),type:String(pick(row,aliases.tipo)||'placa').trim().toLocaleLowerCase('es'),price:Number(String(pick(row,aliases.precio)||0).replace(',','.'))||0,thickness:Number(String(pick(row,aliases.espesor)||0).replace(',','.'))||0})).filter(item=>item.name);
}

export function priceFor(item, priceList) {
  const exact=priceList.find(p=>normalize(p.name)===normalize(item.material));
  return exact?.price ?? 0;
}
