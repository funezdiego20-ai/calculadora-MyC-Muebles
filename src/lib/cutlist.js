export const starterParts = [
  {id:'left',name:'Lateral izquierdo',width:55,height:180,qty:1,material:'Melamina blanca 18 mm',edge:2,edgeSides:2},
  {id:'right',name:'Lateral derecho',width:55,height:180,qty:1,material:'Melamina blanca 18 mm',edge:2,edgeSides:2},
  {id:'top',name:'Techo',width:76.4,height:55,qty:1,material:'Melamina blanca 18 mm',edge:1,edgeSides:1},
  {id:'bottom',name:'Piso',width:76.4,height:55,qty:1,material:'Melamina blanca 18 mm',edge:1,edgeSides:1},
  {id:'shelf',name:'Estante regulable',width:76.4,height:52,qty:3,material:'Melamina blanca 18 mm',edge:1,edgeSides:1},
  {id:'back',name:'Fondo',width:80,height:180,qty:1,material:'Fibrofácil 3 mm',edge:0,edgeSides:0},
];

/** Simple carcass estimate: sides run full height; top/bottom fit between sides. */
export function suggestCabinetParts({width,height,depth,thickness=1.8,shelves=2,material='Melamina blanca 18 mm'}) {
  const w=Number(width),h=Number(height),d=Number(depth),t=Number(thickness);
  if (![w,h,d,t].every(Number.isFinite)||Math.min(w,h,d,t)<=0) throw new Error('Ingresá medidas válidas mayores que cero.');
  const innerWidth=Math.max(1,w-2*t);
  return [
    {name:'Lateral izquierdo',width:d,height:h,qty:1,material,edge:2,edgeSides:2},
    {name:'Lateral derecho',width:d,height:h,qty:1,material,edge:2,edgeSides:2},
    {name:'Techo',width:innerWidth,height:d,qty:1,material,edge:1,edgeSides:1},
    {name:'Piso',width:innerWidth,height:d,qty:1,material,edge:1,edgeSides:1},
    ...(Number(shelves)>0?[{name:'Estante regulable',width:innerWidth,height:Math.max(1,d-3),qty:Number(shelves),material,edge:1,edgeSides:1}]:[]),
    {name:'Fondo',width:w,height:h,qty:1,material:'Fibrofácil 3 mm',edge:0,edgeSides:0},
  ].map((part,index)=>({...part,id:`generated-${index}`}));
}

export function calculateQuote(parts, priceList, markupPercent=35) {
  const lines=parts.map(part=>{
    const area=(Number(part.width)*Number(part.height)*Number(part.qty))/10000;
    const edgeMeters=(Number(part.edge)||0)*(Number(part.edgeSides)||0)*Number(part.qty)/100;
    const material=priceList.find(p=>p.name.toLocaleLowerCase('es')===String(part.material).toLocaleLowerCase('es'));
    const materialCost=area*(material?.price||0);
    const edge=priceList.find(p=>p.type.includes('canto'));
    return {...part,area,edgeMeters,materialCost,edgeCost:edgeMeters*(edge?.price||0)};
  });
  const base=lines.reduce((sum,line)=>sum+line.materialCost+line.edgeCost,0);
  const markup=base*(Number(markupPercent)||0)/100;
  return {lines,base,markup,total:base+markup};
}
