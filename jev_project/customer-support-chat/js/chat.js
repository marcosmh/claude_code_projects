// Estado de la conversación y respuestas del asistente.

const REPLIES = {
  Responder: 'Gracias por escribirnos. Con gusto te ayudo con tu consulta; enseguida te doy los detalles.',
  'Pedir datos': 'Para ayudarte mejor, ¿me compartes tu número de pedido o el correo de tu cuenta y una descripción más detallada?',
  'Ofrecer descuento': 'Lamentamos la molestia. Como agradecimiento por tu paciencia, queremos ofrecerte un descuento en tu próxima factura.',
  Reembolsar: 'Entendemos el problema. Vamos a gestionar el reembolso ahora mismo; lo verás reflejado en 3-5 días hábiles.',
  'Escalar a un agente humano': 'Tu caso es importante. Te estoy pasando con un agente humano que te contactará en breve.',
};

export const messages = [];

export function addMessage(role, text) {
  const msg = { role, text, time: new Date() };
  messages.push(msg);
  return msg;
}

export function replyFor(action) {
  return REPLIES[action] ?? REPLIES.Responder;
}
