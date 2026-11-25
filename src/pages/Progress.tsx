import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Edit3, Plus, Trash2, TrendingUp } from 'lucide-react';
import type { Patient, ProgressRecord } from '../types';
import { uid, useStore } from '../store/store';
import { PatientPicker, useCurrentPatient, useNav } from '../components/nav';
import { Button, Card, Chips, EmptyState, Field, Modal, Notice, NumberInput, PageHeader, TextArea, TextInput, useConfirm, useToast } from '../components/ui';
import { calcBmi, fmt, round, todayStr } from '../lib/calc';
import { averageTotals, dayTotals } from '../lib/meal';
import { PatientSummary } from './Patients';

const FATIGUE = ['1 ほとんどない', '2 少し', '3 ふつう', '4 強い', '5 とても強い'];

function MiniChart({ title, data, unit, digits = 1, higherIsBetter }: { title: string; data: { date: string; v: number | null }[]; unit: string; digits?: number; higherIsBetter?: boolean }) {
  const pts = data.filter((d) => d.v != null) as { date: string; v: number }[];
  if (pts.length === 0) return null;
  const first = pts[0].v;
  const last = pts[pts.length - 1].v;
  const diff = round(last - first, digits);
  const vals = pts.map((p) => p.v);
  const pad = Math.max((Math.max(...vals) - Math.min(...vals)) * 0.3, digits === 0 ? 1 : 0.5);
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="num text-sm">
          <span className="text-[18px] font-bold">{fmt(last, digits)}</span><span className="text-muted"> {unit}</span>
          {pts.length > 1 && <span className={`ml-2 text-[12px] ${diff === 0 ? 'text-muted' : (diff > 0) === !!higherIsBetter ? 'text-emerald-700' : 'text-amber-700'}`}>初回比 {diff > 0 ? '+' : ''}{fmt(diff, digits)}</span>}
        </p>
      </div>
      <div className="mt-2 h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="#eef1ef" />
            <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5).replace('-', '/')} tick={{ fontSize: 11, fill: '#5b6863' }} axisLine={false} tickLine={false} />
            <YAxis domain={[Math.floor((Math.min(...vals) - pad) * 10) / 10, Math.ceil((Math.max(...vals) + pad) * 10) / 10]} tick={{ fontSize: 11, fill: '#5b6863' }} tickFormatter={(x: number) => fmt(x, digits)} axisLine={false} tickLine={false} width={48} />
            <ReferenceLine y={first} stroke="#a8b3ae" strokeDasharray="4 3" />
            <Tooltip formatter={(v) => [`${fmt(Number(v), digits)} ${unit}`, title]} labelFormatter={(l) => String(l)} />
            <Line type="monotone" dataKey="v" stroke="#214d3d" strokeWidth={2} dot={{ r: 4, fill: '#214d3d', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted">点線＝初回の値（{pts[0].date}）</p>
    </div>
  );
}

function blank(p: Patient, staff: string): ProgressRecord {
  return {
    id: uid('pr'), created_at: '', updated_at: '', patient_id: p.id, date: todayStr(), weight_kg: p.weight_kg, body_fat_pct: p.body_fat_pct, skeletal_muscle_kg: p.skeletal_muscle_kg,
    sleep_hours: p.sleep_hours, fatigue: null, meal_summary: '', intake_summary: '', habit_improvement: '', guidance_content: '', next_goal: '', next_check: '', staff,
  };
}

