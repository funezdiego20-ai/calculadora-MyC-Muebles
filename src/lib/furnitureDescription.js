import { suggestCabinetParts } from './cutlist.js';

const normalize = value => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const countOf = (text, noun) => {
  const match = text.match(new RegExp(`\\b(\\d+)\\s+(?:${noun})\\b`, 'i'));
  return match ? Math.max(0, Number(match[1])) : null;
};
const hasNegative = (text, noun) => new RegExp(`\\b(?:sin|no lleva|no tiene|sin incluir)\\b[^.!;]{0,24}\\b(?:${noun})\\b`, 'i').test(text);

function materialHints(item) {
  const name = normalize(item.name);
  const hints = [];
  if (name.includes('aglomerado')) hints.push('aglomerado');
  if (name.includes('fibro')) hints.push('fibro');
  if (name.includes('melamina')) {
    hints.push('melamina');
    for (const color of ['wengue','venecia','nebraska','helsinki','blanca','blanco','negra','negro','natural','gris','color']) {
      if (name.includes(color)) hints.push(color);
    }
  }
  return [...new Set(hints)];
}

function partGroup(name) {
  const part = normalize(name);
  if (/frente.*cajon/.test(part)) return /frente|puerta|cajon/;
  if (/cajon/.test(part)) return /cajon|caja/;
  if (/lateral|costado/.test(part)) return /costado|lateral/;
  if (/techo/.test(part)) return /techo/;
  if (/piso/.test(part)) return /piso|base/;
  if (/estante/.test(part)) return /estante|baldas|entrepanos/;
  if (/divisor/.test(part)) return /divisor|division/;
  if (/puerta/.test(part)) return /puerta|frente/;
  if (/fondo/.test(part)) return /fondo|trasera/;
  if (/zocalo/.test(part)) return /zocalo/;
  return null;
}

function chooseMaterial(partName, clauses, selectedBoards, fallbackMaterial) {
  const group = partGroup(partName);
  if (!group) return fallbackMaterial;
  let clause = clauses.find(item => group.test(item) && /melamina|aglomerado|fibro|madera/i.test(item));
  if (!clause) {
    const partIndex = clauses.findIndex(item => group.test(item));
    if (partIndex >= 0) {
      const following = clauses.slice(partIndex + 1, partIndex + 3).find(item => /melamina|aglomerado|fibro|madera/i.test(item));
      if (following) clause = `${clauses[partIndex]} ${following}`;
    }
  }
  if (!clause) return fallbackMaterial;
  const text = normalize(clause);
  const color = ['wengue','venecia','nebraska','helsinki','blanca','blanco','negra','negro','natural','gris','color'].find(value => text.includes(value));
  const matches = selectedBoards.filter(material => {
    const name = normalize(material.name);
    if (text.includes('melamina')) return name.includes('melamina') && (!color || name.includes(color));
    if (text.includes('aglomerado')) return name.includes('aglomerado') && !name.includes('melamina');
    if (text.includes('fibro')) return name.includes('fibro');
    return materialHints(material).some(hint => text.includes(hint));
  });
  if (matches.length) {
    const hasColor = /wengue|venecia|nebraska|helsinki|blanc[oa]|negr[oa]|natural|gris|color/.test(text);
    if (hasColor) return matches.find(material => materialHints(material).some(hint => hint !== 'melamina' && text.includes(hint)))?.name || matches[0].name;
    return matches.find(material => material.name === fallbackMaterial)?.name || matches[0].name;
  }
  return fallbackMaterial;
}

function addHardware(parts, prices, name, qty) {
  const item = prices.find(price => price.type.includes('herrajes') && normalize(price.name) === normalize(name));
  if (!item || qty <= 0) return;
  parts.push({ id: `description-hardware-${parts.length}`, name: item.name, width: 0, height: 0, qty, material: item.name, edge: 0, edgeSides: 0, edgeMaterial: '' });
}

