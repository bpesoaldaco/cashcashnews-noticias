#!/usr/bin/env python3
"""Comprueba que un noticias.json tiene el formato que espera la app.

Uso: python3 scripts/validar_noticias.py [ruta]   (por defecto noticias.json)
Sale con código 1 y explica los errores si algo no cuadra.
"""
import json
import re
import sys

TENDENCIAS = {"up", "down", "flat"}
TIPOS_AGENDA = {"banco_central", "macro", "resultados", "bolsa", "discurso", "politica", "otro"}
COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# «¿Y esto qué significa para mí?» (campo paraTi): obligatorio en los reels desde este día.
PARA_TI_DESDE = "2026-11-21"
PARA_TI_MAX = 200
# Frases que convierten la explicación en una recomendación (no permitidas).
RECOMIENDA = re.compile(
    r"te recomend|recomendamos|recomendable|deber[íi]as? (comprar|vender|invertir|entrar|salir)|"
    r"es (un )?buen momento (para|de) (comprar|vender|invertir|entrar)|aprovecha (para|y) (comprar|invertir)|"
    r"\b(compra|vende|invierte) (ya|ahora)\b",
    re.IGNORECASE,
)
INDICADORES = {"ibex", "eurostoxx", "dax", "sp500", "nasdaq", "brent", "oro", "eurusd", "bitcoin"}


