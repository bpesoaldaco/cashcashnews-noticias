#!/usr/bin/env python3
"""Mantiene recientes.json: lo último de cada valor del catálogo de la app.

La app lo enseña en la lista de seguimiento y en la ficha del valor cuando ese
valor no sale en las noticias del día (así nunca dice solo «sin noticias»).

Tiene dos partes:
  * "valores": lo escribe la tarea «Lo último de cada valor» con búsquedas en la web
    (variación reciente y 1-3 titulares con fecha, fuente y enlace). Rota por el
    catálogo: cada día revisa unos pocos, los que llevan más tiempo sin revisar.
  * "enNuestrasNoticias": lo calcula este script, gratis, mirando archivo/ y semanal/:
    la última vez que el valor salió en nuestras noticias.

Uso:
  python3 scripts/actualizar_recientes.py               # recalcula, limpia y valida
  python3 scripts/actualizar_recientes.py --pendientes 30   # qué valores toca revisar hoy
"""
import datetime as dt
import glob
import json
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCHIVO = os.path.join(RAIZ, "recientes.json")
CATALOGO = os.path.join(RAIZ, "catalogo.txt")

FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RECOMIENDA = re.compile(
    r"te recomend|recomendamos|recomendable|deber[íi]as? (comprar|vender|invertir|entrar|salir)|"
    r"es (un )?buen momento (para|de) (comprar|vender|invertir|entrar)|aprovecha (para|y) (comprar|invertir)|"
    r"\b(compra|vende|invierte) (ya|ahora)\b|precio objetivo|objetivo de precio|\btarget\b",
    re.IGNORECASE,
)
MAX_TITULARES = 3
DIAS_TITULAR = 45     # titulares más antiguos se quitan solos
DIAS_VARIACION = 14   # una variación más antigua ya no dice nada: se quita


def hoy():
    return dt.date.today()


