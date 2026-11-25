import React, { useMemo, useState } from 'react';
import { CalendarPlus, Copy, Edit3, FolderOpen, Plus, Printer, Search, Send, Trash2 } from 'lucide-react';
import type { MaterialDoc } from '../types';
import { uid, useStore } from '../store/store';
import { useNav } from '../components/nav';
import { Badge, Button, Card, Chips, EmptyState, Field, Modal, Notice, NumberInput, PageHeader, Pill, Select, TextArea, TextInput, useConfirm, useToast, cx } from '../components/ui';
import { MaterialBody } from '../components/MaterialBody';
import { PrintPreview } from '../components/PrintPreview';
import { MATERIAL_CATEGORIES } from '../data/materials';
import { MONTHLY_THEMES } from '../data/seasonal';
import { todayStr } from '../lib/calc';

function blank(category = '基本の栄養'): MaterialDoc {
  return { id: uid('m'), created_at: '', updated_at: '', category, title: '', audience: '患者向け', summary: '', body: '', tags: [], month: null };
}

function monthlyTemplate(month: number): MaterialDoc {
  const t = MONTHLY_THEMES.find((x) => x.month === month)!;
  return {
    ...blank('季節・毎月'),
    title: `${month}月の栄養ポイント：${t.theme}`,
    summary: t.message,
    month,
    tags: ['毎月', `${month}月`],
    body: `${t.message}\n\n## ${month}月の旬の食材\n- ${t.foods.join('\n- ')}\n\n## 今月やってみること\n- \n- \n\n> 体調に不安がある方は、遠慮なくスタッフにご相談ください。`,
  };
}

