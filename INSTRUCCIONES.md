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
    { "id": "economia", "titulo": "Economía", "emoji": "🏛", "color": "#14B8A6", "slides": [ ... ] },
    { "id": "ideas",    "titulo": "Ideas",    "emoji": "💡", "color": "#F59E0B", "slides": [ ... ] },
    { "id": "agenda",   "titulo": "Agenda",   "emoji": "📅", "color": "#8B5CF6", "slides": [ ... ] }
  ],
  "reels": [ ... ],                      // 8 a 12 noticias del día, de ellas 3-4 económicas
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
- **Reel**: `categoria`, `emoji` y `color` de su story (las económicas: `"Economía"`, `"🏛"`, `"#14B8A6"`, más su `tema`; ver «Noticias económicas»), `titulo`, `texto`, opcionales `dato`,
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
- **Formato fijo** (`formato`, solo en el reel del formato del día; ver «Formatos fijos por día»):
  `semana_que_viene`, `concepto` o `semana_pasada`.
- Números en formato español (`19.456`, `−0,86%`, `92,6 $`). Signo menos `−`.
- Solo cifras sacadas de las fuentes. Si un dato no está claro, no lo pongas.

## Noticias económicas (no solo de mercados)

Además de bolsa, cada día van **3 o 4 reels de economía**: lo que explica por qué se mueven los
mercados y lo que la gente nota en su vida. Llevan `"categoria": "Economía"`, `"emoji": "🏛"`,
`"color": "#14B8A6"`, su `paraTi` (obligatorio, como en todos) y un **`tema`**, uno de estos:

| `tema` | De qué va | Ejemplos de titular |
|---|---|---|
| `bolsillo` | Precios del día a día: luz, gas, gasolina, súper, aceite, transporte, suscripciones | «Sube la luz este invierno: ¿cuánto más pagarás?» · «El aceite baja por primera vez en meses» |
| `empleo_vivienda` | Paro, afiliación, salarios, alquiler, compraventa de pisos, hipotecas firmadas | «El paro baja: qué sectores contratan» · «El alquiler sigue subiendo en las grandes ciudades» |
| `macro` | IPC, PIB, PMI, confianza, déficit y deuda, explicados en fácil | «La inflación de la eurozona se modera: qué significa para tu hipoteca» |
| `politica` | Impuestos, presupuestos, ayudas, aranceles, regulación, salario mínimo, pensiones | «Nuevos aranceles de EE. UU.: qué productos europeos se encarecen» · «Cambios en el IRPF para 2027» |
| `global` | Economía de otros países y materias primas: China, EE. UU., Latinoamérica, petróleo, trigo, cobre | «China frena su consumo: qué pasa con el lujo y los coches europeos» · «Del barril a la gasolinera» |

- Da prioridad a **España y Europa**, sin olvidar lo mundial que nos afecta.
- **Mezcla temas**: no repitas el mismo `tema` en dos reels del mismo día, y mira con
  `scripts/ultimos_dias.py` cuáles han salido menos esta semana para darles prioridad.
- Solo noticias de las últimas 24-48 horas (en domingo y festivos, 48 horas), con fuente y `url`.
  Valen datos oficiales (INE, Eurostat, BCE, Banco de España, SEPE, Seguridad Social, OMIE, Ministerio),
  prensa económica y agencias. Comprueba la fecha y el año.
- En la story `economia`, una diapositiva por cada noticia económica del día (mismo contenido, más corto).
- Si una noticia económica tiene relación con una cotización (p. ej., el petróleo y Repsol), ponlo en `valores`.
- La validación pide al menos 3 reels con `tema` desde el 24 nov 2026 (no en el resumen semanal).
- Las mismas reglas de siempre: solo cifras de las fuentes y **nunca recomendaciones**.

## No repetir noticias

El dato «X sube, Y baja» se repite cada día; lo que hace que valga la pena es el **porqué** y
**qué significa para ti**. Antes de escribir:

1. Ejecuta `python3 scripts/ultimos_dias.py` y lee los titulares de los **últimos 7 días**.
2. Un tema que ya salió **solo vuelve si hay algo nuevo** (un dato, una decisión, un giro), y se
   cuenta como **continuación**, con otro titular que diga qué ha cambiado: «Sigue la caída de
   Inditex: ahora…», «Segundo mes de subida del alquiler: …». Si no hay nada nuevo, no se publica.
