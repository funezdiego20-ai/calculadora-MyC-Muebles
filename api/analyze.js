const PROMPT = `Sos un técnico de carpintería. Analizá la foto junto con las medidas exteriores y proponé un despiece inicial para que lo revise una persona. No adivines medidas que no se puedan deducir: usá las medidas exteriores y anotá los supuestos. Para una caja, los laterales recorren el alto completo; techo, piso y estantes van entre laterales y descuentan dos espesores. No dupliques piezas. Devolvé piezas de placa; piezas de herraje o accesorios se cargan manualmente. Indicá confianza y motivo de cada inferencia. Todas las medidas de salida están en centímetros.`;
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    observations: {type: 'array', items: {type: 'string'}},
    parts: {type: 'array', items: {
      type: 'object', additionalProperties: false,
      properties: {
        name: {type: 'string'}, width: {type: 'number'}, height: {type: 'number'}, qty: {type: 'integer'},
        material: {type: 'string', enum: ['CARCASS', 'BACK', 'FRONT']}, edge: {type: 'number'}, edgeSides: {type: 'integer'},
        confidence: {type: 'number'}, reason: {type: 'string'},
      },
      required: ['name', 'width', 'height', 'qty', 'material', 'edge', 'edgeSides', 'confidence', 'reason'],
    }},
  }, required: ['observations', 'parts'],
};
const attempts = new Map();
const MAX_BODY = 3_200_000;

function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.start > 60_000) attempts.set(ip, {start: now, count: 1});
  else { record.count += 1; if (record.count > 8) return true; }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({code: 'METHOD_NOT_ALLOWED', error: 'Usá POST para analizar una foto.'});
  if (limited(req)) return res.status(429).json({code: 'RATE_LIMITED', error: 'Se alcanzó el límite temporal. Esperá un minuto y volvé a intentar.'});
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({code: 'AI_NOT_CONFIGURED', error: 'El análisis de fotos todavía no está activado. Configurá OPENAI_API_KEY en Vercel para habilitar la IA.'});
  const rawLength = Number(req.headers['content-length'] || 0);
  if (rawLength > MAX_BODY) return res.status(413).json({code: 'IMAGE_TOO_LARGE', error: 'La foto es demasiado pesada. Elegí una imagen más pequeña.'});
  const {image, dimensions, material} = req.body || {};
  if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > MAX_BODY) {
    return res.status(400).json({code: 'INVALID_IMAGE', error: 'La imagen no es válida o supera el tamaño permitido.'});
  }
  const dims = ['width', 'height', 'depth'].map(key => Number(dimensions?.[key]));
  if (!dims.every(value => Number.isFinite(value) && value > 0 && value <= 1000) || typeof material !== 'string' || material.length > 160) {
    return res.status(400).json({code: 'INVALID_INPUT', error: 'Revisá las medidas y el material antes de analizar.'});
  }
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || 'gpt-4.1-mini', store: false,
        input: [
          {role: 'developer', content: [{type: 'input_text', text: PROMPT}]},
          {role: 'user', content: [
            {type: 'input_text', text: `Medidas exteriores (cm): ancho ${dims[0]}, alto ${dims[1]}, profundidad ${dims[2]}. Espesor/material principal: ${material}.`},
            {type: 'input_image', image_url: image, detail: 'high'},
          ]},
        ],
        text: {format: {type: 'json_schema', name: 'furniture_cutlist', strict: true, schema}},
      }),
    });
    if (!upstream.ok) {
      if (upstream.status === 401) return res.status(502).json({code: 'AI_AUTH_ERROR', error: 'La clave de IA configurada en Vercel no es válida.'});
      if (upstream.status === 429) return res.status(503).json({code: 'AI_BUSY', error: 'El servicio de IA alcanzó su límite o cuota. Revisá la cuenta de IA e intentá luego.'});
      return res.status(502).json({code: 'AI_PROVIDER_ERROR', error: 'El servicio de análisis no respondió correctamente. Intentá nuevamente.'});
    }
    const payload = await upstream.json();
    const outputText = payload.output_text || payload.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
    if (!outputText) throw new Error('empty response');
    const result = JSON.parse(outputText);
    if (!Array.isArray(result.parts) || result.parts.length > 100) throw new Error('invalid parts');
    for (const part of result.parts) {
      if (![part.width, part.height, part.qty, part.edge, part.edgeSides, part.confidence].every(Number.isFinite) || part.width < 0 || part.height < 0 || part.qty < 1 || part.qty > 500 || part.width > 1000 || part.height > 1000) throw new Error('invalid dimensions');
    }
    return res.status(200).json(result);
  } catch {
    return res.status(502).json({code: 'AI_RESPONSE_ERROR', error: 'No se pudo interpretar la respuesta del análisis. Probá otra foto más clara.'});
  }
}
