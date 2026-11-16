# English Gym

**Entrena tu inglés como entrenas tu cuerpo.** English Gym es un juego para hispanohablantes que quieren pasar de B2 a C1: sesiones diarias cortas que se adaptan a tus errores, un Word Bank de palabras difíciles, reps de ortografía y un Writing Lab para comparar cómo escribes con el tiempo.

Todo funciona **sin IA**: reglas lingüísticas, un diccionario de 84 mil palabras, repetición espaciada y estadísticas de tu propio historial.

---

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Hoy** | Entrenamiento de ~20 min: empieza con la palabra del día, sigue con 14 ejercicios de distinta dificultad (B2 Core, B2 Precision, B2→C1 Challenge) y termina con un texto corto que debe usar la palabra del día. Si fallas un ejercicio, vuelve al final del set hasta que lo aciertes. |
| **Repaso** | Patrones de error (concordancia, preposiciones, traducción literal, colocaciones…) con su estado: error reciente, recurrente, mejorando o dominado. Cuaderno de errores con la fecha en que cada uno regresa. |
| **Palabras** | Word Bank con falsos amigos, palabras de origen germánico, conectores C1 y sustantivos abstractos. Reps diarias de las palabras en **Aprendiendo** (lees el significado y escribes la palabra de memoria), reps de ortografía y palabras nuevas sin fin. |
| **Writing Lab** | Escribes o dictas por voz. El corrector marca errores típicos de hispanohablantes y palabras mal escritas (sin darte la respuesta: tú corriges). Da una nota estimada en 6 criterios y compara tus textos entre fechas. |
| **Progreso** | Nivel MCER estimado, minutos de estudio, racha, precisión por categoría, logros e historial. Copia de seguridad del progreso y opciones de participación en el estudio. |

El **cronómetro** de arriba a la derecha lo controlas tú: empieza cuando pulsas ▶ y se pausa cuando pulsas ⏸. No tiene meta ni límite; muestra el tiempo que llevas hoy y se reinicia cada día. Si lo dejas corriendo 10 minutos sin tocar la app, se pausa solo.

## Cómo usarlo

### Opción 1: GitHub Pages (recomendado)

1. Sube esta carpeta a un repositorio de GitHub.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

### En iPad (y iPhone)

1. Abre la dirección de GitHub Pages en **Safari**.
2. Toca **Compartir → Agregar a pantalla de inicio**. English Gym queda como una app con su ícono, a pantalla completa.
3. El dictado por voz y “Escuchar” funcionan en Safari (iPadOS 14.5 o posterior). La primera vez Safari pide permiso para usar el micrófono.

Se probó en iPad en vertical y horizontal. Requiere iPadOS 14 o posterior.

### Opción 2: en tu computadora

El navegador no deja cargar el diccionario abriendo `index.html` con doble clic, así que hay que usar un servidor local:

```bash
cd english-gym
python3 -m http.server 8000
# abre http://localhost:8000
```

## Tu progreso es solo tuyo

El progreso se guarda en el navegador (`localStorage`). Si dos personas usan la app, cada una la abre en su propio navegador y tiene su propio progreso. Para pasar tu progreso a otro dispositivo: **Progreso → Copia de seguridad → Copiar respaldo**, y en el otro dispositivo pégalo en **Restaurar respaldo**.

## Datos para mejorar la app (opcional)

Si conectas una hoja de Google Sheets, la app invita a cada persona a compartir datos **anónimos** de práctica (con consentimiento, solo mayores de 18, sin enviar nunca lo que escriben) y muestra un formulario de retroalimentación. Con esos datos, `analysis/modelo_aprendizaje.py` entrena el modelo que ajusta los repasos y la dificultad. Instrucciones completas en [docs/DATOS.md](docs/DATOS.md).

## Servicios externos

