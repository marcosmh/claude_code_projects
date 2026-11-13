// Todo lo relacionado con Jev: preguntas (choice / score / noul) e interpretación.

const CHOICE_CRITERIA = {
  category: {
    instructions: 'Clasifica el tipo de consulta del cliente.',
    criteria: {
      Venta: 'quiere comprar, precios, planes, upgrades o información comercial',
      Soporte: 'problema técnico, duda de uso, errores o ayuda con el producto',
      Reclamo: 'queja, mala experiencia, incumplimiento o enfado con el servicio',
      Facturación: 'cobros, facturas, pagos, tarjetas o reembolsos',
    },
  },
  priority: {
    instructions: 'Asigna la prioridad con la que debe atenderse este mensaje.',
    criteria: {
      Baja: 'consulta general sin urgencia',
      Media: 'problema o duda que conviene resolver pronto',
      Alta: 'problema serio, cliente molesto o dinero implicado',
      Crítica: 'servicio caído, pérdida económica grave, amenaza legal o de abandono inminente',
    },
  },
  action: {
    instructions: 'Elige la mejor acción que debe tomar el equipo de soporte.',
    criteria: {
      Responder: 'basta con contestar la duda con información',
      'Pedir datos': 'faltan datos (pedido, cuenta, error) para poder ayudar',
      'Ofrecer descuento': 'cliente indeciso o molesto que se retiene con una oferta',
      Reembolsar: 'cobro duplicado o erróneo, o fallo claro que justifica devolver dinero',
      'Escalar a un agente humano': 'caso delicado, complejo o muy emocional que requiere una persona',
    },
  },
};

const CHURN_LEVELS = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];

// "nuol" devuelve la probabilidad (0-1) de que algo sea cierto; con ellas se construye la explicación.
const SIGNALS = {
  angry: { instructions: '¿El cliente expresa enfado o frustración?', text: 'el cliente muestra enfado o frustración' },
  leaving: { instructions: '¿El cliente amenaza con cancelar, irse a la competencia o dejar el servicio?', text: 'menciona que podría abandonar el servicio' },
  money: { instructions: '¿El mensaje trata de un cobro, pago o dinero perdido?', text: 'hay dinero implicado' },
  urgent: { instructions: '¿El cliente necesita una solución urgente?', text: 'el caso es urgente' },
};

function buildQuestions() {
  const questions = {};
  for (const [id, q] of Object.entries(CHOICE_CRITERIA)) questions[id] = { type: 'choice', ...q };
  questions.churn = {
    type: 'score',
    instructions: '¿Qué tan probable es que este cliente abandone el servicio?',
    criteria: CHURN_LEVELS,
  };
  for (const [id, s] of Object.entries(SIGNALS)) {
    questions[`signal_${id}`] = { type: 'noul', instructions: s.instructions };
  }
  return questions;
}

export async function analyze(message) {
  const res = await fetch('/api/jev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: message, model: 'jev-latest', questions: buildQuestions() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.detail?.toString() || `Error ${res.status} de Jev`);
  return interpret(data.answers ?? data);
}

function interpret(a) {
  // score: valor esperado en la escala 0..(n-1) -> porcentaje 0..100
  const risk = Math.round((a.churn.score / (CHURN_LEVELS.length - 1)) * 100);
  const result = {
    category: a.category.choice,
    priority: a.priority.choice,
    action: a.action.choice,
    risk: Math.min(100, Math.max(0, risk)),
  };
  result.explanation = explain(result, a);
  return result;
}

// Explicación breve construida con las señales nuol más probables (> 50%).
function explain(r, a) {
  const active = Object.entries(SIGNALS)
    .filter(([id]) => a[`signal_${id}`].noul > 0.5)
    .map(([, s]) => s.text);
  const why = active.length ? `Porque ${active.join(', ')}.` : 'No se detectan señales de alarma.';
  return `Consulta de tipo ${r.category.toLowerCase()} con prioridad ${r.priority.toLowerCase()}. ${why} ` +
    `Acción recomendada: ${r.action.toLowerCase()}. Riesgo de abandono: ${r.risk}%.`;
}