def validar(d):
    e = []

    def texto(obj, k, donde, obligatorio=True):
        v = obj.get(k)
        if v is None:
            if obligatorio:
                e.append(f"{donde}: falta '{k}'")
        elif not isinstance(v, str) or (obligatorio and not v.strip()):
            e.append(f"{donde}: '{k}' debe ser un texto no vacío")

    def para_ti(obj, donde, obligatorio):
        v = obj.get("paraTi")
        if v is None:
            if obligatorio:
                e.append(f"{donde}: falta 'paraTi' (¿Y esto qué significa para mí?)")
            return
        if not isinstance(v, str) or not v.strip():
            e.append(f"{donde}: 'paraTi' debe ser un texto no vacío")
        elif len(v) > PARA_TI_MAX:
            e.append(f"{donde}: 'paraTi' es demasiado largo ({len(v)} caracteres, máx. {PARA_TI_MAX})")
        elif RECOMIENDA.search(v):
            e.append(f"{donde}: 'paraTi' no puede sonar a recomendación ({RECOMIENDA.search(v).group(0)!r})")

    def comunes(obj, donde):
        texto(obj, "titulo", donde)
        texto(obj, "texto", donde)
        for k in ("dato", "cambio"):
            texto(obj, k, donde, obligatorio=False)
        t = obj.get("tendencia", "flat")
        if t not in TENDENCIAS:
            e.append(f"{donde}: 'tendencia' debe ser up, down o flat (es {t!r})")
        if "aviso" in obj and not isinstance(obj["aviso"], bool):
            e.append(f"{donde}: 'aviso' debe ser true o false")
        v = obj.get("valores")
        if v is not None and (not isinstance(v, list) or not all(isinstance(x, str) and x.strip() for x in v)):
            e.append(f"{donde}: 'valores' debe ser una lista de nombres")
        g = obj.get("grafica")
        if g is not None:
            vals, et = g.get("valores"), g.get("etiquetas")
            if not isinstance(vals, list) or len(vals) < 2 or not all(isinstance(x, (int, float)) for x in vals):
                e.append(f"{donde}: 'grafica.valores' debe tener al menos 2 números")
            elif not isinstance(et, list) or len(et) != len(vals):
                e.append(f"{donde}: 'grafica.etiquetas' debe tener una etiqueta por valor")

    for k in ("fecha", "fechaTexto", "actualizado", "aviso"):
        texto(d, k, "raíz")
    if isinstance(d.get("fecha"), str) and not FECHA.match(d["fecha"]):
        e.append("raíz: 'fecha' debe ser AAAA-MM-DD")
    if "asesoramiento" not in str(d.get("aviso", "")).lower():
        e.append("raíz: el 'aviso' debe decir que no es asesoramiento financiero")

    ind = d.get("indicadores")
    if not isinstance(ind, list) or not ind:
        e.append("raíz: 'indicadores' debe ser una lista con al menos un indicador")
        ind = []
    vistos = set()
    for i, x in enumerate(ind):
        w = f"indicadores[{i}]"
        if x.get("id") not in INDICADORES:
            e.append(f"{w}: 'id' debe ser uno de {sorted(INDICADORES)}")
        if x.get("id") in vistos:
            e.append(f"{w}: id repetido {x.get('id')!r}")
        vistos.add(x.get("id"))
        texto(x, "nombre", w)
        texto(x, "valor", w)
        texto(x, "cambio", w, obligatorio=False)
        if x.get("tendencia", "flat") not in TENDENCIAS:
            e.append(f"{w}: 'tendencia' debe ser up, down o flat")

    semanal = d.get("tipo") == "semanal"
    stories = d.get("stories", [] if semanal else None)
    if not isinstance(stories, list) or (not stories and not semanal):
        e.append("raíz: 'stories' debe ser una lista con al menos una story")
        stories = []
    ids = set()
    for i, s in enumerate(stories):
        w = f"stories[{i}]"
        for k in ("id", "titulo", "emoji"):
            texto(s, k, w)
        if s.get("id") in ids:
            e.append(f"{w}: id repetido {s.get('id')!r}")
        ids.add(s.get("id"))
        if not COLOR.match(str(s.get("color", ""))):
            e.append(f"{w}: 'color' debe ser #RRGGBB")
        slides = s.get("slides")
        if not isinstance(slides, list) or not slides:
            e.append(f"{w}: 'slides' debe tener al menos una diapositiva")
            slides = []
        for j, sl in enumerate(slides):
            comunes(sl, f"{w}.slides[{j}]")
            para_ti(sl, f"{w}.slides[{j}]", False)
        if s.get("id") == "ideas":
            if len(slides) > 6:
                e.append(f"{w}: máximo 5 ideas (+1 diapositiva de aviso)")
            if not all(sl.get("aviso") is True for sl in slides):
                e.append(f"{w}: todas las diapositivas de ideas deben llevar \"aviso\": true")

    fecha = d.get("fecha") if isinstance(d.get("fecha"), str) else ""
    para_ti_obligatorio = fecha >= PARA_TI_DESDE
    reels = d.get("reels")
    if not isinstance(reels, list) or not reels:
        e.append("raíz: 'reels' debe ser una lista con al menos un reel")
        reels = []
    for i, r in enumerate(reels):
        w = f"reels[{i}]"
        comunes(r, w)
        para_ti(r, w, para_ti_obligatorio and r.get("aviso") is not True)
        for k in ("categoria", "emoji"):
            texto(r, k, w)
        if not COLOR.match(str(r.get("color", ""))):
            e.append(f"{w}: 'color' debe ser #RRGGBB")
        if r.get("fuente") and not str(r.get("url", "")).startswith("https://"):
            e.append(f"{w}: si hay 'fuente', 'url' debe empezar por https://")

    agenda = d.get("agenda")
    if agenda is not None:
        if not isinstance(agenda, list):
            e.append("raíz: 'agenda' debe ser una lista")
            agenda = []
        for i, x in enumerate(agenda):
            w = f"agenda[{i}]"
            texto(x, "titulo", w)
            texto(x, "texto", w, obligatorio=False)
            h = x.get("hora", "")
            if not isinstance(h, str) or (h and not re.match(r"^\d{2}:\d{2}$", h)):
                e.append(f"{w}: 'hora' debe ser HH:MM o \"\"")
            if x.get("tipo", "otro") not in TIPOS_AGENDA:
                e.append(f"{w}: 'tipo' debe ser uno de {sorted(TIPOS_AGENDA)}")
            if x.get("importancia", "media") not in ("alta", "media", "baja"):
                e.append(f"{w}: 'importancia' debe ser alta, media o baja")
            v = x.get("valores")
            if v is not None and (not isinstance(v, list) or not all(isinstance(y, str) and y.strip() for y in v)):
                e.append(f"{w}: 'valores' debe ser una lista de nombres")

    fuentes = d.get("fuentes")
    if not isinstance(fuentes, list) or not fuentes:
        e.append("raíz: 'fuentes' debe tener al menos una fuente")
        fuentes = []
    for i, f in enumerate(fuentes):
        texto(f, "nombre", f"fuentes[{i}]")
        if not str(f.get("url", "")).startswith("https://"):
            e.append(f"fuentes[{i}]: 'url' debe empezar por https://")
    return e


def main():
    ruta = sys.argv[1] if len(sys.argv) > 1 else "noticias.json"
    try:
        with open(ruta, encoding="utf-8") as fh:
            d = json.load(fh)
    except (OSError, ValueError) as ex:
        print(f"ERROR: no se puede leer {ruta}: {ex}")
        return 1
    errores = validar(d)
    if errores:
        print(f"ERROR: {ruta} tiene {len(errores)} problema(s):")
        for x in errores:
            print(" -", x)
        return 1
    print(f"OK: {ruta} ({d['fecha']}, {len(d['stories'])} stories, {len(d['reels'])} reels)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
