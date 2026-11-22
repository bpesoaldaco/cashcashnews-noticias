/* CashCashNews, versión web (para iPhone y cualquier navegador).
 * Lee las mismas noticias que la app de Android, del repositorio público de noticias,
 * y trae lo mismo que la app: stories, reels, seguimiento, fichas, glosario, test,
 * grandes de las finanzas, personaje del día, «¿Quién lo dijo?», calendario y comparar días. */
'use strict';

var VERSION = 'web 1.1';
var RAW = 'https://raw.githubusercontent.com/bpesoaldaco/cashcashnews-noticias/main/';
// En GitHub Pages se lee de GitHub; en local (pruebas), de la carpeta de arriba.
var BASE = /github\.io$/.test(location.hostname) ? RAW : '../';
var STATS = 'https://cashcashnews.goatcounter.com';
var WEB = 'https://bpesoaldaco.github.io/cashcashnews-noticias/';

var $app = document.getElementById('app');
var $layer = document.getElementById('layer');
var datos = null;            // noticias de hoy
var cache = {};              // descargas ya hechas (días, semanas, fichas…)
var timer = null;            // temporizador de stories
var GLOS = [];               // glosario
var GENTE = { personas: [], historias: [] }; // grandes de las finanzas
var BUSCADOR = [];           // valores para el autocompletado
var RECIENTES = {};          // lo último de cada valor (recientes.json)

/* ---------- utilidades ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function attr(s) { return esc(JSON.stringify(String(s))); }   // para onclick="f(…)"
function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function leer(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function tend(t) { return t === 'up' || t === 'down' ? t : 'flat'; }
function flecha(t) { return t === 'up' ? '▲ ' : t === 'down' ? '▼ ' : ''; }
function urlSegura(u) { return /^https:\/\//.test(u || '') ? u : null; }
/** Minúsculas y sin tildes, para que «telefo» encuentre «Telefónica». */
function normal(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
var LETRA = /[\p{L}\p{N}]/u;
function buscarPalabra(h, n) {
  var i = h.indexOf(n);
  while (i >= 0) {
    var fin = i + n.length;
    if ((i === 0 || !LETRA.test(h[i - 1])) && (fin >= h.length || !LETRA.test(h[fin]))) return i;
    i = h.indexOf(n, i + 1);
  }
  return -1;
}
var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function corta(f) { try { return (+f.slice(8, 10)) + ' ' + MESES[+f.slice(5, 7) - 1].slice(0, 3); } catch (e) { return f; } }
function hoyISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function diaEpoch(f) { return Math.round(Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) / 86400000); }
function hace(f) {
  var d = diaEpoch(hoyISO()) - diaEpoch(f);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 14) return 'hace ' + d + ' días';
  return 'hace ' + Math.floor(d / 7) + ' semanas';
}
function aviso(txt) {
  var t = document.createElement('div'); t.className = 'toast'; t.textContent = txt;
  document.body.appendChild(t);
  setTimeout(function () { t.classList.add('fuera'); }, 1800);
  setTimeout(function () { t.remove(); }, 2300);
}

function descargar(ruta) {
  if (cache[ruta]) return Promise.resolve(cache[ruta]);
  return fetch(BASE + ruta, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function (d) { cache[ruta] = d; return d; });
}
function propio(ruta, texto) {
  return fetch(ruta).then(function (r) { if (!r.ok) throw new Error(r.status); return texto ? r.text() : r.json(); });
}

/* ---------- iconos (de línea, como en la app) ---------- */
var I = {
  cal: '<path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  atras: '<path d="M15 5l-7 7 7 7"/>',
  reel: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  grafica: '<path d="M4 19h16M5 15l4-5 4 3 6-7"/>',
  idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  semana: '<path d="M4 6h16v14H4zM4 10h16M8 14h2M11 14h2M14 14h2M8 17h2"/>',
  recargar: '<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/>',
  share: '<path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1"/>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  libro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7"/>',
  columnas: '<path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18"/>',
  test: '<path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M8 12l2 2 4-4M8 17h8"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  alerta: '<path d="M12 3l10 18H2zM12 10v5M12 18v.5"/>',
  brujula: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  noticias: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>',
  trofeo: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  columnas2: '<path d="M4 5h7v14H4zM13 5h7v14h-7z"/>'
};
function ic(n, extra) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' +
    (extra || '') + '>' + I[n] + '</svg>';
}
var BANDERAS = { espana: '🇪🇸', europa: '🇪🇺', eeuu: '🇺🇸' };
function iconoStory(s) {
  if (BANDERAS[s.id]) return BANDERAS[s.id];
  var n = { mercados: 'grafica', ideas: 'idea', agenda: 'cal' }[s.id] || 'grafica';
  return '<span style="color:var(--verde)">' + ic(n) + '</span>';
}
/** La «moneda» del logo con las iniciales de una persona (como en la app). */
function moneda(nombre, tam) {
  var ini = String(nombre).split(/\s+/).filter(function (w) { return /^[A-ZÁÉÍÓÚÑ]/.test(w); })
    .map(function (w) { return w[0]; }).join('').slice(0, 2) || '?';
  return '<svg class="moneda" width="' + tam + '" height="' + tam + '" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#05070C" stroke="#22C55E" stroke-width="2.4"/>' +
    '<circle cx="20" cy="20" r="13.5" fill="none" stroke="#22C55E" stroke-opacity=".45" stroke-width="1"/>' +
    '<text x="20" y="20" dy=".35em" text-anchor="middle" fill="#22C55E" font-size="' + (ini.length > 1 ? 13 : 16) +
    '" font-weight="800" font-family="-apple-system,system-ui,sans-serif">' + esc(ini) + '</text></svg>';
}
function monedaIcono(n, tam) {
  return '<span class="moneda-ic" style="width:' + tam + 'px;height:' + tam + 'px">' + ic(n, ' width="' + Math.round(tam * .48) + '" height="' + Math.round(tam * .48) + '"') + '</span>';
}

/* ---------- modo claro / oscuro ---------- */
function oscuro() { return leer('oscuro', true); }
function aplicarTema() {
  document.documentElement.setAttribute('data-theme', oscuro() ? 'dark' : 'light');
  var m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = oscuro() ? '#07090F' : '#F2F5F3';
}
function cambiarTema() { guardar('oscuro', !oscuro()); aplicarTema(); inicio(); }

/* ---------- estadísticas anónimas (GoatCounter, sin cookies) ---------- */
// Solo cuentan las visitas de personas: fuera robots, navegadores automáticos
// (las pruebas que hacemos nosotros), copias locales y vistas previas.
function visitaReal() {
  try {
    if (!/\.github\.io$/.test(location.hostname)) return false;
    if (navigator.webdriver) return false;
    var ua = navigator.userAgent || '';
    if (/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|phantom|puppeteer|playwright|selenium|python|curl|wget/i.test(ua)) return false;
    if (/[?&]notrack\b/.test(location.search)) { guardar('stats', false); return false; }
    if (document.visibilityState && document.visibilityState !== 'visible') return false;
    return true;
  } catch (e) { return false; }
}
function stats(pantalla) {
  if (!leer('stats', true)) return;
  if (!visitaReal()) return;
  try {
    new Image().src = STATS + '/count?p=' + encodeURIComponent('/web/' + pantalla) +
      '&t=' + encodeURIComponent(pantalla + ' · ' + VERSION) + '&rnd=' + Math.random().toString(36).slice(2);
  } catch (e) {}
}

/* ---------- sonido de inicio ---------- */
// Web Audio respeta el botón de silencio del iPhone (un <audio> normal no).
var audio = null;
function brindis() {
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio) audio = new AC();
    if (audio.state === 'suspended') audio.resume();
    fetch('brindis.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      return new Promise(function (ok, ko) { audio.decodeAudioData(buf, ok, ko); });
    }).then(function (b) {
      var s = audio.createBufferSource(); s.buffer = b; s.connect(audio.destination); s.start(0);
    }).catch(function () {});
  } catch (e) {}
}
function splash() {
  var el = document.getElementById('splash');
  var hecho = false;
  function salir() {
    if (hecho) return; hecho = true;
    el.classList.add('fuera');
    setTimeout(function () { el.remove(); bienvenida(); }, 400);
  }
  // En iPhone el sonido solo puede sonar después de un toque.
  el.addEventListener('click', function () { brindis(); setTimeout(salir, 900); });
  setTimeout(salir, 2600);
}

/* ---------- ventana emergente ---------- */
function modal(html) {
  cerrarModal();
  var m = document.createElement('div');
  m.className = 'modal'; m.id = 'modal';
  m.innerHTML = '<div class="hoja" role="dialog">' + html + '</div>';
  m.addEventListener('click', function (e) { if (e.target === m) cerrarModal(); });
  document.body.appendChild(m);
}
function cerrarModal() { var m = document.getElementById('modal'); if (m) m.remove(); }

function bienvenida() {
  if (leer('bienvenida', false)) return;
  modal('<h3>Antes de empezar</h3><p>CashCashNews resume las noticias financieras del día en formato stories y reels.</p>' +
    '<p>Es solo informativo: no es asesoramiento financiero ni una recomendación de comprar o vender nada. ' +
    'Los resúmenes se hacen de forma automática y pueden tener errores.</p><p>No pedimos datos personales.</p>' +
    '<div class="botones"><button class="btn" onclick="guardar(\'bienvenida\',true);cerrarModal()">Entendido</button>' +
    '<button class="btn sec" onclick="guardar(\'bienvenida\',true);cerrarModal();ir(\'info\')">Leer aviso legal</button></div>');
}

