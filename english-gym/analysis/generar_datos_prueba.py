"""
Genera datos SIMULADOS con el mismo formato que la hoja de Google Sheets,
para probar analysis/modelo_aprendizaje.py antes de tener datos reales.

    python analysis/generar_datos_prueba.py
    python analysis/modelo_aprendizaje.py --datos analysis/datos_prueba --no-modelo
"""
import math
import random
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

random.seed(7)
OUT = Path(__file__).resolve().parent / "datos_prueba"
OUT.mkdir(exist_ok=True)
PATTERNS = ["sva", "prep", "tense", "order", "literal", "colloc", "vocab", "struct", "natural", "register"]
TYPES = ["mc", "fix", "transform", "fill", "build", "scenario"]
DIFF = {1: 50, 2: 62, 3: 76}
INTERVALS = [1, 2, 4, 8, 16, 32]
TRUE_HALF_LIFE = [1.5, 3, 6, 14, 30, 70]
ITEMS = [(f"x{i}", random.choice(PATTERNS), random.choice(TYPES), random.choice([1, 2, 3])) for i in range(120)]

att, daily = [], []
start = date(2026, 11, 1)
for u in range(12):
    anon = f"u-sim{u:05d}"
    skill = random.gauss(58, 8)
    weak = random.sample(PATTERNS, 2)
    mem = {}
    streak = best = 0
    for d in range(40):
        if random.random() > (0.75 if u % 3 else 0.35):
            streak = 0
            continue
        day = start + timedelta(days=d)
        streak += 1
        best = max(best, streak)
        n_first = ok_first = 0
        s0 = skill
        due = [k for k, v in mem.items() if v["due"] <= d][:4]
        tier = 1 if skill < 56 else 2 if skill < 70 else 3
        near = [i for i in ITEMS if abs(i[3] - tier) <= 1 and i[0] not in due]
        todo = due + [it[0] for it in random.sample(near, 10)]
        for pos, ex in enumerate(todo):
            it = next(i for i in ITEMS if i[0] == ex)
            m = mem.get(ex)
            gap = (skill - DIFF[it[3]] - (8 if it[1] in weak else 0)) / 10
            p = 1 / (1 + math.exp(-gap))
            if m:
                delta = d - m["last"]
                p = p * (0.6 + 0.4 * 2 ** (-delta / TRUE_HALF_LIFE[m["box"]])) + (1 - p) * 0.35 * 2 ** (-delta / TRUE_HALF_LIFE[m["box"]])
            ok = random.random() < p
            att.append(dict(anon=anon, alias=f"amigo{u}", date=day.isoformat(), ex=ex, cat="gram", type=it[2], tier=it[3], pattern=it[1],
                            word_bank=False, ok=ok, retry=False, hint=random.random() < 0.1, diff=DIFF[it[3]], skill_before=round(skill, 2),
                            box_before=m["box"] if m else 0, n_before=m["n"] if m else 0, wrong_before=m["w"] if m else 0,
                            days_since=(d - m["last"]) if m else "", hour=random.choice([9, 13, 20, 22]), ms=random.randint(3000, 40000)))
            exp = 1 / (1 + math.exp((DIFF[it[3]] - skill) / 10))
            skill = max(5, min(98, skill + 5 * ((1 if ok else 0) - exp) + 0.15))
            box = min((m["box"] + 1) if (m and ok) else (1 if ok else 0), 5)
            mem[ex] = dict(box=box, last=d, due=d + INTERVALS[box], n=(m["n"] + 1) if m else 1, w=((m["w"] if m else 0) + (0 if ok else 1)))
            n_first += 1
            ok_first += ok
        mins = random.randint(8, 35)
        daily.append(dict(anon=anon, alias=f"amigo{u}", date=day.isoformat(), timer_secs=mins * 60 if random.random() < 0.6 else 0,
                          active_secs=mins * 60 + random.randint(0, 300), sessions=1, attempts_first=n_first, correct_first=ok_first,
                          accuracy=round(ok_first / n_first, 3), skill=round(skill, 1), streak=streak, best_streak=best))

pd.DataFrame(att).to_csv(OUT / "attempt.csv", index=False)
pd.DataFrame(daily).to_csv(OUT / "daily.csv", index=False)
pd.DataFrame([dict(anon="u-sim00001", sid="s1", difficulty=random.choice(["easy", "ok", "hard"]), useful=random.randint(3, 5), nps=random.randint(5, 10)) for _ in range(20)]).to_csv(OUT / "rating.csv", index=False)
pd.DataFrame([dict(anon="u-sim00002", rating=4, category="idea", helped="Las reps de palabras", frustrated="", idea="Más ejercicios de speaking")]).to_csv(OUT / "feedback.csv", index=False)
print(f"Datos simulados en {OUT}: {len(att)} respuestas, {len(daily)} días")
