/* CashCashNews, versión web (para iPhone y cualquier navegador).
 * Lee las mismas noticias que la app de Android, del repositorio público de noticias. */
'use strict';

var VERSION = 'web 1.0';
var RAW = 'https://raw.githubusercontent.com/bpesoaldaco/cashcashnews-noticias/main/';
// En GitHub Pages se lee de GitHub; en local (pruebas), de la carpeta de arriba.
var BASE = /github\.io$/.test(location.hostname) ? RAW : '../';
var STATS = 'https://cashcashnews.goatcounter.com';

var $app = document.getElementById('app');
var $layer = document.getElementById('layer');
var datos = null;            // noticias de hoy
var cache = {};              // otros días y semanas ya descargados
var timer = null;            // temporizador de stories

/* ---------- utilidades ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function leer(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
function tend(t) { return t === 'up' || t === 'down' ? t : 'flat'; }
function urlSegura(u) { return /^https:\/\//.test(u || '') ? u : null; }

function descargar(ruta) {
  return fetch(BASE + ruta, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });
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
  share: '<path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1"/>'
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

/* ---------- estadísticas anónimas (GoatCounter, sin cookies) ---------- */
function stats(pantalla) {
  if (!leer('stats', true)) return;
  if (/^(localhost|127\.)/.test(location.hostname)) return;
  try {
    var u = STATS + '/count?p=' + encodeURIComponent('/web/' + pantalla) +
      '&t=' + encodeURIComponent(pantalla + ' · ' + VERSION) + '&rnd=' + Math.random().toString(36).slice(2);
    new Image().src = u;
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
    setTimeout(function () { el.remove(); }, 400);
  }
  // En iPhone el sonido solo puede sonar después de un toque.
  el.addEventListener('click', function () { brindis(); setTimeout(salir, 900); });
  setTimeout(salir, 2600);
}

/* ---------- carga ---------- */
function cargar(forzar) {
  if (!datos) {
    datos = leer('noticias', null);
    if (datos) inicio();
    else $app.innerHTML = '<div class="cargando">Cargando las noticias…</div>';
  }
  return descargar('noticias.json').then(function (d) {
    var cambio = !datos || JSON.stringify(d) !== JSON.stringify(datos);
    datos = d; guardar('noticias', d);
    if (cambio || forzar) inicio();
  }).catch(function () {
    if (!datos) $app.innerHTML = '<div class="vacio">No se han podido cargar las noticias.<br>Revisa la conexión y vuelve a intentarlo.<br><br>' +
      '<button class="pill up" onclick="cargar(true)">Reintentar</button></div>';
  });
}

/* ---------- pantalla de inicio ---------- */
function esIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function instalada() { return window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches; }

function bannerInstalar() {
  if (instalada() || leer('sinBanner', false)) return '';
  var share = '<span class="share">' + ic('share', ' class="share"') + '</span>';
  var pasos = esIOS()
    ? '<li>Pulsa el botón de compartir ' + share + ' de Safari.</li><li>Elige <b>Añadir a pantalla de inicio</b>.</li><li>Pulsa <b>Añadir</b>.</li>'
    : '<li>Abre el menú del navegador (⋮).</li><li>Elige <b>Añadir a pantalla de inicio</b> o <b>Instalar app</b>.</li>';
  return '<div class="instalar"><button class="cerrar" onclick="cerrarBanner()" aria-label="Cerrar">' + ic('cerrar', ' width="18" height="18"') + '</button>' +
    '<b>Tenla como una app</b><ol>' + pasos + '</ol></div>';
}
function cerrarBanner() { guardar('sinBanner', true); inicio(); }

