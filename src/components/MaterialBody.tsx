import React from 'react';
import type { Food, NutrientKey } from '../types';
import { NUTRIENT_MAP } from '../data/nutrients';
import { MONTHLY_THEMES, RECIPES } from '../data/seasonal';
import { approxUnit, fmt, gramsForTarget, round } from '../lib/calc';
import { sumItems } from '../lib/meal';

function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
}

const PROTEIN_FOODS = [
  'f-chicken-breast', 'f-chicken-tender', 'f-pork-fillet', 'f-beef-round', 'f-salmon-raw', 'f-tuna', 'f-katsuo', 'f-aji', 'f-saba-can', 'f-tuna-can',
  'f-egg-raw', 'f-natto', 'f-tofu-momen', 'f-tofu-kinu', 'f-atsuage', 'f-soymilk', 'f-milk', 'f-yogurt', 'f-cheese', 'f-shirasu',
];

function servingUnit(f: Food) {
  return f.units.find((u) => u.unit !== 'g' && u.unit !== 'ml') ?? null;
}

export function Protein20({ foodMap }: { foodMap: Record<string, Food> }) {
  const rows = PROTEIN_FOODS.map((id) => foodMap[id]).filter(Boolean).map((f) => {
    const g = gramsForTarget(f.per100.protein, 20);
    const u = servingUnit(f);
    return { f, g, approx: g && u ? round(g / u.grams, 1) : null, u };
  }).filter((r) => r.g != null).sort((a, b) => (a.g as number) - (b.g as number));
  return (
    <table>
      <thead><tr><th>食品（状態）</th><th>たんぱく質20gに必要な量</th><th>目安</th><th>100gあたり</th></tr></thead>
      <tbody>
        {rows.map(({ f, g, approx, u }) => (
          <tr key={f.id}>
            <td>{f.name}（{f.state}）</td>
            <td className="r">{fmt(g)}g</td>
            <td>{approx != null && u ? approxUnit(u.unit, approx) : '—'}</td>
            <td className="r">{fmt(f.per100.protein, 1)}g</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function NutrientRank({ k, foods, limit = 10 }: { k: NutrientKey; foods: Food[]; limit?: number }) {
  const def = NUTRIENT_MAP[k];
  const rows = foods
    .filter((f) => f.per100[k] != null && (f.per100[k] as number) > 0 && f.category !== '油脂類' && f.category !== '調味料')
    .map((f) => ({ f, per: ((f.per100[k] as number) * f.serving.grams) / 100 }))
    .sort((a, b) => b.per - a.per)
    .slice(0, limit);
  return (
    <table>
      <thead><tr><th>食品（状態）</th><th>1回量の目安</th><th>{def.name}（1回量）</th><th>100gあたり</th></tr></thead>
      <tbody>
        {rows.map(({ f, per }) => (
          <tr key={f.id}>
            <td>{f.name}（{f.state}）</td>
            <td>{f.serving.label}</td>
            <td className="r">{fmt(per, def.digits)}{def.unit}</td>
            <td className="r">{fmt(f.per100[k], def.digits)}{def.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MonthlyBlock({ month }: { month: number }) {
  const t = MONTHLY_THEMES.find((x) => x.month === month) ?? MONTHLY_THEMES[0];
  return (
    <>
      <h2>{t.month}月のテーマ：{t.theme}</h2>
      <p>{t.message}</p>
      <h2>{t.month}月の旬の食材</h2>
      <p>{t.foods.join('・')}</p>
    </>
  );
}

export function SeasonalTable() {
  return (
    <table>
      <thead><tr><th style={{ width: '12%' }}>月</th><th>旬の食材</th></tr></thead>
      <tbody>
        {MONTHLY_THEMES.map((t) => (
          <tr key={t.month}><td>{t.month}月</td><td>{t.foods.join('・')}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export function recipeTotals(recipeId: string, foodMap: Record<string, Food>) {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r) return null;
  return sumItems(r.ingredients.map((i, idx) => ({ id: String(idx), meal: 'dinner', food_id: i.food_id, amount: i.grams, unit: 'g', grams: i.grams, memo: '' })), foodMap);
}

export function RecipesBlock({ foodMap, ids }: { foodMap: Record<string, Food>; ids?: string[] }) {
  const list = ids ? RECIPES.filter((r) => ids.includes(r.id)) : RECIPES;
  return (
    <>
      {list.map((r) => {
        const t = recipeTotals(r.id, foodMap);
        return (
          <div key={r.id} style={{ breakInside: 'avoid' }}>
            <h2>{r.title}</h2>
            <p style={{ fontSize: '0.9em', color: '#5b6863' }}>おすすめ：{r.purpose}（1人分）</p>
            <p><strong>材料</strong>：{r.ingredients.map((i) => i.label).join('、')}{r.extras.length ? `、${r.extras.join('、')}` : ''}</p>
            <ul>{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
            {t && (
              <p style={{ fontSize: '0.9em' }}>
                栄養価の目安（1人分）：エネルギー {fmt(t.values.energy)}kcal／たんぱく質 {fmt(t.values.protein, 1)}g／カルシウム {fmt(t.values.ca)}mg／鉄 {fmt(t.values.fe, 1)}mg／食塩相当量 {fmt(t.values.salt, 1)}g
                {Object.values(t.missing).some((v) => v > 0) ? '（一部未確認の値あり）' : ''}
              </p>
            )}
            <div className="note">{r.point}</div>
          </div>
        );
      })}
    </>
  );
}

/** 資料本文（簡易マークアップ）の表示 */
export function MaterialBody({ body, foods, foodMap, month }: { body: string; foods: Food[]; foodMap: Record<string, Food>; month: number }) {
  const lines = body.split('\n');
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (list.length) { out.push(<ul key={`u${out.length}`}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; }
    if (para.length) { out.push(<p key={`p${out.length}`}>{inline(para.join(''))}</p>); para = []; }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const block = line.trim().match(/^\{\{(.+)\}\}$/);
    if (block) {
      flush();
      const key = block[1].trim();
      if (key === 'protein20') out.push(<Protein20 key={`b${out.length}`} foodMap={foodMap} />);
      else if (key.startsWith('rank:')) out.push(<NutrientRank key={`b${out.length}`} k={key.slice(5) as NutrientKey} foods={foods} />);
      else if (key === 'monthly') out.push(<MonthlyBlock key={`b${out.length}`} month={month} />);
      else if (key === 'seasonal') out.push(<SeasonalTable key={`b${out.length}`} />);
      else if (key === 'recipes') out.push(<RecipesBlock key={`b${out.length}`} foodMap={foodMap} />);
      else out.push(<p key={`b${out.length}`}>［不明なブロック：{key}］</p>);
      continue;
    }
    if (line.startsWith('## ')) { flush(); out.push(<h2 key={`h${out.length}`}>{line.slice(3)}</h2>); continue; }
    if (line.startsWith('# ')) { flush(); out.push(<h2 key={`h${out.length}`}>{line.slice(2)}</h2>); continue; }
    if (line.startsWith('- ')) { if (para.length) { out.push(<p key={`p${out.length}`}>{inline(para.join(''))}</p>); para = []; } list.push(line.slice(2)); continue; }
    if (line.startsWith('> ')) { flush(); out.push(<div className="note" key={`n${out.length}`}>{inline(line.slice(2))}</div>); continue; }
    if (line.trim() === '') { flush(); continue; }
    if (list.length) { out.push(<ul key={`u${out.length}`}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; }
    para.push(line);
  }
  flush();
  return <>{out}</>;
}
