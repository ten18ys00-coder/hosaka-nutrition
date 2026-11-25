import React, { useMemo, useState } from 'react';
import { ClipboardList, Plus, Save, Trash2 } from 'lucide-react';
import type { QuestionnaireRecord } from '../types';
import { uid, useDraft, useStore } from '../store/store';
import { PatientPicker, useCurrentPatient, useNav } from '../components/nav';
import { Badge, Button, Card, Chips, EmptyState, Field, Notice, PageHeader, Pill, TextArea, TextInput, useConfirm, useToast, cx } from '../components/ui';
import { QUESTION_SECTIONS, analyzeAnswers } from '../data/questionnaire';
import { NUTRIENT_MAP } from '../data/nutrients';
import { todayStr } from '../lib/calc';
import { PatientSummary } from './Patients';

const TOTAL = QUESTION_SECTIONS.reduce((s, x) => s + x.questions.length, 0);

function newRecord(patientId: string, staff: string): QuestionnaireRecord {
  return { id: uid('q'), created_at: '', updated_at: '', patient_id: patientId, date: todayStr(), answers: {}, notes: {}, free_text: '', staff };
}

export function QuestionnaireResult({ answers }: { answers: QuestionnaireRecord['answers'] }) {
  const { suggestions, flags } = useMemo(() => analyzeAnswers(answers), [answers]);
  const nutrientCount = new Map<string, number>();
  suggestions.forEach((s) => s.nutrients.forEach((n) => nutrientCount.set(n, (nutrientCount.get(n) ?? 0) + 1)));
  const ranked = [...nutrientCount.entries()].sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-3">
      {flags.map((f) => <Notice key={f.id} tone="alert" title="医療機関への相談を検討">{f.message}</Notice>)}
      <Card title="追加で確認すべきこと" subtitle="回答から自動表示しています（診断ではありません）">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">回答すると、ここに確認ポイントが表示されます。</p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-beige-50 p-3">
                <p className="font-bold text-ink">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">{s.detail}</p>
                {s.nutrients.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.nutrients.map((n) => <Pill key={n}>{NUTRIENT_MAP[n].name}</Pill>)}</div>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {ranked.length > 0 && (
        <Card title="食事分析で重点的に見る栄養素">
          <div className="flex flex-wrap gap-2">
            {ranked.map(([k, c]) => <Badge key={k} tone={c >= 2 ? 'warn' : 'info'}>{NUTRIENT_MAP[k as keyof typeof NUTRIENT_MAP].name}{c >= 2 ? `（${c}項目）` : ''}</Badge>)}
          </div>
        </Card>
      )}
      <Notice tone="muted">問診の結果だけで、栄養欠乏症や病気を判断することはできません。食事分析（複数日）や、必要に応じて医療機関での検査と合わせて評価してください。</Notice>
    </div>
  );
}

