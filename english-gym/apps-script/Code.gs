/**
 * English Gym · receptor de datos de investigación (Google Apps Script)
 *
 * Cómo instalarlo (detalle en docs/DATOS.md):
 *  1. Abre tu hoja de Google Sheets → Extensiones → Apps Script.
 *  2. Borra el contenido de Code.gs, pega este archivo y guarda.
 *  3. Elige la función `setup` en la barra de arriba y pulsa Ejecutar (acepta los permisos).
 *  4. Implementar → Nueva implementación → Tipo: Aplicación web.
 *     Ejecutar como: Yo · Quién tiene acceso: Cualquier persona → Implementar.
 *  5. Copia la URL que termina en /exec y pégala en js/config.js de la app.
 *
 * La app envía lotes de filas en JSON. Cada tipo de fila va a su propia pestaña.
 * Los tipos profile y daily se actualizan (no se duplican); el resto se agrega.
 */

const COMMON = ['received_at', 'anon', 'alias', 'device', 'app_version', 'client_ts', 'date'];

const TABLES = {
  attempt: ['sid', 'kind', 'pos', 'ex', 'cat', 'type', 'tier', 'pattern', 'word_bank', 'wotd', 'ok', 'retry', 'dont_know', 'assist',
            'choices_shown', 'hint', 'err_kind', 'ms', 'diff', 'skill_before', 'skill_after', 'box_before', 'n_before', 'wrong_before',
            'days_since', 'hour', 'weekday', 'timer_running'],
  session: ['sid', 'kind', 'n_first', 'ok_first', 'retries', 'items', 'xp', 'timer_secs', 'active_secs', 'wall_secs', 'skill_start',
            'skill_end', 'cefr', 'plan_done', 'write_saved', 'completed'],
  daily: ['timer_secs', 'active_secs', 'sessions', 'attempts_first', 'correct_first', 'accuracy', 'skill', 'cefr', 'streak', 'best_streak',
          'days_total', 'plan_done', 'wotd_done', 'words_new', 'words_learning', 'words_known', 'words_active', 'wb_reps_done', 'spell_due',
          'spell_total', 'texts_today', 'texts_total', 'xp'],
  profile: ['start_level', 'cefr', 'skill', 'occupation', 'goal', 'plan_minutes', 'years_english', 'self_level', 'native', 'lang_setting',
            'tz', 'screen', 'consent_date'],
  writing: ['prompt', 'where', 'words', 'sentences', 'avg_sentence', 'variety', 'connectors', 'mode', 'dict_words', 'coach_issues',
            'spell_errors', 'score_avg', 'score_lvl', 'grammar', 'spelling', 'vocabulary', 'coherence', 'topic', 'length', 'wotd_used',
            'bank_words', 'skill'],
  feedback: ['rating', 'category', 'helped', 'frustrated', 'idea', 'cefr', 'sessions', 'days'],
  coach: ['rule', 'kind', 'pattern', 'action', 'conf', 'where'],
  wordrep: ['word', 'cat', 'ok', 'close_spelling', 'attempts_today'],
  spellrep: ['word', 'ok', 'streak_before', 'box'],
  timer: ['action', 'secs_today']
};

// Claves para actualizar en lugar de duplicar (además de anon)
const UPSERT = { profile: [], daily: ['date'] };

const MAX_ROWS_PER_REQUEST = 500;
const MAX_TEXT = 1500;

function doGet() {
  return ContentService.createTextOutput('English Gym · receptor activo');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out_({ ok: false, error: 'busy' });
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const anon = String(body.anon || '');
    if (!/^u-[a-z0-9]{6,20}$/.test(anon)) return out_({ ok: false, error: 'anon' });
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, MAX_ROWS_PER_REQUEST) : [];
    const meta = {
      received_at: new Date(),
      anon: anon,
      alias: clean_(body.alias, 24),
      device: clean_(body.device, 12),
      app_version: clean_(body.app, 12)
    };
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (rows.some(r => r && r.t === 'delete')) {
      deleteAnon_(ss, anon);
      return out_({ ok: true, deleted: true });
    }

    const byType = {};
    rows.forEach(r => {
      if (!r || !TABLES[r.t]) return;
      (byType[r.t] = byType[r.t] || []).push(r);
    });
    Object.keys(byType).forEach(type => write_(ss, type, byType[type], meta));
    return out_({ ok: true, rows: rows.length });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function write_(ss, type, rows, meta) {
  const sh = sheet_(ss, type);
  const cols = COMMON.concat(TABLES[type]);
  const toRow = r => cols.map(c => {
    if (c in meta) return meta[c];
    if (c === 'client_ts') return clean_(r.ts, 30);
    if (c === 'date') return toDate_(r.d);
    return value_(r[c]);
  });

  if (!UPSERT[type]) {
    const values = rows.map(toRow);
    sh.getRange(sh.getLastRow() + 1, 1, values.length, cols.length).setValues(values);
    return;
  }
  // Upsert: anon + claves extra
  const keyCols = ['anon'].concat(UPSERT[type]).map(k => cols.indexOf(k));
  const last = sh.getLastRow();
  const index = {};
  if (last > 1) {
    const data = sh.getRange(2, 1, last - 1, cols.length).getValues();
    data.forEach((row, i) => { index[keyCols.map(k => String(row[k])).join('|')] = i + 2; });
  }
  rows.forEach(r => {
    const values = toRow(r);
    const key = keyCols.map(k => String(values[k])).join('|');
    if (index[key]) {
      sh.getRange(index[key], 1, 1, cols.length).setValues([values]);
    } else {
      const at = sh.getLastRow() + 1;
      sh.getRange(at, 1, 1, cols.length).setValues([values]);
      index[key] = at;
    }
  });
}