/* ---------- carga ---------- */
function cargar(forzar) {
  if (!datos) {
    datos = leer('noticias', null);
    if (datos) inicio();
    else $app.innerHTML = '<div class="cargando">Cargando las noticias…</div>';
  }
  delete cache['noticias.json'];
  return descargar('noticias.json').then(function (d) {
    var cambio = !datos || JSON.stringify(d) !== JSON.stringify(datos);
    datos = d; guardar('noticias', d);
    if (cambio || forzar) inicio();
    if (forzar) aviso(cambio ? 'Noticias actualizadas: ' + d.fechaTexto : 'Ya tienes las últimas noticias');
  }).catch(function () {
    if (forzar) aviso('Sin conexión. Se muestran las últimas noticias guardadas');
    if (!datos) $app.innerHTML = '<div class="vacio">No se han podido cargar las noticias.<br>Revisa la conexión y vuelve a intentarlo.<br><br>' +
      '<button class="btn" onclick="cargar(true)">Reintentar</button></div>';
  });
}
function cargarExtras() {
  var g = propio('datos/glosario.json').then(function (d) {
    GLOS = (d.terminos || []).slice().sort(function (a, b) { return normal(a.termino).localeCompare(normal(b.termino)); });
  }).catch(function () {});
  var p = propio('datos/inversores.json').then(function (d) { GENTE = d; }).catch(function () {});
  var b = propio('datos/buscador_valores.txt', true).then(function (t) {
    BUSCADOR = t.split('\n').map(function (s) { return s.trim(); }).filter(function (s) { return s && s[0] !== '#'; })
      .map(function (s) { var x = s.split('|'); return { nombre: x[0], ticker: x[1] || '', mercado: x[2] || '', clave: normal(x[0]) }; });
  }).catch(function () {});
  return Promise.all([g, p, b]);
}
function cargarRecientes() {
  RECIENTES = leer('recientes', {}) || {};
  delete cache['recientes.json'];
  return descargar('recientes.json').then(function (d) {
    var m = {};
    Object.keys(d.valores || {}).forEach(function (k) { (m[k.toLowerCase()] = m[k.toLowerCase()] || {}).web = d.valores[k]; });
    Object.keys(d.enNuestrasNoticias || {}).forEach(function (k) { (m[k.toLowerCase()] = m[k.toLowerCase()] || {}).nuestra = d.enNuestrasNoticias[k]; });
    RECIENTES = m; guardar('recientes', m);
  }).catch(function () {});
}

/* ---------- glosario: términos subrayados en las noticias ---------- */
function enlazar(texto) {
  texto = String(texto || '');
  if (!GLOS.length) return esc(texto);
  var low = texto.toLowerCase(), usados = [], puestos = 0;
  GLOS.forEach(function (t, idx) {
    if (t.enlazar === false || puestos >= 3) return;
    var formas = [t.termino].concat(t.alias || []);
    for (var k = 0; k < formas.length; k++) {
      var f = formas[k].toLowerCase(), i = buscarPalabra(low, f);
      if (i < 0 || usados.some(function (r) { return i < r[1] && i + f.length > r[0]; })) continue;
      usados.push([i, i + f.length, idx]); puestos++; break;
    }
  });
  usados.sort(function (a, b) { return a[0] - b[0]; });
  var out = '', pos = 0;
  usados.forEach(function (r) {
    out += esc(texto.slice(pos, r[0])) + '<button class="term" onclick="event.stopPropagation();termino(' + r[2] + ')">' +
      esc(texto.slice(r[0], r[1])) + '</button>';
    pos = r[1];
  });
  return out + esc(texto.slice(pos));
}
function termino(i) {
  var t = GLOS[i]; if (!t) return;
  pausaStory(true);
  modal('<h3>' + esc(t.termino) + '</h3><p>' + esc(t.definicion) + '</p>' + (t.ejemplo ? '<p class="suave">Ejemplo: ' + esc(t.ejemplo) + '</p>' : '') +
    '<div class="botones"><button class="btn" onclick="cerrarModal();pausaStory(false)">Entendido</button>' +
    '<button class="btn sec" onclick="cerrarModal();ir(\'glosario\')">Ver glosario</button></div>');
}

/* ---------- seguimiento ---------- */
function seguidos() { return leer('seguidos', []); }
function sigue(v) { return seguidos().some(function (s) { return s.toLowerCase() === String(v).toLowerCase(); }); }
function alternar(v) {
  var l = seguidos(), i = l.findIndex(function (s) { return s.toLowerCase() === v.toLowerCase(); });
  if (i >= 0) l.splice(i, 1); else l.push(v.trim());
  guardar('seguidos', l);
  return i < 0;
}
/** true si la noticia habla de ese valor (por su lista de valores o por el texto). */
function menciona(valor, valores, a, b) {
  var v = valor.toLowerCase();
  if ((valores || []).some(function (x) { return x.toLowerCase() === v; })) return true;
  return [a, b].some(function (t) { return t && buscarPalabra(t.toLowerCase(), v) >= 0; });
}
var VACIAS = new Set(('el la los las un una unos unas de del al en y o u a por para con sin su sus se que ya es son tras hasta mas ' +
  'muy lo le les como sobre entre desde ante').split(' '));
/** Palabras con significado, en minúsculas y sin tildes; «25.000» → «25000». */
function palabras(s) {
  var r = new Set();
  normal(s).replace(/(\d)[.,](?=\d)/g, '$1').split(/[^a-z0-9]+/).forEach(function (w) { if (w.length >= 3 && !VACIAS.has(w)) r.add(w); });
  return r;
}
function comunes(a, b) { var n = 0; a.forEach(function (w) { if (b.has(w)) n++; }); return n; }
/** Titulares del día que hablan de un valor, sin repetidos (aunque estén contados con otras palabras). */
function noticiasDe(f, valor) {
  var l = [], tits = [], txts = [], prop = palabras(valor);
  function anadir(titulo, texto) {
    if (!titulo || l.indexOf(titulo) >= 0) return;
    var t = palabras(titulo), x = palabras(titulo + ' ' + (texto || ''));
    prop.forEach(function (w) { t.delete(w); x.delete(w); });
    for (var i = 0; i < l.length; i++) {
      var ct = comunes(t, tits[i]);
      if (ct >= 2 || (ct > 0 && ct * 2 >= Math.min(t.size, tits[i].size))) return;
      var cx = comunes(x, txts[i]);
      if (cx > 0 && cx * 10 >= 4 * Math.min(x.size, txts[i].size)) return;
    }
    l.push(titulo); tits.push(t); txts.push(x);
  }
  (f.reels || []).forEach(function (r) { if (menciona(valor, r.valores, r.titulo, r.texto)) anadir(r.titulo, r.texto); });
  (f.stories || []).forEach(function (s) {
    if (s.id === 'agenda') return;
    (s.slides || []).forEach(function (d) { if (menciona(valor, d.valores, d.titulo, d.texto)) anadir(d.titulo, d.texto); });
  });
  return l;
}
function todosLosValores(f) {
  var l = [];
  function add(v) { if (l.indexOf(v) < 0) l.push(v); }
  (f.reels || []).forEach(function (r) { (r.valores || []).forEach(add); });
  (f.stories || []).forEach(function (s) { (s.slides || []).forEach(function (d) { (d.valores || []).forEach(add); }); });
  return l;
}
function seguir(v, repintar) {
  var ahora = alternar(v);
  aviso(ahora ? 'Siguiendo ' + v : 'Ya no sigues ' + v);
  if (repintar) repintar();
}

/* ---------- pantalla de inicio ---------- */
function esIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function instalada() { return window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }

function bannerInstalar() {
  if (instalada() || leer('sinBanner', false)) return '';
  var share = ic('share', ' class="share"');
  var pasos = esIOS()
    ? '<li>Pulsa el botón de compartir ' + share + ' de Safari.</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li><li>Pulsa <b>Añadir</b>.</li>'
    : '<li>Abre el menú del navegador (⋮).</li><li>Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar app</b>.</li>';
  return '<div class="instalar"><button class="cerrar" onclick="cerrarBanner()" aria-label="Cerrar">' + ic('cerrar', ' width="18" height="18"') + '</button>' +
    '<b>Tenla como una app</b><ol>' + pasos + '</ol></div>';
}
function cerrarBanner() { guardar('sinBanner', true); inicio(); }

/** Personaje del día: igual para todos, rota por fecha (paso 7, como en la app). */
function delDia(fecha) {
  var ps = GENTE.personas || [];
  if (!ps.length) return null;
  var n = ps.length, paso = 7;
  function mcd(a, b) { return b ? mcd(b, a % b) : a; }
  while (mcd(paso, n) !== 1) paso++;
  var d = diaEpoch(fecha || hoyISO());
  return ps[((d * paso) % n + n) % n];
}
function nombreTipo(t) { return t === 'trader' ? 'Trader' : t === 'empresario' ? 'Empresario' : 'Inversor'; }

function tile(icono, titulo, sub, ruta) {
  return '<button class="fila" onclick="ir(\'' + ruta + '\')"><span class="fila-ic">' + ic(icono, ' width="22" height="22"') +
    '</span><div><div class="t">' + esc(titulo) + '</div><div class="x">' + esc(sub) + '</div></div><span class="flecha">›</span></button>';
}

