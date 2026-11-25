import React, { useMemo, useState } from 'react';
import { ArrowLeft, Calculator, ClipboardList, Edit3, FileText, Plus, Search, Trash2, TrendingUp, UserPlus, Users, UtensilsCrossed } from 'lucide-react';
import type { Patient } from '../types';
import { nextPatientNo, uid, useDraft, useStore } from '../store/store';
import { useNav } from '../components/nav';
import {
  Badge, Button, Card, Chips, DemoBadge, EmptyState, Field, NumberInput, PageHeader, Pill, Select, Stat, Tabs, TextArea, TextInput, useConfirm, useToast,
} from '../components/ui';
import { calcAge, calcBmi, evaluateBmi, fmt, todayStr } from '../lib/calc';
import { PURPOSES, PURPOSE_MAP } from '../data/purposes';
import { ACTIVITY_HINT, ACTIVITY_LABEL } from '../data/dri2025';
import { MEAL_LABEL } from '../lib/meal';

const emptyPatient = (no: string): Patient => ({
  id: uid('pt'), created_at: '', updated_at: '', patient_no: no, name: '', name_kana: '', birth_date: '', sex: 'female', height_cm: null, weight_kg: null,
  body_fat_pct: null, skeletal_muscle_kg: null, occupation: '', activity_level: 'moderate', exercise_habit: '', sleep_hours: null, medical_history: '', medications: '',
  allergies: '', visit_status: '通院中', purposes: [], purpose_note: '', staff_memo: '', menstruation: 'unknown', is_student: false,
  student: { sport: '', practice_frequency: '', practice_hours: null, injury: '', growth: '', snacking: '' }, guidance_active: true,
});

type Errors = Partial<Record<string, string>>;

export function validatePatient(p: Patient, all: Patient[]): Errors {
  const e: Errors = {};
  if (!p.patient_no.trim()) e.patient_no = '患者番号を入力してください';
  else if (all.some((x) => x.id !== p.id && x.patient_no === p.patient_no.trim())) e.patient_no = 'この患者番号はすでに使われています';
  if (!p.name.trim()) e.name = '氏名を入力してください';
  if (!p.birth_date) e.birth_date = '生年月日を入力してください';
  else {
    const age = calcAge(p.birth_date);
    if (age == null) e.birth_date = '日付が正しくありません';
    else if (p.birth_date > todayStr()) e.birth_date = '未来の日付です';
    else if (age > 110) e.birth_date = '年齢が110歳を超えています。日付を確認してください';
  }
  const range = (k: keyof Patient, v: number | null, min: number, max: number, label: string) => {
    if (v != null && (v < min || v > max)) e[k as string] = `${label}は${min}〜${max}の範囲で入力してください`;
  };
  range('height_cm', p.height_cm, 80, 230, '身長');
  range('weight_kg', p.weight_kg, 15, 250, '体重');
  range('body_fat_pct', p.body_fat_pct, 2, 70, '体脂肪率');
  range('skeletal_muscle_kg', p.skeletal_muscle_kg, 5, 80, '骨格筋量');
  range('sleep_hours', p.sleep_hours, 0, 16, '睡眠時間');
  if (p.is_student && p.student.practice_hours != null && (p.student.practice_hours < 0 || p.student.practice_hours > 10)) e.practice_hours = '練習時間は0〜10時間で入力してください';
  return e;
}