/** Creates an editable, approximate cut list from common furniture terms. */
export function buildDescriptionCutlist({ width, height, depth, shelves = 3, primaryMaterial, selectedMaterials, prices, edgeMaterial, furnitureName = '', furnitureDetails = '' }) {
  const w = Number(width), h = Number(height), d = Number(depth);
  if (![w, h, d].every(Number.isFinite) || Math.min(w, h, d) <= 0) throw new Error('Ingresá ancho, alto y profundidad válidos antes de generar el despiece.');
  const selectedBoards = prices.filter(item => item.type.includes('placa') && selectedMaterials.includes(item.name));
  if (!selectedBoards.length) throw new Error('Tildá al menos un material para este mueble.');
  const primary = selectedBoards.some(item => item.name === primaryMaterial) ? primaryMaterial : selectedBoards[0].name;
  const text = normalize(`${furnitureName} ${furnitureDetails}`);
  const clauses = text.split(/[\n,;.!]+/).map(value => value.trim()).filter(Boolean);
  const drawerMentioned = /cajon|cajonero/.test(text) && !hasNegative(text, 'cajon(?:es)?');
  const doorMentioned = /puerta/.test(text) && !hasNegative(text, 'puerta(?:s)?');
  const statedDrawerCount = countOf(text, 'cajon(?:es)?');
  const statedDoorCount = countOf(text, 'puertas?');
  const drawerCount = drawerMentioned ? (statedDrawerCount ?? (text.includes('cajonero') ? 3 : 1)) : 0;
  const doorCount = doorMentioned ? (statedDoorCount ?? 2) : 0;
  const shelfMentioned = /estante|baldas?|entrepanos?/.test(text);
  const shelfCount = hasNegative(text, 'estantes?|baldas?|entrepanos?') ? 0 : (countOf(text, 'estantes?') ?? (shelfMentioned ? Number(shelves) : (drawerCount ? 0 : Number(shelves))));
  const dividerCount = /divisor|division/.test(text) && !hasNegative(text, 'divisores?|divisiones?') ? (countOf(text, 'divisores?|divisiones?') ?? 1) : 0;
  const thickness = (selectedBoards.find(item => item.name === primary)?.thickness || 18) / 10;
  const base = suggestCabinetParts({ width: w, height: h, depth: d, thickness, shelves: shelfCount, material: primary });
  const innerWidth = Math.max(1, w - 2 * thickness);
  const sideHeight = Math.max(8, (h - 4) / Math.max(1, drawerCount) - 1);
  const drawerDepth = Math.max(10, d - 7);
  const backWidth = Math.max(1, innerWidth - 2 * thickness);
  const rows = base.map(part => {
    const fallback = /fondo/i.test(part.name) ? (selectedBoards.find(item => normalize(item.name).includes('fondo fibro facil 3mm'))?.name || primary) : primary;
    return { ...part, material: chooseMaterial(part.name, clauses, selectedBoards, fallback), edgeMaterial: edgeMaterial || '' };
  });
  const observations = [];
  const pricesToAdd = [];
  if (drawerMentioned && statedDrawerCount === null) observations.push(`No indicaste cuántos cajones. Se propusieron ${drawerCount} como referencia.`);
  if (doorMentioned && statedDoorCount === null) observations.push('No indicaste cuántas puertas. Se propusieron 2 como referencia.');
  if (/divisor|division/.test(text) && !hasNegative(text, 'divisores?|divisiones?') && countOf(text, 'divisores?|divisiones?') === null) observations.push('No indicaste cuántos divisores. Se propuso 1 como referencia.');

  if (drawerCount) {
    const drawerBottomMaterial = selectedBoards.find(item => normalize(item.name).includes('fondo fibro facil 3mm'))?.name || primary;
    rows.push(
      { id:'description-drawer-front', name:'Frente de cajón', width:innerWidth, height:sideHeight, qty:drawerCount, material:chooseMaterial('Frente cajón', clauses, selectedBoards, primary), edge:innerWidth, edgeSides:1, edgeMaterial:edgeMaterial||'' },
      { id:'description-drawer-side', name:'Costado de cajón', width:drawerDepth, height:sideHeight, qty:drawerCount*2, material:chooseMaterial('Costado cajón', clauses, selectedBoards, primary), edge:0, edgeSides:0, edgeMaterial:edgeMaterial||'' },
      { id:'description-drawer-back', name:'Trasera de cajón', width:backWidth, height:sideHeight, qty:drawerCount, material:chooseMaterial('Trasera cajón', clauses, selectedBoards, primary), edge:0, edgeSides:0, edgeMaterial:edgeMaterial||'' },
      { id:'description-drawer-bottom', name:'Fondo de cajón', width:backWidth, height:drawerDepth, qty:drawerCount, material:chooseMaterial('Fondo cajón', clauses, selectedBoards, drawerBottomMaterial), edge:0, edgeSides:0, edgeMaterial:edgeMaterial||'' },
    );
    observations.push(`Se agregaron las piezas para ${drawerCount} cajón${drawerCount===1?'':'es'}.`);
  }
  if (doorCount) {
    rows.push({ id:'description-door', name:'Puerta', width:innerWidth/doorCount, height:Math.max(1,h-2), qty:doorCount, material:chooseMaterial('Puerta', clauses, selectedBoards, primary), edge:Math.max(1,h-2), edgeSides:1, edgeMaterial:edgeMaterial||'' });
    observations.push(`Se agregaron ${doorCount} puerta${doorCount===1?'':'s'}.`);
  }
  if (dividerCount) {
    rows.push({ id:'description-divider', name:'División vertical', width:Math.max(1,d-2*thickness), height:Math.max(1,h-2*thickness), qty:dividerCount, material:chooseMaterial('Divisor', clauses, selectedBoards, primary), edge:Math.max(1,h-2*thickness), edgeSides:1, edgeMaterial:edgeMaterial||'' });
    observations.push(`Se agregaron ${dividerCount} divisor${dividerCount===1?'':'es'}.`);
  }
  if (/zocalo/.test(text)) {
    rows.push({ id:'description-plinth', name:'Zócalo frontal', width:innerWidth, height:8, qty:1, material:chooseMaterial('Zócalo', clauses, selectedBoards, primary), edge:innerWidth, edgeSides:1, edgeMaterial:edgeMaterial||'' });
    observations.push('Se agregó un zócalo frontal de 8 cm de alto. Revisá la medida.');
  }

  if (/manija/.test(text) && !hasNegative(text, 'manijas?')) addHardware(rows, prices, 'Manijas', Math.max(1, doorCount + drawerCount));
  if (/bisagra/.test(text) && !hasNegative(text, 'bisagras?')) addHardware(rows, prices, 'Bisagrass Articuladas', Math.max(1, doorCount * 2));
  if (/corredera/.test(text) && !hasNegative(text, 'correderas?')) {
    const length = (text.match(/correderas?[^.;]{0,24}\b(30|35|40|45)\s*cm/) || [])[1];
    const telescopic = text.includes('telescopica');
    const hardware = prices.find(item => item.type.includes('herrajes') && normalize(item.name).includes('corredera') && (length ? normalize(item.name).includes(`${length} cm`) : false) && normalize(item.name).includes(telescopic ? 'telescopicas' : 'metalicas'));
    if (hardware) rows.push({ id:`description-hardware-${rows.length}`, name:hardware.name, width:0, height:0, qty:Math.max(1,drawerCount*2), material:hardware.name, edge:0, edgeSides:0, edgeMaterial:'' });
    else {
      const placeholder = { name:'Correderas metálicas (elegir medida)', type:'herrajes', price:0, thickness:0 };
      pricesToAdd.push(placeholder);
      rows.push({ id:`description-hardware-${rows.length}`, name:placeholder.name, width:0, height:0, qty:Math.max(1,drawerCount*2), material:placeholder.name, edge:0, edgeSides:0, edgeMaterial:'' });
      observations.push('Se agregó la corredera como pendiente de elegir medida. Cambiá ese renglón por el modelo correcto antes de cotizar.');
    }
  }
  const accessoryRules = [
    [/\bcerradura/, 'Cerraduras', 1, 'cerraduras?'],
    [/\bpush\b/, 'Push abrir', 1, 'push'],
    [/\bbotinero/, 'Botineros Plasticos', 1, 'botineros?'],
    [/\bescuadra/, 'Escuadras para colgar alacenas', 2, 'escuadras?'],
    [/ruedas?[^.;]{0,18}\btv\b/, 'Ruedas tv con base Plasticas x4', 1, 'ruedas?'],
    [/ruedas?[^.;]{0,18}puertas? corredizas?/, 'Ruedas Puertas corredizas', 4, 'ruedas?'],
  ];
  for (const [pattern, itemName, qty, noun] of accessoryRules) if (pattern.test(text) && !hasNegative(text, noun)) addHardware(rows, prices, itemName, qty);
  if (/\bpatas?\b/.test(text) && !hasNegative(text, 'patas?')) {
    const legSize = (text.match(/patas?[^.;]{0,18}\b(10|15)\s*cm/) || [])[1];
    if (legSize) addHardware(rows, prices, `Patas Plasticas ${legSize} cm`, 4);
    else observations.push('Se mencionaron patas, pero falta indicar si son de 10 o 15 cm. Agregalas desde el despiece.');
  }
  if (rows.some(part => prices.some(price => price.type.includes('herrajes') && normalize(price.name) === normalize(part.material)) || pricesToAdd.some(price => normalize(price.name) === normalize(part.material)))) observations.push('Revisá modelo y cantidad de herrajes antes de cotizar.');
  observations.push('Las medidas de puertas y cajones son una propuesta inicial. Revisá y corregí cada pieza antes de aprobar el costo.');
  return { parts: rows.map((part,index) => ({ ...part, id: part.id || `description-${index}` })), pricesToAdd, observations, detected: { drawerCount, doorCount, shelfCount, dividerCount } };
}
