# Datos de investigación y retroalimentación

English Gym puede enviar, **solo si cada persona acepta**, datos anónimos de práctica a una hoja de Google Sheets. Con ellos:

1. Vemos cuánto y cómo estudia la gente (minutos, rachas, retención).
2. Recogemos ideas y recomendaciones.
3. Entrenamos un modelo que mejora la app: cuándo repasar, qué tan difícil es de verdad cada ejercicio y cuáles están mal diseñados.

## 1. Conectar la hoja (una sola vez, ~10 minutos)

1. Abre la hoja **English Gym · Datos de investigación** en Google Drive (o crea una hoja nueva).
2. **Extensiones → Apps Script**.
3. Borra lo que haya en `Code.gs`, pega todo el contenido de [`apps-script/Code.gs`](../apps-script/Code.gs) y guarda (ícono del disquete).
4. En la barra de arriba elige la función **`setup`** y pulsa **Ejecutar**. Google pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a English Gym (no seguro) → Permitir*. Es tu propio script; el aviso aparece porque Google no lo ha verificado.
5. **Implementar → Nueva implementación** → ⚙️ **Aplicación web**:
   - Descripción: `v1`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   → **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. En el repositorio, edita [`js/config.js`](../js/config.js) y pega la URL:
   ```js
   window.EG_CONFIG = {
     sheetsEndpoint: "https://script.google.com/macros/s/XXXX/exec"
   };
   ```
7. Haz commit. En un par de minutos, GitHub Pages publica el cambio y la app empieza a mostrar la invitación a participar y el botón **Enviar una idea o recomendación**.

> Si cambias `Code.gs` después, usa **Implementar → Gestionar implementaciones → ✏️ → Versión: nueva** para que la URL siga siendo la misma.

**Para probar:** abre la URL `/exec` en el navegador: debe decir *English Gym · receptor activo*. Luego acepta participar en la app, haz un par de ejercicios y pulsa **Progreso → Ver mis datos → Enviar ahora**. Las filas aparecen en las pestañas en unos segundos.

## 2. Qué se guarda (pestañas de la hoja)

Todas las pestañas empiezan con: `received_at`, `anon` (código al azar, ej. `u-7k2m9x...`), `alias` (apodo opcional), `device` (ipad/phone/desktop/tablet), `app_version`, `client_ts`, `date`.

| Pestaña | Una fila por… | Columnas clave |
|---|---|---|
| **attempt** | cada respuesta a un ejercicio | `ex`, `cat`, `type`, `tier`, `pattern`, `ok`, `retry`, `dont_know`, `hint`, `assist` (eligió entre opciones), `err_kind`, `ms` (tiempo para responder), `diff`, `skill_before/after`, `box_before` (nivel de repaso), `n_before`, `days_since` (días desde la última vez), `hour`, `weekday` |
| **session** | cada sesión terminada | `n_first`, `ok_first`, `retries`, `timer_secs`, `active_secs`, `wall_secs`, `skill_start/end`, `plan_done`, `completed` |
| **daily** | persona y día (se actualiza) | `timer_secs`, `active_secs`, `sessions`, `accuracy`, `skill`, `cefr`, `streak`, `best_streak`, palabras por estado, reps de ortografía, textos |
| **profile** | persona (se actualiza) | nivel inicial, ocupación, objetivo, minutos planeados, años estudiando, nivel autopercibido, zona horaria |
| **writing** | cada texto guardado | palabras, oraciones, variedad, conectores, escrito/dictado, errores del corrector, nota por criterio, si usó la palabra del día. **Nunca el texto.** |
| **feedback** | cada mensaje | `rating`, `category`, `helped`, `frustrated`, `idea` |
| **coach** | cada sugerencia del corrector que se acepta o ignora | `rule`, `kind`, `action` → sirve para afinar las reglas |
| **wordrep / spellrep** | cada intento en reps | palabra, acierto |
| **timer** | iniciar/pausar el cronómetro | `action`, `secs_today` |
| **Resumen** | — | indicadores generales y una tabla por persona (días, minutos, precisión, rachas, nivel) que se actualizan solos |

