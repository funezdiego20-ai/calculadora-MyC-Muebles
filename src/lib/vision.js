export const VISION_SYSTEM_PROMPT = `Sos un asistente técnico de carpintería. Analizá la imagen del mueble y devolvé SOLO JSON válido con esta estructura: {"observations":string[],"parts":[{"name":string,"width":number,"height":number,"qty":number,"material":"CARCASS|BACK|FRONT","edge":number,"edgeSides":number,"confidence":number,"reason":string}]}. Las medidas están en centímetros y deben derivarse de las dimensiones externas provistas. No inventes ensambles invisibles: declaralos en observations. Para un mueble tipo caja, laterales recorren el alto completo; techo y piso encastrados entre laterales miden ancho exterior menos dos espesores; estantes siguen ese ancho interior. Nunca dupliques piezas. Marcá inferencias con confidence menor a 0.75 y explicá supuestos. El resultado es una propuesta que requiere aprobación humana antes de costearse.`;

export async function analyzeFurnitureImage({image,dimensions,material,endpoint='/api/analyze'}) {
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image,dimensions,material,systemPrompt:VISION_SYSTEM_PROMPT})});
  if(!response.ok) throw new Error('No se pudo analizar la imagen. Revisá la conexión con el servicio de IA.');
  return response.json();
}