function deleteAnon_(ss, anon) {
  Object.keys(TABLES).forEach(type => {
    const sh = ss.getSheetByName(type);
    if (!sh || sh.getLastRow() < 2) return;
    const col = COMMON.indexOf('anon') + 1;
    const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i][0] === anon) sh.deleteRow(i + 2);
    }
  });
  const log = ss.getSheetByName('deletions') || ss.insertSheet('deletions');
  if (log.getLastRow() === 0) log.appendRow(['deleted_at', 'anon']);
  log.appendRow([new Date(), anon]);
}

function sheet_(ss, type) {
  let sh = ss.getSheetByName(type);
  const cols = COMMON.concat(TABLES[type]);
  if (!sh) sh = ss.insertSheet(type);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function toDate_(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : '';
}

function value_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return isFinite(v) ? v : '';
  return clean_(v, MAX_TEXT);
}

function clean_(v, max) {
  let s = String(v === undefined || v === null ? '' : v).slice(0, max).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita que un texto se interprete como fórmula
  return s;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Crea las pestañas con encabezados y una pestaña "Resumen" con fórmulas. Ejecútala una vez. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(t => sheet_(ss, t));

  const letter = (type, col) => {
    const i = COMMON.concat(TABLES[type]).indexOf(col);
    let n = i + 1, s = '';
    while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  const D = c => letter('daily', c), F = c => letter('feedback', c);

  const res = ss.getSheetByName('Resumen') || ss.insertSheet('Resumen', 0);
  res.clear();
  res.getRange('A1').setValue('English Gym · Resumen (se actualiza solo)').setFontWeight('bold').setFontSize(14);

  res.getRange('A3').setValue('Indicadores generales').setFontWeight('bold');
  const k = [
    ['Personas con datos', `=COUNTUNIQUE(daily!B2:B)`],
    ['Activas en los últimos 7 días', `=IFERROR(COUNTUNIQUE(FILTER(daily!B2:B, daily!${D('date')}2:${D('date')} >= TODAY()-6)),0)`],
    ['Respuestas a ejercicios', `=COUNTA(attempt!B2:B)`],
    ['Precisión al primer intento', `=IFERROR(COUNTIFS(attempt!${letter('attempt','retry')}2:${letter('attempt','retry')},FALSE,attempt!${letter('attempt','ok')}2:${letter('attempt','ok')},TRUE)/COUNTIFS(attempt!${letter('attempt','retry')}2:${letter('attempt','retry')},FALSE),"")`],
    ['Minutos de cronómetro (total)', `=SUM(daily!${D('timer_secs')}2:${D('timer_secs')})/60`],
    ['Minutos activos en la app (total)', `=SUM(daily!${D('active_secs')}2:${D('active_secs')})/60`],
    ['Utilidad promedio de la app (1–5)', `=IFERROR(AVERAGE(feedback!${F('rating')}2:${F('rating')}),"")`],
    ['Mensajes de retroalimentación', `=COUNTA(feedback!B2:B)`]
  ];
  res.getRange(4, 1, k.length, 2).setValues(k.map(r => [r[0], '']));
  k.forEach((r, i) => res.getRange(4 + i, 2).setFormula(r[1]));

  const row = 4 + k.length + 2;
  res.getRange(row, 1).setValue('Por persona (desde la pestaña daily)').setFontWeight('bold');
  res.getRange(row + 1, 1).setFormula(
    `=QUERY(daily!A:${D('xp')}, "select B, max(C), count(${D('date')}), sum(${D('timer_secs')})/60, sum(${D('active_secs')})/60, ` +
    `avg(${D('accuracy')}), max(${D('streak')}), max(${D('best_streak')}), max(${D('skill')}), max(${D('date')}) ` +
    `where B is not null group by B ` +
    `label B 'Código', max(C) 'Apodo', count(${D('date')}) 'Días con datos', sum(${D('timer_secs')})/60 'Min. cronómetro', ` +
    `sum(${D('active_secs')})/60 'Min. activos', avg(${D('accuracy')}) 'Precisión media', max(${D('streak')}) 'Racha (máx. registrada)', ` +
    `max(${D('best_streak')}) 'Mejor racha', max(${D('skill')}) 'Nivel (0–100)', max(${D('date')}) 'Último día'", 1)`
  );
  res.autoResizeColumns(1, 10);
  SpreadsheetApp.flush();
}