export function PatientForm({ initial, onDone }: { initial: Patient; onDone: (p: Patient | null) => void }) {
  const { patients, save } = useStore();
  const toast = useToast();
  const [p, setP, clear] = useDraft<Patient>(`patient-form:${initial.id}`, () => initial);
  const [touched, setTouched] = useState(false);
  const errors = useMemo(() => validatePatient(p, patients), [p, patients]);
  const age = calcAge(p.birth_date);
  const bmi = calcBmi(p.height_cm, p.weight_kg);
  const ev = evaluateBmi(bmi, age);
  const set = <K extends keyof Patient>(k: K, v: Patient[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const setS = (k: keyof Patient['student'], v: string | number | null) => setP((prev) => ({ ...prev, student: { ...prev.student, [k]: v } }));
  const err = (k: string) => (touched ? errors[k] : undefined);

  const submit = async () => {
    setTouched(true);
    if (Object.keys(errors).length) { toast('入力内容を確認してください', 'warn'); return; }
    const isNew = !patients.some((x) => x.id === p.id);
    const out = { ...p, patient_no: p.patient_no.trim(), name: p.name.trim() };
    await save('patients', out, isNew ? '患者を登録' : '患者情報を更新');
    clear();
    toast(isNew ? '患者を登録しました' : '患者情報を更新しました');
    onDone(out);
  };

  return (
    <div className="space-y-5">
      <Card title="基本情報">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="患者番号" required error={err('patient_no')}><TextInput value={p.patient_no} onChange={(e) => set('patient_no', e.target.value)} invalid={!!err('patient_no')} /></Field>
          <Field label="氏名" required error={err('name')}><TextInput value={p.name} onChange={(e) => set('name', e.target.value)} invalid={!!err('name')} placeholder="例：山田 太郎" /></Field>
          <Field label="ふりがな"><TextInput value={p.name_kana} onChange={(e) => set('name_kana', e.target.value)} placeholder="やまだ たろう" /></Field>
          <Field label="生年月日" required error={err('birth_date')} hint={age != null ? `年齢：${age}歳（自動計算）` : undefined}>
            <TextInput type="date" value={p.birth_date} onChange={(e) => set('birth_date', e.target.value)} invalid={!!err('birth_date')} max={todayStr()} />
          </Field>
          <Field label="性別" required>
            <Chips options={['女性', '男性']} value={p.sex === 'male' ? '男性' : '女性'} onChange={(v) => set('sex', v === '男性' ? 'male' : 'female')} />
          </Field>
          {p.sex === 'female' && age != null && age >= 10 && age < 65 && (
            <Field label="月経" hint="鉄の基準値（月経あり/なし）の切り替えに使います">
              <Chips options={['あり', 'なし', '未確認']} value={p.menstruation === 'yes' ? 'あり' : p.menstruation === 'no' ? 'なし' : '未確認'} onChange={(v) => set('menstruation', v === 'あり' ? 'yes' : v === 'なし' ? 'no' : 'unknown')} />
            </Field>
          )}
          <Field label="職業・学年"><TextInput value={p.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="例：事務職／高校1年生" /></Field>
          <Field label="通院状況">
            <Select value={p.visit_status} onChange={(e) => set('visit_status', e.target.value as Patient['visit_status'])}>
              {['通院中', '経過観察', '休止', '終了'].map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="栄養指導">
            <Chips options={['指導中', '指導なし']} value={p.guidance_active ? '指導中' : '指導なし'} onChange={(v) => set('guidance_active', v === '指導中')} />
          </Field>
        </div>
      </Card>

      <Card title="身体情報" subtitle={bmi != null ? <>BMI {fmt(bmi, 1)}（自動計算）　<Badge tone={ev.tone}>{ev.label}</Badge></> : 'BMIは身長・体重から自動計算します'}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="身長" error={err('height_cm')}><NumberInput value={p.height_cm} onChange={(v) => set('height_cm', v)} unit="cm" invalid={!!err('height_cm')} /></Field>
          <Field label="体重" error={err('weight_kg')}><NumberInput value={p.weight_kg} onChange={(v) => set('weight_kg', v)} unit="kg" invalid={!!err('weight_kg')} /></Field>
          <Field label="体脂肪率" error={err('body_fat_pct')}><NumberInput value={p.body_fat_pct} onChange={(v) => set('body_fat_pct', v)} unit="%" invalid={!!err('body_fat_pct')} /></Field>
          <Field label="骨格筋量" error={err('skeletal_muscle_kg')}><NumberInput value={p.skeletal_muscle_kg} onChange={(v) => set('skeletal_muscle_kg', v)} unit="kg" invalid={!!err('skeletal_muscle_kg')} /></Field>
        </div>
        {bmi != null && <p className="mt-2 text-[13px] text-muted">{ev.note}</p>}
      </Card>

      <Card title="生活・健康情報">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="身体活動レベル" hint={ACTIVITY_HINT[p.activity_level]}>
            <Chips options={['低い', 'ふつう', '高い']} value={ACTIVITY_LABEL[p.activity_level]} onChange={(v) => set('activity_level', v === '低い' ? 'low' : v === '高い' ? 'high' : 'moderate')} />
          </Field>
          <Field label="睡眠時間" error={err('sleep_hours')}><NumberInput value={p.sleep_hours} onChange={(v) => set('sleep_hours', v)} unit="時間" invalid={!!err('sleep_hours')} /></Field>
          <Field label="運動習慣"><TextInput value={p.exercise_habit} onChange={(e) => set('exercise_habit', e.target.value)} placeholder="例：ダイナフィット週1回、ウォーキング週2回" /></Field>
          <Field label="アレルギー"><TextInput value={p.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="例：えび・かに／なし" /></Field>
          <Field label="既往歴"><TextArea value={p.medical_history} onChange={(e) => set('medical_history', e.target.value)} /></Field>
          <Field label="服用薬" hint="ワルファリン（ビタミンK）、降圧薬、腎臓の薬などは指導内容に影響します"><TextArea value={p.medications} onChange={(e) => set('medications', e.target.value)} /></Field>
        </div>
      </Card>

      <Card title="栄養指導の目的" subtitle="複数選択できます">
        <Chips multi options={PURPOSES.map((x) => x.label)} value={p.purposes.map((k) => PURPOSE_MAP[k].label)} onChange={(v) => set('purposes', (v as string[]).map((l) => PURPOSES.find((x) => x.label === l)!.key))} />
        <Field label="目的の詳細" className="mt-4"><TextArea value={p.purpose_note} onChange={(e) => set('purpose_note', e.target.value)} placeholder="患者さんの言葉で書いておくと、指導書づくりに役立ちます" /></Field>
      </Card>

      <Card title="学生の追加項目" actions={<Chips options={['学生である']} multi value={p.is_student ? ['学生である'] : []} onChange={(v) => set('is_student', (v as string[]).length > 0)} size="sm" />}>
        {p.is_student ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="競技種目"><TextInput value={p.student.sport} onChange={(e) => setS('sport', e.target.value)} placeholder="例：サッカー" /></Field>
            <Field label="練習頻度"><TextInput value={p.student.practice_frequency} onChange={(e) => setS('practice_frequency', e.target.value)} placeholder="例：週6日" /></Field>
            <Field label="1日の練習時間" error={err('practice_hours')}><NumberInput value={p.student.practice_hours} onChange={(v) => setS('practice_hours', v)} unit="時間" /></Field>
            <Field label="怪我の有無"><TextInput value={p.student.injury} onChange={(e) => setS('injury', e.target.value)} /></Field>
            <Field label="成長状況"><TextInput value={p.student.growth} onChange={(e) => setS('growth', e.target.value)} placeholder="例：この1年で身長＋5cm" /></Field>
            <Field label="食事・補食の状況"><TextInput value={p.student.snacking} onChange={(e) => setS('snacking', e.target.value)} /></Field>
          </div>
        ) : (
          <p className="text-sm text-muted">「学生である」を選ぶと、競技種目・練習頻度・成長状況などの項目が表示されます。</p>
        )}
      </Card>

      <Card title="スタッフメモ">
        <TextArea value={p.staff_memo} onChange={(e) => set('staff_memo', e.target.value)} placeholder="院内共有のメモ（患者さんに渡す資料には表示されません）" />
      </Card>

      {touched && Object.keys(errors).length > 0 && <p className="text-sm text-rose-700">入力内容にエラーがあります（{Object.keys(errors).length}件）。赤字の項目を確認してください。</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => { clear(); onDone(null); }}>キャンセル</Button>
        <Button variant="primary" onClick={submit}>保存する</Button>
      </div>
    </div>
  );
}

export function PatientSummary({ p, compact }: { p: Patient; compact?: boolean }) {
  const age = calcAge(p.birth_date);
  const bmi = calcBmi(p.height_cm, p.weight_kg);
  const ev = evaluateBmi(bmi, age);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span className="font-bold text-ink">{p.name}</span>
      {p.is_demo && <DemoBadge />}
      <span className="text-muted">{p.patient_no}</span>
      <span>{age ?? '?'}歳・{p.sex === 'male' ? '男性' : '女性'}</span>
      <span className="num">{p.height_cm ?? '—'}cm / {p.weight_kg ?? '—'}kg</span>
      <span className="num">BMI {fmt(bmi, 1)}</span>
      {!compact && <Badge tone={ev.tone}>{ev.label}</Badge>}
      {p.purposes.map((k) => <Pill key={k}>{PURPOSE_MAP[k].short}</Pill>)}
    </div>
  );
}

function PatientDetail({ p, onBack, onEdit }: { p: Patient; onBack: () => void; onEdit: () => void }) {
  const { questionnaires, plans, mealDays, guidanceDocs, progress, distributions, materials, removePatient } = useStore();
  const { go } = useNav();
  const confirm = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<'q' | 'plan' | 'meal' | 'guide' | 'body' | 'docs'>('q');
  const age = calcAge(p.birth_date);
  const bmi = calcBmi(p.height_cm, p.weight_kg);
  const ev = evaluateBmi(bmi, age);
  const qs = questionnaires.filter((x) => x.patient_id === p.id);
  const pls = plans.filter((x) => x.patient_id === p.id);
  const mds = mealDays.filter((x) => x.patient_id === p.id);
  const gds = guidanceDocs.filter((x) => x.patient_id === p.id);
  const prs = progress.filter((x) => x.patient_id === p.id);
  const dss = distributions.filter((x) => x.patient_id === p.id);
  const matTitle = (id: string) => materials.find((m) => m.id === id)?.title ?? id;

  const del = async () => {
    const ok = await confirm({
      title: '患者情報を削除しますか？',
      message: <>「{p.name}」と、紐づく問診・栄養目標・食事記録・指導書・経過記録・配布履歴をすべて削除します。この操作は元に戻せません。<br />（必要なら先に「設定」からデータを書き出してください）</>,
      ok: '削除する', danger: true,
    });
    if (!ok) return;
    await removePatient(p.id);
    toast('削除しました');
    onBack();
  };

  const Row = ({ date, children, onOpen }: { date: string; children: React.ReactNode; onOpen?: () => void }) => (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3"><span className="num w-24 shrink-0 text-sm text-muted">{date}</span><div className="min-w-0 text-[15px]">{children}</div></div>
      {onOpen && <Button size="sm" variant="ghost" onClick={onOpen}>開く</Button>}
    </li>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>患者一覧へ</Button>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Edit3 size={16} />} onClick={onEdit}>編集</Button>
          <Button variant="danger" icon={<Trash2 size={16} />} onClick={del}>削除</Button>
        </div>
      </div>
      <div className="mb-5 rounded-2xl border border-line bg-beige-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[24px] font-bold text-brand">{p.name}</h1>
          {p.is_demo && <DemoBadge />}
          <Pill>{p.patient_no}</Pill>
          <Badge tone={p.guidance_active ? 'good' : 'muted'}>{p.guidance_active ? '栄養指導中' : '指導なし'}</Badge>
          <Pill>{p.visit_status}</Pill>
        </div>
        <p className="mt-1 text-sm text-muted">{p.name_kana}　{age ?? '?'}歳・{p.sex === 'male' ? '男性' : '女性'}　{p.occupation}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="身長" value={fmt(p.height_cm, 1)} unit="cm" />
          <Stat label="体重" value={fmt(p.weight_kg, 1)} unit="kg" />
          <Stat label="BMI" value={fmt(bmi, 1)} sub={<Badge tone={ev.tone}>{ev.label}</Badge>} />
          <Stat label="体脂肪率" value={fmt(p.body_fat_pct, 1)} unit="%" />
          <Stat label="骨格筋量" value={fmt(p.skeletal_muscle_kg, 1)} unit="kg" />
        </div>
        <p className="mt-2 text-[13px] text-muted">{ev.note}</p>
        <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted">身体活動レベル：</span>{ACTIVITY_LABEL[p.activity_level]}</p>
          <p><span className="text-muted">運動習慣：</span>{p.exercise_habit || '—'}</p>
          <p><span className="text-muted">睡眠時間：</span>{p.sleep_hours != null ? `${p.sleep_hours}時間` : '—'}</p>
          <p><span className="text-muted">アレルギー：</span>{p.allergies || '—'}</p>
          <p><span className="text-muted">既往歴：</span>{p.medical_history || '—'}</p>
          <p><span className="text-muted">服用薬：</span>{p.medications || '—'}</p>
          <p className="sm:col-span-2"><span className="text-muted">指導目的：</span>{p.purposes.map((k) => PURPOSE_MAP[k].label).join('、') || '—'}　{p.purpose_note}</p>
          {p.is_student && (
            <p className="sm:col-span-2"><span className="text-muted">学生：</span>{p.student.sport}／{p.student.practice_frequency}・1日{p.student.practice_hours ?? '—'}時間／怪我：{p.student.injury || '—'}／成長：{p.student.growth || '—'}／補食：{p.student.snacking || '—'}</p>
          )}
          {p.staff_memo && <p className="sm:col-span-2"><span className="text-muted">スタッフメモ：</span>{p.staff_memo}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" icon={<ClipboardList size={15} />} onClick={() => go('questionnaire', { patientId: p.id })}>問診をとる</Button>
          <Button size="sm" icon={<Calculator size={15} />} onClick={() => go('calc', { patientId: p.id })}>栄養計算</Button>
          <Button size="sm" icon={<UtensilsCrossed size={15} />} onClick={() => go('meals', { patientId: p.id })}>食事を記録</Button>
          <Button size="sm" icon={<FileText size={15} />} onClick={() => go('guidance', { patientId: p.id })}>指導書を作る</Button>
          <Button size="sm" icon={<TrendingUp size={15} />} onClick={() => go('progress', { patientId: p.id })}>経過を記録</Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'q', label: '問診結果', count: qs.length },
          { key: 'plan', label: '栄養目標', count: pls.length },
          { key: 'meal', label: '食事分析', count: mds.length },
          { key: 'guide', label: '指導履歴', count: gds.length },
          { key: 'body', label: '身体情報の推移', count: prs.length },
          { key: 'docs', label: '配布資料', count: dss.length },
        ]}
      />
      <Card>
        <ul>
          {tab === 'q' && (qs.length ? qs.map((q) => <Row key={q.id} date={q.date} onOpen={() => go('questionnaire', { patientId: p.id, sub: q.id })}>問診（担当：{q.staff}）{q.free_text && <span className="text-muted">　{q.free_text.slice(0, 40)}</span>}</Row>) : <EmptyState title="問診の記録はまだありません" />)}
          {tab === 'plan' && (pls.length ? pls.map((x) => <Row key={x.id} date={x.date} onOpen={() => go('calc', { patientId: p.id, sub: x.id })}>栄養目標（PFC {x.pfc.p}/{x.pfc.f}/{x.pfc.c}%）{x.memo && <span className="text-muted">　{x.memo}</span>}</Row>) : <EmptyState title="保存された栄養目標はありません" />)}
          {tab === 'meal' && (mds.length ? mds.map((x) => <Row key={x.id} date={x.date} onOpen={() => go('meals', { patientId: p.id, sub: x.date })}>{x.items.length}品目（{[...new Set(x.items.map((i) => MEAL_LABEL[i.meal]))].join('・')}）</Row>) : <EmptyState title="食事記録はまだありません" />)}
          {tab === 'guide' && (gds.length || prs.length ? (
            <>
              {gds.map((x) => <Row key={x.id} date={x.date} onOpen={() => go('guidance', { patientId: p.id, sub: x.id })}>個別栄養指導書 <Badge tone={x.status === 'confirmed' ? 'good' : 'info'}>{x.status === 'confirmed' ? '確認済み' : '下書き'}</Badge></Row>)}
              {[...prs].reverse().map((x) => <Row key={x.id} date={x.date} onOpen={() => go('progress', { patientId: p.id })}>指導内容：{x.guidance_content || '—'}　<span className="text-muted">次回目標：{x.next_goal || '—'}</span></Row>)}
            </>
          ) : <EmptyState title="指導履歴はまだありません" />)}
          {tab === 'body' && (prs.length ? [...prs].reverse().map((x) => <Row key={x.id} date={x.date} onOpen={() => go('progress', { patientId: p.id })}><span className="num">体重 {fmt(x.weight_kg, 1)}kg／体脂肪率 {fmt(x.body_fat_pct, 1)}%／骨格筋量 {fmt(x.skeletal_muscle_kg, 1)}kg</span></Row>) : <EmptyState title="経過記録はまだありません" />)}
          {tab === 'docs' && (dss.length ? dss.map((x) => <Row key={x.id} date={x.date}>{x.kind === 'material' ? matTitle(x.ref_id) : x.kind === 'guidance' ? '個別栄養指導書' : '商品の提案'}（{x.staff}）{x.note && <span className="text-muted">　{x.note}</span>}</Row>) : <EmptyState title="配布履歴はまだありません" />)}
        </ul>
      </Card>
    </div>
  );
}