function MaterialEditor({ open, initial, onClose }: { open: boolean; initial: MaterialDoc; onClose: (saved?: MaterialDoc) => void }) {
  const { save, materials, foods, foodMap } = useStore();
  const toast = useToast();
  const [m, setM] = useState(initial);
  const [touched, setTouched] = useState(false);
  React.useEffect(() => { setM(initial); setTouched(false); }, [initial, open]);
  const cats = [...new Set([...MATERIAL_CATEGORIES, ...materials.map((x) => x.category)])];
  const errs = [!m.title.trim() && 'タイトルを入力してください', !m.category.trim() && 'カテゴリーを入力してください', !m.body.trim() && '本文を入力してください'].filter(Boolean) as string[];
  const submit = async () => {
    setTouched(true);
    if (errs.length) return;
    const out = { ...m, title: m.title.trim(), category: m.category.trim() };
    await save('materials', out, '資料を保存');
    toast('資料を保存しました');
    onClose(out);
  };
  return (
    <Modal open={open} onClose={() => onClose()} wide="xl" title={initial.created_at ? '資料の編集' : '資料の新規登録'} footer={<><Button onClick={() => onClose()}>キャンセル</Button><Button variant="primary" onClick={submit}>保存する</Button></>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="タイトル" required><TextInput value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="カテゴリー" required hint="一覧にない名前を入力すると新しいカテゴリーになります">
              <TextInput list="mat-cats" value={m.category} onChange={(e) => setM({ ...m, category: e.target.value })} />
              <datalist id="mat-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="対象"><Chips size="sm" options={['患者向け', 'スタッフ向け']} value={m.audience} onChange={(v) => v && setM({ ...m, audience: v as MaterialDoc['audience'] })} /></Field>
            <Field label="対象月（毎月の資料）" hint="空欄＝通年"><NumberInput value={m.month ?? null} onChange={(v) => setM({ ...m, month: v != null ? Math.min(12, Math.max(1, Math.round(v))) : null })} unit="月" /></Field>
            <Field label="タグ" hint="読点（、）区切り"><TextInput value={m.tags.join('、')} onChange={(e) => setM({ ...m, tags: e.target.value.split(/[、,]/).map((x) => x.trim()).filter(Boolean) })} /></Field>
          </div>
          <Field label="概要"><TextInput value={m.summary} onChange={(e) => setM({ ...m, summary: e.target.value })} /></Field>
          <Field label="本文" required hint="「## 見出し」「- 箇条書き」「> 注意書き」「**太字**」。{{protein20}} {{rank:ca}} {{rank:fe}} {{rank:fiber}} {{rank:zn}} {{rank:vitD}} {{seasonal}} {{recipes}} {{monthly}} で食品データベースから表を自動作成">
            <TextArea value={m.body} onChange={(e) => setM({ ...m, body: e.target.value })} className="min-h-[320px] font-mono text-[14px]" />
          </Field>
          {touched && errs.length > 0 && <Notice tone="alert">{errs.join('／')}</Notice>}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold text-muted">プレビュー</p>
          <div className="doc max-h-[640px] overflow-y-auto rounded-xl border border-line p-4">
            <h1 className="mb-2 text-xl font-bold text-brand">{m.title || '（タイトル）'}</h1>
            <MaterialBody body={m.body} foods={foods} foodMap={foodMap} month={m.month ?? new Date().getMonth() + 1} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function LibraryPage() {
  const { materials, foods, foodMap, distributions, patients, patientMap, save, remove, isBuiltin, staff, settings } = useStore();
  const { sub, patientId } = useNav();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [selId, setSelId] = useState<string | null>(sub ?? materials[0]?.id ?? null);
  const [editing, setEditing] = useState<MaterialDoc | null>(null);
  const [printing, setPrinting] = useState(false);
  const [dist, setDist] = useState<{ patient_id: string; date: string; note: string } | null>(null);
  const [printFor, setPrintFor] = useState<string>('');
  const cats = [...new Set(materials.map((m) => m.category))];
  const list = useMemo(() => materials.filter((m) => (!cat || m.category === cat) && (!q.trim() || [m.title, m.summary, m.body, ...m.tags].some((x) => x.includes(q.trim())))), [materials, q, cat]);
  const sel = materials.find((m) => m.id === selId) ?? null;
  const month = new Date().getMonth() + 1;
  const history = sel ? distributions.filter((d) => d.kind === 'material' && d.ref_id === sel.id) : [];
  const printPatient = printFor ? patientMap[printFor] : null;

  return (
    <div>
      <PageHeader
        title="資料ライブラリ"
        icon={<FolderOpen size={26} />}
        subtitle={`院内の栄養資料 ${materials.length}件。A4で印刷・PDF保存、配布履歴の記録ができます`}
        actions={
          <>
            <Button icon={<CalendarPlus size={17} />} onClick={() => setEditing(monthlyTemplate(month))}>{month}月の資料を追加</Button>
            <Button variant="primary" icon={<Plus size={17} />} onClick={() => setEditing(blank(cat || '基本の栄養'))}>新規登録</Button>
          </>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="資料を検索" className="pl-10" aria-label="資料検索" />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="カテゴリー"><option value="">すべてのカテゴリー</option>{cats.map((c) => <option key={c}>{c}</option>)}</Select>
          <ul className="space-y-1.5">
            {list.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => setSelId(m.id)} className={cx('w-full rounded-xl border px-3 py-2.5 text-left', selId === m.id ? 'border-brand bg-brand-50' : 'border-line bg-white hover:bg-stone-50')}>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">{m.category}{m.month ? `・${m.month}月` : ''}{!isBuiltin('materials', m.id) && <Pill>院内追加</Pill>}</span>
                  <span className="block font-medium text-ink">{m.title}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="py-6 text-center text-sm text-muted">該当する資料はありません</li>}
          </ul>
        </div>

        <div>
          {!sel ? <EmptyState title="資料を選んでください" /> : (
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-1.5"><Pill>{sel.category}</Pill><Pill>{sel.audience}</Pill>{sel.tags.map((t) => <Pill key={t}>#{t}</Pill>)}</div>
                  <h2 className="mt-2 text-[22px] font-bold text-brand">{sel.title}</h2>
                  <p className="text-sm text-muted">{sel.summary}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" icon={<Printer size={16} />} onClick={() => setPrinting(true)}>A4プレビュー・印刷</Button>
                  <Button icon={<Send size={16} />} onClick={() => setDist({ patient_id: patientId ?? '', date: todayStr(), note: '' })}>配布を記録</Button>
                  <Button icon={<Edit3 size={16} />} onClick={() => setEditing(sel)}>編集</Button>
                  <Button variant="ghost" icon={<Copy size={16} />} onClick={() => setEditing({ ...sel, id: uid('m'), created_at: '', updated_at: '', title: `${sel.title}（コピー）` })}>複製</Button>
                  <Button variant="danger" icon={<Trash2 size={16} />} onClick={async () => {
                    if (!(await confirm({ title: '資料を削除しますか？', message: `「${sel.title}」を削除します。${isBuiltin('materials', sel.id) ? '（初期資料は削除後、設定画面から復元できません。複製しておくと安全です）' : ''}`, ok: '削除する', danger: true }))) return;
                    await remove('materials', sel.id, '資料を削除'); setSelId(null); toast('削除しました');
                  }}>削除</Button>
                </div>
              </div>
              <div className="doc mt-4 border-t border-line pt-3">
                <MaterialBody body={sel.body} foods={foods} foodMap={foodMap} month={sel.month ?? month} />
              </div>
              <div className="mt-6 border-t border-line pt-4">
                <p className="mb-2 font-bold text-ink">配布履歴（{history.length}件）</p>
                {history.length === 0 ? <p className="text-sm text-muted">まだ配布の記録はありません</p> : (
                  <ul className="divide-y divide-line text-sm">
                    {history.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span><span className="num text-muted">{d.date}</span>　{patientMap[d.patient_id]?.name ?? '（削除された患者）'}　<span className="text-muted">{d.staff}{d.note && `・${d.note}`}</span></span>
                        <button type="button" className="text-[13px] text-rose-700 hover:underline" onClick={async () => { await remove('distributions', d.id, '配布記録を削除'); toast('配布記録を削除しました'); }}>取り消し</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {editing && <MaterialEditor open initial={editing} onClose={(s) => { setEditing(null); if (s) setSelId(s.id); }} />}

      {sel && (
        <PrintPreview
          open={printing}
          onClose={() => setPrinting(false)}
          title={sel.title}
          extra={
            <Select value={printFor} onChange={(e) => setPrintFor(e.target.value)} className="h-11 max-w-[220px]" aria-label="お渡しする患者">
              <option value="">宛名なし</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} 様</option>)}
            </Select>
          }
        >
          <h1>{sel.title}</h1>
          <div className="meta">{printPatient && <span>{printPatient.name} 様</span>}<span>{todayStr().replace(/-/g, '/')}</span><span>{settings.clinic_name}</span></div>
          <MaterialBody body={sel.body} foods={foods} foodMap={foodMap} month={sel.month ?? month} />
          <div className="foot"><span>{settings.clinic_name}{settings.clinic_address && `　${settings.clinic_address}`}</span><span>食品の栄養価は日本食品標準成分表（八訂）を参考にした目安です</span></div>
        </PrintPreview>
      )}

      <Modal
        open={!!dist}
        onClose={() => setDist(null)}
        title="配布を記録"
        footer={<><Button onClick={() => setDist(null)}>キャンセル</Button><Button variant="primary" onClick={async () => {
          if (!dist || !sel) return;
          if (!dist.patient_id) { toast('患者を選んでください', 'warn'); return; }
          await save('distributions', { id: uid('d'), created_at: '', updated_at: '', kind: 'material', ref_id: sel.id, patient_id: dist.patient_id, date: dist.date || todayStr(), staff, note: dist.note }, '資料の配布を記録');
          toast('配布を記録しました'); setDist(null);
        }}>記録する</Button></>}
      >
        {dist && (
          <div className="space-y-3">
            <p className="text-sm text-muted">資料：{sel?.title}</p>
            <Field label="お渡しした患者" required>
              <Select value={dist.patient_id} onChange={(e) => setDist({ ...dist, patient_id: e.target.value })}>
                <option value="">— 選択 —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.patient_no} {p.name}</option>)}
              </Select>
            </Field>
            <Field label="配布日"><TextInput type="date" value={dist.date} onChange={(e) => setDist({ ...dist, date: e.target.value })} /></Field>
            <Field label="メモ"><TextInput value={dist.note} onChange={(e) => setDist({ ...dist, note: e.target.value })} placeholder="例：保護者にも説明" /></Field>
            <Badge tone="info">担当：{staff}</Badge>
          </div>
        )}
      </Modal>
    </div>
  );
}
