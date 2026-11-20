# Cómo se publican las noticias del día

Cada mañana una tarea programada de Claude escribe las noticias del día en este
repositorio. La app CashcashNEWs descarga `noticias.json` desde
`https://raw.githubusercontent.com/bpesoaldaco/cashcashnews-noticias/main/noticias.json`
al abrirse (y con el botón ↻), así que no hace falta reinstalarla. El calendario de la app
usa `archivo/indice.json` para saber qué días hay, y descarga cada día de `archivo/`.

> Este repositorio tiene que ser **público** para que el móvil pueda descargar el archivo.
> El código de la app está en otro repositorio, privado.

## Qué archivos se escriben cada día

| Archivo | Qué es |
|---|---|
| `noticias.json` | Las noticias que ve la app. Se sobrescribe cada día. |
| `archivo/AAAA-MM-DD.json` | Copia del día. La app la usa en el calendario y al comparar días. |
| `valores.json` | Datos básicos de cada valor para su ficha. Añade los valores nuevos que aparezcan. |
| `archivo/indice.json` | Lista de días para el calendario. Se regenera con `python3 scripts/actualizar_indice.py`. |
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
  "indicadores": [                       // datos clave para comparar días, en este orden
    { "id": "ibex", "nombre": "IBEX 35", "valor": "19.186", "cambio": "−0,97%", "tendencia": "down" },
    ...
  ],
  "stories": [                           // círculos de arriba, en este orden
    { "id": "mercados", "titulo": "Mercados", "emoji": "📊", "color": "#0EA5E9", "slides": [ ... ] },
    { "id": "espana",   "titulo": "España",   "emoji": "🇪🇸", "color": "#E11D48", "slides": [ ... ] },
    { "id": "europa",   "titulo": "Europa",   "emoji": "🇪🇺", "color": "#6366F1", "slides": [ ... ] },
    { "id": "eeuu",     "titulo": "EE. UU.",  "emoji": "🇺🇸", "color": "#10B981", "slides": [ ... ] },
    { "id": "ideas",    "titulo": "Ideas",    "emoji": "💡", "color": "#F59E0B", "slides": [ ... ] },
    { "id": "agenda",   "titulo": "Agenda",   "emoji": "📅", "color": "#8B5CF6", "slides": [ ... ] }
  ],
  "reels": [ ... ],                      // 8 a 12 noticias más importantes del día
  "agenda": [ ... ],                     // lo que se publica HOY (sección «Hoy se publica»)
  "fuentes": [ { "nombre": "...", "url": "https://..." } ]
}
```

- **Indicadores**: uno por cada dato que tengas de hoy, con estos `id` y nombres:
  `ibex` (IBEX 35), `eurostoxx` (Euro Stoxx 50), `dax` (DAX), `sp500` (S&P 500), `nasdaq` (Nasdaq),
  `brent` (Brent), `oro` (Oro), `eurusd` (EUR/USD), `bitcoin` (Bitcoin). `valor` es el último nivel
  (cierre o, si no hay, el último dato del día) y `cambio` la variación del día. Si solo tienes el
  cambio, pon `"valor": "—"`. Si no tienes ninguno de los dos, no incluyas ese indicador.
- **Diapositiva de story**: `titulo` (máx. ~50 caracteres), `texto` (1-2 frases, máx. ~220
  caracteres), opcionales `dato` (cifra principal, p. ej. `"19.456"`), `cambio`
  (p. ej. `"−0,86%"`) y `tendencia` (`up`, `down` o `flat`).
- **Story de ideas**: primera diapositiva de aviso ("Esto no son recomendaciones…") y luego
  una por idea (máx. 5). Todas con `"aviso": true`. En el texto, por qué es interesante y
  `Riesgo: …`.
- **Agenda** (`agenda`, obligatoria en días de diario): todo lo relevante que se publica o pasa **hoy**,
  en orden de hora (hora de Madrid). La app lo enseña al final de las noticias como «Hoy se publica».
  Entre 3 y 10 eventos:
  ```json
  { "hora": "14:30", "titulo": "IPC de EE. UU. (octubre)", "texto": "Se espera un 0,3% mensual. Si sale más alto, aumentan las apuestas por subidas de la Fed.",
    "tipo": "macro", "importancia": "alta", "pais": "EE. UU.", "valores": ["S&P 500", "EUR/USD"] }
  ```
  - `hora`: `HH:MM` o `""` si no está confirmada (dilo en el texto). `titulo` corto (máx. ~50 caracteres).
  - `texto`: qué es, qué se espera (previsión del consenso si la hay) y por qué importa, en una o dos frases.
  - `tipo`: `banco_central` (decisiones de tipos, actas, discursos de Fed/BCE…), `macro` (IPC, PIB, empleo,
    PMI, ventas minoristas…), `resultados` (empresas que presentan cuentas; di si es antes o después de la
    apertura), `bolsa` (aperturas, OPV, vencimientos, festivos), `discurso`, `politica` u `otro`.
  - `importancia`: `alta` (Fed, BCE, IPC y empleo de EE. UU., PIB, resultados de grandes como Nvidia o
    Inditex), `media` o `baja`.
  - Incluye también los resultados de empresas del IBEX y de las grandes de EE. UU. y Europa que publican hoy.
  - Sigue escribiendo también la story `agenda` como hasta ahora (la usan las versiones antiguas de la app).
- **Reel**: `categoria`, `emoji` y `color` de su story, `titulo`, `texto`, opcionales `dato`,
  `cambio`, `tendencia`, y `fuente` + `url` (https) de donde sale la noticia. Si el reel es una
  idea de inversión, `"aviso": true`.
- **«¿Y esto qué significa para mí?»** (`paraTi`, **obligatorio en cada reel** salvo los de `"aviso": true`):
  una o dos frases (máx. **200 caracteres**, mejor ~150) que explican en lenguaje llano cómo afecta la noticia a
  una persona normal de España: su hipoteca o el euríbor, sus ahorros y depósitos, su fondo indexado o plan de
  pensiones, la gasolina y la luz, los precios del súper, comprar en dólares, su sueldo o el empleo...
  La app lo enseña debajo de la noticia con el título «¿Y esto qué significa para mí?».
  ```json
  "paraTi": "Si tienes hipoteca variable, el euríbor podría bajar en la próxima revisión y la cuota con él. Las fijas no cambian."
  ```
  - Es **información, nunca una recomendación**: explica el efecto («si tienes…, esto hace que…»), no lo que hay
    que hacer. Prohibido «compra», «vende», «deberías…», «es buen momento para…», «te recomendamos…»
    (la validación lo comprueba). No hables de comprar ni vender valores concretos.
  - Concreto y honesto: si el efecto en el día a día es pequeño o tarda en llegar, dilo («apenas te afecta»,
    «tarda semanas en notarse en la gasolinera»). No exageres ni metas miedo.
  - Sin cifras nuevas que no estén en las fuentes. Puedes usar conocimientos generales que no cambian
    (p. ej., que los depósitos están cubiertos hasta 100.000 € por persona y banco).
  - Habla de tú y piensa en alguien que no sigue los mercados. Si la noticia es de una empresa concreta,
    di si pesa en los fondos indexados que tiene mucha gente (S&P 500, MSCI World, IBEX), si le afecta como
    cliente, o si solo importa a quien tiene sus acciones.
  - También puede ir (opcional) en las diapositivas de stories, salvo en la story de ideas.
  - Mira `archivo/2026-11-18.json` para ver un ejemplo en cada reel. Va también en los reels del resumen semanal.
- **Valores** (en reels y diapositivas, opcional pero muy recomendado): `"valores": ["Solaria", "IBEX 35"]`,
  con las empresas, índices o materias primas de los que habla la noticia (máx. 4). La app lo usa para la
  lista de seguimiento y para avisar al usuario. Usa siempre el mismo nombre para lo mismo
  (`IBEX 35`, `S&P 500`, `Nasdaq`, `Dow Jones`, `DAX`, `Euro Stoxx 50`, `Brent`, `Oro`, `Bitcoin`, `EUR/USD`,
  y el nombre corto habitual de cada empresa: `Solaria`, `Nvidia`, `SAP`...).
- **Minigráfica** (opcional): `"grafica": {"valores": [19946, 19625, 19373, 19186], "etiquetas": ["16 nov", "17 nov", "18 nov", "19 nov"]}`.
  Entre 3 y 8 puntos, del más antiguo al más reciente, con números sin formato (punto decimal). Normalmente
  los cierres de las últimas sesiones; también vale la evolución dentro del día (apertura, media sesión...).
  Ponla en las noticias principales de índices, materias primas y valores con movimientos fuertes, **solo si
  las cifras salen de las fuentes** o se calculan directamente de ellas (por ejemplo, el cierre anterior a
  partir del cierre y el % de cambio).
- Números en formato español (`19.456`, `−0,86%`, `92,6 $`). Signo menos `−`.
- Solo cifras sacadas de las fuentes. Si un dato no está claro, no lo pongas.

## Comprobar y publicar

```bash
python3 scripts/validar_noticias.py noticias.json
python3 scripts/actualizar_indice.py
```

La validación tiene que decir `OK`, y el índice tiene que incluir el día de hoy. Si da errores, corrígelos y vuelve a comprobar. Después, un commit
con el mensaje `Noticias del AAAA-MM-DD` directamente en `main` y push.

## Resumen semanal (viernes)

Lo escribe otra tarea programada los viernes por la noche, después del cierre de Wall Street.
La app lo enseña en «Resumen semanal» como unas pocas tarjetas que se pasan hacia arriba.

- Archivo: `semanal/AAAA-MM-DD.json`, con la fecha del viernes.
- Mismo formato que `noticias.json`, con estas diferencias:
  - `"tipo": "semanal"` y `"fechaTexto": "Semana del 16 al 20 nov 2026"`.
  - `stories` puede ir vacío (`[]`).
  - `reels`: **entre 5 y 7 tarjetas** con lo más importante de la semana: cómo cerró cada mercado en la
    semana (con su minigráfica de los 5 cierres diarios), los 2-3 temas que más movieron el mercado, los
    valores con mayores subidas y bajadas de la semana, y una tarjeta «La semana que viene» con la agenda
    clave. Cada tarjeta con sus `valores`.
  - `indicadores`: el cierre del viernes y, en `cambio`, la variación **semanal**.
- Usa sobre todo los archivos de `archivo/` de los días de la semana, y completa con búsquedas para el
  cierre del viernes. No inventes cifras.
- Después: `python3 scripts/validar_noticias.py semanal/AAAA-MM-DD.json` y
  `python3 scripts/actualizar_indice.py` (actualiza `semanal/indice.json`).

## Fichas de valores

`valores.json` tiene los datos básicos de cada valor (ticker, mercado, sector, país y una frase de qué es).
La app los enseña en la ficha del valor. Si una noticia menciona en `valores` uno que no está en
`valores.json`, añádelo con el mismo formato (solo datos que sepas con seguridad).