**Dos medidas de tiempo:** `timer_secs` es el cronómetro que la persona controla; `active_secs` es el tiempo con la app abierta y en uso (se pausa tras 3 minutos sin tocar nada). Compararlas dice si el cronómetro refleja el estudio real.

## 3. Privacidad y consentimiento

- Participar es **opcional** y requiere confirmar que se tiene **18 años o más**.
- No se piden nombre, correo ni ubicación. El apodo es opcional; pide a tus amigos que no usen su nombre completo.
- El contenido de lo que se escribe o dicta **nunca** se envía, solo métricas.
- Cualquiera puede **dejar de participar** o **borrar sus datos** desde *Progreso → Ver mis datos y opciones*. El borrado elimina sus filas de todas las pestañas y queda registrado en la pestaña `deletions`.
- La hoja es privada: compártela solo con quien analice los datos.
- **Nunca subas los CSV ni `analysis/reporte.md` al repositorio** (incluyen apodos y comentarios). El `.gitignore` ya los excluye.
- La URL del script es pública porque la app lo es; el script valida el formato y limita el tamaño de lo que recibe, pero alguien podría enviar datos falsos. Si pasa, borra esas filas por su código `anon`.

## 4. Entrenar el modelo

Cuando haya datos (al menos unas 200 respuestas; idealmente varias semanas de varias personas):

1. En la hoja, descarga como CSV las pestañas `attempt`, `daily`, `session` y `feedback` (*Archivo → Descargar → Valores separados por comas*, una por una, con la pestaña abierta).
2. Guárdalas en `analysis/datos/` como `attempt.csv`, `daily.csv`, etc.
3. Ejecuta:
   ```bash
   pip install pandas numpy scikit-learn
   python analysis/modelo_aprendizaje.py
   ```
4. Revisa `analysis/reporte.md`. Si los resultados tienen sentido, haz commit **solo** de `js/data/model.js`. La app lo carga y empieza a usar:
   - **Intervalos de repaso** ajustados para que la probabilidad de recordar sea ~85 %.
   - **Dificultad calibrada** de cada ejercicio (mejora la elección de ejercicios y el nivel estimado).
   - **Ejercicios marcados** (mucho más difíciles de lo esperado o ambiguos): dejan de salir en las sesiones hasta que alguien los corrija en `js/data/exercises.js`.
   - **Tasa base de error por patrón**, que usa el modelo de errores del corrector.

Para probar el análisis antes de tener datos reales:

```bash
python analysis/generar_datos_prueba.py
python analysis/modelo_aprendizaje.py --datos analysis/datos_prueba --no-modelo
```

### Qué mide el reporte

1. **¿Qué predice que aciertes?** Compara el modelo actual de la app (tipo Elo) con una regresión logística que además usa días desde el último repaso, nivel de repaso, pistas, tipo de ejercicio, patrón y hora. Valida por persona (entrena con unas, prueba con otras) para no engañarse.
2. **Intervalos de repaso.** Ajusta una curva de olvido `p = 2^(−días / vida_media)` por nivel de repaso y calcula cuántos días esperar para recordar ~85 %. Mezcla con los valores actuales según cuántos datos hay.
3. **Dificultad real de cada ejercicio** y lista de ejercicios a revisar.
4. **Error por patrón.**
5. **Uso:** días activos, retención (¿volvieron al día siguiente?, ¿siguen tras 7 días?), minutos, rachas, relación entre minutos y avance, valoraciones del formulario y comentarios.

## 5. Ideas de validación con estos datos

- ¿Las rachas largas predicen más avance que el total de minutos?
- ¿Las personas que usan el cronómetro estudian más (o solo lo registran mejor)?
- ¿Las reps de ortografía reducen los errores de ortografía en los textos siguientes? (`spellrep` + `writing.spell_errors`)
- ¿Elegir entre opciones en "Improve this sentence" ayuda o retrasa el aprendizaje? (`attempt.assist` y aciertos posteriores del mismo ejercicio)
- ¿En qué horario se aprende mejor? (`attempt.hour`)