export default function PatientsPage() {
  const { patients, settings } = useStore();
  const { sub, setSub, setPatientId } = useNav();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'student'>('all');
  type Mode = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'form'; patient: Patient };
  const [mode, setMode] = useDraft<Mode>('patients-mode', () => (sub ? { kind: 'detail', id: sub } : { kind: 'list' }));
  React.useEffect(() => { if (sub) setMode({ kind: 'detail', id: sub }); }, [sub]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return patients.filter((p) => {
      if (filter === 'active' && !p.guidance_active) return false;
      if (filter === 'student' && !p.is_student) return false;
      if (!s) return true;
      return [p.name, p.name_kana, p.patient_no, p.occupation, ...p.purposes.map((k) => PURPOSE_MAP[k].label)].some((x) => x.toLowerCase().includes(s));
    });
  }, [patients, q, filter]);

  if (mode.kind === 'form') {
    const isNew = !patients.some((x) => x.id === mode.patient.id);
    return (
      <div>
        <PageHeader title={isNew ? '患者の新規登録' : '患者情報の編集'} icon={<UserPlus size={26} />} subtitle="入力途中の内容は、画面を移動しても保持されます。" />
        <PatientForm initial={mode.patient} onDone={(p) => setMode(p ? { kind: 'detail', id: p.id } : isNew ? { kind: 'list' } : { kind: 'detail', id: mode.patient.id })} />
      </div>
    );
  }
  if (mode.kind === 'detail') {
    const p = patients.find((x) => x.id === mode.id);
    if (!p) return <EmptyState title="患者が見つかりません" action={<Button onClick={() => setMode({ kind: 'list' })}>一覧へ</Button>} />;
    return <PatientDetail p={p} onBack={() => { setSub(null); setMode({ kind: 'list' }); }} onEdit={() => setMode({ kind: 'form', patient: p })} />;
  }

  return (
    <div>
      <PageHeader
        title="患者管理"
        icon={<Users size={26} />}
        subtitle={`登録 ${patients.length}名${settings.show_demo ? '（架空データを含む）' : ''}`}
        actions={<Button variant="primary" icon={<Plus size={18} />} onClick={() => setMode({ kind: 'form', patient: emptyPatient(nextPatientNo(patients)) })}>新規登録</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="氏名・ふりがな・患者番号・目的で検索" className="pl-10" aria-label="患者検索" />
        </div>
        <Chips size="sm" options={['すべて', '栄養指導中', '学生']} value={filter === 'all' ? 'すべて' : filter === 'active' ? '栄養指導中' : '学生'} onChange={(v) => setFilter(v === '栄養指導中' ? 'active' : v === '学生' ? 'student' : 'all')} />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users size={32} />} title="該当する患者がいません" action={<Button variant="primary" onClick={() => setMode({ kind: 'form', patient: emptyPatient(nextPatientNo(patients)) })}>新規登録</Button>}>検索条件を変えるか、新しく登録してください。</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const age = calcAge(p.birth_date);
            const bmi = calcBmi(p.height_cm, p.weight_kg);
            const ev = evaluateBmi(bmi, age);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setPatientId(p.id); setMode({ kind: 'detail', id: p.id }); }}
                className="rounded-2xl border border-line bg-white p-4 text-left transition-colors hover:border-sage hover:bg-brand-50/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted">{p.patient_no}</p>
                    <p className="truncate text-[17px] font-bold text-ink">{p.name}</p>
                    <p className="text-sm text-muted">{age ?? '?'}歳・{p.sex === 'male' ? '男性' : '女性'}　{p.occupation}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.is_demo && <DemoBadge />}
                    {p.guidance_active && <Badge tone="good">指導中</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="num">BMI {fmt(bmi, 1)}</span>
                  <Badge tone={ev.tone} icon={false}>{ev.label}</Badge>
                  {p.is_student && <Pill>学生・{p.student.sport || '競技未入力'}</Pill>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">{p.purposes.map((k) => <Pill key={k}>{PURPOSE_MAP[k].short}</Pill>)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { emptyPatient };