def catalogo():
    nombres = []
    with open(CATALOGO, encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if linea and not linea.startswith("#"):
                nombres.append(linea.split("|")[0].strip())
    return nombres


def cargar():
    if not os.path.exists(ARCHIVO):
        return {"actualizado": "", "valores": {}, "enNuestrasNoticias": {}}
    with open(ARCHIVO, encoding="utf-8") as f:
        return json.load(f)


def menciona(nombre, item):
    for v in item.get("valores") or []:
        if isinstance(v, str) and v.lower() == nombre.lower():
            return True
    # En el texto, con mayúsculas tal cual (es un nombre propio: «Meta» sí, «la meta» no)
    patron = re.compile(r"(?<![\w])" + re.escape(nombre) + r"(?![\w])")
    return any(patron.search(item.get(k) or "") for k in ("titulo", "texto"))


def puntos(nombre, item):
    if re.search(r"(?<![\w])" + re.escape(nombre) + r"(?![\w])", item.get("titulo") or ""):
        return 3
    vals = item.get("valores") or []
    if vals and isinstance(vals[0], str) and vals[0].lower() == nombre.lower():
        return 2
    return 1


def en_nuestras_noticias(nombres):
    """Última aparición de cada valor en archivo/ (días) y semanal/ (resúmenes)."""
    dias = []
    for ruta in glob.glob(os.path.join(RAIZ, "archivo", "*.json")) + glob.glob(os.path.join(RAIZ, "semanal", "*.json")):
        base = os.path.basename(ruta)[:-5]
        if not FECHA.match(base):
            continue
        try:
            with open(ruta, encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            continue
        items = list(d.get("reels") or [])
        for s in d.get("stories") or []:
            if s.get("id") != "agenda":
                items += s.get("slides") or []
        dias.append((base, "semanal" in ruta, items))
    # Más reciente primero; a igual fecha, el día antes que el resumen semanal
    dias.sort(key=lambda x: (x[0], not x[1]), reverse=True)
    res = {}
    for nombre in nombres:
        for fecha, semanal, items in dias:
            hits = [i for i in items if menciona(nombre, i) and i.get("titulo")]
            if hits:
                # De ese día, la noticia que más trata del valor: con su nombre en el titular,
                # o con el valor el primero de su lista; si no, la primera que lo nombra.
                hit = max(hits, key=lambda i: puntos(nombre, i))
                e = {"fecha": fecha, "titulo": hit["titulo"]}
                if puntos(nombre, hit) < 3:
                    # El titular habla de otra cosa: la frase del texto que nombra al valor
                    for frase in re.split(r"(?<=[.!?])\s+", hit.get("texto") or ""):
                        if re.search(r"(?<![\w])" + re.escape(nombre) + r"(?![\w])", frase):
                            e["frase"] = frase.strip()
                            break
                if hit.get("cambio") and puntos(nombre, hit) >= 2:
                    e["cambio"] = hit["cambio"]
                    e["tendencia"] = hit.get("tendencia", "flat")
                if semanal:
                    e["semanal"] = True
                res[nombre] = e
                break
    return res


def limpiar_y_validar(d, nombres):
    errores = []
    limite_t = (hoy() - dt.timedelta(days=DIAS_TITULAR)).isoformat()
    limite_v = (hoy() - dt.timedelta(days=DIAS_VARIACION)).isoformat()
    manana = (hoy() + dt.timedelta(days=1)).isoformat()
    valores = d.get("valores") or {}
    for nombre in list(valores):
        v = valores[nombre]
        donde = f"valores[{nombre!r}]"
        if nombre not in nombres:
            errores.append(f"{donde}: no está en catalogo.txt (usa el nombre exacto del catálogo)")
            continue
        if not FECHA.match(v.get("revisado", "")):
            errores.append(f"{donde}: falta 'revisado' (AAAA-MM-DD)")
        res = v.get("resumen")
        if res is not None:
            if not isinstance(res, str) or not res.strip() or len(res) > 180:
                errores.append(f"{donde}: 'resumen' vacío o de más de 180 caracteres")
            elif RECOMIENDA.search(res):
                errores.append(f"{donde}: 'resumen' no puede sonar a recomendación ({RECOMIENDA.search(res).group(0)!r})")
        var = v.get("variacion")
        if var is not None:
            if not FECHA.match(var.get("hasta", "")) or not var.get("cambio") or not var.get("periodo"):
                errores.append(f"{donde}: 'variacion' necesita 'cambio', 'periodo' y 'hasta' (AAAA-MM-DD)")
            elif var["hasta"] < limite_v:
                del v["variacion"]  # demasiado antigua
            elif var.get("tendencia") not in ("up", "down", "flat"):
                errores.append(f"{donde}: 'variacion.tendencia' tiene que ser up, down o flat")
            elif not var.get("fuente"):
                errores.append(f"{donde}: 'variacion' necesita 'fuente'")
        tits = []
        for i, t in enumerate(v.get("titulares") or []):
            dt_ = f"{donde}.titulares[{i}]"
            if not FECHA.match(t.get("fecha", "")):
                errores.append(f"{dt_}: 'fecha' AAAA-MM-DD")
                continue
            if t["fecha"] > manana:
                errores.append(f"{dt_}: fecha en el futuro")
                continue
            if t["fecha"] < limite_t:
                continue  # antiguo: se quita solo
            if not t.get("titulo") or len(t["titulo"]) > 110:
                errores.append(f"{dt_}: 'titulo' vacío o de más de 110 caracteres")
            elif RECOMIENDA.search(t["titulo"]):
                errores.append(f"{dt_}: el titular no puede sonar a recomendación")
            if not t.get("fuente"):
                errores.append(f"{dt_}: falta 'fuente'")
            if not str(t.get("url", "")).startswith("https://"):
                errores.append(f"{dt_}: 'url' tiene que empezar por https://")
            tits.append(t)
        tits.sort(key=lambda t: t["fecha"], reverse=True)
        v["titulares"] = tits[:MAX_TITULARES]
        if not v["titulares"]:
            del v["titulares"]
    return errores


def pendientes(d, nombres, n):
    valores = d.get("valores") or {}
    orden = sorted(range(len(nombres)), key=lambda i: (valores.get(nombres[i], {}).get("revisado", ""), i))
    return [nombres[i] for i in orden[:n]]


def main():
    nombres = catalogo()
    d = cargar()
    if len(sys.argv) >= 2 and sys.argv[1] == "--pendientes":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        for nombre in pendientes(d, nombres, n):
            print(nombre)
        return 0
    errores = limpiar_y_validar(d, nombres)
    d["enNuestrasNoticias"] = en_nuestras_noticias(nombres)
    d["actualizado"] = hoy().isoformat()
    salida = {"actualizado": d["actualizado"],
              "aviso": "Solo informativo. No es asesoramiento financiero ni una recomendación de compra o venta.",
              "valores": dict(sorted((d.get("valores") or {}).items(), key=lambda kv: nombres.index(kv[0]) if kv[0] in nombres else 9999)),
              "enNuestrasNoticias": d["enNuestrasNoticias"]}
    with open(ARCHIVO, "w", encoding="utf-8") as f:
        json.dump(salida, f, ensure_ascii=False, indent=1)
        f.write("\n")
    if errores:
        print("ERRORES en recientes.json:")
        for e in errores:
            print(" -", e)
        return 1
    revisados = sum(1 for v in salida["valores"].values() if v.get("titulares") or v.get("variacion"))
    print(f"OK: {revisados} valores con datos de la web y {len(salida['enNuestrasNoticias'])} "
          f"con noticias nuestras, de {len(nombres)} del catálogo")
    return 0


if __name__ == "__main__":
    sys.exit(main())
