import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarPlus, Edit3, PackagePlus, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react';
import type { Food, MealDay, MealItem, MealType, NutrientKey, Patient } from '../types';
import { uid, useStore } from '../store/store';
import { PatientPicker, useCurrentPatient, useNav } from '../components/nav';
import { Badge, Button, Card, Chips, EmptyState, Field, Modal, Notice, NumberInput, PageHeader, Pill, Select, TextInput, useConfirm, useToast, cx } from '../components/ui';
import { FoodEditor, newFood } from '../components/FoodEditor';
import { FOOD_CATEGORIES } from '../data/foods';
import { NUTRIENTS, NUTRIENT_MAP } from '../data/nutrients';
import { evaluateIntake, fmt, round, todayStr, type Tone } from '../lib/calc';
import { MEAL_LABEL, MEAL_TYPES, averageTotals, dayTotals, nutrientsOf, pfcRatio, sumItems, type Totals } from '../lib/meal';
import { computePlan, latestPlan, type PlanResult } from '../lib/plan';
import { PatientSummary } from './Patients';

const PFC_COLORS = { p: '#1f8a5e', f: '#d9822b', c: '#3f74c4' };
const TONE_BAR: Record<Tone, string> = { good: '#2b604c', info: '#5b86b0', warn: '#c8892b', alert: '#b83b3b', muted: '#a8b3ae' };

export function foodMatches(f: Food, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return [f.name, f.kana, f.category, f.state].some((x) => x.toLowerCase().includes(s));
}