function inicio() {
  var d = datos;
  if (!d) return;
  var vistos = leer('vistos', {});
  var h = '<div class="wrap">';
  h += '<header class="cabecera"><img src="logo.svg" alt=""><div><div class="marca">CashCash<b>News</b></div>' +
    '<div class="fecha">' + esc(d.fechaTexto) +  + '</div></div>' +
    '<div class="acciones"><button class="icono" onclick="ir(\'calendario\')" aria-label="Calendario">' + ic('cal') + '</button>' +
    '<button class="icono" onclick="ir(\'info\')" aria-label="Información">' + ic('info') + '</button></div></header>';
  h += bannerInstalar();

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
      var t = tend(x.tendencia);
      h += '<div class="chip"><div class="n">' + esc(x.nombre) + '</div><div class="v">' + esc(x.valor) +
        '</div><div class="c ' + t + '">' + esc(x.cambio) + '</div></div>';
    });
    h += '</div>';
  }

  var n = (d.reels || []).length;
  h += '<button class="destacada" onclick="ir(\'reels\')">' + ic('reel') +
    '<div><div class="t">Ver las ' + n + ' noticias del día</div><div class="s">Desliza hacia arriba para pasar de una a otra</div></div></button>';

  if ((d.agenda || []).length) {
    h += '<div class="seccion">Hoy se publica</div><div class="lista">';
    d.agenda.forEach(function (a) {
      h += '<div class="fila"><div class="hora">' + esc(a.hora || '—') + '</div><div><div class="t">' + esc(a.titulo) +
        (a.importancia === 'alta' ? '<span class="etiqueta">Importante</span>' : '') + '</div><div class="x">' + esc(a.texto) + '</div></div></div>';
    });
    h += '</div>';
  }

  h += '<div class="seccion">Más</div><div class="lista">' +
    '<button class="fila" onclick="ir(\'semanas\')"><span style="color:var(--verde)">' + ic('semana', ' width="22" height="22"') +
    '</span><div><div class="t">Resumen semanal</div><div class="x">Lo más importante de cada semana</div></div><span class="flecha">›</span></button>' +
    '<button class="fila" onclick="ir(\'calendario\')"><span style="color:var(--verde)">' + ic('cal', ' width="22" height="22"') +
    '</span><div><div class="t">Calendario</div><div class="x">Las noticias de días anteriores</div></div><span class="flecha">›</span></button>' +
    '</div>';

  h += '<div class="aviso">' + esc(d.aviso || 'Contenido solo informativo. No es asesoramiento financiero.') + '</div>';
  h += '<div class="pie"><button onclick="cargar(true)" style="color:var(--suave)">' + ic('recargar', ' width="14" height="14" style="vertical-align:-2px"') +
    ' Actualizar</button> · <button onclick="ir(\'info\')" style="color:var(--suave)">Aviso legal</button></div>';
  h += '</div>';
  $app.innerHTML = h;
}

/* ---------- piezas de noticia ---------- */
function sparkline(g, t) {
  if (!g || !g.valores || g.valores.length < 2) return '';
  var v = g.valores, et = g.etiquetas || [];
  var min = Math.min.apply(null, v), max = Math.max.apply(null, v), r = (max - min) || 1;
  var W = 300, H = 90, pt = 10, pb = 22;
  var pts = v.map(function (y, i) {
    return [(i / (v.length - 1)) * (W - 20) + 10, pt + (1 - (y - min) / r) * (H - pt - pb)];
  });
  var col = v[v.length - 1] > v[0] ? 'var(--verde)' : v[v.length - 1] < v[0] ? 'var(--rojo)' : 'var(--gris)';
  var line = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
  var area = 'M' + pts[0][0] + ',' + (H - pb) + ' L' + line.replace(/ /g, ' L') + ' L' + pts[pts.length - 1][0] + ',' + (H - pb) + 'Z';
  var s = '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
    '<path d="' + area + '" fill="' + col + '" opacity=".14"/>' +
    '<polyline points="' + line + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
  var last = pts[pts.length - 1];
  s += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3.5" fill="' + col + '"/>';
  if (et.length) {
    s += '<text x="10" y="' + (H - 6) + '">' + esc(et[0]) + '</text>' +
      '<text x="' + (W - 10) + '" y="' + (H - 6) + '" text-anchor="end">' + esc(et[et.length - 1]) + '</text>';
  }
  return s + '</svg>';
}

function noticia(x, cat) {
  var t = tend(x.tendencia), h = '';
  if (cat) h += '<div class="cat">' + esc(cat) + '</div>';
  h += '<h2 class="titulo">' + esc(x.titulo) + '</h2>';
  if (x.dato || x.cambio) {
    h += '<div class="dato">' + (x.dato ? '<span class="n ' + (x.aviso ? '' : t) + '">' + esc(x.dato) + '</span>' : '') +
      (x.cambio ? '<span class="pill ' + t + '">' + (t === 'up' ? '▲ ' : t === 'down' ? '▼ ' : '') + esc(x.cambio) + '</span>' : '') + '</div>';
  }
  h += sparkline(x.grafica, t);
  h += '<p class="texto">' + esc(x.texto) + '</p>';
  if (x.aviso) h += '<div class="cuidado">Esto no es una recomendación. Investiga por tu cuenta antes de decidir nada.</div>';
  if (x.paraTi) h += '<div class="parati"><div class="h">' + ic('persona') + '¿Y esto qué significa para mí?</div>' + esc(x.paraTi) + '</div>';
  if ((x.valores || []).length) h += '<div class="valores">' + x.valores.map(function (v) { return '<span>' + esc(v) + '</span>'; }).join('') + '</div>';
  var u = urlSegura(x.url);
  if (x.fuente) h += '<div class="fuente">Fuente: ' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(x.fuente) + '</a>' : esc(x.fuente)) + '</div>';
  return h;
}

