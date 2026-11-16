"""
English Gym · modelo de aprendizaje a partir de los datos de investigación.

Uso:
    1. Descarga de Google Sheets las pestañas attempt, daily, session y feedback
       como CSV (Archivo → Descargar → CSV) y guárdalas en analysis/datos/ con esos nombres:
       attempt.csv, daily.csv, session.csv, feedback.csv
    2. pip install pandas numpy scikit-learn
    3. python analysis/modelo_aprendizaje.py

Qué hace:
    - Entrena un modelo que predice si una persona va a acertar un ejercicio (regresión logística)
      y lo compara con el modelo actual de la app (tipo Elo).
    - Estima la "vida media" del recuerdo por nivel de repaso y propone intervalos de repaso
      para que la probabilidad de recordar sea ~85 %.
    - Calibra la dificultad real de cada ejercicio y marca los que parecen mal diseñados.
    - Calcula la tasa base de error por patrón.
    - Resume el uso: días activos, minutos, rachas, retención y valoraciones.

Salidas:
    js/data/model.js          → la app lo carga y usa intervalos, dificultades y ejercicios marcados.
    analysis/reporte.md       → reporte legible para revisar antes de publicar el modelo.
"""
from __future__ import annotations

import argparse
import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INTERVALS = [1, 2, 4, 8, 16, 32]
DEFAULT_DIFF = {1: 50, 2: 62, 3: 76}
TARGET_RECALL = 0.85
MIN_OBS_BOX = 30
MIN_OBS_ITEM = 15


def load(folder: Path, name: str) -> pd.DataFrame:
    p = folder / f"{name}.csv"
    if not p.exists():
        return pd.DataFrame()
    df = pd.read_csv(p)
    for c in df.columns:
        if df[c].dtype == object:
            low = df[c].astype(str).str.upper()
            if low.isin(["TRUE", "FALSE", "NAN", ""]).all():
                df[c] = low.map({"TRUE": True, "FALSE": False}).astype("boolean")
    return df


def to_bool(s: pd.Series) -> pd.Series:
    if s.dtype == bool or str(s.dtype) == "boolean":
        return s.fillna(False).astype(bool)
    return s.astype(str).str.upper().isin(["TRUE", "1", "VERDADERO"])


def elo_p(skill, diff):
    return 1.0 / (1.0 + np.exp((diff - skill) / 10.0))


# ---------------------------------------------------------------- 1. modelo de acierto
def recall_model(att: pd.DataFrame, rep: list[str]) -> dict:
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import log_loss, roc_auc_score
    from sklearn.model_selection import GroupKFold, KFold

    df = att[~att["retry"]].copy()
    if len(df) < 200 or df["ok"].nunique() < 2:
        rep.append(f"- Modelo de acierto: se necesitan al menos 200 respuestas al primer intento (hay {len(df)}).")
        return {}
    ds = pd.to_numeric(df["days_since"], errors="coerce")
    X = pd.DataFrame({
        "is_new": ds.isna().astype(int),
        "log_days": np.log1p(ds.fillna(0).clip(lower=0)),
        "box": pd.to_numeric(df["box_before"], errors="coerce").fillna(0),
        "seen": np.log1p(pd.to_numeric(df["n_before"], errors="coerce").fillna(0)),
        "wrong_before": pd.to_numeric(df["wrong_before"], errors="coerce").fillna(0).clip(upper=5),
        "skill_gap": (pd.to_numeric(df["skill_before"], errors="coerce") - pd.to_numeric(df["diff"], errors="coerce")) / 10,
        "hint": to_bool(df["hint"]).astype(int),
        "word_bank": to_bool(df["word_bank"]).astype(int),
        "evening": pd.to_numeric(df["hour"], errors="coerce").fillna(12).between(19, 23).astype(int),
        "night": pd.to_numeric(df["hour"], errors="coerce").fillna(12).between(0, 5).astype(int),
    })
    X = pd.concat([X, pd.get_dummies(df["type"], prefix="type", dtype=int), pd.get_dummies(df["pattern"], prefix="pat", dtype=int)], axis=1).fillna(0)
    y = df["ok"].astype(int).values
    groups = df["anon"].values
    base = elo_p(pd.to_numeric(df["skill_before"], errors="coerce").fillna(58), pd.to_numeric(df["diff"], errors="coerce").fillna(62)).values

    n_users = len(set(groups))
    splitter = GroupKFold(n_splits=min(5, n_users)) if n_users >= 3 else KFold(n_splits=5, shuffle=True, random_state=0)
    pred = np.zeros(len(y))
    for tr, te in splitter.split(X, y, groups if n_users >= 3 else None):
        m = LogisticRegression(max_iter=2000, C=1.0)
        m.fit(X.iloc[tr], y[tr])
        pred[te] = m.predict_proba(X.iloc[te])[:, 1]
    auc_m, auc_b = roc_auc_score(y, pred), roc_auc_score(y, base)
    ll_m, ll_b = log_loss(y, np.clip(pred, 1e-4, 1 - 1e-4)), log_loss(y, np.clip(base, 1e-4, 1 - 1e-4))
    full = LogisticRegression(max_iter=2000).fit(X, y)
    coefs = sorted(zip(X.columns, full.coef_[0]), key=lambda t: -abs(t[1]))[:10]

    rep.append("## 1. ¿Qué predice que aciertes?")
    rep.append(f"Validación cruzada {'por persona' if n_users >= 3 else '(pocas personas: por filas)'} con {len(y)} respuestas al primer intento.\n")
    rep.append("| Modelo | AUC (más alto = mejor) | Log-loss (más bajo = mejor) |\n|---|---|---|")
    rep.append(f"| Actual de la app (Elo) | {auc_b:.3f} | {ll_b:.3f} |")
    rep.append(f"| Nuevo (regresión logística) | {auc_m:.3f} | {ll_m:.3f} |\n")
    rep.append("Factores con más peso (positivo = ayuda a acertar):\n")
    rep.extend([f"- `{k}`: {v:+.2f}" for k, v in coefs])
    rep.append("")
    return {"auc_model": round(auc_m, 4), "auc_elo": round(auc_b, 4)}


