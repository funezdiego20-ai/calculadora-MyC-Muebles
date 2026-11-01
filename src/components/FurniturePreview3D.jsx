import {useMemo, useRef, useState} from 'react';
import {RotateCcw, RotateCw} from 'lucide-react';
import './preview3d.css';

const clean = value => String(value || '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function materialColor(name = '') {
  const value = clean(name);
  if (/negra|negro|black/.test(value)) return '#414642';
  if (/wengue|nogal|oscuro/.test(value)) return '#69503f';
  if (/gris|gray/.test(value)) return '#9da4a1';
  if (/nebraska|roble|natural|madera|aglomerado/.test(value)) return '#b89266';
  if (/fondo|fibro|crudo/.test(value)) return '#cbbb9e';
  if (/blanco|blanca|white/.test(value)) return '#e8e5dc';
  if (/melamina/.test(value)) return '#c7a47a';
  return '#b8c8bb';
}

function cabinetGeometry({width, height, depth, parts, prices}) {
  const w = Math.max(1, Number(width) || 80);
  const h = Math.max(1, Number(height) || 80);
  const d = Math.max(1, Number(depth) || 45);
  const boardParts = parts.filter(part => Number(part.width) > 0 && Number(part.height) > 0);
  const match = regex => boardParts.find(part => regex.test(clean(part.name)));
  const side = match(/lateral|costado/) || boardParts[0];
  const top = match(/techo/);
  const bottom = match(/piso|base/);
  const back = match(/fondo|trasera/);
  const doorParts = boardParts.filter(part => /puerta/.test(clean(part.name)));
  const drawerParts = boardParts.filter(part => /frente.*caj|frente de caj/.test(clean(part.name)));
  const shelves = boardParts.filter(part => /estante|baldas|entrepanos/.test(clean(part.name)));
  const dividers = boardParts.filter(part => /divisor|division/.test(clean(part.name)));
  const plinth = match(/zocalo/);
  const thicknessFor = part => Math.min(3, Math.max(.3, (Number(prices.find(item => item.name === part?.material)?.thickness) || 18) / 10));
  const baseThickness = thicknessFor(side);
  const box = [];
  const add = (x, y, z, sx, sy, sz, material, label) => {
    if (sx <= 0 || sy <= 0 || sz <= 0) return;
    box.push({x, y, z, sx, sy, sz, material: material || 'Melamina', label});
  };

  add(0, 0, 0, baseThickness, d, h, side?.material, 'Lateral izquierdo');
  add(w - baseThickness, 0, 0, baseThickness, d, h, side?.material, 'Lateral derecho');
  add(baseThickness, 0, h - baseThickness, w - 2 * baseThickness, d, thicknessFor(top || side), top?.material || side?.material, 'Techo');
  add(baseThickness, 0, 0, w - 2 * baseThickness, d, thicknessFor(bottom || side), bottom?.material || side?.material, 'Piso');

  const shelvesQty = Math.max(0, ...shelves.map(part => Number(part.qty) || 0));
  for (let index = 0; index < shelvesQty; index++) {
    const part = shelves[0];
    const z = baseThickness + ((h - 2 * baseThickness) * (index + 1)) / (shelvesQty + 1);
    add(baseThickness, baseThickness, z, w - 2 * baseThickness, d - baseThickness, thicknessFor(part), part?.material || side?.material, part?.name || 'Estante');
  }
  dividers.forEach((part, index) => {
    const thickness = thicknessFor(part);
    const position = w * (index + 1) / (dividers.length + 1);
    add(position - thickness / 2, baseThickness, baseThickness, thickness, d - baseThickness, h - 2 * baseThickness, part.material, part.name);
  });
  if (back) add(0, .15, 0, w, thicknessFor(back), h, back.material, back.name);

  if (doorParts.length) {
    const part = doorParts[0];
    const count = Math.max(1, doorParts.reduce((sum, item) => sum + (Number(item.qty) || 0), 0));
    const doorWidth = w / count;
    for (let index = 0; index < count; index++) {
      add(index * doorWidth + .25, d - baseThickness * .35, baseThickness, Math.max(1, doorWidth - .5), .8, h - 2 * baseThickness, part.material, part.name);
    }
  }
  if (drawerParts.length) {
    const part = drawerParts[0];
    const count = Math.max(1, drawerParts.reduce((sum, item) => sum + (Number(item.qty) || 0), 0));
    const drawerHeight = (h - 2 * baseThickness) / count;
    for (let index = 0; index < count; index++) {
      add(.25, d - baseThickness * .3, baseThickness + index * drawerHeight + .2, w - .5, .8, Math.max(1, drawerHeight - .4), part.material, part.name);
    }
  }
  if (plinth) add(baseThickness, d - 2, 0, w - 2 * baseThickness, 2, Math.min(8, h * .1), plinth.material, plinth.name);
  if (!box.length) add(0, 0, 0, w, d, h, side?.material || 'Melamina', 'Mueble');
  return {box, width: w, height: h, depth: d, count: boardParts.reduce((sum, part) => sum + (Number(part.qty) || 0), 0)};
}