function inicio() {
  var d = datos;
  if (!d) return;
  if (location.hash) return;   // hay otra pantalla encima: se repinta al volver
  var vistos = leer('vistos', {});
  var h = '<div class="wrap">';
  h += '<header class="cabecera"><img src="logo.svg" alt=""><div class="cab-txt"><div class="marca">CashCash<b>News</b></div>' +
    '<div class="fecha">' + esc(d.fechaTexto) + '</div></div>' +
    '<div class="acciones"><button class="icono" onclick="cambiarTema()" aria-label="' + (oscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro') + '">' + ic(oscuro() ? 'sol' : 'luna') + '</button>' +
    '<button class="icono" onclick="cargar(true)" aria-label="Buscar noticias nuevas">' + ic('recargar') + '</button>' +
    '<button class="icono" onclick="ir(\'info\')" aria-label="Información">' + ic('info') + '</button></div></header>';
  h += bannerInstalar();
  if (d.fecha && d.fecha < hoyISO()) {
    var hora = new Date().getHours();
    h += '<div class="aviso-dia">' + (hora < 9 ? 'Las noticias de hoy se publican hacia las 8:00. Mientras, tienes las del ' : 'Las noticias de hoy aún no están. Mientras, tienes las del ') +
      esc(String(d.fechaTexto).toLowerCase()) + '.</div>';
  }

  h += '<div class="rings">';
  (d.stories || []).forEach(function (s) {
    var visto = vistos[d.fecha + '/' + s.id] ? ' visto' : '';
    h += '<button class="ring' + visto + '" onclick="ir(\'story/' + esc(s.id) + '\')"><div class="circ"><div class="dentro">' +
      iconoStory(s) + '</div></div>' + esc(s.titulo) + '</button>';
  });
  h += '</div>';

  if ((d.indicadores || []).length) {
    h += '<div class="chips">';
    d.indicadores.forEach(function (x) {
      h += '<button class="chip" onclick="ir(\'valor/\'+encodeURIComponent(' + attr(x.nombre) + '))"><div class="n">' + esc(x.nombre) + '</div><div class="v">' + esc(x.valor) +
        '</div><div class="c ' + tend(x.tendencia) + '">' + esc(x.cambio) + '</div></button>';
    });
    h += '</div>';
  }

  var n = (d.reels || []).length;
  h += '<button class="destacada" onclick="ir(\'reels\')">' + ic('reel') +
    '<div><div class="t">Ver las ' + n + ' noticias del día</div><div class="s">' +
    esc((d.reels || []).slice(0, 2).map(function (r) { return r.titulo; }).join(' · ')) + '</div></div></button>';

  var p = delDia();
  if (p) {
    h += '<button class="personaje-card" onclick="ir(\'personaje\')">' + moneda(p.nombre, 54) + '<div><div class="cat" style="margin:0 0 2px">Personaje del día · ' +
      esc(nombreTipo(p.tipo)) + '</div><div class="t">' + esc(p.nombre) + '</div><div class="x">' + esc(p.resumen) + '</div></div></button>';
  }

  if ((d.agenda || []).length) {
    h += '<div class="seccion">Hoy se publica</div><div class="lista">';
    d.agenda.forEach(function (a) {
      h += '<div class="fila"><div class="hora">' + esc(a.hora || '—') + '</div><div><div class="t">' + esc(a.titulo) +
        (a.importancia === 'alta' ? '<span class="etiqueta">Importante</span>' : '') + '</div><div class="x">' + enlazar(a.texto) + '</div></div></div>';
    });
    h += '</div>';
  }

  var seg = seguidos(), conNoticias = seg.filter(function (v) { return noticiasDe(d, v).length; }).length;
  var subSeg = !seg.length ? 'Sigue valores y mira sus noticias' :
    seg.length + (seg.length === 1 ? ' valor' : ' valores') + (conNoticias ? ' · ' + conNoticias + ' con noticias hoy' : '');
  h += '<div class="seccion">Más</div><div class="lista">' +
    tile('cal', 'Calendario', 'Noticias de cualquier día y comparar días', 'calendario') +
    tile('estrella', 'Seguimiento', subSeg, 'seguimiento') +
    tile('libro', 'Glosario', 'Términos y test de 10 preguntas', 'glosario') +
    tile('columnas', 'Grandes de las finanzas', 'Inversores, traders, empresarios e historias de la bolsa', 'inversores') +
    tile('semana', 'Resumen semanal', 'Lo más importante de la semana, cada viernes', 'semanas') +
    '</div>';

  h += '<div class="aviso">' + esc(d.aviso || 'Contenido solo informativo. No es asesoramiento financiero.') + '</div>';
  h += '<div class="pie"><button onclick="ir(\'info\')">Aviso legal y privacidad</button> · <button onclick="opinion()">Enviar opinión</button></div>';
  h += '</div>';
  $app.innerHTML = h;
}

/* ---------- piezas de noticia ---------- */
function sparkline(g, alto) {
  if (!g || !g.valores || g.valores.length < 2) return '';
  var v = g.valores, et = g.etiquetas || [];
  var min = Math.min.apply(null, v), max = Math.max.apply(null, v), r = (max - min) || 1;
  var W = 300, H = 90, pt = 10, pb = 22;
  var pts = v.map(function (y, i) { return [(i / (v.length - 1)) * (W - 20) + 10, pt + (1 - (y - min) / r) * (H - pt - pb)]; });
  var col = v[v.length - 1] > v[0] ? 'var(--verde)' : v[v.length - 1] < v[0] ? 'var(--rojo)' : 'var(--gris)';
  var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  var area = 'M' + pts[0][0] + ',' + (H - pb) + ' L' + line.replace(/ /g, ' L') + ' L' + pts[pts.length - 1][0] + ',' + (H - pb) + 'Z';
  var last = pts[pts.length - 1];
  var s = '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none"' + (alto ? ' style="height:' + alto + 'px"' : '') + '>' +
    '<path d="' + area + '" fill="' + col + '" opacity=".14"/>' +
    '<polyline points="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
    '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.5" fill="' + col + '"/>';
  if (et.length) {
    s += '<text x="10" y="' + (H - 6) + '">' + esc(et[0]) + '</text>' +
      '<text x="' + (W - 10) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(et[et.length - 1]) + '</text>';
  }
  return s + '</svg>';
}
function datoRow(dato, cambio, t, grande) {
  if (!dato && !cambio) return '';
  return '<div class="dato">' + (dato ? '<span class="n ' + t + '"' + (grande ? ' style="font-size:' + grande + 'px"' : '') + '>' + esc(dato) + '</span>' : '') +
    (cambio ? '<span class="pill ' + t + '">' + flecha(t) + esc(cambio) + '</span>' : '') + '</div>';
}
function chipsValores(vs) {
  if (!(vs || []).length) return '';
  return '<div class="valores">' + vs.map(function (v) {
    return '<button onclick="event.stopPropagation();ir(\'valor/\'+encodeURIComponent(' + attr(v) + '))">' + (sigue(v) ? '★ ' : '') + esc(v) + '</button>';
  }).join('') + '</div>';
}
function noticia(x, cat) {
  var t = tend(x.tendencia), h = '';
  if (cat) h += '<div class="cat">' + esc(cat) + '</div>';
  h += '<h2 class="titulo">' + esc(x.titulo) + '</h2>';
  h += datoRow(x.dato, x.cambio, x.aviso ? 'flat' : t);
  h += sparkline(x.grafica);
  h += '<p class="texto">' + enlazar(x.texto) + '</p>';
  if (x.aviso) h += '<div class="cuidado">Esto no es una recomendación. Investiga por tu cuenta antes de decidir nada.</div>';
  if (x.paraTi) h += '<div class="parati"><div class="h">' + ic('persona') + '¿Y esto qué significa para mí?</div>' + enlazar(x.paraTi) + '</div>';
  h += chipsValores(x.valores);
  var u = urlSegura(x.url);
  if (x.fuente) h += '<div class="fuente">Fuente: ' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">' + esc(x.fuente) + '</a>' : esc(x.fuente)) + '</div>';
  return h;
}

/* ---------- stories ---------- */
var pausaStory = function () {};
function abrirStory(d, id) {
  var orden = (d.stories || []).filter(function (s) { return (s.slides || []).length; });
  var si = orden.findIndex(function (s) { return s.id === id; });
  if (si < 0) return cerrar();
  var s = orden[si], i = 0, pausa = false, t0 = 0, hecho = 0, DUR = 7000;
  var vistos = leer('vistos', {}); vistos[d.fecha + '/' + s.id] = 1; guardar('vistos', vistos);
  pausaStory = function (p) {
    if (p && !pausa) { hecho += Date.now() - t0; pausa = true; }
    else if (!p && pausa) { t0 = Date.now(); pausa = false; }
  };

  function pintar() {
    var sl = s.slides[i];
    $layer.innerHTML = '<div class="story"><div class="segs">' + s.slides.map(function (_, k) {
      return '<div class="seg' + (k < i ? ' hecho' : '') + '"><i></i></div>';
    }).join('') + '</div><div class="story-top"><span class="story-ic">' + iconoStory(s).replace('<svg', '<svg width="20" height="20"') +
      '</span><span class="tt">' + esc(s.titulo) + '</span><button class="icono" aria-label="Cerrar">' + ic('cerrar') + '</button></div>' +
      '<div class="story-body">' + noticia(sl) + '</div><div class="story-pie">Toca a la derecha para avanzar · mantén pulsado para pausar</div></div>';
    var st = $layer.querySelector('.story');
    st.querySelector('.icono').onclick = function (e) { e.stopPropagation(); cerrar(); };
    // Toque a la izquierda: atrás; a la derecha: adelante (salvo en enlaces y botones).
    st.addEventListener('click', function (e) {
      if (e.target.closest('a,button') || largo) return;
      mover(e.clientX < st.clientWidth / 3 ? -1 : 1);
    });
    var largo = false, tLargo = null;
    st.addEventListener('pointerdown', function (e) {
      if (e.target.closest('a,button')) return;
      largo = false; tLargo = setTimeout(function () { largo = true; }, 350); pausaStory(true);
    });
    function soltar() { clearTimeout(tLargo); pausaStory(false); setTimeout(function () { largo = false; }, 30); }
    st.addEventListener('pointerup', soltar);
    st.addEventListener('pointercancel', soltar);
    gestoBajar(st);
    hecho = 0; t0 = Date.now(); pausa = false; animar();
  }
  function animar() {
    clearInterval(timer);
    var barra = $layer.querySelectorAll('.seg i')[i];
    timer = setInterval(function () {
      if (pausa || document.getElementById('modal')) return;
      var h = hecho + (Date.now() - t0);
      if (barra) barra.style.width = Math.min(100, h / DUR * 100) + '%';
      if (h >= DUR) mover(1);
    }, 50);
  }
  function mover(dir) {
    i += dir;
    if (i < 0) i = 0;
    if (i >= s.slides.length) {
      clearInterval(timer);
      var sig = orden[si + 1];
      if (sig) return location.replace('#story/' + sig.id);
      return cerrar();
    }
    pintar();
  }
  pintar();
  stats('stories');
}
function gestoBajar(el) {
  var y0 = null;
  el.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', function (e) {
    if (y0 != null && e.changedTouches[0].clientY - y0 > 110) cerrar();
    y0 = null;
  });
}

/* ---------- reels ---------- */
function abrirReels(d, titulo) {
  var rs = d.reels || [];
  var h = '<div class="reels-top"><span class="cont" id="cont">1 / ' + rs.length + '</span>' +
    '<button class="icono" aria-label="Cerrar" onclick="cerrar()">' + ic('cerrar') + '</button></div><div class="reels" id="reels">';
  rs.forEach(function (r, k) {
    h += '<section class="reel"><div class="reel-inner">' + noticia(r, (titulo ? titulo + ' · ' : '') + (r.categoria || '')) +
      (k === 0 && rs.length > 1 ? '<div class="desliza">Desliza hacia arriba ↑</div>' : '') + '</div></section>';
  });
  if (!rs.length) h += '<section class="reel"><div class="vacio">Este día no tiene noticias.</div></section>';
  var esSemana = d.tipo === 'semanal';
  h += '<section class="reel"><div class="reel-inner" style="text-align:center"><img src="logo.svg" alt="" style="width:80px">' +
    '<h2 class="titulo" style="margin-top:14px">¡Ya estás al día!</h2><p class="texto">' + esc(d.aviso || '') + '</p>' +
    '<div class="botones centro"><button class="btn" onclick="cerrar()">Volver</button>' +
    (!esSemana && d.fecha ? '<button class="btn sec" onclick="ir(\'comparar/' + esc(d.fecha) + '\')">Comparar con otro día</button>' : '') +
    '</div></div></section></div>';
  $layer.innerHTML = h;
  var cont = document.getElementById('reels'), c = document.getElementById('cont');
  cont.addEventListener('scroll', function () {
    var k = Math.round(cont.scrollTop / cont.clientHeight);
    c.textContent = Math.min(k + 1, rs.length) + ' / ' + rs.length;
  }, { passive: true });
  stats(esSemana ? 'resumen-semanal' : 'noticias');
}