# ---------------------------------------------------------------- 2. intervalos de repaso
def fit_half_life(delta: np.ndarray, ok: np.ndarray) -> float:
    grid = np.exp(np.linspace(np.log(0.3), np.log(400), 300))
    err = [np.mean((ok - 2.0 ** (-delta / h)) ** 2) for h in grid]
    return float(grid[int(np.argmin(err))])


def intervals(att: pd.DataFrame, rep: list[str]) -> list[int]:
    df = att[(~att["retry"])].copy()
    df["days_since"] = pd.to_numeric(df["days_since"], errors="coerce")
    df["box_before"] = pd.to_numeric(df["box_before"], errors="coerce")
    df = df[(df["days_since"] >= 1) & df["box_before"].notna()]
    out, rows = [], []
    for b in range(len(DEFAULT_INTERVALS)):
        sub = df[df["box_before"] == b]
        n = len(sub)
        if n >= MIN_OBS_BOX:
            h = fit_half_life(sub["days_since"].values.astype(float), sub["ok"].astype(int).values)
            ideal = h * -math.log2(TARGET_RECALL)
            w = n / (n + 100)
            val = w * ideal + (1 - w) * DEFAULT_INTERVALS[b]
            rows.append(f"| {b} | {n} | {sub['ok'].mean():.0%} | {h:.1f} | {ideal:.1f} | {DEFAULT_INTERVALS[b]} | {val:.1f} |")
        else:
            val = DEFAULT_INTERVALS[b]
            rows.append(f"| {b} | {n} | — | — | — | {DEFAULT_INTERVALS[b]} | {val} (pocos datos) |")
        out.append(val)
    fixed = []
    for i, v in enumerate(out):
        v = max(1, min(120, round(v)))
        if fixed and v < fixed[-1]:
            v = fixed[-1]
        fixed.append(v)
    rep.append("## 2. Intervalos de repaso")
    rep.append(f"Objetivo: que la probabilidad de recordar al repasar sea ~{TARGET_RECALL:.0%}. Se mezcla con el valor actual según cuántos datos hay.\n")
    rep.append("| Nivel de repaso | Observaciones | Aciertos | Vida media (días) | Intervalo ideal | Actual | Propuesto |\n|---|---|---|---|---|---|---|")
    rep.extend(rows)
    rep.append(f"\nIntervalos propuestos: **{fixed}** (antes {DEFAULT_INTERVALS}).\n")
    return fixed


