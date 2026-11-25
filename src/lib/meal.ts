// 食事の栄養量集計（未収載の値は0にせず「未確認」として件数を数える）
import type { Food, MealDay, MealItem, MealType, NutrientKey, NutrientValues } from '../types';
import { NUTRIENTS } from '../data/nutrients';
import { round } from './calc';

export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
  { key: 'pre_ex', label: '運動前の補食' },
  { key: 'post_ex', label: '運動後の補食' },
];
export const MEAL_LABEL: Record<MealType, string> = Object.fromEntries(MEAL_TYPES.map((m) => [m.key, m.label])) as Record<MealType, string>;

export interface Totals {
  values: Record<NutrientKey, number>;
  missing: Record<NutrientKey, number>; // 値が未確認だった品目数
  itemCount: number;
  unknownFoods: number; // 食品が見つからない品目
}

export function emptyTotals(): Totals {
  const values = {} as Record<NutrientKey, number>;
  const missing = {} as Record<NutrientKey, number>;
  for (const n of NUTRIENTS) { values[n.key] = 0; missing[n.key] = 0; }
  return { values, missing, itemCount: 0, unknownFoods: 0 };
}

export function nutrientsOf(food: Food, grams: number): NutrientValues {
  const out: NutrientValues = {};
  for (const n of NUTRIENTS) {
    const v = food.per100[n.key];
    out[n.key] = v == null ? null : (v * grams) / 100;
  }
  return out;
}

export function sumItems(items: MealItem[], foodMap: Record<string, Food>): Totals {
  const t = emptyTotals();
  for (const it of items) {
    const f = foodMap[it.food_id];
    t.itemCount += 1;
    if (!f) { t.unknownFoods += 1; for (const n of NUTRIENTS) t.missing[n.key] += 1; continue; }
    for (const n of NUTRIENTS) {
      const v = f.per100[n.key];
      if (v == null) t.missing[n.key] += 1;
      else t.values[n.key] += (v * it.grams) / 100;
    }
  }
  return t;
}

export function averageTotals(list: Totals[]): Totals {
  const t = emptyTotals();
  if (!list.length) return t;
  for (const n of NUTRIENTS) {
    t.values[n.key] = list.reduce((s, x) => s + x.values[n.key], 0) / list.length;
    t.missing[n.key] = list.reduce((s, x) => s + x.missing[n.key], 0);
  }
  t.itemCount = list.reduce((s, x) => s + x.itemCount, 0);
  t.unknownFoods = list.reduce((s, x) => s + x.unknownFoods, 0);
  return t;
}

export function dayTotals(day: MealDay, foodMap: Record<string, Food>): Totals {
  return sumItems(day.items, foodMap);
}

/** PFC比（%）: たんぱく質×4・脂質×9・炭水化物×4 の比率（簡易計算） */
export function pfcRatio(t: Totals): { p: number; f: number; c: number; kcal: number } | null {
  const p = t.values.protein * 4;
  const f = t.values.fat * 9;
  const c = t.values.carb * 4;
  const s = p + f + c;
  if (s <= 0) return null;
  return { p: round((p / s) * 100, 0), f: round((f / s) * 100, 0), c: round(100 - round((p / s) * 100, 0) - round((f / s) * 100, 0), 0), kcal: round(s, 0) };
}
