# CashcashNEWs · noticias del día

Noticias financieras diarias que lee la app CashcashNEWs (stories y reels). Las publica
cada mañana una tarea programada de Claude.

| Archivo | Qué es |
|---|---|
| `noticias.json` | Noticias del día que descarga la app |
| `archivo/` | Una copia por día e `indice.json` (lista de días para el calendario de la app) |
| `resumenes/` | El resumen del día en texto |
| `recientes.json` | Lo último de cada valor del catálogo (`catalogo.txt`), para la lista de seguimiento |
| `apk/` | El APK de cada versión de la app, para el botón «Descargar» (se instala encima) |
| `app.json` | Última versión de la app (para el aviso de «versión nueva»), dónde se descarga, adónde van las estadísticas anónimas y las opiniones. Cambiarlo no requiere sacar otra versión |
| `INSTRUCCIONES.md` | Cómo se escriben y publican, y el formato del JSON |

> Contenido solo informativo y educativo. No es asesoramiento financiero ni una
> recomendación de compra o venta.

## Aviso si faltan las noticias

`.github/workflows/avisar-si-faltan.yml` comprueba cada día a las 09:45 (Madrid, invierno)
que `noticias.json` es de hoy y pasa la validación. Si no, abre una incidencia y GitHub
avisa por correo al dueño del repositorio. Se cierra sola cuando vuelve a estar bien.

## app.json

```json
{
  "versionCode": 19,            // súbelo con cada APK nuevo (el de app/build.gradle.kts)
  "versionName": "0.13.0",
  "novedades": "Qué trae, en una frase",
  "descarga": "https://…",      // enlace al APK; vacío = «pídeselo a quien te pasó la app»
  "estadisticas": "https://NOMBRE.goatcounter.com",  // vacío = sin estadísticas
  "opinion": "mailto:…"         // o https://… (formulario); vacío = «Compartir» (WhatsApp…)
}
```

## Versión web (iPhone)

La carpeta `docs/` es la versión web de la app, para iPhone o cualquier navegador.
Se publica con GitHub Pages (Settings → Pages → rama `main`, carpeta `/docs`) en
https://bpesoaldaco.github.io/cashcashnews-noticias/ y lee las mismas noticias que la app de Android.