# ---------------------------------------------------------------- 3. calibración de ejercicios
def items(att: pd.DataFrame, rep: list[str]) -> tuple[dict, list]:
    df = att[~att["retry"]].copy()
    df["skill_before"] = pd.to_numeric(df["skill_before"], errors="coerce")
    df["tier"] = pd.to_numeric(df["tier"], errors="coerce")
    diff, flagged, rows = {}, [], []
    for ex, g in df.groupby("ex"):
        n = len(g)
        if n < MIN_OBS_ITEM or str(ex).startswith("wb-"):
            continue
        p = float(g["ok"].mean())
        s = float(g["skill_before"].mean())
        pc = min(max(p, 0.02), 0.98)
        est = s + 10 * math.log((1 - pc) / pc)
        prior = DEFAULT_DIFF.get(int(g["tier"].iloc[0]) if pd.notna(g["tier"].iloc[0]) else 2, 62)
        w = n / (n + 30)
        diff[ex] = round(w * est + (1 - w) * prior, 1)
        hi = g[g["skill_before"] >= 70]
        expected = float(elo_p(g["skill_before"].values, prior).mean())
        reason = ""
        if n >= 20 and p - expected < -0.35:
            reason = f"mucho más difícil de lo esperado ({p:.0%} vs {expected:.0%}): ¿ambiguo o mal explicado?"
        elif n >= 20 and p > 0.97 and expected < 0.8:
            reason = "casi todos aciertan: demasiado fácil para su nivel"
        elif len(hi) >= 10 and hi["ok"].mean() < 0.4:
            reason = "falla incluso con nivel alto (¿respuesta ambigua?)"
        if reason:
            flagged.append(ex)
        rows.append((ex, n, p, prior, diff[ex], reason))
    rep.append("## 3. Dificultad real de los ejercicios")
    if not rows:
        rep.append(f"Aún no hay ejercicios con al menos {MIN_OBS_ITEM} respuestas.\n")
        return diff, flagged
    rows.sort(key=lambda r: -abs(r[4] - r[3]))
    rep.append("Los que más se alejan de su dificultad asignada (escala 0–100):\n")
    rep.append("| Ejercicio | Respuestas | Aciertos | Dificultad asignada | Calibrada | Revisar |\n|---|---|---|---|---|---|")
    rep.extend([f"| {r[0]} | {r[1]} | {r[2]:.0%} | {r[3]} | {r[4]} | {r[5]} |" for r in rows[:20]])
    if flagged:
        rep.append(f"\n**Marcados para revisar ({len(flagged)})**: la app deja de incluirlos en las sesiones hasta que se corrijan: {', '.join(flagged)}\n")
    return diff, flagged


def pattern_prior(att: pd.DataFrame, rep: list[str]) -> dict:
    df = att[~att["retry"]]
    out = {}
    rep.append("## 4. Tasa de error por patrón")
    rep.append("| Patrón | Respuestas | Error |\n|---|---|---|")
    for p, g in df.groupby("pattern"):
        n, err = len(g), 1 - float(g["ok"].mean())
        val = (err * n + 0.15 * 30) / (n + 30)
        out[p] = round(val, 3)
        rep.append(f"| {p} | {n} | {err:.0%} |")
    rep.append("")
    return out


