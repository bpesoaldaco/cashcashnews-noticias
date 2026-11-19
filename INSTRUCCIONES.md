# Cómo se publican las noticias del día

Cada mañana una tarea programada de Claude escribe las noticias del día en este
repositorio. La app CashcashNEWs descarga `noticias.json` desde
`https://raw.githubusercontent.com/bpesoaldaco/cashcashnews-noticias/main/noticias.json`
al abrirse (y con el botón ↻), así que no hace falta reinstalarla.

> Este repositorio tiene que ser **público** para que el móvil pueda descargar el archivo.
> El código de la app está en otro repositorio, privado.

## Qué archivos se escriben cada día

| Archivo | Qué es |
|---|---|
| `noticias.json` | Las noticias que ve la app. Se sobrescribe cada día. |
| `archivo/AAAA-MM-DD.json` | Copia del día, para tener el historial. |
| `resumenes/AAAA-MM-DD.md` | El resumen en texto (mismo contenido, formato largo). |

No se toca nada más del repositorio.

## Contenido

Primero el resumen en `resumenes/AAAA-MM-DD.md`, en español, con estas secciones:
`📊 Resumen del mercado` / `🔎 Valores destacados` / `💡 Ideas para investigar` (máximo 5,
cada una con por qué es interesante y su riesgo, presentadas como ideas y **no** como
recomendaciones) / `📅 Agenda de hoy (hora de Madrid)` / `🔗 Fuentes`, y una nota final
de que no es asesoramiento financiero. Usa `resumenes/2026-11-18.md` como modelo.
Si es fin de semana o festivo, haz un repaso de la semana y lo que viene.

Después, el JSON de la app con ese mismo contenido, en frases cortas que se lean en una
pantalla de móvil. Usa `archivo/2026-11-18.json` como modelo del formato.

### Formato de `noticias.json`

```jsonc
{
  "fecha": "2026-11-19",                 // AAAA-MM-DD, la del día
  "fechaTexto": "Jueves 19 nov 2026",
  "actualizado": "07:45 (hora de Madrid)",
  "aviso": "Contenido solo informativo y educativo. No es asesoramiento financiero ni una recomendación de compra o venta. ...",
  "stories": [                           // círculos de arriba, en este orden
    { "id": "mercados", "titulo": "Mercados", "emoji": "📊", "color": "#0EA5E9", "slides": [ ... ] },
    { "id": "espana",   "titulo": "España",   "emoji": "🇪🇸", "color": "#E11D48", "slides": [ ... ] },
    { "id": "europa",   "titulo": "Europa",   "emoji": "🇪🇺", "color": "#6366F1", "slides": [ ... ] },
    { "id": "eeuu",     "titulo": "EE. UU.",  "emoji": "🇺🇸", "color": "#10B981", "slides": [ ... ] },
    { "id": "ideas",    "titulo": "Ideas",    "emoji": "💡", "color": "#F59E0B", "slides": [ ... ] },
    { "id": "agenda",   "titulo": "Agenda",   "emoji": "📅", "color": "#8B5CF6", "slides": [ ... ] }
  ],
  "reels": [ ... ],                      // 8 a 12 noticias más importantes del día
  "fuentes": [ { "nombre": "...", "url": "https://..." } ]
}
```

- **Diapositiva de story**: `titulo` (máx. ~50 caracteres), `texto` (1-2 frases, máx. ~220
  caracteres), opcionales `dato` (cifra principal, p. ej. `"19.456"`), `cambio`
  (p. ej. `"−0,86%"`) y `tendencia` (`up`, `down` o `flat`).
- **Story de ideas**: primera diapositiva de aviso ("Esto no son recomendaciones…") y luego
  una por idea (máx. 5). Todas con `"aviso": true`. En el texto, por qué es interesante y
  `Riesgo: …`.
- **Reel**: `categoria`, `emoji` y `color` de su story, `titulo`, `texto`, opcionales `dato`,
  `cambio`, `tendencia`, y `fuente` + `url` (https) de donde sale la noticia. Si el reel es una
  idea de inversión, `"aviso": true`.
- Números en formato español (`19.456`, `−0,86%`, `92,6 $`). Signo menos `−`.
- Solo cifras sacadas de las fuentes. Si un dato no está claro, no lo pongas.

## Comprobar y publicar

```bash
python3 scripts/validar_noticias.py noticias.json
```

Tiene que decir `OK`. Si da errores, corrígelos y vuelve a comprobar. Después, un commit
con el mensaje `Noticias del AAAA-MM-DD` directamente en `main` y push.