/* ---------- páginas ---------- */
function pagina(titulo, sub, cuerpo, accion) {
  $layer.innerHTML = '<div class="pagina" id="pag"><div class="barra"><button class="icono" onclick="cerrar()" aria-label="Volver">' + ic('atras') + '</button>' +
    '<div class="barra-txt"><div class="tt">' + esc(titulo) + '</div>' + (sub ? '<div class="st">' + esc(sub) + '</div>' : '') + '</div>' +
    (accion || '') + '</div><div class="info" id="cuerpo">' + cuerpo + '</div></div>';
  return document.getElementById('cuerpo');
}
function errorPagina() {
  pagina('Sin conexión', '', '<div class="vacio">No se ha podido descargar.<br>Revisa la conexión y vuelve a intentarlo.</div>');
}
function cargando(t) { return '<div class="cargando">' + esc(t || 'Cargando…') + '</div>'; }

/* ---------- calendario, semanas y comparar ---------- */
function abrirCalendario() {
  var hash = location.hash;
  pagina('Calendario', 'Toca un día para ver sus noticias', cargando());
  stats('calendario');
  delete cache['archivo/indice.json'];
  descargar('archivo/indice.json').then(function (ix) {
    var dias = ix.dias || [];
    var h = '<button class="btn ancho" onclick="ir(\'comparar\')" style="margin-top:8px">' + ic('columnas2', ' width="18" height="18"') + ' Comparar dos días</button>', mes = '';
    dias.forEach(function (d) {
      var m = MESES[+d.fecha.slice(5, 7) - 1] + ' ' + d.fecha.slice(0, 4);
      if (m !== mes) { if (mes) h += '</div>'; h += '<div class="mes">' + m + '</div><div class="lista">'; mes = m; }
      h += '<button class="fila dia" onclick="ir(\'dia/' + esc(d.fecha) + '\')"><div><div class="t">' + esc(d.fechaTexto) +
        '</div><div class="x">' + esc(d.titular || '') + '</div></div><span class="flecha">›</span></button>';
    });
    if (mes) h += '</div>';
    if (location.hash === hash) pagina('Calendario', 'Toca un día para ver sus noticias', h);
  }).catch(errorPagina);
}
function abrirSemanas() {
  var hash = location.hash;
  pagina('Resumen semanal', 'Lo más importante de cada semana', cargando());
  delete cache['semanal/indice.json'];
  descargar('semanal/indice.json').then(function (ix) {
    var h = '<div class="lista" style="margin-top:8px">';
    (ix.semanas || []).forEach(function (s) {
      h += '<button class="fila" onclick="ir(\'semana/' + esc(s.fecha) + '\')"><div><div class="t">' + esc(s.fechaTexto) +
        '</div></div><span class="flecha">›</span></button>';
    });
    h += '</div>';
    if (!(ix.semanas || []).length) h = '<div class="vacio">Todavía no hay ningún resumen semanal. Se publica los viernes por la noche.</div>';
    if (location.hash === hash) pagina('Resumen semanal', 'Lo más importante de cada semana', h);
  }).catch(errorPagina);
}
function abrirArchivo(ruta, tituloFn) {
  $layer.innerHTML = cargando();
  var hash = location.hash;
  descargar(ruta).then(function (d) { if (location.hash === hash) abrirReels(d, tituloFn(d)); }).catch(errorPagina);
}

var ORDEN_IND = ['ibex', 'eurostoxx', 'dax', 'sp500', 'nasdaq', 'brent', 'oro', 'eurusd', 'bitcoin'];
/** «19.186» → 19186, «92,3 $» → 92.3, «—» → null. */
function numero(s) {
  if (s == null) return null;
  var b = String(s).replace(/[^\d.,]/g, '');
  if (!b) return null;
  var n = parseFloat(b.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}
function pct(a, b) {
  var p = (b - a) / a * 100;
  if (Math.abs(p) < 0.005) return '0,00%';
  return (p < 0 ? '−' : '+') + Math.abs(p).toFixed(2).replace('.', ',') + '%';
}
function abrirComparar(fa, fb) {
  var hash = location.hash;
  pagina('Comparar días', 'Cómo cambiaron los mercados de un día a otro', cargando('Cargando los dos días…'));
  stats('comparar-dias');
  descargar('archivo/indice.json').then(function (ix) {
    var dias = ix.dias || [];
    if (dias.length < 2) throw new Error('pocos');
    var b = fb || (fa ? fa : dias[0].fecha);
    var a = fb ? fa : (dias.find(function (d) { return d.fecha < b; }) || dias[1]).fecha;
    if (a > b) { var t = a; a = b; b = t; }
    return Promise.all([descargar('archivo/' + a + '.json'), descargar('archivo/' + b + '.json')]).then(function (r) {
      if (location.hash !== hash) return;
      pintarComparar(dias, r[0], r[1]);
    });
  }).catch(function () { if (location.hash === hash) errorPagina(); });
}
function selectorDia(dias, sel, id) {
  return '<select id="' + id + '" onchange="cambiarComparar()">' + dias.map(function (d) {
    return '<option value="' + esc(d.fecha) + '"' + (d.fecha === sel ? ' selected' : '') + '>' + esc(corta(d.fecha) + ' ' + d.fecha.slice(0, 4)) + '</option>';
  }).join('') + '</select>';
}
function cambiarComparar() {
  location.replace('#comparar/' + document.getElementById('ca').value + '/' + document.getElementById('cb').value);
}
function pintarComparar(dias, A, B) {
  var h = '<div class="comparar-sel">' + selectorDia(dias, A.fecha, 'ca') + '<span>→</span>' + selectorDia(dias, B.fecha, 'cb') + '</div>';
  var ia = {}, ib = {};
  (A.indicadores || []).forEach(function (x) { ia[x.id] = x; });
  (B.indicadores || []).forEach(function (x) { ib[x.id] = x; });
  var filas = '';
  ORDEN_IND.forEach(function (id) {
    var x = ia[id], y = ib[id];
    if (!x && !y) return;
    var nx = x && numero(x.valor), ny = y && numero(y.valor);
    var v = nx && ny ? pct(nx, ny) : null;
    var cls = !v ? 'flat' : v[0] === '−' ? 'down' : v === '0,00%' ? 'flat' : 'up';
    function celda(i) { return !i ? '—' : esc(i.valor) + (i.cambio ? '<small>' + esc(i.cambio) + '</small>' : ''); }
    filas += '<tr><th>' + esc((x || y).nombre) + '</th><td>' + celda(x) + '</td><td>' + celda(y) + '</td><td class="' + cls + '"><b>' + (v || '—') + '</b></td></tr>';
  });
  h += '<div class="seccion">Indicadores</div>';
  h += filas ? '<div class="tabla-wrap"><table class="tabla"><tr><th></th><th>' + corta(A.fecha) + '</th><th>' + corta(B.fecha) + '</th><th>Variación</th></tr>' + filas + '</table></div>' +
    '<p class="nota">Cada día muestra su último dato y, debajo, lo que cambió ese día. «Variación» es el cambio de un día a otro.</p>'
    : '<p class="nota">Estos días no tienen indicadores guardados. Compara sus titulares más abajo.</p>';
  function titulares(f) {
    return (f.reels || []).map(function (r) {
      return '<li>' + (BANDERAS[r.id] || '') + esc(r.titulo) + (r.cambio ? ' <span class="' + tend(r.tendencia) + '">(' + esc(r.cambio) + ')</span>' : '') + '</li>';
    }).join('');
  }
  function ideas(f) {
    var l = [];
    (f.stories || []).forEach(function (s) {
      if (s.id !== 'ideas') return;
      (s.slides || []).forEach(function (sl) { if (!/no son recomendaciones/i.test(sl.titulo)) l.push('<li>' + esc(sl.titulo) + '</li>'); });
    });
    return l.join('') || '<li>Sin ideas este día.</li>';
  }
  h += '<div class="seccion">Titulares</div><div class="dos"><div><div class="sub">' + esc(A.fechaTexto) + '</div><ul>' + titulares(A) + '</ul>' +
    '<button class="enlace" onclick="ir(\'dia/' + A.fecha + '\')">Ver el ' + corta(A.fecha) + ' ›</button></div>' +
    '<div><div class="sub">' + esc(B.fechaTexto) + '</div><ul>' + titulares(B) + '</ul>' +
    '<button class="enlace" onclick="ir(\'dia/' + B.fecha + '\')">Ver el ' + corta(B.fecha) + ' ›</button></div></div>';
  h += '<div class="seccion">Ideas para investigar</div><div class="dos"><div><div class="sub">' + corta(A.fecha) + '</div><ul>' + ideas(A) + '</ul></div>' +
    '<div><div class="sub">' + corta(B.fecha) + '</div><ul>' + ideas(B) + '</ul></div></div>';
  h += '<div class="aviso">Solo informativo. No es asesoramiento financiero ni una recomendación de compra o venta.</div>';
  pagina('Comparar días', 'Cómo cambiaron los mercados de un día a otro', h);
}

/* ---------- seguimiento ---------- */
var verTodos = false;
function abrirSeguimiento() {
  var c = pagina('Lista de seguimiento', 'Tus valores y sus noticias de hoy',
    '<div class="buscador"><div class="campo">' + ic('buscar', ' width="18" height="18"') +
    '<input id="entrada" type="text" placeholder="Añade un valor (p. ej. Solaria)" autocomplete="off" autocapitalize="words" enterkeyhint="done"></div>' +
    '<button class="btn" onclick="anadirValor()">Añadir</button><div id="sugerencias" class="sugerencias"></div></div><div id="segLista"></div>');
  var e = document.getElementById('entrada');
  e.addEventListener('input', function () { sugerir(e.value); });
  e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); anadirValor(); } });
  e.addEventListener('blur', function () { setTimeout(function () { sugerir(''); }, 200); });
  pintarSeguimiento();
  cargarRecientes().then(function () { if (location.hash === '#seguimiento') pintarSeguimiento(); });
  stats('seguimiento');
}
/** 0 = el nombre empieza así; 1 = alguna palabra; 2 = el ticker; -1 = no coincide. */
function nivel(v, q) {
  if (v.clave.indexOf(q) === 0) return 0;
  if (v.clave.split(/[^a-z0-9&]+/).some(function (w) { return w.indexOf(q) === 0; })) return 1;
  if (v.ticker && normal(v.ticker).indexOf(q) === 0) return 2;
  return -1;
}
function sugerir(texto) {
  var box = document.getElementById('sugerencias');
  if (!box) return;
  var q = normal(texto.trim());
  if (!q) { box.innerHTML = ''; return; }
  var todos = BUSCADOR.slice();
  if (datos) todosLosValores(datos).forEach(function (v) {
    if (!todos.some(function (x) { return x.clave === normal(v); })) todos.push({ nombre: v, ticker: '', mercado: 'En las noticias', clave: normal(v) });
  });
  var r = [];
  for (var n = 0; n <= 2 && r.length < 12; n++) {
    todos.filter(function (v) { return nivel(v, q) === n; }).sort(function (a, b) { return a.clave.localeCompare(b.clave); })
      .forEach(function (v) { if (r.length < 12) r.push(v); });
  }
  box.innerHTML = r.map(function (v) {
    return '<button onmousedown="event.preventDefault()" onclick="anadirValor(' + attr(v.nombre) + ')"><b>' + esc(v.nombre) + '</b><span>' +
      esc([v.ticker, v.mercado].filter(Boolean).join(' · ')) + '</span></button>';
  }).join('');
}
function anadirValor(nombre) {
  var e = document.getElementById('entrada');
  var v = (nombre || (e && e.value) || '').trim();
  if (!v) return;
  if (!sigue(v)) { alternar(v); aviso('Siguiendo ' + v); }
  if (e) { e.value = ''; e.blur(); }
  sugerir('');
  pintarSeguimiento();
}
function quitarValor(v) { alternar(v); pintarSeguimiento(); }
function pintarSeguimiento() {
  var box = document.getElementById('segLista');
  if (!box || !datos) return;
  var hoy = datos, seg = seguidos(), h = '<div class="seccion">★ Siguiendo (' + seg.length + ')</div>';
  if (!seg.length) h += '<p class="nota">Aún no sigues ningún valor. Añádelo arriba, toca una sugerencia o pulsa un valor en cualquier noticia y luego «Seguir».</p>';
  // Primero los que tienen noticias hoy; del resto, el orden en que se añadieron.
  var orden = seg.filter(function (v) { return noticiasDe(hoy, v).length; });
  seg.forEach(function (v) { if (orden.indexOf(v) < 0) orden.push(v); });
  var n = verTodos ? orden.length : Math.min(5, orden.length);
  for (var i = 0; i < n; i++) h += tarjetaValor(orden[i], hoy);
  if (orden.length > 5) h += '<button class="btn sec ancho" onclick="verTodos=!verTodos;pintarSeguimiento()">' + (verTodos ? 'Ver menos ▴' : 'Ver todos (' + orden.length + ') ▾') + '</button>';
  var sug = todosLosValores(hoy).filter(function (v) { return !sigue(v); });
  if (sug.length) {
    h += '<div class="seccion">Valores en las noticias de hoy</div><div class="valores grandes">' + sug.map(function (v) {
      return '<button onclick="anadirValor(' + attr(v) + ')">☆ ' + esc(v) + '</button>';
    }).join('') + '</div><p class="nota">Toca uno para seguirlo.</p>';
  }
  box.innerHTML = h;
}
function tarjetaValor(valor, hoy) {
  var n = noticiasDe(hoy, valor);
  var h = '<div class="tarjeta" onclick="ir(\'valor/\'+encodeURIComponent(' + attr(valor) + '))"><div class="tarjeta-top"><span class="nombre">★ ' + esc(valor) + '</span>' +
    '<button class="quitar" onclick="event.stopPropagation();quitarValor(' + attr(valor) + ')">Dejar de seguir</button></div>';
  if (!n.length) {
    h += '<div class="sub">Hoy no sale en nuestras noticias.</div>';
    var r = RECIENTES[valor.toLowerCase()], w = r && r.web, o = r && r.nuestra;
    if (!w && !o) h += '<div class="linea suave">Aún no tenemos lo último de ' + esc(valor) + '. Lo buscamos en los próximos días.</div>';
    if (w && w.variacion && w.variacion.cambio) h += '<div class="linea ' + tend(w.variacion.tendencia) + '"><b>' + flecha(w.variacion.tendencia) + esc(variacion(w.variacion)) + '</b></div>';
    if (w && w.resumen) h += '<div class="linea tres">' + esc(w.resumen) + '</div>';
    ((w && w.titulares) || []).slice(0, 2).forEach(function (t) { h += '<div class="linea una">• ' + esc(corta(t.fecha)) + ' · ' + esc(t.titulo) + '</div>'; });
    if ((!w || !(w.titulares || []).length) && o && o.fecha) {
      h += '<div class="sub">' + esc(nuestraLinea(o)) + '</div><div class="linea una">• ' + esc(o.frase || o.titulo) + '</div>';
    }
  } else {
    h += '<div class="sub">Noticias del ' + esc(String(hoy.fechaTexto).toLowerCase()) + ':</div>';
    n.slice(0, 2).forEach(function (t) { h += '<div class="linea una">• ' + esc(t) + '</div>'; });
  }
  var resto = n.length - 2;
  h += '<div class="ver-ficha">' + (resto > 0 ? 'Ver ficha y ' + resto + (resto === 1 ? ' noticia más ›' : ' noticias más ›') : 'Ver ficha ›') + '</div></div>';
  return h;
}
function variacion(v) { return v.cambio + (v.periodo ? ' en ' + v.periodo : '') + (v.hasta ? ', hasta el ' + corta(v.hasta) : ''); }
function nuestraLinea(o) { return 'En nuestras noticias ' + (o.semanal ? '(resumen semanal) ' : '') + hace(o.fecha) + ', el ' + corta(o.fecha) + ':'; }

