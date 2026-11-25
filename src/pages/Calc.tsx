import React, { useMemo, useState } from 'react';
import { BookMarked, Calculator, History, RotateCcw, Save } from 'lucide-react';
import type { NutrientKey, NutritionPlan, Patient } from '../types';
import { uid, useDraft, useStore } from '../store/store';
import { PatientPicker, useCurrentPatient, useNav } from '../components/nav';
import { Badge, Button, Card, Chips, EmptyState, Field, Notice, NumberInput, PageHeader, Pill, Select, Stat, TextArea, TextInput, useToast, cx } from '../components/ui';
import { ACTIVITY_HINT, ACTIVITY_LABEL, AGE_GROUP_LABEL, DRI, DRI_ENERGY_SOURCE, DRI_SOURCE, DRI_URL, INDICATOR_HELP, NIHN_SOURCE, pfcGoalRange } from '../data/dri2025';
import { DRI_DIGITS, NUTRIENTS, NUTRIENT_MAP } from '../data/nutrients';
import { checkPfc, fmt, todayStr } from '../lib/calc';
import { computePlan, defaultPlan } from '../lib/plan';
import { PatientSummary } from './Patients';

function v(x: number | null | undefined, digits: number) {
  return x == null ? <span className="text-stone-300">—</span> : <span className="num">{fmt(x, digits)}</span>;
}

function DgCell({ k, min, max }: { k: NutrientKey; min: number | null; max: number | null }) {
  if (min == null && max == null) return <span className="text-stone-300">—</span>;
  const d = DRI_DIGITS[k];
  if (max != null) return <span className="num">{fmt(max, d)}未満</span>;
  return <span className="num">{fmt(min, d)}以上</span>;
}

