// Todo lo relacionado con Jev: preguntas (choice / score / noul) e interpretación.

const CHOICE_CRITERIA = {
  category: {
    instructions:
      'Clasifica el motivo principal del mensaje del cliente. Si el cliente se queja de un producto o servicio ' +
      'que compró (defectuoso, no funciona, no llegó, mala atención) o exige que le devuelvan su dinero por ese motivo, ' +
      'es Reclamo aunque mencione dinero. Facturación es solo para errores o dudas sobre cobros, facturas o medios de pago.',
    criteria: {
      Venta: 'quiere comprar, pide precios, planes, cotizaciones o información antes de comprar',
      Soporte: 'duda de uso o problema técnico donde pide ayuda para resolverlo, sin quejarse ni exigir compensación',
      Reclamo: 'queja o inconformidad: producto defectuoso o que no funciona, pedido incorrecto o no recibido, mal servicio, exige reembolso o solución por una mala compra',
      Facturación: 'cobro duplicado o incorrecto, factura errónea, problema con tarjeta, método de pago o suscripción cobrada',
    },
  },
  priority: {
    instructions: 'Asigna la prioridad con la que debe atenderse este mensaje.',
    criteria: {
      Baja: 'consulta general sin urgencia ni molestia',
      Media: 'problema o duda que conviene resolver pronto',
      Alta: 'producto o servicio que falla, cliente molesto o dinero implicado',
      Crítica: 'servicio caído, pérdida económica grave, amenaza legal o de abandono inminente',
    },
  },
  action: {
    instructions:
      'Elige la mejor acción para el equipo de soporte. Si el cliente describe un producto defectuoso o un cobro ' +
      'erróneo y pide su dinero, la acción es Reembolsar; no pidas datos si el mensaje ya explica el problema.',
    criteria: {
      Responder: 'basta con contestar una duda con información',
      'Pedir datos': 'el mensaje es demasiado vago y faltan datos básicos para entender o resolver el caso',
      'Ofrecer descuento': 'cliente indeciso o ligeramente molesto que se retiene con una oferta, sin exigir dinero de vuelta',
      Reembolsar: 'el cliente pide la devolución de su dinero, o hay producto defectuoso, no entregado o cobro erróneo que justifica devolver dinero',
      'Escalar a un agente humano': 'caso delicado, legal, complejo o muy emocional que requiere una persona',
    },
  },
};

const CHURN_LEVELS = ['Muy bajo', 'Bajo', 'Medio', 'Alto', 'Muy alto'];

// "nuol" devuelve la probabilidad (0-1) de que algo sea cierto; con ellas se construye la explicación.
const SIGNALS = {
  angry: { instructions: '¿El cliente expresa enfado o frustración?', text: 'expresa inconformidad o frustración' },
  leaving: { instructions: '¿El cliente amenaza con cancelar, irse a la competencia o dejar el servicio?', text: 'menciona la intención de cancelar el servicio' },
  money: { instructions: '¿El mensaje trata de un cobro, pago o dinero perdido?', text: 'plantea un problema con cobros o dinero' },
  urgent: { instructions: '¿El cliente necesita una solución urgente?', text: 'necesita una solución urgente' },
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
  const pct = (p) => Math.round((p ?? 0) * 100);
  const percents = (answer) =>
    Object.fromEntries(Object.entries(answer.probabilities ?? {}).map(([k, p]) => [k, pct(p)]));
  const result = {
    category: a.category.choice,
    priority: a.priority.choice,
    action: a.action.choice,
    // Probabilidad (0-100) de cada opción, para mostrar confianza y comparar alternativas.
    categoryProbs: percents(a.category),
    priorityProbs: percents(a.priority),
    actionProbs: percents(a.action),
    risk: Math.min(100, Math.max(0, risk)),
  };
  result.confidence = result.categoryProbs[result.category] ?? pct(a.category.confidence);
  result.explanation = explain(result, a);
  return result;
}

// Explicación breve construida con las señales nuol más probables (> 50%).
function explain(r, a) {
  const active = Object.entries(SIGNALS)
    .filter(([id]) => a[`signal_${id}`].noul > 0.5)
    .map(([, s]) => s.text);
  const why = active.length
    ? `El cliente ${active.length > 1 ? `${active.slice(0, -1).join(', ')} y ${active.at(-1)}` : active[0]}.`
    : 'No se detectan señales de alarma en el mensaje.';
  return `${why} Por ello, la consulta fue clasificada como ${r.category} con prioridad ${r.priority} ` +
    `y se recomienda ${r.action.toLowerCase()}.`;
}