/* ---------- ficha de un valor ---------- */
var IND_NOMBRE = { 'ibex 35': 'ibex', 'euro stoxx 50': 'eurostoxx', 'dax': 'dax', 's&p 500': 'sp500', 'nasdaq': 'nasdaq', 'brent': 'brent', 'oro': 'oro', 'eur/usd': 'eurusd', 'bitcoin': 'bitcoin' };
function botonSeguir(v) {
  var s = sigue(v);
  return '<button class="seguir' + (s ? ' on' : '') + '" id="btnSeguir" onclick="seguir(' + attr(v) + ', function(){document.getElementById(\'btnSeguir\').outerHTML=botonSeguir(' + attr(v) + ')})">' +
    (s ? '★ Siguiendo' : '☆ Seguir') + '</button>';
}
function abrirValor(valor) {
  var hash = location.hash;
  pagina(valor, 'Ficha del valor', cargando('Buscando las noticias de ' + valor + '…'), botonSeguir(valor));
  stats('ficha-de-valor');
  var info = descargar('valores.json').then(function (d) {
    return (d.valores || []).find(function (x) { return x.nombre.toLowerCase() === valor.toLowerCase(); });
  }).catch(function () { return null; });
  var dias = descargar('archivo/indice.json').then(function (ix) {
    return Promise.all((ix.dias || []).slice(0, 10).map(function (d) {
      return descargar('archivo/' + d.fecha + '.json').catch(function () { return null; });
    }));
  }).catch(function () { return []; });
  Promise.all([info, dias, cargarRecientes()]).then(function (r) {
    if (location.hash !== hash) return;
    pintarValor(valor, r[0], r[1].filter(Boolean));
  });
}
function pintarValor(valor, info, feeds) {
  var menciones = [], serie = [], etiquetas = [], ind = IND_NOMBRE[valor.toLowerCase()];
  feeds.forEach(function (f) {
    var vistos = [];
    (f.reels || []).forEach(function (r) {
      if (menciona(valor, r.valores, r.titulo, r.texto)) { menciones.push(Object.assign({ fecha: f.fecha }, r)); vistos.push(r.titulo); }
    });
    (f.stories || []).forEach(function (s) {
      if (s.id === 'agenda') return;
      (s.slides || []).forEach(function (d) {
        if (vistos.indexOf(d.titulo) < 0 && menciona(valor, d.valores, d.titulo, d.texto)) { menciones.push(Object.assign({ fecha: f.fecha }, d)); vistos.push(d.titulo); }
      });
    });
    if (ind) {
      var x = (f.indicadores || []).find(function (i) { return i.id === ind; }), n = x && numero(x.valor);
      if (n != null) { serie.unshift(n); etiquetas.unshift(corta(f.fecha)); }
    }
  });
  var rec = RECIENTES[valor.toLowerCase()] || {}, w = rec.web, o = rec.nuestra;
  var h = '<div class="ficha-card"><div class="ficha-nombre">' + esc(valor) + (info && info.ticker ? ' · ' + esc(info.ticker) : '') + '</div>';
  if (info) h += '<div class="ficha-sub">' + esc([info.sector, info.mercado, info.pais].filter(Boolean).join(' · ')) + '</div>';
  // El dato de una noticia solo es de este valor si es el primero (o el único) del que habla.
  function propia(m) { var vs = m.valores || []; return vs.length ? vs[0].toLowerCase() === valor.toLowerCase() : buscarPalabra(String(m.titulo).toLowerCase(), valor.toLowerCase()) >= 0; }
  var ultima = menciones.find(function (m) { return (m.dato || m.cambio) && propia(m); });
  if (ultima) {
    h += datoRow(ultima.dato, ultima.cambio, tend(ultima.tendencia), 34) + '<div class="ficha-sub">Último dato en las noticias del ' + corta(ultima.fecha) + '</div>';
  } else if (w && w.variacion && w.variacion.cambio) {
    var v = w.variacion;
    h += datoRow(null, v.cambio, tend(v.tendencia)) + '<div class="ficha-sub">' + esc((v.periodo ? 'En ' + v.periodo : 'Variación') + (v.hasta ? ', hasta el ' + corta(v.hasta) : '') + (v.fuente ? ' · ' + v.fuente : '')) + '</div>';
  }
  var g = serie.length >= 2 ? { valores: serie, etiquetas: etiquetas } : (menciones.find(function (m) { return m.grafica && propia(m); }) || {}).grafica;
  h += sparkline(g, 140) + '</div>';
  if (info && info.descripcion) h += '<div class="seccion">Qué es</div><div class="caja">' + enlazar(info.descripcion) + '</div>';
  if (w && (w.resumen || (w.variacion && w.variacion.cambio) || (w.titulares || []).length)) {
    h += '<div class="seccion">Lo último de ' + esc(valor) + '</div><div class="caja">';
    if (w.variacion && w.variacion.cambio) h += '<div class="' + tend(w.variacion.tendencia) + '"><b>' + flecha(w.variacion.tendencia) + esc(variacion(w.variacion)) + '</b></div>' +
      (w.variacion.fuente ? '<div class="nota" style="margin:0">Dato de ' + esc(w.variacion.fuente) + '</div>' : '');
    if (w.resumen) h += '<div style="margin-top:6px">' + enlazar(w.resumen) + '</div>';
    h += '</div>';
    (w.titulares || []).forEach(function (t) {
      var u = urlSegura(t.url);
      h += '<' + (u ? 'a href="' + esc(u) + '" target="_blank" rel="noopener"' : 'div') + ' class="caja titular"><div class="nota" style="margin:0">' + esc(corta(t.fecha)) + ' · ' + esc(t.fuente) + '</div>' +
        '<b>' + esc(t.titulo) + '</b>' + (u ? '<div class="ver-ficha">Leer en ' + esc(t.fuente) + ' ›</div>' : '') + '</' + (u ? 'a' : 'div') + '>';
    });
    h += '<p class="nota">Noticias de otras fuentes, revisadas cada pocos días.</p>';
  }
  h += '<div class="seccion">' + (w ? 'En nuestras noticias' : 'Noticias recientes') + '</div>';
  if (!menciones.length) {
    h += '<p class="nota">' + (o && o.fecha ? 'No aparece en los últimos 10 días de noticias. La última vez fue ' + esc(hace(o.fecha)) + ', el ' + corta(o.fecha) + ': «' + esc(o.frase || o.titulo) + '»'
      : 'No aparece en las noticias de los últimos 10 días.') + '</p>';
  }
  menciones.forEach(function (m) {
    var t = tend(m.tendencia);
    h += '<div class="caja mencion" role="link" tabindex="0" onclick="ir(\'dia/' + esc(m.fecha) + '\')"><div class="mencion-top"><span class="nota" style="margin:0">' + corta(m.fecha) + '</span>' +
      (m.cambio && propia(m) ? '<span class="' + t + '"><b>' + flecha(t) + esc(m.cambio) + '</b></span>' : '') + '</div><b>' + esc(m.titulo) + '</b><div class="suave">' + enlazar(m.texto) + '</div></div>';
  });
  h += '<div class="aviso">Solo informativo. No es asesoramiento financiero ni una recomendación de compra o venta.</div>';
  pagina(valor, 'Ficha del valor', h, botonSeguir(valor));
}

