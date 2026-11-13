// Punto de entrada: conecta formulario -> Jev -> chat + Panel de Decisiones.
import { analyze } from './jev-service.js';
import { addMessage, replyFor } from './chat.js';
import { renderMessage, renderDecision, setTyping, showError } from './ui.js';

const form = document.getElementById('form');
const input = document.getElementById('input');

renderMessage(addMessage('assistant', '¡Hola! Soy el asistente de soporte. ¿En qué puedo ayudarte hoy?'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  showError('');
  renderMessage(addMessage('customer', text));
  setTyping(true);
  try {
    const decision = await analyze(text);
    renderDecision(decision);
    renderMessage(addMessage('assistant', replyFor(decision.action)));
  } catch (err) {
    showError(err.message);
  } finally {
    setTyping(false);
  }
});
