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

export function showError(text) {
  const el = $('error');
  el.textContent = text;
  el.classList.toggle('hidden', !text);
}

/* ---------- Panel de Decisiones ---------- */

// Las claves coinciden con las etiquetas que Jev devuelve en jev-service.js.
const CATEGORIES = [
  { key: 'Venta', icon: '🛒' },
  { key: 'Soporte', icon: '🛠️' },
  { key: 'Reclamo', icon: '⚠️' },
  { key: 'Facturación', icon: '💳' },
];
const PRIORITIES = [
  { key: 'Baja', icon: '🟢', bar: 'bg-green-500' },
  { key: 'Media', icon: '🟡', bar: 'bg-yellow-400' },
  { key: 'Alta', icon: '🟠', bar: 'bg-orange-500' },
  { key: 'Crítica', icon: '🔴', bar: 'bg-red-600' },
];
const ACTIONS = [
  { key: 'Responder', icon: '💬', label: 'Responder' },
  { key: 'Pedir datos', icon: '📝', label: 'Pedir datos' },
  { key: 'Ofrecer descuento', icon: '🎁', label: 'Ofrecer descuento' },
  { key: 'Reembolsar', icon: '💸', label: 'Reembolsar' },
  { key: 'Escalar a un agente humano', icon: '👨‍💼', label: 'Escalar a humano' },
];
const RISK_LEVELS = [
  { max: 25, label: 'Bajo', icon: '🟢', bar: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  { max: 50, label: 'Medio', icon: '🟡', bar: 'bg-yellow-400', text: 'text-yellow-700 dark:text-yellow-300' },
  { max: 75, label: 'Alto', icon: '🟠', bar: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  { max: 100, label: 'Crítico', icon: '🔴', bar: 'bg-red-600', text: 'text-red-700 dark:text-red-400' },
];

const muted = 'text-slate-500 dark:text-slate-400';

// Barra horizontal que se llena con scaleX (solo transform, respeta reduced-motion).
const bar = (pct, color, h = 'h-2') =>
  `<div class="${h} w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
     <div class="bar-fill ${h} w-full origin-left rounded-full ${color}" style="transform:scaleX(${pct / 100})"></div>
   </div>`;

// d = null muestra el estado vacío (sin selección).
export function renderDecision(d) {
  renderCategory(d);
  renderPriority(d);
  renderActions(d);
  renderRisk(d);
  $('d-explanation').textContent = d ? d.explanation : 'Envía un mensaje para ver el análisis.';
}

function renderCategory(d) {
  $('p-category').innerHTML = CATEGORIES.map((c) => {
    const on = d?.category === c.key;
    return `<li ${on ? 'aria-current="true"' : ''} class="flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center text-xs transition-colors ${
      on ? 'border-indigo-500 bg-indigo-50 font-semibold text-indigo-900 ring-2 ring-indigo-400 dark:bg-indigo-950 dark:text-indigo-100'
        : `border-slate-200 dark:border-slate-700 ${d ? 'opacity-50' : ''}`}">
      <span class="text-2xl" aria-hidden="true">${c.icon}</span>${c.key}</li>`;
  }).join('');
  $('p-confidence').innerHTML = d
    ? `<span class="${muted}">Confianza:</span> <span class="font-semibold tabular-nums">${d.confidence}%</span>`
    : '';
}

function renderPriority(d) {
  const level = PRIORITIES.findIndex((p) => p.key === d?.priority);
  const color = PRIORITIES[level]?.bar ?? '';
  $('p-priority-bar').innerHTML = PRIORITIES.map((_, i) =>
    `<div class="h-3 flex-1 rounded-full ${i <= level ? color : 'bg-slate-200 dark:bg-slate-700'}"></div>`).join('');
  $('p-priority-labels').innerHTML = PRIORITIES.map((p, i) =>
    `<li class="flex-1 text-center ${i === level ? 'font-bold text-slate-900 dark:text-white' : muted}">
       <span aria-hidden="true">${p.icon}</span> ${p.key}</li>`).join('');
}

function renderActions(d) {
  $('p-actions').innerHTML = ACTIONS.map((a) => {
    const on = d?.action === a.key;
    const pct = d?.actionProbs?.[a.key] ?? 0;
    return `<li ${on ? 'aria-current="true"' : ''} class="rounded-xl border px-3 py-2 ${
      on ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400 dark:bg-indigo-950' : 'border-slate-200 dark:border-slate-700'}">
      <div class="mb-1 flex items-center justify-between gap-2 text-sm">
        <span class="${on ? 'font-semibold' : ''}"><span aria-hidden="true">${a.icon}</span> ${a.label}${
          on ? ' <span class="ml-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">Recomendada</span>' : ''}</span>
        <span class="tabular-nums ${on ? 'font-semibold' : muted}">${d ? `${pct}%` : '—'}</span>
      </div>
      ${bar(pct, on ? 'bg-indigo-600' : 'bg-slate-400 dark:bg-slate-500')}
    </li>`;
  }).join('');
}

function renderRisk(d) {
  const level = d ? RISK_LEVELS.find((l) => d.risk <= l.max) : null;
  const fill = $('d-risk-bar');
  fill.className = `bar-fill h-4 w-full origin-left rounded-full ${level?.bar ?? ''}`;
  fill.style.transform = `scaleX(${(d?.risk ?? 0) / 100})`;
  const track = $('d-risk-track');
  track.setAttribute('aria-valuenow', d?.risk ?? 0);
  track.setAttribute('aria-valuetext', d ? `${d.risk}% · ${level.label}` : 'Sin datos');
  $('d-risk-value').textContent = d ? `${d.risk}%` : '—';
  $('d-risk-value').className = `text-3xl font-bold tabular-nums ${level?.text ?? muted}`;
  $('d-risk-level').textContent = d ? `${level.icon} ${level.label}` : '';
  $('d-risk-level').className = `text-sm font-semibold ${level?.text ?? ''}`;
}