/* ---------- glosario y test ---------- */
function abrirGlosario() {
  pagina('Glosario', 'Toca un término para ver su explicación',
    '<div id="testCard"></div><div class="campo" style="margin:14px 0 4px">' + ic('buscar', ' width="18" height="18"') +
    '<input id="filtro" type="search" placeholder="Buscar (p. ej. OPA, soporte, dividendo)" autocomplete="off"></div><div id="glosLista"></div>');
  document.getElementById('filtro').addEventListener('input', function (e) { pintarGlosario(e.target.value); });
  pintarGlosario('');
  stats('glosario');
}
function pintarGlosario(filtro) {
  var ok = leer('test_acertados', []), mal = leer('test_fallados', []);
  var dominados = GLOS.filter(function (t) { return ok.indexOf(t.termino) >= 0; }).length;
  var racha = rachaTest();
  document.getElementById('testCard').innerHTML = '<div class="test-card"><div class="t">' + ic('test', ' width="22" height="22"') + ' Test de 10 preguntas</div>' +
    '<div class="s">Mejor resultado: ' + leer('test_mejor', 0) + '/10 · Racha: ' + racha + (racha === 1 ? ' día' : ' días') +
    '<br>Términos dominados: ' + dominados + ' de ' + GLOS.length + '</div><div class="botones"><button class="btn" onclick="ir(\'test\')">Empezar test</button>' +
    (mal.length ? '<button class="btn sec" onclick="ir(\'test/repaso\')">Repasar fallos (' + mal.length + ')</button>' : '') + '</div></div>';
  var q = normal(filtro.trim()), h = '';
  GLOS.forEach(function (t, i) {
    if (q && normal(t.termino + ' ' + (t.alias || []).join(' ') + ' ' + t.definicion).indexOf(q) < 0) return;
    h += '<details class="termino"><summary><span>' + esc(t.termino) + '</span>' +
      (ok.indexOf(t.termino) >= 0 ? '<span class="up">✓</span>' : mal.indexOf(t.termino) >= 0 ? '<span class="down" style="font-size:13px">✗ repasar</span>' : '') +
      '</summary><p>' + esc(t.definicion) + '</p>' + (t.ejemplo ? '<p class="suave">Ejemplo: ' + esc(t.ejemplo) + '</p>' : '') + '</details>';
  });
  document.getElementById('glosLista').innerHTML = h || '<p class="nota">No hay ningún término con «' + esc(filtro) + '».</p>';
}
function diaLocal() { return diaEpoch(hoyISO()); }
function rachaTest() {
  var u = leer('test_ultimo_dia', 0), d = diaLocal();
  return (u === d || u === d - 1) ? leer('test_racha', 0) : 0;
}
function barajar(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function letra(i) { return String.fromCharCode(65 + i); }

function abrirTest(repaso) {
  var pool = [];
  if (repaso) { var f = leer('test_fallados', []); pool = GLOS.filter(function (t) { return f.indexOf(t.termino) >= 0; }); }
  if (!pool.length) pool = GLOS.slice();
  barajar(pool);
  var preguntas = pool.slice(0, 10).map(function (t) {
    var defATerm = Math.random() < .5;
    var ops = barajar(barajar(GLOS.filter(function (o) { return o !== t; })).slice(0, 3).concat([t]));
    return { t: t, defATerm: defATerm, opciones: ops.map(function (o) { return defATerm ? o.termino : o.definicion; }), correcta: ops.indexOf(t) };
  });
  juego({
    titulo: repaso ? 'Repaso de fallos' : 'Test del glosario', sub: 'Elige la respuesta correcta', preguntas: preguntas,
    enunciado: function (q) {
      return q.defATerm ? '<div class="cat">¿A qué término corresponde?</div><div class="enunciado">«' + esc(q.t.definicion) + '»</div>'
        : '<div class="cat">¿Qué significa…?</div><div class="enunciado grande">' + esc(q.t.termino) + '</div>';
    },
    opcion: function (q, i) { return esc(q.opciones[i]); },
    alResponder: function (q, ok) {
      var f = leer('test_fallados', []), a = leer('test_acertados', []);
      f = f.filter(function (x) { return x !== q.t.termino; }); a = a.filter(function (x) { return x !== q.t.termino; });
      (ok ? a : f).push(q.t.termino);
      guardar('test_fallados', f); guardar('test_acertados', a);
      return '<div class="' + (ok ? 'up' : 'down') + ' resultado">' + (ok ? '✓  ¡Correcto!' : '✗  No es esa') + '</div><p class="suave">' + esc(q.t.termino) + ': ' +
        esc(q.t.definicion) + (q.t.ejemplo ? '<br>Ejemplo: ' + esc(q.t.ejemplo) : '') + '</p>';
    },
    final: function (aciertos, n, fallos) {
      var d = diaLocal(), u = leer('test_ultimo_dia', 0), racha = leer('test_racha', 0);
      if (u !== d) racha = u === d - 1 ? racha + 1 : 1;
      var record = aciertos > leer('test_mejor', 0) && n === 10;
      guardar('test_ultimo_dia', d); guardar('test_racha', racha); guardar('test_hechos', leer('test_hechos', 0) + 1);
      if (n === 10) guardar('test_mejor', Math.max(aciertos, leer('test_mejor', 0)));
      var msg = aciertos === n ? '¡Perfecto! Dominas estos términos.' : aciertos * 10 >= n * 7 ? '¡Muy bien! Ya casi lo tienes.'
        : aciertos * 10 >= n * 5 ? 'Vas bien. Repasa los fallos y vuelve a intentarlo.' : 'Buen comienzo. Repasa los términos y prueba otra vez.';
      var h = resultadoCard(aciertos * 10 >= n * 7 ? 'trofeo' : aciertos * 10 >= n * 5 ? 'check' : 'libro', aciertos, n, msg,
        (record ? '★ ¡Nuevo récord! · ' : 'Récord: ' + leer('test_mejor', 0) + '/10 · ') + 'Racha: ' + racha + (racha === 1 ? ' día' : ' días'));
      if (fallos.length) {
        h += '<div class="seccion">Para repasar</div>' + fallos.map(function (q) {
          return '<div class="caja"><b class="down">✗ ' + esc(q.t.termino) + '</b><div class="suave">' + esc(q.t.definicion) + '</div></div>';
        }).join('');
      }
      return h + '<div class="botones"><button class="btn" onclick="location.replace(\'#test\');ruta()">Otro test</button>' +
        (fallos.length ? '<button class="btn sec" onclick="location.replace(\'#test/repaso\');ruta()">Repasar fallos</button>' : '') +
        '<button class="btn sec" onclick="cerrar()">Volver</button></div>';
    }
  });
  stats('test');
}
function resultadoCard(icono, aciertos, n, msg, linea) {
  return '<div class="resultado-card">' + monedaIcono(icono, 72) + '<div class="puntos">' + aciertos + ' / ' + n + '</div><div>' + esc(msg) + '</div>' +
    '<div class="s">' + esc(linea) + '</div></div>';
}
/** Motor común del test y de «¿Quién lo dijo?»: pregunta, 4 opciones, explicación y resultado. */
function juego(cfg) {
  var actual = 0, aciertos = 0, fallos = [];
  var cuerpo = pagina(cfg.titulo, cfg.sub, '');
  function mostrar() {
    var q = cfg.preguntas[actual], n = cfg.preguntas.length;
    var h = '<div class="progreso">Pregunta ' + (actual + 1) + ' de ' + n + ' · ✓ ' + aciertos + '</div><div class="barra-prog"><i style="width:' + (actual / n * 100) + '%"></i></div>' +
      '<div class="pregunta">' + cfg.enunciado(q) + '</div><div class="opciones">';
    for (var i = 0; i < q.opciones.length; i++) h += '<button class="opcion" data-i="' + i + '"><b>' + letra(i) + '</b><span>' + cfg.opcion(q, i) + '</span></button>';
    h += '</div><div id="explicacion"></div>';
    cuerpo.innerHTML = h;
    document.getElementById('pag').scrollTop = 0;
    var respondida = false;
    cuerpo.querySelectorAll('.opcion').forEach(function (b) {
      b.onclick = function () {
        if (respondida) return; respondida = true;
        var el = +b.dataset.i, ok = el === q.correcta;
        if (ok) aciertos++; else fallos.push(q);
        cuerpo.querySelectorAll('.opcion').forEach(function (o, k) {
          o.classList.add(k === q.correcta ? 'bien' : k === el ? 'mal' : 'apagada');
        });
        var ultima = actual === n - 1;
        var ex = document.getElementById('explicacion');
        ex.innerHTML = cfg.alResponder(q, ok) + '<button class="btn ancho" id="sig">' + (ultima ? 'Ver resultado' : 'Siguiente →') + '</button>';
        document.getElementById('sig').onclick = function () { if (ultima) { cuerpo.innerHTML = cfg.final(aciertos, n, fallos); document.getElementById('pag').scrollTop = 0; } else { actual++; mostrar(); } };
        ex.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
    });
  }
  if (!cfg.preguntas.length) { cuerpo.innerHTML = '<div class="vacio">No hay preguntas todavía.</div>'; return; }
  mostrar();
}

/* ---------- grandes de las finanzas ---------- */
var filtroGente = 'todos';
function abrirInversores() {
  pagina('Grandes de las finanzas', 'Quiénes son, cómo invierten y qué aprender de ellos', '<div id="genteLista"></div>');
  pintarInversores();
  stats('grandes-de-las-finanzas');
}
function pintarInversores() {
  var FILTROS = [['todos', 'Todos'], ['inversor', 'Inversores'], ['trader', 'Traders'], ['empresario', 'Empresarios'], ['historias', 'Historias']];
  var h = '<div class="test-card"><div class="t">' + ic('chat', ' width="22" height="22"') + ' ¿Quién lo dijo?</div><div class="s">10 preguntas: adivina de quién es cada frase o cada historia.<br>Mejor resultado: ' +
    leer('quien_mejor', 0) + '/10</div><div class="botones"><button class="btn" onclick="ir(\'quien\')">Jugar</button></div></div>';
  var p = delDia();
  if (p) h += '<button class="personaje-card" onclick="ir(\'personaje\')" style="margin-top:12px">' + moneda(p.nombre, 46) + '<div><div class="cat" style="margin:0">Personaje del día</div><div class="t">' + esc(p.nombre) + '</div></div></button>';
  h += '<div class="filtros">' + FILTROS.map(function (f) {
    return '<button class="' + (filtroGente === f[0] ? 'on' : '') + '" onclick="filtroGente=\'' + f[0] + '\';pintarInversores()">' + f[1] + '</button>';
  }).join('') + '</div><div class="lista">';
  if (filtroGente === 'historias') {
    (GENTE.historias || []).forEach(function (x) {
      h += '<button class="fila" onclick="ir(\'historia/' + esc(x.id) + '\')">' + monedaIcono('reloj', 44) + '<div><div class="t">' + esc(x.titulo) + '</div><div class="x">' +
        esc(x.fecha + (x.lugar ? ' · ' + x.lugar : '')) + '</div><div class="x">' + esc(x.resumen) + '</div></div><span class="flecha">›</span></button>';
    });
  } else {
    (GENTE.personas || []).forEach(function (x) {
      if (filtroGente !== 'todos' && filtroGente !== x.tipo) return;
      h += '<button class="fila" onclick="ir(\'persona/' + esc(x.id) + '\')">' + moneda(x.nombre, 44) + '<div><div class="t">' + esc(x.nombre) + ' <span class="etiqueta verde">' + nombreTipo(x.tipo) + '</span></div><div class="x">' +
        esc(x.pais + (x.vida ? ' · ' + x.vida : '')) + '</div><div class="x">' + esc(x.resumen) + '</div></div><span class="flecha">›</span></button>';
    });
  }
  h += '</div><p class="nota">Contenido educativo. Que un inversor famoso use un método no significa que te vaya a funcionar a ti: no es asesoramiento financiero.</p>';
  document.getElementById('genteLista').innerHTML = h;
}
function seccionTexto(icono, titulo, texto) {
  if (!texto) return '';
  return '<div class="seccion con-ic">' + ic(icono, ' width="16" height="16"') + esc(titulo) + '</div><div class="caja">' + enlazar(texto) + '</div>';
}
function seccionLista(icono, titulo, l, pre) {
  if (!(l || []).length) return '';
  return '<div class="seccion con-ic">' + ic(icono, ' width="16" height="16"') + esc(titulo) + '</div><div class="caja">' + l.map(function (x) { return '<div class="item">' + pre + esc(x) + '</div>'; }).join('') + '</div>';
}
function fuentesHtml(fs) {
  if (!(fs || []).length) return '';
  return '<div class="seccion con-ic">' + ic('enlace', ' width="16" height="16"') + 'Fuentes</div>' + fs.map(function (f) {
    var u = urlSegura(f.url);
    return u ? '<a class="enlace-fuente" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(f.titulo) + ' ›</a>' : '';
  }).join('');
}
function abrirPersona(id) {
  var p = (GENTE.personas || []).find(function (x) { return x.id === id; });
  if (!p) return cerrar();
  var h = '<div class="persona-cab">' + moneda(p.nombre, 64) + '<div><div class="ficha-nombre">' + esc(p.nombre) + '</div><div class="nota" style="margin:0">' +
    esc(p.pais + (p.vida ? ' · ' + p.vida : '')) + '</div></div></div><p>' + esc(p.resumen) + '</p>';
  if (p.cita) h += '<div class="cita">«' + esc(p.cita) + '»</div>';
  h += seccionTexto('persona', 'Quién es', p.quien) + seccionTexto('brujula', 'Su método', p.metodo) + seccionTexto('ajustes', 'Cómo trabaja', p.como_trabaja) +
    seccionLista('idea', 'Qué aprender', p.claves, '✓  ') + seccionTexto('alerta', 'A tener en cuenta', p.cuidado) + seccionLista('libro', 'Para saber más', p.libros, '•  ');
  if ((p.valores || []).length) h += '<div class="seccion con-ic">' + ic('grafica', ' width="16" height="16"') + 'Valores relacionados</div>' + chipsValores(p.valores);
  h += fuentesHtml(p.fuentes) + '<div class="aviso">Contenido educativo. No es asesoramiento financiero ni una recomendación de compra o venta.</div>';
  pagina(p.nombre, nombreTipo(p.tipo), h);
  stats('ficha-de-persona');
}
function abrirHistoria(id) {
  var x = (GENTE.historias || []).find(function (y) { return y.id === id; });
  if (!x) return cerrar();
  var h = '<div class="persona-cab">' + monedaIcono('reloj', 64) + '<div><div class="ficha-nombre">' + esc(x.titulo) + '</div><div class="nota" style="margin:0">' +
    esc(x.fecha + (x.lugar ? ' · ' + x.lugar : '')) + '</div></div></div><p>' + esc(x.resumen) + '</p>' +
    seccionTexto('libro', 'Qué pasó', x.que_paso) + seccionTexto('idea', 'La lección', x.leccion) + fuentesHtml(x.fuentes) +
    '<div class="aviso">Contenido educativo. No es asesoramiento financiero.</div>';
  pagina(x.titulo, 'Historia de la bolsa', h);
  stats('ficha-de-persona');
}

/* ---------- personaje del día (6 escenas, como un reel) ---------- */
function abrirPersonaje() {
  var p = delDia();
  if (!p) return cerrar();
  var esc6 = [];
  esc6.push('<div class="escena-ic">' + moneda(p.nombre, 84) + '</div><div class="cat">' + esc(nombreTipo(p.tipo).toUpperCase() + (p.pais ? ' · ' + p.pais : '')) +
    '</div><h2 class="titulo grande">' + esc(p.nombre) + '</h2><p class="texto">' + esc(p.resumen) + '</p>');
  function escena(icono, etq, txt) { return '<div class="escena-ic">' + monedaIcono(icono, 56) + '</div><div class="cat">' + esc(etq) + '</div><p class="texto escena-txt">' + enlazar(txt) + '</p>'; }
  if (p.quien) esc6.push(escena('persona', 'Quién es', p.quien));
  if (p.metodo) esc6.push(escena('brujula', 'Su método', p.metodo));
  if (p.como_trabaja) esc6.push(escena('ajustes', 'Cómo trabaja', p.como_trabaja));
  if ((p.claves || []).length) {
    esc6.push('<div class="escena-ic">' + monedaIcono('idea', 56) + '</div><div class="cat">Lo que puedes aprender</div>' +
      p.claves.slice(0, 4).map(function (k, i) { return '<div class="leccion"><span>' + (i + 1) + '</span><p>' + esc(k) + '</p></div>'; }).join(''));
  }
  var manana = delDia(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  esc6.push((p.cita ? '<div class="escena-ic">' + monedaIcono('chat', 56) + '</div><div class="cita grande">«' + esc(p.cita) + '»</div><div class="suave">— ' + esc(p.nombre) + '</div>'
    : '<div class="escena-ic">' + moneda(p.nombre, 56) + '</div>') +
    (p.cuidado ? '<div class="cuidado" style="margin-top:16px">A tener en cuenta: ' + esc(p.cuidado) + '</div>' : '') +
    '<div class="botones"><button class="btn" onclick="ir(\'persona/' + esc(p.id) + '\')">Ver ficha completa</button><button class="btn sec" onclick="compartirPersonaje()">Compartir</button></div>' +
    (manana && manana !== p ? '<div class="nota">Mañana: ' + esc(manana.nombre) + '</div>' : ''));
  var h = '<div class="reels-top"><span class="cont">Personaje del día · <span id="cont">1/' + esc6.length + '</span></span>' +
    '<button class="icono" aria-label="Cerrar" onclick="cerrar()">' + ic('cerrar') + '</button></div><div class="reels" id="reels">';
  esc6.forEach(function (e, i) {
    h += '<section class="reel' + (i === 0 ? ' destacada-reel' : '') + '"><div class="reel-inner">' + e +
      '<div class="pie-escena">' + (i === 0 ? '↑ Desliza para seguir · ' : '') + 'Solo informativo. No es asesoramiento financiero.</div></div></section>';
  });
  $layer.innerHTML = h + '</div>';
  var cont = document.getElementById('reels'), c = document.getElementById('cont');
  cont.addEventListener('scroll', function () { c.textContent = (Math.round(cont.scrollTop / cont.clientHeight) + 1) + '/' + esc6.length; }, { passive: true });
  stats('personaje-del-dia');
}
function compartirPersonaje() {
  var p = delDia();
  var txt = p.nombre + ': ' + p.resumen + (p.cita ? '\n\n«' + p.cita + '»' : '');
  compartir('Personaje del día: ' + p.nombre, txt);
}

/* ---------- ¿Quién lo dijo? ---------- */
function abrirQuien() {
  var todas = GENTE.personas || [], pool = [];
  function ocultar(t, p) { p.nombre.split(' ').forEach(function (w) { if (w.length > 3) t = t.split(w).join('…'); }); return t; }
  todas.forEach(function (p) {
    if (p.cita) pool.push({ p: p, enunciado: '¿Quién dijo esta frase?', pista: '«' + p.cita + '»' });
    pool.push({ p: p, enunciado: '¿De quién hablamos?', pista: ocultar(p.resumen, p) });
  });
  barajar(pool);
  var usadas = [], preguntas = [];
  pool.forEach(function (q) {
    if (preguntas.length >= 10 || usadas.indexOf(q.p.id) >= 0) return;
    usadas.push(q.p.id);
    var ops = barajar(barajar(todas.filter(function (o) { return o !== q.p; })).slice(0, 3).concat([q.p]));
    q.ops = ops; q.opciones = ops.map(function (o) { return o.nombre; }); q.correcta = ops.indexOf(q.p);
    preguntas.push(q);
  });
  juego({
    titulo: '¿Quién lo dijo?', sub: 'Elige a la persona correcta', preguntas: preguntas,
    enunciado: function (q) { return '<div class="cat">' + esc(q.enunciado) + '</div><div class="enunciado">' + esc(q.pista) + '</div>'; },
    opcion: function (q, i) { return esc(q.opciones[i]); },
    alResponder: function (q, ok) {
      return '<div class="' + (ok ? 'up' : 'down') + ' resultado">' + (ok ? '✓  ¡Correcto!' : '✗  Era ' + esc(q.p.nombre)) + '</div><p class="suave">' + esc(q.p.resumen) + '</p>' +
        '<button class="enlace" onclick="ir(\'persona/' + esc(q.p.id) + '\')">Ver su ficha ›</button>';
    },
    final: function (aciertos, n, fallos) {
      var record = n === 10 && aciertos > leer('quien_mejor', 0);
      if (record) guardar('quien_mejor', aciertos);
      var h = resultadoCard(aciertos * 10 >= n * 7 ? 'trofeo' : 'chat', aciertos, n,
        aciertos === n ? '¡Perfecto! Los conoces a todos.' : aciertos * 10 >= n * 5 ? '¡Bien! Ya conoces a muchos.' : 'Buen comienzo. Echa un vistazo a sus fichas.',
        record ? '★ ¡Nuevo récord!' : 'Récord: ' + leer('quien_mejor', 0) + '/10');
      if (fallos.length) h += '<div class="seccion">Para conocer mejor</div><div class="lista">' + fallos.map(function (q) {
        return '<button class="fila" onclick="ir(\'persona/' + esc(q.p.id) + '\')">' + moneda(q.p.nombre, 36) + '<div class="t">' + esc(q.p.nombre) + '</div><span class="flecha">›</span></button>';
      }).join('') + '</div>';
      return h + '<div class="botones"><button class="btn" onclick="location.replace(\'#quien\');ruta()">Jugar otra vez</button><button class="btn sec" onclick="cerrar()">Volver</button></div>';
    }
  });
  stats('quien-lo-dijo');
}

/* ---------- información, aviso legal, opinión ---------- */
var LEGAL = [
  ['Solo informativo', 'CashCashNews resume noticias financieras para que entiendas qué pasa en los mercados. Es información general y educativa. No es asesoramiento financiero, ni una recomendación de comprar o vender nada, ni un análisis pensado para tu situación. No somos una entidad registrada en la CNMV ni en ningún otro supervisor.'],
  ['Puede haber errores', 'Los resúmenes se hacen cada mañana de forma automática, con ayuda de inteligencia artificial, a partir de fuentes públicas que se citan en cada noticia. Pueden tener errores o datos atrasados, y las cotizaciones no son en tiempo real. Antes de decidir nada, compruébalo en la fuente original.'],
  ['Invertir tiene riesgo', 'Puedes perder parte o todo el dinero que inviertas. Que algo haya subido antes no quiere decir que vaya a seguir subiendo. «Ideas para investigar» y «¿Y esto qué significa para mí?» son explicaciones generales, no consejos. Si vas a invertir, infórmate bien o pregunta a un profesional autorizado.'],
  ['Nombres y frases', 'Los nombres y marcas de empresas son de sus dueños y aparecen solo para informar. Algunas frases célebres de inversores se atribuyen de forma popular y no siempre está claro quién las dijo.']
];
var PRIVACIDAD = [
  ['Sin cuentas ni datos personales', 'No hace falta registrarse. La web no pide tu nombre, tu correo ni tu ubicación, y no usa cookies.'],
  ['Lo que se queda en tu móvil', 'Tu lista de seguimiento, tus récords del test, el modo claro u oscuro y las noticias guardadas se quedan en tu navegador y no se envían a nadie.'],
  ['Lo que se descarga', 'Las noticias se descargan de GitHub (raw.githubusercontent.com). Como cualquier web, GitHub ve la dirección de internet desde la que se piden.'],
  ['Estadísticas anónimas', 'Si están activadas, se cuenta qué pantallas se abren (por ejemplo «calendario») en GoatCounter, un servicio sin cookies que no guarda tu dirección de internet. No se manda nada que te identifique, ni qué valores sigues. Puedes quitarlas aquí arriba.'],
  ['Tu opinión', 'Si envías una opinión, solo se manda lo que tú escribes, por la app que elijas.']
];
function abrirInfo() {
  var on = leer('stats', true);
  var h = '<div class="lista" style="margin-top:6px"><button class="interruptor" onclick="cambiarStats()"><div><div style="font-weight:650">Estadísticas anónimas</div>' +
    '<div class="x">Ayuda a saber qué se usa. Sin datos personales.</div></div><span class="sw' + (on ? ' on' : '') + '"></span></button>' +
    '<button class="interruptor" onclick="cambiarTema();abrirInfo()"><div><div style="font-weight:650">Modo oscuro</div><div class="x">Negro y verde, como el logo.</div></div><span class="sw' + (oscuro() ? ' on' : '') + '"></span></button></div>';
  h += '<div class="botones"><button class="btn" onclick="opinion()">Enviar opinión</button><button class="btn sec" onclick="compartir(\'CashCashNews\', \'Noticias financieras del día en stories y reels\', WEB)">Compartir la app</button></div>';
  h += '<div class="seccion">Aviso legal</div>' + LEGAL.map(function (p) { return '<h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p>'; }).join('');
  h += '<div class="seccion">Privacidad</div>' + PRIVACIDAD.map(function (p) { return '<h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p>'; }).join('');
  h += '<div class="seccion">¿Tienes Android?</div><p>También hay una app para Android, con avisos en el móvil cuando tus valores salen en las noticias. ' +
    '<a href="' + RAW + 'apk/CashCashNews-0.13.1.apk" id="apk">Descargar la app de Android</a></p>';
  h += '<p class="pie">Versión ' + VERSION + ' (de prueba)</p>';
  pagina('Información', 'Léelo en un minuto', h);
  descargar('app.json').then(function (a) { var u = urlSegura(a.descarga); var el = document.getElementById('apk'); if (u && el) el.href = u; }).catch(function () {});
  stats('informacion');
}
function cambiarStats() { guardar('stats', !leer('stats', true)); abrirInfo(); }
function compartir(titulo, texto, url) {
  if (navigator.share) { navigator.share({ title: titulo, text: texto, url: url }).catch(function () {}); return; }
  try { navigator.clipboard.writeText(texto + (url ? '\n' + url : '')); aviso('Copiado. Pégalo donde quieras.'); } catch (e) {}
}
function opinion() {
  descargar('app.json').then(function (a) { return urlSegura(a.opinion); }).catch(function () { return null; }).then(function (u) {
    if (u) { window.open(u, '_blank', 'noopener'); return; }
    compartir('Mi opinión sobre CashCashNews', 'Mi opinión sobre CashCashNews: ');
  });
  stats('opinion');
}

/* ---------- navegación (con el gesto de atrás del iPhone) ---------- */
var pasos = 0; // pantallas abiertas desde dentro (para volver con «atrás»)
function ir(r) { cerrarModal(); pasos++; location.hash = r; }
function cerrar() {
  clearInterval(timer); cerrarModal();
  if (pasos > 0) { pasos--; history.back(); }
  else location.hash = '';
}
function ruta() {
  clearInterval(timer); cerrarModal(); pausaStory = function () {};
  var r = location.hash.replace(/^#\/?/, ''), m;
  if (!r) { $layer.innerHTML = ''; document.body.style.overflow = ''; inicio(); return; }
  document.body.style.overflow = 'hidden';
  if (!datos) { $layer.innerHTML = cargando(); return; }
  if (r === 'reels') return abrirReels(datos);
  if ((m = r.match(/^story\/(.+)$/))) return abrirStory(datos, m[1]);
  if (r === 'calendario') return abrirCalendario();
  if (r === 'semanas') return abrirSemanas();
  if (r === 'info') return abrirInfo();
  if (r === 'seguimiento') return abrirSeguimiento();
  if (r === 'glosario') return abrirGlosario();
  if (r === 'test') return abrirTest(false);
  if (r === 'test/repaso') return abrirTest(true);
  if (r === 'inversores') return abrirInversores();
  if (r === 'personaje') return abrirPersonaje();
  if (r === 'quien') return abrirQuien();
  if ((m = r.match(/^persona\/(.+)$/))) return abrirPersona(m[1]);
  if ((m = r.match(/^historia\/(.+)$/))) return abrirHistoria(m[1]);
  if ((m = r.match(/^valor\/(.+)$/))) return abrirValor(decodeURIComponent(m[1]));
  if ((m = r.match(/^comparar(?:\/(\d{4}-\d{2}-\d{2}))?(?:\/(\d{4}-\d{2}-\d{2}))?$/))) return abrirComparar(m[1], m[2]);
  if ((m = r.match(/^dia\/(\d{4}-\d{2}-\d{2})$/))) return abrirArchivo('archivo/' + m[1] + '.json', function (d) { return d.fechaTexto; });
  if ((m = r.match(/^semana\/(\d{4}-\d{2}-\d{2})$/))) return abrirArchivo('semanal/' + m[1] + '.json', function () { return 'Semana'; });
  location.hash = '';
}
window.addEventListener('hashchange', ruta);
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (document.getElementById('modal')) cerrarModal(); else if (location.hash) cerrar();
});

// Al volver a la app después de un rato, buscar noticias nuevas.
var ultima = Date.now();
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && Date.now() - ultima > 10 * 60 * 1000) { ultima = Date.now(); cargar(); }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}

aplicarTema();
splash();
stats(instalada() ? 'abrir-app' : 'abrir-web');
Promise.all([cargarExtras(), cargar()]).then(function () {
  RECIENTES = leer('recientes', {}) || {};
  if (location.hash) ruta(); else inicio();
});