/** 食品検索＋分量入力 */
export function FoodPickerModal({ open, onClose, onPick, initial }: {
  open: boolean; onClose: () => void; onPick: (item: { food: Food; amount: number; unit: string; grams: number; memo: string; meal?: MealType }) => void;
  initial?: { item: MealItem; food: Food } | null;
}) {
  const { foods } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [food, setFood] = useState<Food | null>(initial?.food ?? null);
  const [unit, setUnit] = useState(initial?.item.unit ?? 'g');
  const [amount, setAmount] = useState<number | null>(initial?.item.amount ?? 100);
  const [memo, setMemo] = useState(initial?.item.memo ?? '');
  const [meal, setMeal] = useState<MealType>(initial?.item.meal ?? 'breakfast');
  const [editorOpen, setEditorOpen] = useState(false);
  const blankFood = useMemo(newFood, [editorOpen]);
  const isEdit = !!initial?.item.id;
  React.useEffect(() => {
    if (!open) return;
    setFood(initial?.food ?? null); setUnit(initial?.item.unit ?? 'g'); setAmount(initial?.item.amount ?? 100); setMemo(initial?.item.memo ?? ''); setQ(''); setCat('');
    if (initial) setMeal(initial.item.meal);
  }, [open, initial]);
  const results = useMemo(() => foods.filter((f) => (!cat || f.category === cat) && foodMatches(f, q)).slice(0, 80), [foods, q, cat]);
  const u = food?.units.find((x) => x.unit === unit);
  const grams = food && u && amount != null ? round(u.grams * amount, 1) : null;
  const preview = food && grams ? nutrientsOf(food, grams) : null;
  const invalid = amount == null || amount <= 0 || amount > 5000;

  const choose = (f: Food) => {
    setFood(f);
    const su = f.units.find((x) => x.unit !== 'g' && x.unit !== 'ml');
    if (su) { setUnit(su.unit); setAmount(1); } else { setUnit('g'); setAmount(100); }
  };

  return (
    <>
      <Modal
        open={open && !editorOpen}
        onClose={onClose}
        wide
        title={isEdit ? '食品の編集' : '食品を追加'}
        footer={food ? (
          <>
            <Button onClick={() => setFood(null)}>食品を選び直す</Button>
            <Button variant="primary" disabled={invalid || grams == null} onClick={() => { if (food && grams != null && amount != null) { onPick({ food, amount, unit, grams, memo, meal }); } }}>{isEdit ? '更新する' : '追加する'}</Button>
          </>
        ) : undefined}
      >
        {!food ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="食品名・よみ（例：たまご、鮭、ごはん）" className="pl-10" aria-label="食品検索" />
              </div>
              <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto" aria-label="カテゴリー">
                <option value="">すべてのカテゴリー</option>
                {FOOD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <ul className="max-h-[52vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" onClick={() => choose(f)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-brand-50">
                    <span className="min-w-0">
                      <span className="font-medium text-ink">{f.name}</span>
                      <span className="ml-2 text-[13px] text-muted">{f.state}・{f.category}</span>
                      {f.source !== 'mext8' && <Pill className="ml-2">{f.source === 'product' ? '院内商品' : '手動登録'}</Pill>}
                    </span>
                    <span className="num shrink-0 text-[13px] text-muted">{fmt(f.per100.energy)}kcal・P{fmt(f.per100.protein, 1)}g /100g</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">見つかりません。下のボタンから手動登録できます。</li>}
            </ul>
            <Button size="sm" icon={<PackagePlus size={16} />} onClick={() => setEditorOpen(true)}>市販食品・院内商品を手動登録</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-beige-50 p-3">
              <p className="font-bold text-ink">{food.name}<span className="ml-2 text-sm font-normal text-muted">{food.state}・{food.category}</span></p>
              {!food.verified && <p className="mt-1 text-[12px] text-amber-800">試作用データ（公式値と未照合）</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="食事区分"><Select value={meal} onChange={(e) => setMeal(e.target.value as MealType)}>{MEAL_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}</Select></Field>
              <Field label="量" error={invalid ? '0より大きい値を入力してください' : null}><NumberInput value={amount} onChange={setAmount} invalid={invalid} /></Field>
              <Field label="単位"><Select value={unit} onChange={(e) => setUnit(e.target.value)}>{food.units.map((x) => <option key={x.unit} value={x.unit}>{x.unit}{x.unit !== 'g' ? `（${x.grams}g）` : ''}</option>)}</Select></Field>
            </div>
            <div className="rounded-xl border border-line p-3 text-sm">
              <p><span className="text-muted">換算：</span><span className="num font-bold">{amount ?? '—'} {unit} ＝ {grams ?? '—'} g</span></p>
              <p className="mt-0.5 text-[13px] text-muted">換算根拠：{u?.basis ?? '—'}</p>
            </div>
            {preview && (
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {(['energy', 'protein', 'fat', 'carb', 'ca', 'fe', 'vitC', 'salt'] as NutrientKey[]).map((k) => (
                  <div key={k} className="rounded-lg bg-stone-50 px-3 py-2">
                    <p className="text-[12px] text-muted">{NUTRIENT_MAP[k].name}</p>
                    <p className="num font-bold">{preview[k] == null ? <span className="text-[13px] font-normal text-amber-800">未確認</span> : `${fmt(preview[k], NUTRIENT_MAP[k].digits)}${NUTRIENT_MAP[k].unit}`}</p>
                  </div>
                ))}
              </div>
            )}
            <Field label="メモ"><TextInput value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="料理名・調理法など" /></Field>
          </div>
        )}
      </Modal>
      <FoodEditor open={editorOpen} initial={blankFood} onClose={() => setEditorOpen(false)} onSaved={(f) => choose(f)} />
    </>
  );
}

function statusOf(k: NutrientKey, t: Totals, plan: PlanResult | null) {
  const target = plan?.targets[k];
  const v = t.values[k];
  if (k === 'energy' || k === 'fat' || k === 'carb') {
    const tgt = target?.final ?? null;
    if (!tgt) return { label: '目標未設定', tone: 'muted' as Tone, pct: null as number | null, target: null as number | null };
    const pct = round((v / tgt) * 100, 0);
    const tone: Tone = pct < 80 ? 'warn' : pct > 120 ? 'warn' : 'good';
    return { label: pct < 80 ? '目標より少ない' : pct > 120 ? '目標より多い' : '目標付近', tone, pct, target: tgt };
  }
  if (k === 'protein' && target?.final && target.final !== target.dri?.rda) {
    const pct = round((v / target.final) * 100, 0);
    return { label: pct >= 100 ? '院内目標以上' : '院内目標未満', tone: (pct >= 100 ? 'good' : 'warn') as Tone, pct, target: target.final };
  }
  const st = evaluateIntake(k, v, target?.dri ?? null, target?.override ?? null);
  return { ...st, target: target?.final ?? null };
}

export function ComparisonTable({ totals, plan, days }: { totals: Totals; plan: PlanResult | null; days: number }) {
  const rows = NUTRIENTS.filter((n) => n.key !== 'na');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[13px] text-muted">
            <th className="py-2 font-medium">栄養素</th><th className="py-2 text-right font-medium">摂取量{days > 1 ? '（平均）' : ''}</th><th className="py-2 text-right font-medium">比較する目標</th><th className="py-2 text-right font-medium">割合</th><th className="py-2 pl-3 font-medium">判定</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((n) => {
            const st = statusOf(n.key, totals, plan);
            const miss = totals.missing[n.key];
            const basis = plan?.targets[n.key];
            const basisLabel = basis?.override != null ? '院内目標' : n.key === 'protein' && basis?.final !== basis?.dri?.rda ? '院内目標' : basis?.primary.basis === 'rda' ? '推奨量' : basis?.primary.basis === 'ai' ? '目安量' : basis?.primary.basis === 'dg' ? '目標量' : n.key === 'energy' || n.key === 'fat' || n.key === 'carb' ? '目標' : '';
            const held = miss > 0 && !st.label.includes('耐容上限量');
            return (
              <tr key={n.key} className="border-b border-line align-top">
                <td className="whitespace-nowrap py-2 pr-2">{n.name}</td>
                <td className="num whitespace-nowrap py-2 text-right">
                  {fmt(totals.values[n.key], n.digits)}<span className="ml-0.5 text-[12px] text-muted">{n.unit}</span>
                  {miss > 0 && <span className="block text-[11px] text-amber-800">未確認 {miss}品目{days > 1 ? '（延べ）' : ''}</span>}
                </td>
                <td className="num whitespace-nowrap py-2 text-right">{st.target != null ? <>{fmt(st.target, n.digits)}{n.key === 'salt' ? '未満' : ''}<span className="block text-[11px] text-muted">{basisLabel}</span></> : '—'}</td>
                <td className="num whitespace-nowrap py-2 text-right">{st.pct != null ? `${st.pct}%` : '—'}</td>
                <td className="py-2 pl-3">
                  <Badge tone={held ? 'muted' : st.tone}>{held ? '判定保留' : st.label}</Badge>
                  {held && <span className="mt-0.5 block text-[11px] text-muted">未確認の値があるため参考（{st.label}）</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">「目安量未満」は不足とは判断できません（目安量は十分な根拠がなく推奨量を決められない栄養素の基準）。「判定保留」は、食品データに未確認の値があり集計が不完全な栄養素です。</p>
    </div>
  );
}

export function AchievementChart({ totals, plan }: { totals: Totals; plan: PlanResult | null }) {
  const data = NUTRIENTS.filter((n) => n.key !== 'na').map((n) => {
    const st = statusOf(n.key, totals, plan);
    const held = totals.missing[n.key] > 0;
    return { name: n.short, pct: st.pct == null ? 0 : Math.min(st.pct, 200), raw: st.pct, tone: held ? ('muted' as Tone) : st.tone, label: held ? '判定保留・未確認値あり' : st.label, key: n.key };
  }).filter((d) => d.raw != null);
  if (!data.length) return <p className="text-sm text-muted">栄養目標を保存すると、達成率のグラフが表示されます。</p>;
  return (
    <div style={{ height: Math.max(320, data.length * 26 + 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 22, right: 24, bottom: 8, left: 8 }} barCategoryGap={4}>
          <CartesianGrid horizontal={false} stroke="#eef1ef" />
          <XAxis type="number" domain={[0, 200]} ticks={[0, 50, 100, 150, 200]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: '#5b6863' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 12, fill: '#1d2925' }} axisLine={false} tickLine={false} />
          <ReferenceLine x={100} stroke="#214d3d" strokeDasharray="4 3" label={{ value: '目標100%', position: 'top', fontSize: 11, fill: '#214d3d' }} />
          <Tooltip
            cursor={{ fill: 'rgba(33,77,61,0.06)' }}
            formatter={(_v, _n, item) => [`${(item.payload as { raw: number }).raw}%（${(item.payload as { label: string }).label}）`, '目標に対する割合']}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((d) => <Cell key={d.key} fill={TONE_BAR[d.tone]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PfcPie({ totals, target }: { totals: Totals; target?: { p: number; f: number; c: number } }) {
  const r = pfcRatio(totals);
  if (!r) return <p className="text-sm text-muted">記録がありません</p>;
  const data = [
    { name: 'たんぱく質', value: r.p, color: PFC_COLORS.p, g: totals.values.protein, t: target?.p },
    { name: '脂質', value: r.f, color: PFC_COLORS.f, g: totals.values.fat, t: target?.f },
    { name: '炭水化物', value: r.c, color: PFC_COLORS.c, g: totals.values.carb, t: target?.c },
  ];
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} stroke="#fff" strokeWidth={2} startAngle={90} endAngle={-270} label={({ value }) => `${value}%`} labelLine={false}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v}%`, n as string]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-1.5 font-medium">区分</th><th className="py-1.5 text-right font-medium">摂取</th><th className="py-1.5 text-right font-medium">比率</th><th className="py-1.5 text-right font-medium">目標比率</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.name} className="border-b border-line">
              <td className="py-1.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: d.color }} />{d.name}</td>
              <td className="num py-1.5 text-right">{fmt(d.g, 1)} g</td>
              <td className="num py-1.5 text-right font-bold">{d.value}%</td>
              <td className="num py-1.5 text-right text-muted">{d.t != null ? `${d.t}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[12px] text-muted sm:col-span-2">比率は たんぱく質×4・脂質×9・炭水化物×4 kcal の割合で計算した簡易値です。</p>
    </div>
  );
}

function MealsBody({ p }: { p: Patient }) {
  const { mealDays, foodMap, save, remove, plans, staff } = useStore();
  const { sub } = useNav();
  const toast = useToast();
  const confirm = useConfirm();
  const days = mealDays.filter((d) => d.patient_id === p.id);
  const [date, setDate] = useState<string>(sub && /^\d{4}-/.test(sub) ? sub : days[0]?.date ?? todayStr());
  const [picker, setPicker] = useState<{ meal: MealType; edit?: MealItem } | null>(null);
  const [view, setView] = useState<'day' | 'avg'>('day');
  const [avgSel, setAvgSel] = useState<string[]>(() => days.slice(0, 7).map((d) => d.date));
  const day: MealDay = days.find((d) => d.date === date) ?? { id: `${p.id}_${date}`, created_at: '', updated_at: '', patient_id: p.id, date, items: [], note: '' };
  const plan = useMemo(() => computePlan(p, latestPlan(plans, p, staff)), [p, plans, staff]);
  const hasSavedPlan = plans.some((x) => x.patient_id === p.id);
  const totals = useMemo(() => dayTotals(day, foodMap), [day, foodMap]);
  const avgDays = days.filter((d) => avgSel.includes(d.date));
  const avg = useMemo(() => averageTotals(avgDays.map((d) => dayTotals(d, foodMap))), [avgDays, foodMap]);
  const shown = view === 'day' ? totals : avg;
  const nDays = view === 'day' ? 1 : avgDays.length;
  const latest = plans.find((x) => x.patient_id === p.id);

  const persist = async (items: MealItem[], log: string) => {
    if (!items.length && day.created_at) {
      await remove('meal_days', day.id, '食事記録を削除');
      return;
    }
    await save('meal_days', { ...day, items }, log);
  };

  const onPick = async ({ food, amount, unit, grams, memo, meal }: { food: Food; amount: number; unit: string; grams: number; memo: string; meal?: MealType }) => {
    const m = meal ?? picker?.meal ?? 'breakfast';
    if (picker?.edit) {
      await persist(day.items.map((i) => (i.id === picker.edit!.id ? { ...i, meal: m, food_id: food.id, amount, unit, grams, memo } : i)), '食事記録を編集');
      toast('更新しました');
    } else {
      await persist([...day.items, { id: uid('mi'), meal: m, food_id: food.id, amount, unit, grams, memo }], '食事記録に追加');
      toast(`${food.name}を${MEAL_LABEL[m]}に追加しました`);
    }
    setPicker(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-beige-50 px-4 py-3"><PatientSummary p={p} /></div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="記録日"><TextInput type="date" value={date} max={todayStr()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-1.5 pb-1">
          {days.slice(0, 10).map((d) => (
            <button key={d.id} type="button" onClick={() => setDate(d.date)} className={cx('h-9 rounded-full border px-3 text-sm num', d.date === date ? 'border-brand bg-brand text-white' : 'border-sage-200 bg-white hover:bg-brand-50')}>{d.date.slice(5).replace('-', '/')}</button>
          ))}
          {!days.some((d) => d.date === todayStr()) && <Button size="sm" variant="ghost" icon={<CalendarPlus size={15} />} onClick={() => setDate(todayStr())}>今日</Button>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {MEAL_TYPES.map((m) => {
            const items = day.items.filter((i) => i.meal === m.key);
            const t = sumItems(items, foodMap);
            if (!items.length && (m.key === 'pre_ex' || m.key === 'post_ex') && !p.is_student && !/運動|部活|ジム|トレ/.test(p.exercise_habit)) {
              return null;
            }
            return (
              <Card
                key={m.key}
                title={<>{m.label}{items.length > 0 && <span className="num ml-2 text-sm font-normal text-muted">{fmt(t.values.energy)}kcal・たんぱく質{fmt(t.values.protein, 1)}g</span>}</>}
                actions={<Button size="sm" icon={<Plus size={15} />} onClick={() => setPicker({ meal: m.key })}>食品を追加</Button>}
              >
                {items.length === 0 ? <p className="text-sm text-stone-400">記録なし</p> : (
                  <ul className="divide-y divide-line">
                    {items.map((i) => {
                      const f = foodMap[i.food_id];
                      const n = f ? nutrientsOf(f, i.grams) : null;
                      const u = f?.units.find((x) => x.unit === i.unit);
                      return (
                        <li key={i.id} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <p className="text-[15px] text-ink">{f ? f.name : <span className="text-rose-700">（削除された食品）</span>}<span className="ml-1 text-[12px] text-muted">{f?.state}</span>{f && !f.verified && <span className="ml-1 text-[11px] text-amber-700">試作値</span>}</p>
                            <p className="num text-[13px] text-muted" title={u?.basis}>{i.amount}{i.unit !== 'g' ? i.unit : 'g'}{i.unit !== 'g' && `＝${i.grams}g`}　{n ? `${fmt(n.energy)}kcal・P${fmt(n.protein, 1)}g` : ''}{i.memo && `　${i.memo}`}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-brand-50" aria-label="編集" onClick={() => setPicker({ meal: i.meal, edit: i })}><Edit3 size={16} /></button>
                            <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-rose-700 hover:bg-rose-50" aria-label="削除" onClick={async () => {
                              if (!(await confirm({ title: '食品を削除しますか？', message: `${f?.name ?? 'この食品'}（${i.grams}g）を記録から削除します。`, ok: '削除', danger: true }))) return;
                              await persist(day.items.filter((x) => x.id !== i.id), '食事記録から削除');
                            }}><Trash2 size={16} /></button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card
            title="栄養量の集計"
            actions={<Chips size="sm" options={['この日', '複数日の平均']} value={view === 'day' ? 'この日' : '複数日の平均'} onChange={(v) => setView(v === 'この日' ? 'day' : 'avg')} />}
          >
            {view === 'avg' && (
              <div className="mb-3">
                <p className="mb-1.5 text-sm text-muted">平均に含める日（{avgDays.length}日）</p>
                <Chips multi size="sm" options={days.map((d) => d.date)} value={avgSel} onChange={(v) => setAvgSel(v as string[])} />
              </div>
            )}
            {!hasSavedPlan && <Notice tone="info" className="mb-3">栄養目標が未保存のため、食事摂取基準の既定値で比較しています。「栄養計算」で目標を保存すると、院内目標で比較できます。</Notice>}
            {latest && <p className="mb-2 text-[13px] text-muted">比較に使う栄養目標：{latest.date}（{latest.staff}）</p>}
            <Notice tone="warn" className="mb-3">
              {nDays < 3 ? `${nDays}日分の記録です。` : `${nDays}日分の平均です。`}食事摂取基準は「習慣的な摂取量」の基準です。単日の記録だけで栄養不足と判断せず、複数日（できれば1〜2週間程度）の平均や問診とあわせて評価してください。
            </Notice>
            {shown.itemCount === 0 ? <EmptyState title="記録がありません" /> : <ComparisonTable totals={shown} plan={plan} days={nDays} />}
          </Card>
          {shown.itemCount > 0 && (
            <>
              <Card title="目標に対する割合" subtitle="100%が目標（院内目標→推奨量→目安量→目標量の順で比較）。200%以上は200%で表示">
                <AchievementChart totals={shown} plan={plan} />
              </Card>
              <Card title="PFCバランス">
                <PfcPie totals={shown} target={latest?.pfc} />
              </Card>
              {view === 'day' && (
                <Card title="食事ごとの栄養量">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-1.5 font-medium">区分</th>{(['energy', 'protein', 'fat', 'carb', 'ca', 'fe', 'salt'] as NutrientKey[]).map((k) => <th key={k} className="py-1.5 text-right font-medium">{NUTRIENT_MAP[k].short}</th>)}</tr></thead>
                      <tbody>
                        {MEAL_TYPES.map((m) => {
                          const its = day.items.filter((i) => i.meal === m.key);
                          if (!its.length) return null;
                          const t = sumItems(its, foodMap);
                          return <tr key={m.key} className="border-b border-line"><td className="py-1.5">{m.label}</td>{(['energy', 'protein', 'fat', 'carb', 'ca', 'fe', 'salt'] as NutrientKey[]).map((k) => <td key={k} className="num py-1.5 text-right">{fmt(t.values[k], NUTRIENT_MAP[k].digits)}</td>)}</tr>;
                        })}
                        <tr className="font-bold"><td className="py-1.5">合計</td>{(['energy', 'protein', 'fat', 'carb', 'ca', 'fe', 'salt'] as NutrientKey[]).map((k) => <td key={k} className="num py-1.5 text-right">{fmt(totals.values[k], NUTRIENT_MAP[k].digits)}</td>)}</tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
      <FoodPickerModal
        open={!!picker}
        onClose={() => setPicker(null)}
        onPick={onPick}
        initial={picker?.edit && foodMap[picker.edit.food_id] ? { item: picker.edit, food: foodMap[picker.edit.food_id] } : picker ? { item: { id: '', meal: picker.meal, food_id: '', amount: 100, unit: 'g', grams: 100, memo: '' }, food: null as unknown as Food } : null}
      />
    </div>
  );
}

export default function MealsPage() {
  const p = useCurrentPatient();
  const { go } = useNav();
  return (
    <div>
      <PageHeader title="食事分析" icon={<UtensilsCrossed size={26} />} subtitle="日本食品標準成分表（八訂）を基本とした食品データベースで集計" actions={<PatientPicker />} />
      {!p ? <EmptyState title="患者を選択してください" action={<Button onClick={() => go('patients')}>患者管理へ</Button>} /> : <MealsBody key={p.id} p={p} />}
    </div>
  );
}