function CalcBody({ p }: { p: Patient }) {
  const { plans, save, staff } = useStore();
  const { sub } = useNav();
  const toast = useToast();
  const saved = plans.filter((x) => x.patient_id === p.id);
  const start = (sub && saved.find((x) => x.id === sub)) || saved[0] || defaultPlan(p, staff, uid('pl'));
  const [plan, setPlan, clear] = useDraft<NutritionPlan>(`plan:${p.id}`, () => start);
  const [showAdj, setShowAdj] = useState(false);
  const r = useMemo(() => computePlan(p, plan), [p, plan]);
  const set = <K extends keyof NutritionPlan>(k: K, val: NutritionPlan[K]) => setPlan((x) => ({ ...x, [k]: val }));
  if (!r) return <Notice tone="warn">生年月日が未入力のため計算できません。患者情報を編集してください。</Notice>;
  const age = r.age;
  const pfcCheck = checkPfc(plan.pfc, age);
  const range = pfcGoalRange(age);
  const isChild = age < 18;

  const savePlan = async () => {
    if (!pfcCheck.ok) { toast('PFCバランスを確認してください', 'warn'); return; }
    if (plan.energy_source === 'manual' && (plan.energy_manual == null || plan.energy_manual < 500 || plan.energy_manual > 6000)) { toast('目標エネルギーは500〜6000kcalで入力してください', 'warn'); return; }
    // 日付を変えた場合は新しい記録として保存（履歴を上書きしない）
    const existing = saved.find((x) => x.id === plan.id);
    const id = plan.id.startsWith('plan-default') || (existing && existing.date !== plan.date) ? uid('pl') : plan.id;
    const snapshot = {
      age, weight_kg: p.weight_kg, height_cm: p.height_cm, bmr: r.bmrUsed, energy: r.energyTarget,
      targets: Object.fromEntries(Object.values(r.targets).map((t) => [t.key, t.final])) as Record<NutrientKey, number | null>,
    };
    const out = { ...plan, id, date: plan.date || todayStr(), staff: plan.staff || staff, snapshot };
    await save('plans', out, '栄養目標を保存');
    setPlan(out);
    toast('栄養目標を保存しました（食事分析・指導書で使われます）');
  };

  const adj = (k: NutrientKey) => plan.adjustments[k];
  const setAdj = (k: NutrientKey, value: number | null, note?: string) =>
    setPlan((x) => {
      const next = { ...x.adjustments };
      if (value == null && !(note ?? next[k]?.note)) delete next[k];
      else next[k] = { value, note: note ?? next[k]?.note ?? '' };
      return { ...x, adjustments: next };
    });

  const micro = NUTRIENTS.filter((n) => n.group === 'ビタミン' || n.group === 'ミネラル・その他');

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-beige-50 px-4 py-3"><PatientSummary p={p} /></div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* 条件 */}
        <div className="space-y-4">
          <Card title="計算の条件" subtitle={`${AGE_GROUP_LABEL[r.energy.group ?? '18-29'] ?? ''}・${p.sex === 'male' ? '男性' : '女性'}の基準を使用`}>
            <div className="space-y-4">
              <Field label="身体活動レベル" hint={ACTIVITY_HINT[plan.activity_level]}>
                <Chips size="sm" options={['低い', 'ふつう', '高い']} value={ACTIVITY_LABEL[plan.activity_level]} onChange={(val) => set('activity_level', val === '低い' ? 'low' : val === '高い' ? 'high' : 'moderate')} />
              </Field>
              <Field label="基礎代謝量の推定方法">
                <Select value={plan.bmr_method} onChange={(e) => set('bmr_method', e.target.value as NutritionPlan['bmr_method'])}>
                  <option value="dri">基礎代謝基準値 × 体重（食事摂取基準）</option>
                  <option value="nihn" disabled={isChild}>国立健康・栄養研究所の式（18歳以上）{isChild ? '※対象外' : ''}</option>
                </Select>
              </Field>
              <Field label="目標エネルギーの決め方">
                <Select value={plan.energy_source} onChange={(e) => set('energy_source', e.target.value as NutritionPlan['energy_source'])}>
                  <option value="individual">個人の推定値（実測の体重から計算）</option>
                  <option value="reference">食事摂取基準の参照値（参照体位）</option>
                  <option value="manual">スタッフが手入力（院内目標）</option>
                </Select>
              </Field>
              {plan.energy_source === 'manual' && (
                <Field label="目標エネルギー（院内目標）" hint="500〜6000kcal"><NumberInput value={plan.energy_manual} onChange={(val) => set('energy_manual', val)} unit="kcal" /></Field>
              )}
            </div>
          </Card>

          <Card title="PFCバランス（%エネルギー）" subtitle={`目標量：たんぱく質 ${range.p.min}〜${range.p.max}%／脂質 ${range.f.min}〜${range.f.max}%／炭水化物 ${range.c.min}〜${range.c.max}%`}>
            <div className="grid grid-cols-3 gap-3">
              {(['p', 'f', 'c'] as const).map((k) => (
                <Field key={k} label={k === 'p' ? 'たんぱく質' : k === 'f' ? '脂質' : '炭水化物'}>
                  <NumberInput value={plan.pfc[k]} onChange={(val) => set('pfc', { ...plan.pfc, [k]: val ?? 0 })} unit="%" />
                </Field>
              ))}
            </div>
            {!pfcCheck.ok ? <div className="mt-3 space-y-1">{pfcCheck.messages.map((m) => <p key={m} className="text-[13px] text-rose-700">{m}</p>)}</div> : <p className="mt-3 text-[13px] text-emerald-700">目標量の範囲内です（合計100%）</p>}
            <Button size="sm" variant="ghost" className="mt-2" icon={<RotateCcw size={14} />} onClick={() => set('pfc', defaultPlan(p, staff, plan.id).pfc)}>初期値に戻す</Button>
          </Card>

          <Card title="たんぱく質の院内目標（任意）" subtitle="体重あたりの院内目標。食事摂取基準（g/日）とは区別して扱います">
            <Field label="体重あたり" hint={p.weight_kg ? `体重 ${p.weight_kg}kg × ${plan.protein_per_kg ?? '—'} = ${r.proteinPerKgTarget ?? '—'} g/日` : '体重が未入力です'}>
              <NumberInput value={plan.protein_per_kg} onChange={(val) => set('protein_per_kg', val)} unit="g/kg" placeholder="空欄＝使わない" />
            </Field>
            {r.proteinClinic && (
              <div className="mt-3 rounded-lg bg-beige-50 p-3 text-[13px] leading-relaxed">
                <p className="font-bold text-ink">参考（{r.proteinClinic.purpose}）：{r.proteinClinic.label}</p>
                <p className="mt-1 text-muted">出典：{r.proteinClinic.source}</p>
              </div>
            )}
            {/腎/.test(p.medical_history + p.medications) && <Notice tone="warn" className="mt-3">既往歴・服用薬に腎臓に関する記載があります。たんぱく質を増やす前に主治医の指示を確認してください。</Notice>}
          </Card>

          <Card title="記録">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="計算日"><TextInput type="date" value={plan.date} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="担当"><TextInput value={plan.staff} onChange={(e) => set('staff', e.target.value)} /></Field>
              </div>
              <Field label="メモ"><TextArea value={plan.memo} onChange={(e) => set('memo', e.target.value)} placeholder="目標設定の理由など" /></Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" icon={<Save size={17} />} onClick={savePlan}>栄養目標を保存</Button>
                <Button icon={<RotateCcw size={16} />} onClick={() => { clear(); setPlan(defaultPlan(p, staff, uid('pl'))); }}>リセット</Button>
              </div>
            </div>
          </Card>

          {saved.length > 0 && (
            <Card title="保存した栄養目標" icon={<History size={17} />}>
              <ul className="space-y-1">
                {saved.map((x) => (
                  <li key={x.id}>
                    <button type="button" onClick={() => setPlan(x)} className={cx('flex h-11 w-full items-center justify-between rounded-lg px-3 text-left', plan.id === x.id ? 'bg-brand-50 font-bold text-brand' : 'hover:bg-stone-50')}>
                      <span className="num">{x.date}</span><span className="text-sm text-muted">{x.snapshot?.energy ? `${fmt(x.snapshot.energy)}kcal` : ''}　{x.staff}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* 結果 */}
        <div className="space-y-5">
          <Card title="基本項目">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="BMI" value={fmt(r.bmi, 1)} sub={<Badge tone={r.bmiEval.tone}>{r.bmiEval.label}</Badge>} />
              <Stat label={`推定基礎代謝量（${plan.bmr_method === 'nihn' && !isChild ? '研究所の式' : '基準値×体重'}）`} value={fmt(r.bmrUsed)} unit="kcal/日" />
              <Stat label="身体活動レベル" value={r.energy.pal != null ? fmt(r.energy.pal, 2) : '—'} sub={ACTIVITY_LABEL[plan.activity_level]} />
              <Stat label="目標エネルギー" value={fmt(r.energyTarget)} unit="kcal/日" sub={plan.energy_source === 'manual' ? <Badge tone="info">院内目標</Badge> : plan.energy_source === 'reference' ? '参照値' : '個人の推定値'} />
            </div>
            <p className="mt-3 text-[13px] text-muted">{r.bmiEval.note}</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 font-medium">推定方法</th><th className="py-2 text-right font-medium">基礎代謝量</th><th className="py-2 text-right font-medium">推定エネルギー必要量</th></tr></thead>
                <tbody>
                  <tr className="border-b border-line"><td className="py-2">基礎代謝基準値（{fmt(r.energy.bmrStandard, 1)}kcal/kg）× 体重{isChild ? ' ＋ エネルギー蓄積量' : ''}</td><td className="num py-2 text-right">{fmt(r.energy.bmrDri)} kcal</td><td className="num py-2 text-right">{fmt(r.energy.eerDri)} kcal{isChild && <span className="block text-[12px] text-muted">蓄積量 {r.energy.storage}kcal を含む</span>}</td></tr>
                  <tr className="border-b border-line"><td className="py-2">国立健康・栄養研究所の式{isChild && <span className="ml-1 text-[12px] text-muted">（18歳未満は使用しない）</span>}</td><td className="num py-2 text-right">{isChild ? '—' : `${fmt(r.energy.bmrNihn)} kcal`}</td><td className="num py-2 text-right">{isChild ? '—' : `${fmt(r.energy.eerNihn)} kcal`}</td></tr>
                  <tr><td className="py-2">食事摂取基準の参照値（参照体位・{AGE_GROUP_LABEL[r.energy.group ?? '18-29']}）</td><td className="py-2 text-right text-muted">—</td><td className="num py-2 text-right">{fmt(r.energy.eerReference)} kcal</td></tr>
                </tbody>
              </table>
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-muted">{r.energy.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            {r.energyWarnings.map((w) => <Notice key={w} tone="warn" className="mt-3">{w}</Notice>)}
          </Card>

          <Card title="三大栄養素（PFCバランス）">
            {r.macros ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-line text-left text-muted"><th className="py-2 font-medium">栄養素</th><th className="py-2 text-right font-medium">設定比率</th><th className="py-2 text-right font-medium">目標量（g/日）</th><th className="py-2 text-right font-medium">食事摂取基準の目標量の範囲</th><th className="py-2 text-right font-medium">推奨量</th></tr></thead>
                  <tbody>
                    <tr className="border-b border-line"><td className="py-2">たんぱく質</td><td className="num py-2 text-right">{plan.pfc.p}%</td><td className="num py-2 text-right font-bold">{r.macros.protein.target} g</td><td className="num py-2 text-right">{r.macros.protein.min}〜{r.macros.protein.max} g（{range.p.min}〜{range.p.max}%）</td><td className="num py-2 text-right">{fmt(r.targets.protein.dri?.rda)} g</td></tr>
                    <tr className="border-b border-line"><td className="py-2">脂質</td><td className="num py-2 text-right">{plan.pfc.f}%</td><td className="num py-2 text-right font-bold">{r.macros.fat.target} g</td><td className="num py-2 text-right">{r.macros.fat.min}〜{r.macros.fat.max} g（20〜30%）</td><td className="py-2 text-right text-stone-300">—</td></tr>
                    <tr><td className="py-2">炭水化物</td><td className="num py-2 text-right">{plan.pfc.c}%</td><td className="num py-2 text-right font-bold">{r.macros.carb.target} g</td><td className="num py-2 text-right">{r.macros.carb.min}〜{r.macros.carb.max} g（50〜65%）</td><td className="py-2 text-right text-stone-300">—</td></tr>
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted">目標エネルギーが決まると表示されます。</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line p-3"><p className="text-[13px] text-muted">たんぱく質 推定平均必要量</p><p className="num text-xl font-bold">{fmt(r.targets.protein.dri?.ear)} g</p><p className="text-[12px] text-muted">食事摂取基準（g/日・体重換算しない）</p></div>
              <div className="rounded-xl border border-line p-3"><p className="text-[13px] text-muted">たんぱく質 推奨量</p><p className="num text-xl font-bold">{fmt(r.targets.protein.dri?.rda)} g</p><p className="text-[12px] text-muted">食事摂取基準（g/日）</p></div>
              <div className="rounded-xl border border-sage-200 bg-brand-50 p-3"><p className="text-[13px] text-muted">たんぱく質 院内目標</p><p className="num text-xl font-bold text-brand">{r.proteinPerKgTarget != null ? `${r.proteinPerKgTarget} g` : '—'}</p><p className="text-[12px] text-muted">{plan.protein_per_kg ? `${plan.protein_per_kg} g/kg × 体重` : '未設定'}</p></div>
            </div>
          </Card>

          <Card
            title="ビタミン・ミネラル・その他"
            subtitle={`日本人の食事摂取基準（2025年版）・${AGE_GROUP_LABEL[r.energy.group ?? '18-29']}・${p.sex === 'male' ? '男性' : '女性'}${p.sex === 'female' && p.menstruation === 'yes' ? '（月経あり）' : ''}`}
            actions={<Button size="sm" variant={showAdj ? 'primary' : 'secondary'} onClick={() => setShowAdj((s) => !s)}>{showAdj ? '院内目標の編集を閉じる' : '院内目標を調整'}</Button>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[13px] text-muted">
                    <th className="py-2 font-medium">栄養素</th>
                    <th className="py-2 text-right font-medium" title={INDICATOR_HELP.ear}>推定平均必要量</th>
                    <th className="py-2 text-right font-medium" title={INDICATOR_HELP.rda}>推奨量</th>
                    <th className="py-2 text-right font-medium" title={INDICATOR_HELP.ai}>目安量</th>
                    <th className="py-2 text-right font-medium" title={INDICATOR_HELP.dg}>目標量</th>
                    <th className="py-2 text-right font-medium" title={INDICATOR_HELP.ul}>耐容上限量</th>
                    <th className="py-2 pl-3 font-medium">院内目標</th>
                  </tr>
                </thead>
                <tbody>
                  {micro.map((n) => {
                    const t = r.targets[n.key];
                    const e = t?.dri;
                    const def = DRI[n.key];
                    return (
                      <tr key={n.key} className="border-b border-line align-top">
                        <td className="py-2">
                          <span className="font-medium text-ink">{n.name}</span>
                          <span className="ml-1 text-[12px] text-muted">{n.unit}{n.key === 'salt' ? '' : '/日'}</span>
                        </td>
                        <td className="py-2 text-right">{v(e?.ear, DRI_DIGITS[n.key])}</td>
                        <td className="py-2 text-right">{e?.rda != null ? <span className="num font-bold">{fmt(e.rda, DRI_DIGITS[n.key])}</span> : v(null, 0)}</td>
                        <td className="py-2 text-right">{v(e?.ai, DRI_DIGITS[n.key])}</td>
                        <td className="py-2 text-right"><DgCell k={n.key} min={e?.dgMin ?? null} max={e?.dgMax ?? null} /></td>
                        <td className="py-2 text-right">
                          {e?.ul != null ? <span className="num">{fmt(e.ul, DRI_DIGITS[n.key])}</span> : n.key === 'mg' && age >= 18 ? <span className="num text-[12px]">350※</span> : v(null, 0)}
                          {def?.ulScope && def.ulScope !== 'food' && (e?.ul != null || n.key === 'mg') && <span className="block text-[11px] text-muted">{def.ulScope === 'retinol' ? 'レチノールのみ' : '食品以外'}</span>}
                        </td>
                        <td className="py-2 pl-3">
                          {showAdj ? (
                            <div className="flex min-w-[220px] flex-col gap-1">
                              <NumberInput value={adj(n.key)?.value ?? null} onChange={(val) => setAdj(n.key, val)} unit={n.unit} placeholder="空欄＝基準どおり" />
                              <TextInput value={adj(n.key)?.note ?? ''} onChange={(ev) => setAdj(n.key, adj(n.key)?.value ?? null, ev.target.value)} placeholder="調整の理由" className="h-9 text-sm" />
                            </div>
                          ) : t?.override != null ? (
                            <div><Badge tone="info" icon={false}>{fmt(t.override, n.digits)}{n.unit}</Badge>{t.overrideNote && <span className="block text-[12px] text-muted">{t.overrideNote}</span>}</div>
                          ) : <span className="text-[12px] text-stone-400">基準どおり</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid gap-2 text-[12px] leading-relaxed text-muted sm:grid-cols-2">
              <p><strong className="text-ink">推定平均必要量</strong>：{INDICATOR_HELP.ear}</p>
              <p><strong className="text-ink">推奨量</strong>：{INDICATOR_HELP.rda}</p>
              <p><strong className="text-ink">目安量</strong>：{INDICATOR_HELP.ai}</p>
              <p><strong className="text-ink">目標量</strong>：{INDICATOR_HELP.dg}</p>
              <p><strong className="text-ink">耐容上限量</strong>：{INDICATOR_HELP.ul}</p>
              <p>※マグネシウムの耐容上限量（成人350mg/日）は通常の食品以外からの摂取が対象。ビタミン・ミネラルは体重換算していません。</p>
            </div>
          </Card>

          <Card title="計算式と出典" icon={<BookMarked size={17} />}>
            <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
              <li><strong className="text-ink">推定エネルギー必要量</strong>＝基礎代謝量（kcal/日）×身体活動レベル（18歳未満はエネルギー蓄積量を加算）</li>
              <li><strong className="text-ink">基礎代謝量（食事摂取基準）</strong>＝基礎代謝基準値（kcal/kg体重/日）×体重（kg）　出典：{DRI_ENERGY_SOURCE}</li>
              <li><strong className="text-ink">国立健康・栄養研究所の式</strong>＝（0.0481×体重kg＋0.0234×身長cm−0.0138×年齢−定数［男性0.4235・女性0.9708］）×1000÷4.186　出典：{NIHN_SOURCE}</li>
              <li><strong className="text-ink">PFC（g）</strong>＝目標エネルギー×比率÷4（たんぱく質・炭水化物）または÷9（脂質）</li>
              <li><strong className="text-ink">ビタミン・ミネラル等の基準値</strong>：{DRI_SOURCE}（<a className="text-brand underline" href={DRI_URL} target="_blank" rel="noreferrer">厚生労働省のページ</a>）</li>
              <li><strong className="text-ink">BMIの判定</strong>：日本肥満学会の判定基準、目標とするBMIは食事摂取基準（18歳以上のみ）</li>
              <li>院内目標（青色の値）は、スタッフが調整した院内独自の指導目標で、食事摂取基準の値とは区別して表示・保存しています。</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CalcPage() {
  const p = useCurrentPatient();
  const { go } = useNav();
  return (
    <div>
      <PageHeader title="栄養計算" icon={<Calculator size={26} />} subtitle="日本人の食事摂取基準（2025年版）に基づく目標設定" actions={<PatientPicker />} />
      {!p ? <EmptyState title="患者を選択してください" action={<Button onClick={() => go('patients')}>患者管理へ</Button>} /> : <CalcBody key={p.id} p={p} />}
      <div className="mt-6 flex flex-wrap gap-1 text-[12px] text-muted"><Pill>決定論的な計算</Pill><Pill>AIは使用していません</Pill></div>
    </div>
  );
}
