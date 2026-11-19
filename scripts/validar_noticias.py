#!/usr/bin/env python3
"""Comprueba que un noticias.json tiene el formato que espera la app.

Uso: python3 scripts/validar_noticias.py [ruta]   (por defecto noticias.json)
Sale con código 1 y explica los errores si algo no cuadra.
"""
import json
import re
import sys

TENDENCIAS = {"up", "down", "flat"}
COLOR = re.compile(r"^#[0-9A-Fa-f]{6}$")
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
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

    stories = d.get("stories")
    if not isinstance(stories, list) or not stories:
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
        if s.get("id") == "ideas":
            if len(slides) > 6:
                e.append(f"{w}: máximo 5 ideas (+1 diapositiva de aviso)")
            if not all(sl.get("aviso") is True for sl in slides):
                e.append(f"{w}: todas las diapositivas de ideas deben llevar \"aviso\": true")

    reels = d.get("reels")
    if not isinstance(reels, list) or not reels:
        e.append("raíz: 'reels' debe ser una lista con al menos un reel")
        reels = []
    for i, r in enumerate(reels):
        w = f"reels[{i}]"
        comunes(r, w)
        for k in ("categoria", "emoji"):
            texto(r, k, w)
        if not COLOR.match(str(r.get("color", ""))):
            e.append(f"{w}: 'color' debe ser #RRGGBB")
        if r.get("fuente") and not str(r.get("url", "")).startswith("https://"):
            e.append(f"{w}: si hay 'fuente', 'url' debe empezar por https://")

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