function RecordForm({ p, initial, onClose }: { p: Patient; initial: ProgressRecord; onClose: () => void }) {
  const { save, mealDays, foodMap, progress } = useStore();
  const toast = useToast();
  const [r, setR] = useState(initial);
  const [updatePatient, setUpdatePatient] = useState(true);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof ProgressRecord>(k: K, v: ProgressRecord[K]) => setR((x) => ({ ...x, [k]: v }));
  const errs: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) errs.push('日付を入力してください');
  if (r.weight_kg != null && (r.weight_kg < 15 || r.weight_kg > 250)) errs.push('体重は15〜250kg');
  if (r.body_fat_pct != null && (r.body_fat_pct < 2 || r.body_fat_pct > 70)) errs.push('体脂肪率は2〜70%');
  if (r.skeletal_muscle_kg != null && (r.skeletal_muscle_kg < 5 || r.skeletal_muscle_kg > 80)) errs.push('骨格筋量は5〜80kg');
  if (r.sleep_hours != null && (r.sleep_hours < 0 || r.sleep_hours > 16)) errs.push('睡眠時間は0〜16時間');

  const fillIntake = () => {
    const recent = mealDays.filter((d) => d.patient_id === p.id && d.date <= r.date).slice(0, 7);
    if (!recent.length) { toast('この日までの食事記録がありません', 'warn'); return; }
    const t = averageTotals(recent.map((d) => dayTotals(d, foodMap)));
    set('intake_summary', `食事記録${recent.length}日の平均：エネルギー ${fmt(t.values.energy)}kcal、たんぱく質 ${fmt(t.values.protein, 1)}g、カルシウム ${fmt(t.values.ca)}mg、鉄 ${fmt(t.values.fe, 1)}mg、食塩 ${fmt(t.values.salt, 1)}g`);
  };

  const submit = async () => {
    setTouched(true);
    if (errs.length) return;
    await save('progress', r, '経過記録を保存');
    if (updatePatient && (r.weight_kg != null || r.body_fat_pct != null || r.skeletal_muscle_kg != null)) {
      // 最新日付の記録のときだけ、患者情報の身体情報を更新する
      const newestOther = progress.filter((x) => x.patient_id === p.id && x.id !== r.id).reduce((m, x) => (x.date > m ? x.date : m), '');
      if (r.date >= newestOther) await save('patients', { ...p, weight_kg: r.weight_kg ?? p.weight_kg, body_fat_pct: r.body_fat_pct ?? p.body_fat_pct, skeletal_muscle_kg: r.skeletal_muscle_kg ?? p.skeletal_muscle_kg, sleep_hours: r.sleep_hours ?? p.sleep_hours });
    }
    toast('経過記録を保存しました');
    onClose();
  };

  return (
    <Modal open onClose={onClose} wide title={initial.created_at ? '経過記録の編集' : '経過記録を追加'} footer={<><Button onClick={onClose}>キャンセル</Button><Button variant="primary" onClick={submit}>保存する</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="記録日" required><TextInput type="date" value={r.date} max={todayStr()} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="担当"><TextInput value={r.staff} onChange={(e) => set('staff', e.target.value)} /></Field>
          <Field label="BMI（自動）"><div className="num flex h-11 items-center rounded-lg bg-stone-50 px-3">{fmt(calcBmi(p.height_cm, r.weight_kg), 1)}</div></Field>
          <Field label="体重"><NumberInput value={r.weight_kg} onChange={(v) => set('weight_kg', v)} unit="kg" /></Field>
          <Field label="体脂肪率"><NumberInput value={r.body_fat_pct} onChange={(v) => set('body_fat_pct', v)} unit="%" /></Field>
          <Field label="骨格筋量"><NumberInput value={r.skeletal_muscle_kg} onChange={(v) => set('skeletal_muscle_kg', v)} unit="kg" /></Field>
          <Field label="睡眠時間"><NumberInput value={r.sleep_hours} onChange={(v) => set('sleep_hours', v)} unit="時間" /></Field>
        </div>
        <Field label="疲労感"><Chips size="sm" options={FATIGUE} value={r.fatigue ? FATIGUE[r.fatigue - 1] : ''} onChange={(v) => set('fatigue', v ? Number(String(v)[0]) : null)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="食事内容（傾向）"><TextArea value={r.meal_summary} onChange={(e) => set('meal_summary', e.target.value)} /></Field>
          <Field label="栄養摂取量" hint={<button type="button" className="text-brand underline" onClick={fillIntake}>食事記録（直近7日まで）の平均を入れる</button>}><TextArea value={r.intake_summary} onChange={(e) => set('intake_summary', e.target.value)} /></Field>
          <Field label="食習慣の改善状況"><TextArea value={r.habit_improvement} onChange={(e) => set('habit_improvement', e.target.value)} /></Field>
          <Field label="栄養指導の内容"><TextArea value={r.guidance_content} onChange={(e) => set('guidance_content', e.target.value)} /></Field>
          <Field label="次回の目標"><TextArea value={r.next_goal} onChange={(e) => set('next_goal', e.target.value)} /></Field>
          <Field label="次回確認する項目"><TextArea value={r.next_check} onChange={(e) => set('next_check', e.target.value)} /></Field>
        </div>
        <Chips multi size="sm" options={['患者情報の体重・体組成もこの値に更新する']} value={updatePatient ? ['患者情報の体重・体組成もこの値に更新する'] : []} onChange={(v) => setUpdatePatient((v as string[]).length > 0)} />
        {touched && errs.length > 0 && <Notice tone="alert">{errs.join('／')}</Notice>}
      </div>
    </Modal>
  );
}

function ProgressBody({ p }: { p: Patient }) {
  const { progress, mealDays, foodMap, remove, staff } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<ProgressRecord | null>(null);
  const recs = progress.filter((r) => r.patient_id === p.id);
  const series = (f: (r: ProgressRecord) => number | null) => recs.map((r) => ({ date: r.date, v: f(r) }));
  const intake = useMemo(
    () => mealDays.filter((d) => d.patient_id === p.id).slice().sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({ date: d.date, t: dayTotals(d, foodMap) })),
    [mealDays, foodMap, p.id],
  );
  const first = recs[0];
  const last = recs[recs.length - 1];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-beige-50 px-4 py-3">
        <PatientSummary p={p} />
        <Button variant="primary" icon={<Plus size={17} />} onClick={() => setEditing(blank(p, staff))}>経過を記録</Button>
      </div>
      {recs.length === 0 ? <EmptyState icon={<TrendingUp size={32} />} title="経過記録はまだありません" action={<Button variant="primary" onClick={() => setEditing(blank(p, staff))}>最初の記録をつける</Button>}>初回の測定値を記録すると、次回から変化をグラフで確認できます。</EmptyState> : (
        <>
          {first && last && recs.length > 1 && (
            <Card title={`初回（${first.date}）と最新（${last.date}）の比較`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-2 font-medium">項目</th><th className="py-2 text-right font-medium">初回</th><th className="py-2 text-right font-medium">最新</th><th className="py-2 text-right font-medium">変化</th></tr></thead>
                  <tbody>
                    {([
                      ['体重', 'kg', (r: ProgressRecord) => r.weight_kg, 1],
                      ['BMI', '', (r: ProgressRecord) => calcBmi(p.height_cm, r.weight_kg), 1],
                      ['体脂肪率', '%', (r: ProgressRecord) => r.body_fat_pct, 1],
                      ['骨格筋量', 'kg', (r: ProgressRecord) => r.skeletal_muscle_kg, 1],
                      ['睡眠時間', '時間', (r: ProgressRecord) => r.sleep_hours, 1],
                      ['疲労感（1〜5）', '', (r: ProgressRecord) => r.fatigue, 0],
                    ] as [string, string, (r: ProgressRecord) => number | null, number][]).map(([label, unit, f, d]) => {
                      const a = f(first); const b = f(last);
                      const diff = a != null && b != null ? round(b - a, d) : null;
                      return <tr key={label} className="border-b border-line"><td className="py-2">{label}</td><td className="num py-2 text-right">{fmt(a, d)}{unit && ` ${unit}`}</td><td className="num py-2 text-right font-bold">{fmt(b, d)}{unit && ` ${unit}`}</td><td className="num py-2 text-right">{diff == null ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff, d)}`}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MiniChart title="体重" unit="kg" data={series((r) => r.weight_kg)} />
            <MiniChart title="BMI" unit="" data={series((r) => calcBmi(p.height_cm, r.weight_kg))} />
            <MiniChart title="体脂肪率" unit="%" data={series((r) => r.body_fat_pct)} />
            <MiniChart title="骨格筋量" unit="kg" data={series((r) => r.skeletal_muscle_kg)} higherIsBetter />
            <MiniChart title="睡眠時間" unit="時間" data={series((r) => r.sleep_hours)} higherIsBetter />
            <MiniChart title="疲労感（1〜5）" unit="" digits={0} data={series((r) => r.fatigue)} />
          </div>
          {intake.length > 0 && (
            <Card title="栄養摂取量の推移（食事記録から）" subtitle="記録日ごとの1日の合計">
              <div className="grid gap-3 md:grid-cols-2">
                <MiniChart title="エネルギー" unit="kcal" digits={0} data={intake.map((x) => ({ date: x.date, v: round(x.t.values.energy, 0) }))} />
                <MiniChart title="たんぱく質" unit="g" data={intake.map((x) => ({ date: x.date, v: round(x.t.values.protein, 1) }))} higherIsBetter />
              </div>
            </Card>
          )}
          <Card title="記録の一覧">
            <ul className="divide-y divide-line">
              {[...recs].reverse().map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-ink"><span className="num">{r.date}</span><span className="ml-2 text-sm font-normal text-muted">{r.staff}</span></p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" icon={<Edit3 size={15} />} onClick={() => setEditing(r)}>編集</Button>
                      <Button size="sm" variant="ghost" icon={<Trash2 size={15} />} onClick={async () => {
                        if (!(await confirm({ title: '経過記録を削除しますか？', message: `${r.date} の記録を削除します。`, ok: '削除する', danger: true }))) return;
                        await remove('progress', r.id, '経過記録を削除'); toast('削除しました');
                      }}>削除</Button>
                    </div>
                  </div>
                  <p className="num text-sm">体重 {fmt(r.weight_kg, 1)}kg・体脂肪率 {fmt(r.body_fat_pct, 1)}%・骨格筋量 {fmt(r.skeletal_muscle_kg, 1)}kg・睡眠 {fmt(r.sleep_hours, 1)}時間・疲労感 {r.fatigue ?? '—'}</p>
                  <dl className="mt-1 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                    {([['食事内容', r.meal_summary], ['栄養摂取量', r.intake_summary], ['改善状況', r.habit_improvement], ['指導内容', r.guidance_content], ['次回の目標', r.next_goal], ['次回確認', r.next_check]] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}><dt className="inline text-muted">{k}：</dt><dd className="inline">{v}</dd></div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      {editing && <RecordForm p={p} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function ProgressPage() {
  const p = useCurrentPatient();
  const { go } = useNav();
  return (
    <div>
      <PageHeader title="経過管理" icon={<TrendingUp size={26} />} subtitle="体重・体組成・睡眠・食習慣と指導内容を時系列で記録" actions={<PatientPicker />} />
      {!p ? <EmptyState title="患者を選択してください" action={<Button onClick={() => go('patients')}>患者管理へ</Button>} /> : <ProgressBody key={p.id} p={p} />}
    </div>
  );
}
