import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, FileText, Plus, Printer, RefreshCw, Save, Send, Trash2, X } from 'lucide-react';
import type { GuidanceDoc, NutrientKey, Patient, PurposeKey } from '../types';
import { uid, useDraft, useStore } from '../store/store';
import { PatientPicker, useCurrentPatient, useNav } from '../components/nav';
import { Badge, Button, Card, Chips, EmptyState, Field, Notice, NumberInput, PageHeader, Pill, Select, Tabs, TextArea, TextInput, useConfirm, useToast, cx } from '../components/ui';
import { PrintPreview } from '../components/PrintPreview';
import { PURPOSES, PURPOSE_MAP } from '../data/purposes';
import { DRI_DIGITS, NUTRIENT_MAP } from '../data/nutrients';
import { RECIPES } from '../data/seasonal';
import { analyzeAnswers } from '../data/questionnaire';
import { evaluateIntake, fmt, round, todayStr } from '../lib/calc';
import { averageTotals, dayTotals, nutrientsOf } from '../lib/meal';
import { computePlan, latestPlan, type PlanResult } from '../lib/plan';
import { PatientSummary } from './Patients';

const KEY_TARGETS: NutrientKey[] = ['energy', 'protein', 'fat', 'carb', 'ca', 'fe', 'vitD', 'vitC', 'fiber', 'salt'];