# ---------------------------------------------------------------- 5. uso y retención
def engagement(daily: pd.DataFrame, rating: pd.DataFrame, feedback: pd.DataFrame, rep: list[str]) -> None:
    rep.append("## 5. Uso, rachas y retención")
    if daily.empty:
        rep.append("Sin datos diarios todavía.\n")
        return
    daily = daily.copy()
    daily["date"] = pd.to_datetime(daily["date"], errors="coerce")
    for c in ["timer_secs", "active_secs", "skill", "streak", "best_streak", "attempts_first"]:
        daily[c] = pd.to_numeric(daily.get(c), errors="coerce")
    per = daily.groupby("anon").agg(
        alias=("alias", "last"), dias=("date", "nunique"), primero=("date", "min"), ultimo=("date", "max"),
        min_crono=("timer_secs", lambda s: s.sum() / 60), min_activo=("active_secs", lambda s: s.sum() / 60),
        mejor_racha=("best_streak", "max"), nivel_ini=("skill", "first"), nivel_fin=("skill", "last"))
    per["ganancia"] = per["nivel_fin"] - per["nivel_ini"]
    per["span"] = (per["ultimo"] - per["primero"]).dt.days + 1
    n = len(per)
    d2 = (per["dias"] >= 2).mean()
    d7 = (per["span"] >= 7).mean()
    rep.append(f"- Personas: **{n}** · días con práctica por persona (mediana): **{per['dias'].median():.0f}**")
    rep.append(f"- Volvieron un segundo día: **{d2:.0%}** · siguen después de 7 días: **{d7:.0%}**")
    act = daily[daily["active_secs"] > 0]
    rep.append(f"- Minutos activos por día de práctica (mediana): **{(act['active_secs'] / 60).median():.1f}** · con cronómetro: **{(daily['timer_secs'][daily['timer_secs'] > 0] / 60).median() if (daily['timer_secs'] > 0).any() else 0:.1f}**")
    rep.append(f"- Mejor racha (mediana): **{per['mejor_racha'].median():.0f}** días")
    if n >= 5:
        r = per[["min_activo", "ganancia"]].corr(method="spearman").iloc[0, 1]
        rep.append(f"- Correlación entre minutos de práctica y subida de nivel (Spearman): **{r:+.2f}**")
    rep.append("\n| Persona | Días | Min. activos | Min. cronómetro | Mejor racha | Nivel inicial → final |\n|---|---|---|---|---|---|")
    for a, r in per.sort_values("dias", ascending=False).iterrows():
        name = r["alias"] if isinstance(r["alias"], str) and r["alias"] else a
        rep.append(f"| {name} | {r['dias']} | {r['min_activo']:.0f} | {r['min_crono']:.0f} | {r['mejor_racha']:.0f} | {r['nivel_ini']:.0f} → {r['nivel_fin']:.0f} |")
    rep.append("")
    if not rating.empty:
        rep.append("### Valoraciones al terminar sesión")
        if "difficulty" in rating:
            rep.append("- Dificultad: " + ", ".join(f"{k}: {v}" for k, v in rating["difficulty"].value_counts().items()))
        if "useful" in rating:
            rep.append(f"- Utilidad media (1–5): **{pd.to_numeric(rating['useful'], errors='coerce').mean():.2f}**")
        if "nps" in rating:
            nps = pd.to_numeric(rating["nps"], errors="coerce").dropna()
            if len(nps):
                score = ((nps >= 9).mean() - (nps <= 6).mean()) * 100
                rep.append(f"- NPS: **{score:.0f}** ({len(nps)} respuestas)")
        rep.append("")
    if not feedback.empty:
        rep.append(f"### Retroalimentación escrita ({len(feedback)} mensajes)")
        for _, r in feedback.tail(15).iterrows():
            parts = [str(r.get(k, "")) for k in ["helped", "frustrated", "idea"] if isinstance(r.get(k, ""), str) and r.get(k, "")]
            if parts:
                rep.append(f"- ({r.get('rating', '')}/5, {r.get('category', '')}) " + " · ".join(parts))
        rep.append("")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--datos", default=str(ROOT / "analysis" / "datos"))
    ap.add_argument("--no-modelo", action="store_true", help="solo genera el reporte, no escribe js/data/model.js")
    args = ap.parse_args()
    folder = Path(args.datos)
    att = load(folder, "attempt")
    daily, rating, feedback = load(folder, "daily"), load(folder, "rating"), load(folder, "feedback")
    rep = [f"# English Gym · reporte del modelo\nGenerado: {datetime.now():%Y-%m-%d %H:%M}\n"]
    model = {"generated": datetime.now().strftime("%Y-%m-%d")}
    if att.empty:
        rep.append("No se encontró attempt.csv: descarga las pestañas de Google Sheets en analysis/datos/.")
    else:
        att["ok"] = to_bool(att["ok"])
        att["retry"] = to_bool(att["retry"])
        model["n_attempts"] = int(len(att))
        model["n_users"] = int(att["anon"].nunique())
        rep.append(f"Datos: **{len(att)}** respuestas de **{att['anon'].nunique()}** personas.\n")
        model.update(recall_model(att, rep))
        model["intervals"] = intervals(att, rep)
        model["itemDiff"], model["flagged"] = items(att, rep)
        model["patternPrior"] = pattern_prior(att, rep)
    engagement(daily, rating, feedback, rep)

    (ROOT / "analysis" / "reporte.md").write_text("\n".join(rep), encoding="utf-8")
    print("Reporte: analysis/reporte.md")
    if not args.no_modelo and not att.empty:
        js = "/* Generado por analysis/modelo_aprendizaje.py. No editar a mano. */\nwindow.EG_MODEL = " + json.dumps(model, ensure_ascii=False, indent=1) + ";\n"
        (ROOT / "js" / "data" / "model.js").write_text(js, encoding="utf-8")
        print("Modelo: js/data/model.js")


if __name__ == "__main__":
    main()
