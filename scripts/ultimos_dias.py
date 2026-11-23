#!/usr/bin/env python3
"""Lo publicado en los últimos días, para no repetir noticias.

Uso: python3 scripts/ultimos_dias.py [AAAA-MM-DD] [días]
     (por defecto: hoy en Madrid y 7 días)
Enseña los titulares de cada día con su categoría o tema, los valores que más se han
repetido y qué temas económicos han salido menos. Léelo ANTES de escribir las noticias.
"""
import collections
import datetime
import json
import os
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMAS = ["bolsillo", "empleo_vivienda", "macro", "politica", "global"]


def hoy_madrid():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("Europe/Madrid")).date()
    except Exception:
        return datetime.date.today()


def main():
    hoy = datetime.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else hoy_madrid()
    dias = int(sys.argv[2]) if len(sys.argv) > 2 else 7
    valores = collections.Counter()
    temas = collections.Counter()
    for n in range(dias, 0, -1):
        dia = hoy - datetime.timedelta(days=n)
        ruta = os.path.join(RAIZ, "archivo", dia.isoformat() + ".json")
        try:
            with open(ruta, encoding="utf-8") as fh:
                d = json.load(fh)
        except (OSError, ValueError):
            continue
        print(f"\n== {d.get('fechaTexto') or dia.isoformat()} ==")
        for r in d.get("reels", []):
            etiqueta = r.get("tema") or r.get("formato") or r.get("categoria", "")
            print(f"  [{etiqueta}] {r.get('titulo', '')}  · {', '.join(r.get('valores', []))}")
            valores.update(r.get("valores", []))
            if r.get("tema"):
                temas[r["tema"]] += 1
    print("\nValores que más se repiten (cuidado con volver a contar lo mismo):")
    for v, c in valores.most_common(10):
        print(f"  {v}: {c}")
    print("\nTemas económicos de estos días (da prioridad a los que menos han salido):")
    for t in sorted(TEMAS, key=lambda t: temas[t]):
        print(f"  {t}: {temas[t]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
