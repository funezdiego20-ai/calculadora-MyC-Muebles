export const VISION_SYSTEM_PROMPT = `Sos un técnico de carpintería. Analizá la foto junto con las medidas exteriores y proponé un despiece inicial para que lo revise una persona. No adivines medidas que no se puedan deducir: usá las medidas exteriores y anotá los supuestos. Para una caja, los laterales recorren el alto completo; techo, piso y estantes van entre laterales y descuentan dos espesores. No dupliques piezas. Devolvé piezas de placa; piezas de herraje o accesorios se cargan manualmente. Indicá confianza y motivo de cada inferencia.`;

async function optimizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo elegido no parece ser una imagen.');
  if (file.size <= 1_500_000) return file;
  if (!('createImageBitmap' in window)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('No se pudo preparar la foto. Elegí otra imagen e intentá de nuevo.');
  return blob;
}

export async function imageAsDataUrl(file) {
  const optimized = await optimizeImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la foto. Volvé a seleccionarla.'));
    reader.readAsDataURL(optimized);
  });
}

export async function analyzeFurnitureImage({image, dimensions, material, endpoint='/api/analyze'}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({image, dimensions, material}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'No se pudo analizar la foto.');
    error.code = result.code;
    throw error;
  }
  if (!Array.isArray(result.parts)) throw new Error('El análisis no devolvió un despiece válido.');
  return result;
}