function QuestionnaireForm({ record, onSaved, onCancel }: { record: QuestionnaireRecord; onSaved: () => void; onCancel: () => void }) {
  const { save, staff } = useStore();
  const toast = useToast();
  const [r, setR, clear] = useDraft<QuestionnaireRecord>(`questionnaire:${record.id}`, () => record);
  const answered = QUESTION_SECTIONS.flatMap((s) => s.questions).filter((q) => {
    const v = r.answers[q.id];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }).length;
  const setA = (id: string, v: string | string[]) => setR((p) => ({ ...p, answers: { ...p.answers, [id]: v } }));
  const setN = (id: string, v: string) => setR((p) => ({ ...p, notes: { ...p.notes, [id]: v } }));

  const submit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) { toast('問診日を入力してください', 'warn'); return; }
    if (answered === 0) { toast('1つ以上回答してください', 'warn'); return; }
    await save('questionnaires', { ...r, staff: r.staff || staff }, '栄養問診を保存');
    clear();
    toast('問診を保存しました');
    onSaved();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <Field label="問診日" required><TextInput type="date" value={r.date} onChange={(e) => setR((p) => ({ ...p, date: e.target.value }))} max={todayStr()} /></Field>
            <Field label="担当"><TextInput value={r.staff} onChange={(e) => setR((p) => ({ ...p, staff: e.target.value }))} /></Field>
            <div className="ml-auto text-sm text-muted">回答 <span className="num font-bold text-ink">{answered}</span> / {TOTAL}</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sage-100"><div className="h-full bg-brand transition-all" style={{ width: `${(answered / TOTAL) * 100}%` }} /></div>
        </Card>
        {QUESTION_SECTIONS.map((sec) => (
          <Card key={sec.id} title={sec.title}>
            <div className="divide-y divide-line">
              {sec.questions.map((q) => (
                <div key={q.id} className="py-3.5 first:pt-0 last:pb-0">
                  <p className="mb-2 font-medium text-ink">{q.label}{q.help && <span className="ml-2 text-[13px] font-normal text-muted">{q.help}</span>}</p>
                  <Chips multi={q.type === 'multi'} options={q.options ?? []} value={r.answers[q.id]} onChange={(v) => setA(q.id, v)} size="sm" />
                  {q.note && (
                    <TextInput className="mt-2" value={r.notes[q.id] ?? ''} onChange={(e) => setN(q.id, e.target.value)} placeholder="補足（自由記述）" aria-label={`${q.label}の補足`} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
        <Card title="自由記述" subtitle="患者さんの言葉、気になっていること、生活の背景など">
          <TextArea value={r.free_text} onChange={(e) => setR((p) => ({ ...p, free_text: e.target.value }))} className="min-h-[120px]" />
        </Card>
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={() => { clear(); onCancel(); }}>キャンセル</Button>
          <Button variant="primary" icon={<Save size={17} />} onClick={submit}>問診を保存</Button>
        </div>
      </div>
      <div className="xl:sticky xl:top-20 xl:self-start"><QuestionnaireResult answers={r.answers} /></div>
    </div>
  );
}

export default function QuestionnairePage() {
  const p = useCurrentPatient();
  const { questionnaires, staff, remove } = useStore();
  const { sub, setSub, go } = useNav();
  const confirm = useConfirm();
  const toast = useToast();
  const list = p ? questionnaires.filter((q) => q.patient_id === p.id) : [];
  const [editing, setEditing] = useDraft<QuestionnaireRecord | null>(`questionnaire-open:${p?.id ?? 'none'}`, () => null);
  const [viewId, setViewId] = useState<string | null>(sub);
  const view = list.find((q) => q.id === viewId) ?? null;

  return (
    <div>
      <PageHeader title="栄養問診" icon={<ClipboardList size={26} />} subtitle="チェック・選択・自由記述で食習慣と身体の状態を確認します" actions={<PatientPicker />} />
      {!p ? (
        <EmptyState title="患者を選択してください" action={<Button onClick={() => go('patients')}>患者管理へ</Button>}>上の「対象患者」から選ぶか、患者管理で新規登録してください。</EmptyState>
      ) : editing ? (
        <>
          <div className="mb-4 rounded-xl border border-line bg-beige-50 px-4 py-3"><PatientSummary p={p} /></div>
          <QuestionnaireForm record={editing} onCancel={() => setEditing(null)} onSaved={() => { setViewId(editing.id); setEditing(null); }} />
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-3">
            <Button variant="primary" className="w-full" icon={<Plus size={18} />} onClick={() => setEditing(newRecord(p.id, staff))}>新しい問診をとる</Button>
            <Card title="問診の履歴">
              {list.length === 0 ? <p className="text-sm text-muted">まだありません</p> : (
                <ul className="space-y-1">
                  {list.map((q) => (
                    <li key={q.id}>
                      <button type="button" onClick={() => { setViewId(q.id); setSub(q.id); }} className={cx('flex h-11 w-full items-center justify-between rounded-lg px-3 text-left text-[15px]', viewId === q.id ? 'bg-brand-50 font-bold text-brand' : 'hover:bg-stone-50')}>
                        <span className="num">{q.date}</span><span className="text-sm text-muted">{q.staff}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <div>
            <div className="mb-4 rounded-xl border border-line bg-beige-50 px-4 py-3"><PatientSummary p={p} /></div>
            {view ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-ink">{view.date} の問診（担当：{view.staff}）</h2>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditing(view)}>編集</Button>
                    <Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={async () => {
                      if (!(await confirm({ title: 'この問診を削除しますか？', message: `${view.date} の問診記録を削除します。元に戻せません。`, ok: '削除する', danger: true }))) return;
                      await remove('questionnaires', view.id, '栄養問診を削除'); setViewId(null); toast('削除しました');
                    }}>削除</Button>
                  </div>
                </div>
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <Card title="回答内容">
                    {QUESTION_SECTIONS.map((sec) => (
                      <div key={sec.id} className="mb-4 last:mb-0">
                        <p className="mb-1 text-sm font-bold text-sage">{sec.title}</p>
                        <dl className="divide-y divide-line">
                          {sec.questions.map((q) => {
                            const v = view.answers[q.id];
                            const text = Array.isArray(v) ? v.join('、') : v;
                            return (
                              <div key={q.id} className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-3 py-2 text-sm">
                                <dt className="text-muted">{q.label}</dt>
                                <dd className="text-ink">{text || <span className="text-stone-400">未回答</span>}{view.notes[q.id] && <span className="block text-muted">（{view.notes[q.id]}）</span>}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    ))}
                    {view.free_text && <div className="mt-2 rounded-xl bg-beige-50 p-3 text-sm"><p className="font-bold">自由記述</p>{view.free_text}</div>}
                  </Card>
                  <QuestionnaireResult answers={view.answers} />
                </div>
              </div>
            ) : (
              <EmptyState icon={<ClipboardList size={32} />} title={list.length ? '左の履歴から問診を選んでください' : '問診の記録はまだありません'} action={<Button variant="primary" onClick={() => setEditing(newRecord(p.id, staff))}>新しい問診をとる</Button>} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