| Servicio | Para qué | Notas |
|---|---|---|
| [Free Dictionary API](https://dictionaryapi.dev) | Definición y ejemplo de las palabras nuevas que descubre el Word Bank | Gratis, sin clave. Datos de Wiktionary (CC BY-SA). |
| Web Speech API del navegador | Dictado por voz y botón “Escuchar” | Funciona mejor en Chrome y Edge. En Chrome, el reconocimiento de voz se procesa en servidores de Google. |
| Google Fonts | Tipografías Barlow y JetBrains Mono | Si no cargan, se usan fuentes del sistema. |
| Google Apps Script (opcional) | Recibir datos anónimos y retroalimentación en tu hoja de Google Sheets | Solo si configuras `js/config.js` y la persona acepta participar. |

Sin internet la app sigue funcionando; solo no podrá descubrir palabras nuevas.

## Estructura

```
english-gym/
├── index.html               # estructura de la página
├── manifest.webmanifest     # para instalarla en la pantalla de inicio (iPad, iPhone, Android)
├── icons/                   # íconos de la app
├── css/styles.css           # estilos (tokens de color y tipografía en :root, modo oscuro automático)
├── js/config.js             # URL del receptor de datos (Google Apps Script)
├── js/data/model.js         # modelo aprendido de los datos (lo genera analysis/)
├── js/data/exercises.js     # banco de ejercicios, patrones de error, evaluación inicial, logros
├── js/data/words.js         # Word Bank: categorías y palabras
├── js/data/instructions.js  # instrucciones explícitas y ayudas guiadas por ejercicio
├── js/app.js                # lógica: corrector, modelo de errores, sesiones, vistas
├── data/words.txt           # diccionario (~84 mil palabras): ortografía, palabras nuevas y nota de vocabulario
├── apps-script/Code.gs      # receptor de datos para Google Sheets
├── analysis/                # modelo de aprendizaje (Python) y generador de datos de prueba
├── docs/DATOS.md            # qué datos se recogen, privacidad y cómo entrenar el modelo
└── .github/ISSUE_TEMPLATE/  # plantillas para dar retroalimentación
```

No hay dependencias ni paso de compilación: se edita un archivo y se recarga la página.

## Cómo funciona por dentro

- **Nivel adaptativo:** cada respuesta ajusta un puntaje de 0 a 100 (modelo tipo Elo) que se traduce a MCER (A1–C2). La dificultad de cada sesión se elige alrededor de ese puntaje.
- **Repetición espaciada:** los ejercicios y palabras regresan a 1, 2, 4, 8, 16 y 32 días según los vayas acertando. Con datos reales, el modelo ajusta estos intervalos.
- **Modelo aprendido:** `js/data/model.js` puede traer intervalos de repaso, dificultad calibrada por ejercicio y ejercicios marcados para revisar; lo genera `analysis/modelo_aprendizaje.py`.
- **Modelo de errores:** estima la probabilidad de que cometas cada tipo de error combinando tus ejercicios y las correcciones que aceptas en tus textos. Las sesiones priorizan los patrones más altos y el corrector marca “zonas de riesgo” en tus oraciones.
- **Corrector:** ~60 reglas de errores típicos de hispanohablantes. Cada regla aprende de ti: si la ignoras seguido, pierde peso.
- **Ortografía:** diccionario local con sugerencias por distancia de edición, ordenadas por frecuencia. El corrector no te da la palabra: te da una pista y la palabra pasa a tus reps de ortografía.
- **Nota de escritura:** gramática (reglas), ortografía, vocabulario (variedad y palabras poco frecuentes), coherencia (conectores, largo de oraciones), tema (palabras relacionadas con la consigna) y extensión. Es una estimación para comparar tus textos entre sí, no una calificación oficial.

## Contribuir

¿Encontraste un error, tienes una idea o quieres agregar ejercicios y palabras? Lee [CONTRIBUTING.md](CONTRIBUTING.md). La forma más fácil de dar retroalimentación es abrir un *Issue* con la plantilla **Retroalimentación**.

## Créditos

- Frecuencia de palabras: [wordfreq](https://github.com/rspeer/wordfreq) (datos CC BY-SA 4.0).
- Lista de palabras válidas: [an-array-of-english-words](https://github.com/words/an-array-of-english-words) (MIT).
- Definiciones de palabras nuevas: [Free Dictionary API](https://dictionaryapi.dev) / Wiktionary (CC BY-SA).