3. **Menos cotizaciones sueltas**: el «sube/baja» de índices y materias primas va en `indicadores`
   y en la story `mercados`. Como reels, como mucho **3** sobre movimientos de mercado, y solo
   si explican la causa (resultados, bancos centrales, datos macro, fusiones, una noticia concreta).
   Los demás reels: historias con causa, noticias económicas y empresas con algo que contar.
4. La validación rechaza un titular igual o casi igual a uno de los últimos 7 días (salvo los de
   `formato`). Si salta, cambia el enfoque o quita el reel; no basta con cambiar dos palabras.

## Formatos fijos por día

Un reel fijo según el día de la semana (hora de Madrid), con su campo `formato`:

| Día | `formato` | Qué es |
|---|---|---|
| Lunes | `semana_que_viene` | «La semana que viene»: lo más importante de la semana que empieza, con día y hora de Madrid. |
| Miércoles | `concepto` | «Un concepto explicado»: un concepto económico o financiero (inflación, euríbor, prima de riesgo, PER, dividendo…) explicado en sencillo **con una noticia de hoy** como ejemplo. Que no se repita un concepto de las últimas 4 semanas. |
| Viernes | `semana_pasada` | «Lo que ha pasado esta semana»: los 3-4 temas que más han importado, en una tarjeta. |

Los demás días no hay reel fijo. Estos reels también llevan su `paraTi`.

## Comprobar y publicar

```bash
python3 scripts/validar_noticias.py noticias.json      # también comprueba que no repite titulares
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

## Lo último de cada valor (`recientes.json`)

La lista de seguimiento de la app se guarda solo en el móvil, así que no sabemos qué valores
sigue cada persona. Para que un valor que hoy no sale en las noticias no aparezca solo como
«sin noticias», `recientes.json` guarda lo último de **todos** los valores de `catalogo.txt`
(el mismo catálogo del buscador de la app). La app lo enseña en la lista de seguimiento y en la
ficha del valor.

Tiene dos partes:

- **`enNuestrasNoticias`**: la última vez que cada valor salió en `archivo/` o `semanal/`.
  La calcula `scripts/actualizar_recientes.py` sola, sin búsquedas. No se escribe a mano.
- **`valores`**: lo que la tarea «Lo último de cada valor» encuentra en la web. Cada día revisa
  **solo un lote** (los que llevan más tiempo sin revisar), para que el coste no se dispare:
  `python3 scripts/actualizar_recientes.py --pendientes 30` dice cuáles tocan.

Formato de cada valor en `valores` (la clave es el nombre exacto de `catalogo.txt`):

```json
"XRP": {
  "revisado": "2026-11-21",
  "resumen": "Lleva semanas a la baja: el 15 de noviembre tocó 0,89 $, su nivel más bajo desde noviembre de 2024.",
  "variacion": { "cambio": "−12,4%", "tendencia": "down", "periodo": "7 días", "hasta": "2026-11-17", "fuente": "TradingNews" },
  "titulares": [
    { "fecha": "2026-11-18", "titulo": "XRP vuelve a 1 $ tras subir un 4,6% en el día", "fuente": "TradingNews", "url": "https://..." }
  ]
}
```

- `revisado` (obligatorio): el día que lo has buscado, **aunque no encuentres nada**. Así el valor
  pasa al final de la cola y no se busca otra vez mañana.
- `variacion` (opcional): la variación más reciente que dé una fuente (de la última semana o de
  7 días; si solo hay de un mes, `"periodo": "1 mes"`). `hasta` es la fecha del dato. Si las fuentes
  no lo dan claro, no la pongas. Las de más de 14 días se borran solas.
- `titulares` (opcional, máx. 3, de los últimos 30 días): noticias de ese valor, el titular en
  español en frase corta (máx. ~100 caracteres), con su `fecha` de publicación, `fuente` y `url`
  (https). Solo noticias que hablen de verdad del valor. Los de más de 45 días se borran solos.
- `resumen` (opcional, máx. 180 caracteres): qué ha pasado con el valor estas semanas, en una
  frase llana. Solo hechos de las fuentes.
- **Nada de recomendaciones ni precios objetivo** (la validación lo comprueba). Nada de cifras
  inventadas: si no hay dato, mejor dejarlo vacío.
- Si añades un valor nuevo al buscador de la app, añádelo también a `catalogo.txt`.

Después: `python3 scripts/actualizar_recientes.py` tiene que decir `OK`. Commit con el mensaje
`Lo último de cada valor AAAA-MM-DD` en `main` y push (solo `recientes.json`).