const facePaths = [
  {vertices: [1, 2, 6, 5], shade: 1.08},
  {vertices: [0, 4, 7, 3], shade: .78},
  {vertices: [0, 1, 5, 4], shade: .9},
  {vertices: [3, 7, 6, 2], shade: .96},
  {vertices: [4, 5, 6, 7], shade: 1.14},
  {vertices: [0, 3, 2, 1], shade: .7},
];
const shadeColor = (hex, factor) => {
  const value = hex.replace('#', '');
  const rgb = [0, 2, 4].map(index => Math.round(parseInt(value.slice(index, index + 2), 16) * factor));
  return `rgb(${rgb.map(channel => Math.max(0, Math.min(255, channel))).join(',')})`;
};

export default function FurniturePreview3D({width, height, depth, parts, prices}) {
  const [yaw, setYaw] = useState(.62);
  const [pitch, setPitch] = useState(.28);
  const drag = useRef(null);
  const model = useMemo(() => cabinetGeometry({width, height, depth, parts, prices}), [width, height, depth, parts, prices]);
  const faces = useMemo(() => {
    const points = [];
    const rawFaces = [];
    for (const board of model.box) {
      const {x, y, z, sx, sy, sz} = board;
      const vertices = [[x,y,z],[x+sx,y,z],[x+sx,y+sy,z],[x,y+sy,z],[x,y,z+sz],[x+sx,y,z+sz],[x+sx,y+sy,z+sz],[x,y+sy,z+sz]];
      for (const face of facePaths) {
        const projected = face.vertices.map(index => {
          const [vx, vy, vz] = vertices[index];
          const localX = vx - model.width / 2;
          const localY = vy - model.depth / 2;
          const rotatedX = Math.cos(yaw) * localX - Math.sin(yaw) * localY;
          const rotatedY = Math.sin(yaw) * localX + Math.cos(yaw) * localY;
          return {x: rotatedX, y: rotatedY * Math.cos(pitch) - (vz - model.height / 2) * Math.sin(pitch), depth: rotatedY * Math.sin(pitch) + (vz - model.height / 2) * Math.cos(pitch)};
        });
        rawFaces.push({points: projected, depth: projected.reduce((sum, point) => sum + point.depth, 0) / projected.length, material: board.material, shade: face.shade});
        points.push(...projected);
      }
    }
    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));
    const scale = Math.min(310 / Math.max(1, maxX - minX), 210 / Math.max(1, maxY - minY));
    const offsetX = 180 - ((minX + maxX) / 2) * scale;
    const offsetY = 126 - ((minY + maxY) / 2) * scale;
    return rawFaces.sort((a, b) => a.depth - b.depth).map((face, index) => ({...face, key: index, path: face.points.map((point, pointIndex) => `${pointIndex ? 'L' : 'M'}${(point.x * scale + offsetX).toFixed(1)},${(point.y * scale + offsetY).toFixed(1)}`).join(' ') + ' Z'}));
  }, [model, yaw, pitch]);
  const materials = [...new Set(model.box.map(part => part.material).filter(Boolean))].slice(0, 4);

  return <section className="preview3d-panel" aria-label="Vista previa tridimensional del mueble">
    <div className="preview3d-heading"><div><span className="preview3d-kicker">VISTA INTERACTIVA</span><h3>Así se vería armado</h3><p>Arrastrá para girar y comprobar cómo combinan los materiales.</p></div><div className="preview3d-controls"><button type="button" title="Girar a la izquierda" aria-label="Girar a la izquierda" onClick={() => setYaw(value => value - .28)}><RotateCcw size={16}/></button><button type="button" title="Girar a la derecha" aria-label="Girar a la derecha" onClick={() => setYaw(value => value + .28)}><RotateCw size={16}/></button><button type="button" title="Vista de frente" onClick={() => {setYaw(0);setPitch(0)}}>Frente</button></div></div>
    <div className="preview3d-stage" onPointerDown={event => {drag.current = {x: event.clientX, y: event.clientY};event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={event => {if (!drag.current) return;const dx = event.clientX - drag.current.x;const dy = event.clientY - drag.current.y;drag.current = {x: event.clientX, y: event.clientY};setYaw(value => value + dx * .012);setPitch(value => Math.max(-.15, Math.min(.8, value + dy * .006)) )}} onPointerUp={() => {drag.current = null}} onPointerCancel={() => {drag.current = null}}>
      <svg viewBox="0 0 360 250" role="img" aria-label={`Vista 3D estimada: ${model.width} cm de ancho, ${model.height} cm de alto y ${model.depth} cm de profundidad`}>
        <ellipse cx="180" cy="224" rx="104" ry="12" fill="#203128" opacity=".08"/>
        {faces.map(face => <path key={face.key} d={face.path} fill={shadeColor(materialColor(face.material), face.shade)} stroke="#354239" strokeWidth=".75" strokeLinejoin="round"/>)}
      </svg>
      <span className="preview3d-drag-hint">↔ Arrastrá para girar</span>
    </div>
    <div className="preview3d-footer"><span>{model.width} × {model.height} × {model.depth} cm · {model.count} piezas listadas</span><div className="preview3d-legend">{materials.map(material => <span key={material}><i style={{background: materialColor(material)}}/>{material}</span>)}</div></div>
    <small className="preview3d-disclaimer">Representación orientativa basada en medidas, piezas y materiales asignados; no reemplaza la revisión del despiece.</small>
  </section>;
}
