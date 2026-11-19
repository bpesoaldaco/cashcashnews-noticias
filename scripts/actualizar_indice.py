#!/usr/bin/env python3
"""Regenera archivo/indice.json con todos los días de archivo/AAAA-MM-DD.json.

La app lo usa para el calendario. Ejecutar después de añadir o cambiar un día.
"""
import glob
import json
import os
import re

dias = []
for ruta in glob.glob("archivo/*.json"):
    if not re.match(r"^\d{4}-\d{2}-\d{2}\.json$", os.path.basename(ruta)):
        continue
    with open(ruta, encoding="utf-8") as fh:
        d = json.load(fh)
    reels = d.get("reels") or []
    dias.append({
        "fecha": d["fecha"],
        "fechaTexto": d.get("fechaTexto", d["fecha"]),
        "titular": reels[0]["titulo"] if reels else "",
        "noticias": len(reels),
    })
dias.sort(key=lambda x: x["fecha"], reverse=True)
with open("archivo/indice.json", "w", encoding="utf-8") as fh:
    fh.write(json.dumps({"dias": dias}, ensure_ascii=False, indent=2) + "\n")
print(f"archivo/indice.json: {len(dias)} días")
