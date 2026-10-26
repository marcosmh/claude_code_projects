// Aplica tema y menú antes del primer pintado. Una elección guardada manda; si no hay, se sigue
// la preferencia del sistema (prefers-color-scheme) y, si no se puede saber, oscuro.
// Es un archivo externo (no inline) para que la CSP pueda prohibir scripts inline (script-src 'self').
try {
  var d = document.documentElement;
  var saved = localStorage.getItem("theme");
  var dark = saved ? saved !== "light" : !window.matchMedia || !matchMedia("(prefers-color-scheme: light)").matches;
  if (dark) d.classList.add("dark");
  if (localStorage.getItem("menu") === "collapsed") d.classList.add("menu-collapsed");
} catch (e) {
  document.documentElement.classList.add("dark");
}
