# Cómo contribuir a English Gym

Gracias por ayudar. El objetivo no es tener más ejercicios, sino que **las dos aprendamos de verdad**: más precisión, más naturalidad y más confianza al usar el inglés.

## Retroalimentación (lo más fácil)

Abre un **Issue** y elige una plantilla:

- **Retroalimentación**: qué te sirvió, qué te frustró, qué cambiarías.
- **Ejercicio o palabra nueva**: propón contenido aunque no sepas programar.
- **Algo no funciona**: errores de la app.

## Agregar contenido sin programar mucho

Puedes editar los archivos directo en GitHub (ícono del lápiz) y abrir un *Pull Request*.

### Una palabra nueva → `js/data/words.js`

Agrega un objeto al arreglo `WORDS`:

```js
{id:"cope", w:"to cope with", cat:"germ", pos:"verb",
 es:"lidiar con, sobrellevar", short:"lidiar con",
 trap:"",                       // opcional: “No confundir con…”
 ex:"She coped with the pressure remarkably well.",
 form:"coped with",             // cómo aparece la palabra en el ejemplo (para ejercicios de contexto)
 basic:["deal with"]},          // opcional: expresiones básicas que el corrector sugerirá reemplazar
```

- `id`: único, sin espacios.
- `cat`: `ff` (falso amigo), `germ` (origen germánico), `conn` (conector), `abs` (sustantivo abstracto).
- `fals` (solo falsos amigos): el significado engañoso, se usa como distractor.
- El ejemplo debe contener la palabra tal como está en `form`.

### Un ejercicio nuevo → `js/data/exercises.js`

Agrega un objeto al arreglo `BANK`. Ejemplo de opción múltiple:

```js
{id:"g17", c:"gram", t:"mc", l:2, p:"prep",
 q:"Choose the correct sentence.",
 o:["I'm married with a teacher.","I'm married to a teacher.","I'm married of a teacher."],
 a:1,                 // índice de la respuesta correcta
 ok:"g-g",            // tipo de error de cada opción: g gramatical, n poco natural, r registro, m cambia el significado, - correcta
 h:"Pista en español (opcional).",
 e:"Explicación en español: por qué es correcta.",
 x:"Otro ejemplo en inglés."},
```

| Campo | Valores |
|---|---|
| `c` categoría | `gram`, `colloc`, `arch`, `think`, `acad`, `real`, `vocab`, `write` |
| `t` tipo | `mc` opción múltiple, `scenario` situación, `fill` completar, `fix` corregir, `transform` reescribir, `build` ordenar palabras, `write` escritura |
| `l` nivel | `1` B2 Core, `2` B2 Precision, `3` B2→C1 Challenge |
| `p` patrón | `sva`, `prep`, `tense`, `order`, `literal`, `colloc`, `vocab`, `struct`, `natural`, `register` |

Para `fill`, `fix` y `transform`, `a` es una **lista de respuestas aceptadas** (en minúsculas, sin puntuación; las contracciones se normalizan solas) y `m` es la respuesta modelo. Agrega también una instrucción clara en `js/data/instructions.js` (`ins`), por ejemplo: *"Hay 2 errores: el tiempo verbal y una preposición."*

### Checklist de un buen ejercicio

- [ ] Evalúa **un solo punto** y la instrucción dice exactamente qué se pide.
- [ ] Hay **una** respuesta claramente correcta (o todas las variantes válidas están en `a`).
- [ ] Los distractores son errores reales de hispanohablantes, no opciones absurdas.
- [ ] La explicación dice **por qué**, no solo cuál.
- [ ] El inglés suena natural y actual.

## Cambios en la app

Toda la lógica está en `js/app.js`, organizada en secciones marcadas con `/* ===== NOMBRE ===== */`. Para probar, levanta un servidor local (`python3 -m http.server 8000`) y recarga la página. No hay dependencias.

Si cambias la forma en que se guarda el progreso (`state`), asegúrate de que un progreso viejo siga cargando: `fresh()` define los valores por defecto y se mezcla con lo guardado.