/* ---------- stories ---------- */
function abrirStory(d, id, desde) {
  var orden = (d.stories || []).filter(function (s) { return (s.slides || []).length; });
  var si = orden.findIndex(function (s) { return s.id === id; });
  if (si < 0) return cerrar();
  var s = orden[si], i = desde || 0, pausa = false, t0 = 0, resto = 7000, DUR = 7000;
  var vistos = leer('vistos', {}); vistos[d.fecha + '/' + s.id] = 1; guardar('vistos', vistos);

  function pintar() {
    var sl = s.slides[i];
    $layer.innerHTML = '<div class="story"><div class="segs">' + s.slides.map(function (_, k) {
      return '<div class="seg' + (k < i ? ' hecho' : '') + '"><i></i></div>';
    }).join('') + '</div><div class="story-top"><span class="ring" style="width:auto"><span style="font-size:20px">' + iconoStory(s).replace('<svg', '<svg width="20" height="20"') +
      '</span></span><span class="tt">' + esc(s.titulo) + '</span><button class="icono" aria-label="Cerrar">' + ic('cerrar') + '</button></div>' +
      '<div class="story-body">' + noticia(sl) + '</div>' +
      '<div class="zona izq"></div><div class="zona der"></div></div>';
    var st = $layer.querySelector('.story');
    st.querySelector('.icono').onclick = function (e) { e.stopPropagation(); cerrar(); };
    st.querySelector('.izq').onclick = function () { mover(-1); };
    st.querySelector('.der').onclick = function () { mover(1); };
    // Mantener pulsado para pausar (como en Instagram).
    st.addEventListener('pointerdown', function () { pausa = true; resto -= Date.now() - t0; });
    st.addEventListener('pointerup', function () { pausa = false; t0 = Date.now(); });
    st.addEventListener('pointercancel', function () { pausa = false; t0 = Date.now(); });
    gestoBajar(st);
    resto = DUR; t0 = Date.now(); animar();
  }
  function animar() {
    clearInterval(timer);
    var barra = $layer.querySelectorAll('.seg i')[i];
    timer = setInterval(function () {
      if (pausa) return;
      var hecho = DUR - resto + (Date.now() - t0);
      if (barra) barra.style.width = Math.min(100, hecho / DUR * 100) + '%';
      if (hecho >= DUR) mover(1);
    }, 50);
  }
  function mover(dir) {
    i += dir;
    if (i < 0) { i = 0; }
    if (i >= s.slides.length) {
      clearInterval(timer);
      var sig = orden[si + 1];
      if (sig) return location.replace(location.href.replace(/story\/[^/]+$/, 'story/' + sig.id));
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
function abrirReels(d, titulo, volverA) {
  var rs = d.reels || [];
  var h = '<div class="reels-top"><span class="cont" id="cont">1 / ' + rs.length + '</span>' +
    '<button class="icono" aria-label="Cerrar" onclick="cerrar()">' + ic('cerrar') + '</button></div><div class="reels" id="reels">';
  rs.forEach(function (r, k) {
    h += '<section class="reel"><div class="reel-inner">' + noticia(r, (titulo ? titulo + ' · ' : '') + (r.categoria || '')) +
      (k === 0 && rs.length > 1 ? '<div class="desliza">Desliza hacia arriba ↑</div>' : '') + '</div></section>';
  });
  if (!rs.length) h += '<section class="reel"><div class="vacio">Este día no tiene noticias.</div></section>';
  h += '<section class="reel"><div class="reel-inner" style="text-align:center"><img src="logo.svg" alt="" style="width:80px">' +
    '<h2 class="titulo" style="margin-top:14px">¡Ya estás al día!</h2><p class="texto">' + esc(d.aviso || '') + '</p>' +
    '<button class="pill up" style="font-size:16px;padding:10px 18px" onclick="cerrar()">Volver al inicio</button></div></section>';
  h += '</div>';
  $layer.innerHTML = h;
  var cont = document.getElementById('reels'), c = document.getElementById('cont');
  cont.addEventListener('scroll', function () {
    var k = Math.round(cont.scrollTop / cont.clientHeight);
    c.textContent = Math.min(k + 1, rs.length) + ' / ' + rs.length;
  }, { passive: true });
  stats('noticias');
}

/* ---------- calendario y semanas ---------- */
function pagina(titulo, sub, cuerpo) {
  $layer.innerHTML = '<div class="pagina"><div class="barra"><button class="icono" onclick="cerrar()" aria-label="Volver">' + ic('atras') + '</button>' +
    '<div><div class="tt">' + esc(titulo) + '</div>' + (sub ? '<div class="st">' + esc(sub) + '</div>' : '') + '</div></div>' + cuerpo + '</div>';
}

var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function abrirCalendario() {
  pagina('Calendario', 'Toca un día para ver sus noticias', '<div class="cargando">Cargando…</div>');
  stats('calendario');
  descargar('archivo/indice.json').then(function (ix) {
    var h = '<div class="info">', mes = '';
    (ix.dias || []).forEach(function (d) {
      var m = MESES[+d.fecha.slice(5, 7) - 1] + ' ' + d.fecha.slice(0, 4);
      if (m !== mes) { if (mes) h += '</div>'; h += '<div class="mes">' + m + '</div><div class="lista">'; mes = m; }
      h += '<button class="fila dia" onclick="ir(\'dia/' + esc(d.fecha) + '\')"><div><div class="t">' + esc(d.fechaTexto) +
        '</div><div class="x">' + esc(d.titular || '') + '</div></div><span class="flecha">›</span></button>';
    });
    if (mes) h += '</div>';
    h += '</div>';
    if (location.hash === '#calendario') pagina('Calendario', 'Toca un día para ver sus noticias', h);
  }).catch(errorPagina);
}

function abrirSemanas() {
  pagina('Resumen semanal', 'Lo más importante de cada semana', '<div class="cargando">Cargando…</div>');
  stats('resumen-semanal');
  descargar('semanal/indice.json').then(function (ix) {
    var h = '<div class="info" style="padding-top:8px"><div class="lista">';
    (ix.semanas || []).forEach(function (s) {
      h += '<button class="fila" onclick="ir(\'semana/' + esc(s.fecha) + '\')"><div><div class="t">' + esc(s.fechaTexto) +
        '</div></div><span class="flecha">›</span></button>';
    });
    h += '</div></div>';
    if (location.hash === '#semanas') pagina('Resumen semanal', 'Lo más importante de cada semana', h);
  }).catch(errorPagina);
}

function abrirArchivo(ruta, tituloFn) {
  $layer.innerHTML = '<div class="cargando">Cargando…</div>';
  var hash = location.hash;
  var p = cache[ruta] ? Promise.resolve(cache[ruta]) : descargar(ruta);
  p.then(function (d) {
    cache[ruta] = d;
    if (location.hash === hash) abrirReels(d, tituloFn(d));
  }).catch(errorPagina);
}

function errorPagina() {
  pagina('Sin conexión', '', '<div class="vacio">No se ha podido descargar.<br>Revisa la conexión y vuelve a intentarlo.</div>');
}

/* ---------- información y aviso legal ---------- */
var LEGAL = [
  ['Solo informativo', 'CashCashNews resume noticias financieras para que entiendas qué pasa en los mercados. Es información general y educativa. No es asesoramiento financiero, ni una recomendación de comprar o vender nada, ni un análisis pensado para tu situación. No somos una entidad registrada en la CNMV ni en ningún otro supervisor.'],
  ['Puede haber errores', 'Los resúmenes se hacen cada mañana de forma automática, con ayuda de inteligencia artificial, a partir de fuentes públicas que se citan en cada noticia. Pueden tener errores o datos atrasados, y las cotizaciones no son en tiempo real. Antes de decidir nada, compruébalo en la fuente original.'],
  ['Invertir tiene riesgo', 'Puedes perder parte o todo el dinero que inviertas. Que algo haya subido antes no quiere decir que vaya a seguir subiendo. «Ideas para investigar» y «¿Y esto qué significa para mí?» son explicaciones generales, no consejos. Si vas a invertir, infórmate bien o pregunta a un profesional autorizado.'],
  ['Nombres y frases', 'Los nombres y marcas de empresas son de sus dueños y aparecen solo para informar.']
];
var PRIVACIDAD = [
  ['Sin cuentas ni datos personales', 'No hace falta registrarse. La web no pide tu nombre, tu correo ni tu ubicación, y no usa cookies.'],
  ['Lo que se queda en tu móvil', 'Las últimas noticias descargadas y qué stories has visto se guardan en tu navegador para que vaya más rápido. No se envían a nadie.'],
  ['Lo que se descarga', 'Las noticias se descargan de GitHub (raw.githubusercontent.com). Como cualquier web, GitHub ve la dirección de internet desde la que se piden.'],
  ['Estadísticas anónimas', 'Si están activadas, se cuenta qué pantallas se abren (por ejemplo «calendario») en GoatCounter, un servicio sin cookies que no guarda tu dirección de internet. No se manda nada que te identifique. Puedes quitarlas aquí abajo.']
];
function abrirInfo() {
  var on = leer('stats', true);
  var h = '<div class="info">';
  h += '<div class="lista" style="margin-top:6px"><button class="interruptor" style="width:100%;text-align:left" onclick="cambiarStats()"><div><div style="font-weight:650">Estadísticas anónimas</div>' +
    '<div style="font-size:13px;color:var(--suave)">Ayuda a saber qué se usa. Sin datos personales.</div></div><span class="sw' + (on ? ' on' : '') + '"></span></button></div>';
  h += '<div class="seccion">Aviso legal</div>' + LEGAL.map(function (p) { return '<h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p>'; }).join('');
  h += '<div class="seccion">Privacidad</div>' + PRIVACIDAD.map(function (p) { return '<h3>' + esc(p[0]) + '</h3><p>' + esc(p[1]) + '</p>'; }).join('');
  h += '<div class="seccion">¿Tienes Android?</div><p style="font-size:14.5px;color:var(--suave)">Hay una app para Android con más cosas (avisos, lista de seguimiento, glosario y test). ' +
    '<a href="' + RAW + 'apk/CashCashNews-0.13.0.apk" id="apk">Descargar la app de Android</a></p>';
  h += '<p class="pie">Versión ' + VERSION + ' (de prueba)</p></div>';
  pagina('Información', 'Léelo en un minuto', h);
  // El enlace al APK más reciente sale de app.json.
  descargar('app.json').then(function (a) { var u = urlSegura(a.descarga); var el = document.getElementById('apk'); if (u && el) el.href = u; }).catch(function () {});
  stats('informacion');
}
function cambiarStats() { guardar('stats', !leer('stats', true)); abrirInfo(); }

/* ---------- navegación (con el gesto de atrás del iPhone) ---------- */
var pasos = 0; // pantallas abiertas desde dentro (para volver con «atrás»)
function ir(ruta) { pasos++; location.hash = ruta; }
function cerrar() {
  clearInterval(timer);
  if (pasos > 0) { pasos--; history.back(); }
  else location.hash = '';
  setTimeout(function () { if (!location.hash) $layer.innerHTML = ''; }, 60);
}
function ruta() {
  clearInterval(timer);
  var r = location.hash.replace(/^#\/?/, '');
  var m;
  if (!r) { $layer.innerHTML = ''; document.body.style.overflow = ''; inicio(); return; }
  document.body.style.overflow = 'hidden';
  if (r === 'reels') return datos ? abrirReels(datos) : cerrar();
  if ((m = r.match(/^story\/(.+)$/))) return datos ? abrirStory(datos, m[1]) : cerrar();
  if (r === 'calendario') return abrirCalendario();
  if (r === 'semanas') return abrirSemanas();
  if (r === 'info') return abrirInfo();
  if ((m = r.match(/^dia\/(\d{4}-\d{2}-\d{2})$/))) return abrirArchivo('archivo/' + m[1] + '.json', function (d) { return d.fechaTexto; });
  if ((m = r.match(/^semana\/(\d{4}-\d{2}-\d{2})$/))) return abrirArchivo('semanal/' + m[1] + '.json', function () { return 'Semana'; });
  location.hash = '';
}
window.addEventListener('hashchange', ruta);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && location.hash) cerrar(); });

// Al volver a la app después de un rato, buscar noticias nuevas.
var ultima = Date.now();
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && Date.now() - ultima > 10 * 60 * 1000) { ultima = Date.now(); cargar(); }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}

splash();
stats(instalada() ? 'abrir-app' : 'abrir-web');
cargar().then(function () { if (location.hash) ruta(); });
