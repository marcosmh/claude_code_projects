// Renderizado del DOM: burbujas de chat y Panel de Decisiones.

const $ = (id) => document.getElementById(id);

export function renderMessage({ role, text, time }) {
  const mine = role === 'customer';
  const row = document.createElement('div');
  row.className = `flex ${mine ? 'justify-end' : 'justify-start'}`;
  const bubble = document.createElement('div');
  bubble.className = `min-w-0 max-w-[85%] break-words rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-[80%] ${
    mine ? 'bg-indigo-600 text-white rounded-br-sm'
      : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'}`;
  const p = document.createElement('p');
  p.textContent = text; // textContent evita inyección de HTML
  const t = document.createElement('span');
  t.className = `mt-1 block text-[11px] tabular-nums ${mine ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`;
  t.textContent = `${mine ? 'Cliente' : 'Asistente'} · ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  bubble.append(p, t);
  row.append(bubble);
  $('messages').append(row);
  $('messages').scrollTop = $('messages').scrollHeight;
}

export function setTyping(on) {
  $('typing').classList.toggle('hidden', !on);
  $('send').disabled = on;
  $('input').disabled = on;
  if (!on) $('input').focus();
}

const RISK_LEVELS = [
  { max: 25, label: 'Bajo', bar: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  { max: 50, label: 'Medio', bar: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-300' },
  { max: 75, label: 'Alto', bar: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  { max: 100, label: 'Crítico', bar: 'bg-red-600', text: 'text-red-700 dark:text-red-400' },
];

export function renderDecision(d) {
  $('d-category').textContent = d.category;
  $('d-priority').textContent = d.priority;
  $('d-action').textContent = d.action;
  $('d-explanation').textContent = d.explanation;

  const level = RISK_LEVELS.find((l) => d.risk <= l.max);
  const bar = $('d-risk-bar');
  bar.className = `h-3 w-full origin-left rounded-full ${level.bar}`;
  bar.style.transform = `scaleX(${d.risk / 100})`;
  $('d-risk-track').setAttribute('aria-valuenow', d.risk);
  $('d-risk-track').setAttribute('aria-valuetext', `${d.risk}% · ${level.label}`);
  $('d-risk-value').textContent = `${d.risk}% · ${level.label}`;
  $('d-risk-value').className = `text-sm font-semibold tabular-nums ${level.text}`;
}

export function showError(text) {
  const el = $('error');
  el.textContent = text;
  el.classList.toggle('hidden', !text);
}
