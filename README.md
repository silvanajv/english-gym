# English Gym

**Entrena tu inglés como entrenas tu cuerpo.** English Gym es un juego para hispanohablantes que quieren pasar de B2 a C1: sesiones diarias cortas que se adaptan a tus errores, un Word Bank de palabras difíciles, reps de ortografía y un Writing Lab para comparar cómo escribes con el tiempo.

Todo funciona **sin IA**: reglas lingüísticas, un diccionario de 280 mil palabras, repetición espaciada y estadísticas de tu propio historial.

---

## Qué incluye

| Sección | Qué hace |
|---|---|
| **Hoy** | Entrenamiento de ~20 min: empieza con la palabra del día, sigue con 14 ejercicios de distinta dificultad (B2 Core, B2 Precision, B2→C1 Challenge) y termina con un texto corto que debe usar la palabra del día. Si fallas un ejercicio, vuelve al final del set hasta que lo aciertes. |
| **Repaso** | Patrones de error (concordancia, preposiciones, traducción literal, colocaciones…) con su estado: error reciente, recurrente, mejorando o dominado. Cuaderno de errores con la fecha en que cada uno regresa. |
| **Palabras** | Word Bank con falsos amigos, palabras de origen germánico, conectores C1 y sustantivos abstractos. Reps diarias de las palabras en **Aprendiendo** (lees el significado y escribes la palabra de memoria), reps de ortografía y palabras nuevas sin fin. |
| **Writing Lab** | Escribes o dictas por voz. El corrector marca errores típicos de hispanohablantes y palabras mal escritas (sin darte la respuesta: tú corriges). Da una nota estimada en 6 criterios y compara tus textos entre fechas. |
| **Progreso** | Nivel MCER estimado, minutos de estudio, precisión por categoría, logros e historial. Copia de seguridad del progreso. |

El cronómetro de arriba a la derecha cuenta solo el tiempo real de estudio (se pausa si cambias de pestaña o pasan 3 minutos sin actividad). La meta diaria es 20 minutos.

## Cómo usarlo

### Opción 1: GitHub Pages (recomendado)

1. Sube esta carpeta a un repositorio de GitHub.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En uno o dos minutos la app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

### Opción 2: en tu computadora

El navegador no deja cargar el diccionario abriendo `index.html` con doble clic, así que hay que usar un servidor local:

```bash
cd english-gym
python3 -m http.server 8000
# abre http://localhost:8000
```

## Tu progreso es solo tuyo

El progreso se guarda en el navegador (`localStorage`). Si dos personas usan la app, cada una la abre en su propio navegador y tiene su propio progreso. Para pasar tu progreso a otro dispositivo: **Progreso → Copia de seguridad → Copiar respaldo**, y en el otro dispositivo pégalo en **Restaurar respaldo**.

## Servicios externos

| Servicio | Para qué | Notas |
|---|---|---|
| [Free Dictionary API](https://dictionaryapi.dev) | Definición y ejemplo de las palabras nuevas que descubre el Word Bank | Gratis, sin clave. Datos de Wiktionary (CC BY-SA). |
| Web Speech API del navegador | Dictado por voz y botón “Escuchar” | Funciona mejor en Chrome y Edge. En Chrome, el reconocimiento de voz se procesa en servidores de Google. |
| Google Fonts | Tipografías Barlow y JetBrains Mono | Si no cargan, se usan fuentes del sistema. |

Sin internet la app sigue funcionando; solo no podrá descubrir palabras nuevas.

## Estructura

```
english-gym/
├── index.html               # estructura de la página
├── css/styles.css           # estilos (tokens de color y tipografía en :root, modo oscuro automático)
├── js/data/exercises.js     # banco de ejercicios, patrones de error, evaluación inicial, logros
├── js/data/words.js         # Word Bank: categorías y palabras
├── js/data/instructions.js  # instrucciones explícitas y ayudas guiadas por ejercicio
├── js/app.js                # lógica: corrector, modelo de errores, sesiones, vistas
├── data/words-ranked.txt    # diccionario: ~47 mil palabras ordenadas por frecuencia
├── data/words-valid-*.txt   # ~233 mil palabras válidas más, en 4 partes
└── .github/ISSUE_TEMPLATE/  # plantillas para dar retroalimentación
```

No hay dependencias ni paso de compilación: se edita un archivo y se recarga la página.

## Cómo funciona por dentro

- **Nivel adaptativo:** cada respuesta ajusta un puntaje de 0 a 100 (modelo tipo Elo) que se traduce a MCER (A1–C2). La dificultad de cada sesión se elige alrededor de ese puntaje.
- **Repetición espaciada:** los ejercicios y palabras regresan a 1, 2, 4, 8, 16 y 32 días según los vayas acertando.
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