function PurposeGuide({ keys }: { keys: PurposeKey[] }) {
  const { foodMap } = useStore();
  if (!keys.length) return <p className="text-sm text-muted">指導目的を選んでください（複数可）。</p>;
  return (
    <div className="space-y-4">
      {keys.map((k) => {
        const d = PURPOSE_MAP[k];
        return (
          <Card key={k} title={d.label} subtitle={d.focus.join('・')}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-1 text-[13px] font-bold text-sage">指導のポイント（スタッフ向け）</p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">{d.points.map((x) => <li key={x}>{x}</li>)}</ul>
                {d.proteinPerKg && <p className="mt-2 rounded-lg bg-brand-50 p-2.5 text-[13px]"><strong>たんぱく質の院内目安：</strong>{d.proteinPerKg.label}<span className="block text-muted">{d.proteinPerKg.source}</span></p>}
                {d.caution && <Notice tone="warn" className="mt-2">{d.caution}</Notice>}
              </div>
              <div>
                <p className="mb-1 text-[13px] font-bold text-sage">患者さんに伝える具体策</p>
                <ul className="space-y-1 text-sm">{d.patientTips.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand" />{x}</li>)}</ul>
                <p className="mb-1 mt-3 text-[13px] font-bold text-sage">重点栄養素</p>
                <div className="flex flex-wrap gap-1">{d.nutrients.map((n) => <Pill key={n}>{NUTRIENT_MAP[n].name}</Pill>)}</div>
                <p className="mb-1 mt-3 text-[13px] font-bold text-sage">おすすめ食品（1食あたり）</p>
                <ul className="text-sm">
                  {d.foods.map((id) => foodMap[id]).filter(Boolean).map((f) => {
                    const n = nutrientsOf(f, f.serving.grams);
                    return <li key={f.id} className="flex justify-between gap-2 border-b border-line py-1"><span>{f.name}<span className="ml-1 text-[12px] text-muted">{f.serving.label}</span></span><span className="num text-[13px] text-muted">{d.nutrients.slice(0, 2).map((k2) => n[k2] != null ? `${NUTRIENT_MAP[k2].short}${fmt(n[k2], NUTRIENT_MAP[k2].digits)}${NUTRIENT_MAP[k2].unit}` : '').filter(Boolean).join('・')}</span></li>;
                  })}
                </ul>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/** 患者データから指導書の下書きを決定論的に作成（AIは使用しない） */
function buildDraft(p: Patient, purposes: PurposeKey[], plan: PlanResult | null, ctx: ReturnType<typeof useGuidanceContext>, staff: string): GuidanceDoc {
  const { avg, nDays, latestQ, foodMap, planId } = ctx;
  const low: NutrientKey[] = [];
  const good: NutrientKey[] = [];
  if (avg && plan) {
    for (const k of ['protein', 'ca', 'fe', 'vitD', 'vitC', 'fiber', 'vitB1', 'zn', 'mg', 'k'] as NutrientKey[]) {
      const t = plan.targets[k];
      if (!t || avg.missing[k] > 0) continue;
      const st = k === 'protein' && t.final ? { tone: avg.values.protein >= t.final ? 'good' : 'warn' } : evaluateIntake(k, avg.values[k], t.dri, t.override);
      if (st.tone === 'warn' || st.tone === 'alert') low.push(k);
      else if (st.tone === 'good') good.push(k);
    }
    if (plan.targets.salt.final && avg.values.salt >= plan.targets.salt.final) low.push('salt');
  }
  const purposeNutrients = purposes.flatMap((k) => PURPOSE_MAP[k].nutrients);
  const priorityNutrients = [...low].sort((a, b) => Number(purposeNutrients.includes(b)) - Number(purposeNutrients.includes(a))).slice(0, 3);
  const qSug = latestQ ? analyzeAnswers(latestQ.answers).suggestions : [];

  const tendency: string[] = [];
  if (nDays > 0) {
    tendency.push(`食事記録（${nDays}日分）をみると、${good.length ? `${good.slice(0, 3).map((k) => NUTRIENT_MAP[k].name).join('・')}はよくとれています。` : ''}${low.length ? `${low.filter((k) => k !== 'salt').slice(0, 4).map((k) => NUTRIENT_MAP[k].name).join('・')}が目標に届いていません。` : ''}${low.includes('salt') ? '食塩はやや多めです。' : ''}`);
  } else tendency.push('食事記録がまだないため、問診の内容から傾向をまとめています。');
  if (latestQ?.answers.breakfast && latestQ.answers.breakfast !== '毎日食べる') tendency.push(`朝食は「${latestQ.answers.breakfast}」とのことでした。`);
  if (latestQ?.free_text) tendency.push(`（お話より）${latestQ.free_text}`);
  if (nDays > 0 && nDays < 3) tendency.push('※記録が少ないため、あくまで目安です。');

  const priorities: string[] = [];
  priorityNutrients.forEach((k) => priorities.push(k === 'salt' ? '食塩を控える（汁物・麺の汁・調味料の量を見直す）' : `${NUTRIENT_MAP[k].name}を増やす`));
  qSug.filter((s) => !s.nutrients.some((n) => priorityNutrients.includes(n))).slice(0, Math.max(0, 3 - priorities.length)).forEach((s) => priorities.push(s.title));
  if (!priorities.length && purposes.length) priorities.push(...PURPOSE_MAP[purposes[0]].focus.slice(0, 2));

  // おすすめ食品：重点栄養素を1食で多く含むもの（目的の推奨食品を優先）
  const pool = [...new Set(purposes.flatMap((k) => PURPOSE_MAP[k].foods))].map((id) => foodMap[id]).filter(Boolean);
  const focus = priorityNutrients.filter((k) => k !== 'salt');
  const scored = pool
    .map((f) => ({ f, s: focus.reduce((sum, k) => { const t = plan?.targets[k]?.final; const v = f.per100[k]; return sum + (t && v ? ((v * f.serving.grams) / 100) / t : 0); }, 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5);
  const foods = scored.map(({ f }) => ({ food_id: f.id, grams: f.serving.grams, note: f.serving.label }));

  const recipeIdx = RECIPES.filter((r) => purposes.some((k) => r.purpose.includes(PURPOSE_MAP[k].short) || r.purpose.includes(PURPOSE_MAP[k].label))).slice(0, 2);
  const menu = [
    ...purposes.flatMap((k) => PURPOSE_MAP[k].patientTips.slice(0, 2)),
    ...recipeIdx.map((r) => `おすすめ：${r.title}（${r.point}）`),
  ];
  const nextGoals = priorities.slice(0, 2).map((x) => `${x}（次回までに、できた日をメモしてみましょう）`);

  return {
    id: uid('g'), created_at: '', updated_at: '', patient_id: p.id, date: todayStr(), staff, purposes, plan_id: planId,
    targets_text: plan?.energyTarget ? '下の表は、今の体格と活動量から計算した1日の目安です。毎日ぴったりでなくて大丈夫。1〜2週間の平均で近づけていきましょう。' : '',
    current_tendency: tendency.join('\n'),
    priorities: priorities.map((x) => `- ${x}`).join('\n'),
    foods,
    menu: [...new Set(menu)].map((x) => `- ${x}`).join('\n'),
    next_goals: nextGoals.map((x) => `- ${x}`).join('\n'),
    closing: '食事は、体を修理するための材料です。一度に全部を変えなくて大丈夫。できることから一つずつ、一緒に進めていきましょう。',
    status: 'draft',
  };
}

function useGuidanceContext(p: Patient) {
  const { mealDays, foodMap, questionnaires, plans } = useStore();
  const days = mealDays.filter((d) => d.patient_id === p.id).slice(0, 7);
  const avg = days.length ? averageTotals(days.map((d) => dayTotals(d, foodMap))) : null;
  return { avg, nDays: days.length, latestQ: questionnaires.find((q) => q.patient_id === p.id) ?? null, foodMap, planId: plans.find((x) => x.patient_id === p.id)?.id ?? null };
}

function Lines({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim());
  const items = lines.filter((l) => l.startsWith('- '));
  if (items.length === lines.length && items.length) return <ul>{items.map((l, i) => <li key={i}>{l.slice(2)}</li>)}</ul>;
  return <>{lines.map((l, i) => <p key={i}>{l.replace(/^- /, '・')}</p>)}</>;
}

function GuidanceSheet({ doc, p, plan }: { doc: GuidanceDoc; p: Patient; plan: PlanResult | null }) {
  const { foodMap, settings } = useStore();
  return (
    <>
      <h1>栄養指導書</h1>
      <div className="meta">
        <span><strong style={{ color: '#1d2925', fontSize: '12pt' }}>{p.name.replace(/（架空）/, '')} 様</strong></span>
        <span>指導日：{doc.date.replace(/-/g, '/')}</span>
        <span>担当：{doc.staff}</span>
      </div>
      <h2>指導の目的</h2>
      <p>{doc.purposes.map((k) => PURPOSE_MAP[k].label).join('、') || '—'}{p.purpose_note ? `（${p.purpose_note}）` : ''}</p>
      <h2>1日の目標栄養摂取量</h2>
      {doc.targets_text && <p>{doc.targets_text}</p>}
      {plan && (
        <table>
          <thead><tr><th>栄養素</th><th>1日の目標</th><th>栄養素</th><th>1日の目標</th></tr></thead>
          <tbody>
            {Array.from({ length: Math.ceil(KEY_TARGETS.length / 2) }).map((_, i) => {
              const pair = KEY_TARGETS.slice(i * 2, i * 2 + 2);
              return (
                <tr key={i}>
                  {pair.map((k) => {
                    const v = plan.targets[k]?.final;
                    const n = NUTRIENT_MAP[k];
                    return <React.Fragment key={k}><td>{n.name}</td><td className="r">{v != null ? `${k === 'salt' ? '' : '約'}${fmt(v, DRI_DIGITS[k])}${n.unit}${k === 'salt' ? '未満' : ''}` : '—'}</td></React.Fragment>;
                  })}
                  {pair.length < 2 && <><td /><td /></>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <h2>現在の食事の傾向</h2>
      <Lines text={doc.current_tendency} />
      <h2>優先して改善したいポイント</h2>
      <Lines text={doc.priorities} />
      <h2>おすすめの食品と量の目安</h2>
      <table>
        <thead><tr><th>食品</th><th>量の目安</th><th>とれる栄養（目安）</th></tr></thead>
        <tbody>
          {doc.foods.map((x, i) => {
            const f = foodMap[x.food_id];
            if (!f) return null;
            const n = nutrientsOf(f, x.grams);
            const show = (['protein', 'ca', 'fe', 'vitD', 'vitC', 'fiber'] as NutrientKey[]).filter((k) => n[k] != null && (n[k] as number) > 0).slice(0, 3);
            return <tr key={i}><td>{f.name}</td><td>{x.note || `${x.grams}g`}（{x.grams}g）</td><td>{show.map((k) => `${NUTRIENT_MAP[k].name} ${fmt(n[k], NUTRIENT_MAP[k].digits)}${NUTRIENT_MAP[k].unit}`).join('、')}</td></tr>;
          })}
        </tbody>
      </table>
      <h2>食事・献立の提案</h2>
      <Lines text={doc.menu} />
      <h2>次回までの目標</h2>
      <Lines text={doc.next_goals} />
      {doc.closing && <div className="note">{doc.closing}</div>}
      <div className="foot"><span>{settings.clinic_name}{settings.clinic_address && `　${settings.clinic_address}`}</span><span>担当：{doc.staff}</span></div>
      <p style={{ fontSize: '8pt', color: '#5b6863', marginTop: '2mm' }}>この指導書は一般的な栄養指導のためのものです。治療中の病気がある方は、主治医の指示を優先してください。食品の栄養量は日本食品標準成分表を参考にした目安です。</p>
    </>
  );
}

function GuidanceEditor({ p, initial, onClose }: { p: Patient; initial: GuidanceDoc; onClose: () => void }) {
  const { save, foods, foodMap, plans, staff } = useStore();
  const toast = useToast();
  const [d, setD, clearDraft] = useDraft<GuidanceDoc>(`guidance:${initial.id}`, () => initial);
  const [checked, setChecked] = useState(initial.status === 'confirmed');
  const [preview, setPreview] = useState(false);
  const plan = useMemo(() => computePlan(p, plans.find((x) => x.id === d.plan_id) ?? latestPlan(plans, p, staff)), [p, plans, d.plan_id, staff]);
  const set = <K extends keyof GuidanceDoc>(k: K, v: GuidanceDoc[K]) => { setD((x) => ({ ...x, [k]: v, status: 'draft' })); setChecked(false); };

  const doSave = async (confirmIt: boolean) => {
    const out = { ...d, status: confirmIt ? 'confirmed' : 'draft' } as GuidanceDoc;
    await save('guidance_docs', out, confirmIt ? '指導書を確認済みで保存' : '指導書を下書き保存');
    setD(out);
    toast(confirmIt ? '確認済みとして保存しました' : '下書きを保存しました');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-ink">個別栄養指導書</h2><Badge tone={d.status === 'confirmed' ? 'good' : 'info'}>{d.status === 'confirmed' ? '確認済み' : '下書き'}</Badge></div>
        <Button variant="ghost" icon={<X size={16} />} onClick={() => { clearDraft(); onClose(); }}>閉じる</Button>
      </div>
      <Notice tone="info">下書きは、患者情報・栄養目標・問診・食事分析から自動で作成しています（定型ルールによる作成で、AIは使用していません）。必ずスタッフが内容を確認・編集してください。</Notice>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="指導日"><TextInput type="date" value={d.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="担当スタッフ"><TextInput value={d.staff} onChange={(e) => set('staff', e.target.value)} /></Field>
        <Field label="指導目的"><Chips multi size="sm" options={PURPOSES.map((x) => x.short)} value={d.purposes.map((k) => PURPOSE_MAP[k].short)} onChange={(v) => set('purposes', (v as string[]).map((s) => PURPOSES.find((x) => x.short === s)!.key))} /></Field>
      </div>
      <Card title="1日の目標栄養摂取量" subtitle={plan?.energyTarget ? `栄養計算の結果を使用（エネルギー ${fmt(plan.energyTarget)}kcal）` : '栄養計算で目標を保存すると表示されます'}>
        <TextArea value={d.targets_text} onChange={(e) => set('targets_text', e.target.value)} placeholder="表の上に添える説明" />
        {plan && <div className="mt-2 flex flex-wrap gap-2 text-sm">{KEY_TARGETS.map((k) => <Pill key={k}>{NUTRIENT_MAP[k].name} {fmt(plan.targets[k]?.final, DRI_DIGITS[k])}{NUTRIENT_MAP[k].unit}{k === 'salt' ? '未満' : ''}</Pill>)}</div>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="現在の食事の傾向"><TextArea value={d.current_tendency} onChange={(e) => set('current_tendency', e.target.value)} className="min-h-[130px]" /></Field>
        <Field label="優先して改善したいポイント" hint="「- 」で始めると箇条書き"><TextArea value={d.priorities} onChange={(e) => set('priorities', e.target.value)} className="min-h-[130px]" /></Field>
      </div>
      <Card title="おすすめの食品と具体的な摂取量">
        <ul className="space-y-2">
          {d.foods.map((x, i) => {
            const f = foodMap[x.food_id];
            return (
              <li key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_120px_minmax(0,1fr)_auto]">
                <Select value={x.food_id} onChange={(e) => set('foods', d.foods.map((y, j) => (j === i ? { ...y, food_id: e.target.value, grams: foodMap[e.target.value]?.serving.grams ?? 100, note: foodMap[e.target.value]?.serving.label ?? '' } : y)))} aria-label="食品">
                  {foods.map((fd) => <option key={fd.id} value={fd.id}>{fd.name}（{fd.state}）</option>)}
                </Select>
                <NumberInput value={x.grams} onChange={(v) => set('foods', d.foods.map((y, j) => (j === i ? { ...y, grams: v ?? 0 } : y)))} unit="g" aria-label="量" />
                <TextInput value={x.note} onChange={(e) => set('foods', d.foods.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} placeholder={f ? `例：${f.serving.label}` : ''} aria-label="量の目安（表示用）" />
                <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-rose-700 hover:bg-rose-50" aria-label="削除" onClick={() => set('foods', d.foods.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
              </li>
            );
          })}
        </ul>
        <Button size="sm" variant="ghost" className="mt-2" icon={<Plus size={15} />} onClick={() => set('foods', [...d.foods, { food_id: 'f-egg-raw', grams: 50, note: '1個' }])}>食品を追加</Button>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="食事・献立の提案"><TextArea value={d.menu} onChange={(e) => set('menu', e.target.value)} className="min-h-[130px]" /></Field>
        <Field label="次回までの目標"><TextArea value={d.next_goals} onChange={(e) => set('next_goals', e.target.value)} className="min-h-[130px]" /></Field>
      </div>
      <Field label="ひとこと（指導書の最後に表示）"><TextArea value={d.closing} onChange={(e) => set('closing', e.target.value)} /></Field>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-beige-50 p-3">
        <Chips multi size="sm" options={['内容を確認しました（患者さんに渡せる内容です）']} value={checked ? ['内容を確認しました（患者さんに渡せる内容です）'] : []} onChange={(v) => setChecked((v as string[]).length > 0)} />
        <div className="flex flex-wrap gap-2">
          <Button icon={<Save size={16} />} onClick={() => doSave(false)}>下書き保存</Button>
          <Button variant="primary" icon={<CheckCircle2 size={16} />} disabled={!checked} onClick={() => doSave(true)}>確認済みで保存</Button>
          <Button icon={<Printer size={16} />} disabled={d.status !== 'confirmed'} onClick={() => setPreview(true)} title={d.status !== 'confirmed' ? '確認済みで保存すると印刷できます' : undefined}>A4プレビュー・印刷</Button>
        </div>
      </div>
      {d.status !== 'confirmed' && <p className="text-right text-[13px] text-muted">A4印刷・PDF保存は「確認済みで保存」した後に使えます。</p>}
      <PrintPreview
        open={preview}
        onClose={() => setPreview(false)}
        title={`栄養指導書_${p.name.replace(/（架空）/, '')}_${d.date}`}
        extra={<Button icon={<Send size={16} />} onClick={async () => { await save('distributions', { id: uid('d'), created_at: '', updated_at: '', kind: 'guidance', ref_id: d.id, patient_id: p.id, date: todayStr(), staff, note: '個別栄養指導書' }, '指導書の配布を記録'); toast('配布履歴に記録しました'); }}>配布を記録</Button>}
      >
        <GuidanceSheet doc={d} p={p} plan={plan} />
      </PrintPreview>
    </div>
  );
}

function GuidanceBody({ p }: { p: Patient }) {
  const { guidanceDocs, plans, staff, remove } = useStore();
  const { sub } = useNav();
  const confirm = useConfirm();
  const toast = useToast();
  const ctx = useGuidanceContext(p);
  const [tab, setTab] = useState<'doc' | 'purpose' | 'ai'>('doc');
  const [purposes, setPurposes] = useState<PurposeKey[]>(p.purposes);
  const docs = guidanceDocs.filter((x) => x.patient_id === p.id);
  const [editing, setEditing] = useDraft<GuidanceDoc | null>(`guidance-open:${p.id}`, () => (sub ? docs.find((x) => x.id === sub) ?? null : null));
  React.useEffect(() => { if (sub) { const x = docs.find((y) => y.id === sub); if (x) setEditing(x); } }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps
  const plan = useMemo(() => computePlan(p, latestPlan(plans, p, staff)), [p, plans, staff]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-beige-50 px-4 py-3"><PatientSummary p={p} /></div>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'doc', label: '個別栄養指導書', count: docs.length }, { key: 'purpose', label: '目的別の指導ポイント' }, { key: 'ai', label: 'AI栄養アシスタント（将来）' }]} />
      {tab === 'purpose' && (
        <>
          <Card title="指導目的（複数選択）"><Chips multi size="sm" options={PURPOSES.map((x) => x.label)} value={purposes.map((k) => PURPOSE_MAP[k].label)} onChange={(v) => setPurposes((v as string[]).map((l) => PURPOSES.find((x) => x.label === l)!.key))} /></Card>
          <PurposeGuide keys={purposes} />
        </>
      )}
      {tab === 'ai' && (
        <Card title="AI栄養アシスタント" icon={<Bot size={18} />} subtitle="将来の実装予定（現在は使用できません）">
          <Notice tone="muted" className="mb-3">この機能は未実装です。栄養計算は決定論的なプログラムで行い、AIは説明文や提案の下書きを支援する役割にとどめる設計です。AIの生成内容はスタッフの確認を必須とし、氏名など個人を識別できる情報はAIに送らない方針です。</Notice>
          <div className="grid gap-2 sm:grid-cols-2">
            {['食事改善案', '献立提案', '苦手な食品の代替案', '補食提案', '患者さんへの説明文', '栄養指導記録の文章作成', '個別栄養指導書の下書き'].map((x) => (
              <div key={x} className="flex items-center justify-between rounded-xl border border-dashed border-sage-200 px-3 py-2.5 text-sm text-muted">{x}<Badge tone="muted" icon={false}>未実装</Badge></div>
            ))}
          </div>
        </Card>
      )}
      {tab === 'doc' && (
        editing ? <GuidanceEditor p={p} initial={editing} onClose={() => setEditing(null)} /> : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card title="指導書を作成" subtitle="患者情報・栄養目標・問診・食事分析から下書きを作り、スタッフが確認・編集してから印刷します">
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-2">{plans.some((x) => x.patient_id === p.id) ? <Badge tone="good">栄養目標あり</Badge> : <Badge tone="warn">栄養目標が未保存（既定値を使用）</Badge>}</p>
                <p className="flex items-center gap-2">{ctx.latestQ ? <Badge tone="good">問診 {ctx.latestQ.date}</Badge> : <Badge tone="warn">問診なし</Badge>}</p>
                <p className="flex items-center gap-2">{ctx.nDays ? <Badge tone={ctx.nDays >= 3 ? 'good' : 'info'}>食事記録 {ctx.nDays}日分</Badge> : <Badge tone="warn">食事記録なし</Badge>}</p>
                <p className="flex items-center gap-2"><Badge tone={p.purposes.length ? 'good' : 'warn'}>目的 {p.purposes.map((k) => PURPOSE_MAP[k].short).join('・') || '未設定'}</Badge></p>
              </div>
              <Button variant="primary" className="mt-4" icon={<RefreshCw size={17} />} onClick={() => setEditing(buildDraft(p, p.purposes, plan, ctx, staff))}>下書きを作成する</Button>
            </Card>
            <Card title="作成した指導書">
              {docs.length === 0 ? <p className="text-sm text-muted">まだありません</p> : (
                <ul className="space-y-1">
                  {docs.map((x) => (
                    <li key={x.id} className="flex items-center gap-1">
                      <button type="button" onClick={() => setEditing(x)} className={cx('flex h-11 flex-1 items-center justify-between rounded-lg px-3 text-left hover:bg-stone-50')}>
                        <span className="num">{x.date}</span><Badge tone={x.status === 'confirmed' ? 'good' : 'info'}>{x.status === 'confirmed' ? '確認済み' : '下書き'}</Badge>
                      </button>
                      <button type="button" className="grid h-10 w-10 place-items-center rounded-lg text-rose-700 hover:bg-rose-50" aria-label="削除" onClick={async () => {
                        if (!(await confirm({ title: '指導書を削除しますか？', message: `${x.date} の指導書を削除します。`, ok: '削除する', danger: true }))) return;
                        await remove('guidance_docs', x.id, '指導書を削除'); toast('削除しました');
                      }}><Trash2 size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )
      )}
    </div>
  );
}

export default function GuidancePage() {
  const p = useCurrentPatient();
  const { go } = useNav();
  return (
    <div>
      <PageHeader title="個別栄養指導" icon={<FileText size={26} />} subtitle="目的別の指導ポイントと、患者さん向けの栄養指導書（A4）" actions={<PatientPicker />} />
      {!p ? <EmptyState title="患者を選択してください" action={<Button onClick={() => go('patients')}>患者管理へ</Button>} /> : <GuidanceBody key={p.id} p={p} />}
    </div>
  );
}

void round;
