import React, { useMemo, useState } from 'react';
import { ArrowDownWideNarrow, Database, Edit3, FileUp, Plus, Scale, Search, Target, Trash2, X } from 'lucide-react';
import type { Food, NutrientKey } from '../types';
import { uid, useStore } from '../store/store';
import { Badge, Button, Card, Chips, EmptyState, Field, Modal, Notice, NumberInput, PageHeader, Pill, Select, Tabs, TextArea, TextInput, useConfirm, useToast } from '../components/ui';
import { FoodEditor, newFood } from '../components/FoodEditor';
import { FOOD_CATEGORIES, FOOD_SOURCE, FOOD_URL } from '../data/foods';
import { NUTRIENTS, NUTRIENT_GROUPS, NUTRIENT_MAP } from '../data/nutrients';
import { approxUnit, fmt, gramsForTarget, round } from '../lib/calc';
import { foodMatches } from './Meals';

const val = (f: Food, k: NutrientKey, per: '100' | 'serving') => {
  const v = f.per100[k];
  if (v == null) return null;
  return per === '100' ? v : (v * f.serving.grams) / 100;
};

function Num({ v, k }: { v: number | null; k: NutrientKey }) {
  return v == null ? <span className="text-[12px] text-amber-800">未確認</span> : <span className="num">{fmt(v, NUTRIENT_MAP[k].digits)}</span>;
}

function FoodDetail({ f, onClose, onEdit }: { f: Food; onClose: () => void; onEdit: () => void }) {
  const { save, remove, isBuiltin } = useStore();
  const confirm = useConfirm();
  const toast = useToast();
  return (
    <Modal open onClose={onClose} wide title={`${f.name}（${f.state}）`} footer={
      <>
        <Button variant="danger" icon={<Trash2 size={16} />} onClick={async () => {
          if (!(await confirm({ title: '食品を削除しますか？', message: `「${f.name}」を削除します。この食品を使った食事記録は「削除された食品」と表示されます。`, ok: '削除する', danger: true }))) return;
          await remove('foods', f.id, '食品を削除'); toast('削除しました'); onClose();
        }}>削除</Button>
        <Button onClick={async () => { await save('foods', { ...f, verified: !f.verified }, f.verified ? '食品を未照合に変更' : '食品を照合済みに変更'); toast(f.verified ? '未照合にしました' : '照合済みにしました'); }}>{f.verified ? '未照合に戻す' : '公式値と照合済みにする'}</Button>
        <Button variant="primary" icon={<Edit3 size={16} />} onClick={onEdit}>編集</Button>
      </>
    }>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Pill>{f.category}</Pill>
        <Badge tone={f.verified ? 'good' : 'warn'}>{f.verified ? '照合済み' : '試作用データ（未照合）'}</Badge>
        <Pill>{f.source === 'mext8' ? '成分表（八訂）参考' : f.source === 'product' ? '院内商品' : '手動登録'}</Pill>
        {!isBuiltin('foods', f.id) && <Pill>院内追加</Pill>}
      </div>
      {f.note && <Notice tone="info" className="mb-3">{f.note}</Notice>}
      <p className="mb-1 text-sm font-bold">単位と換算根拠</p>
      <ul className="mb-4 text-sm">{f.units.filter((u) => u.unit !== 'g').map((u) => <li key={u.unit} className="border-b border-line py-1.5"><span className="font-medium">{u.unit}</span> ＝ <span className="num">{u.grams}g</span>　<span className="text-muted">{u.basis}</span></li>)}</ul>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUTRIENT_GROUPS.map((g) => (
          <div key={g}>
            <p className="mb-1 text-[13px] font-bold text-sage">{g}</p>
            <table className="w-full text-sm">
              <thead><tr className="text-[12px] text-muted"><th className="text-left font-medium">栄養素</th><th className="text-right font-medium">100gあたり</th><th className="text-right font-medium">{f.serving.label}</th></tr></thead>
              <tbody>
                {NUTRIENTS.filter((n) => n.group === g).map((n) => (
                  <tr key={n.key} className="border-b border-line"><td className="py-1">{n.name}<span className="ml-1 text-[11px] text-muted">{n.unit}</span></td><td className="py-1 text-right"><Num v={val(f, n.key, '100')} k={n.key} /></td><td className="py-1 text-right"><Num v={val(f, n.key, 'serving')} k={n.key} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const CSV_KEYS: NutrientKey[] = NUTRIENTS.map((n) => n.key);
const CSV_HEADER = ['食品名', 'よみ・キーワード', 'カテゴリー', '状態', '1食の単位', '1食のg', ...NUTRIENTS.map((n) => `${n.name}(${n.unit})`)];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = '', row: string[] = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function CsvImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    const rows = parseCsv(text);
    if (!rows.length) return { foods: [] as Food[], errors: [] as string[] };
    const body = rows[0][0]?.includes('食品名') ? rows.slice(1) : rows;
    const errors: string[] = [];
    const foods: Food[] = [];
    body.forEach((r, i) => {
      const name = (r[0] ?? '').trim();
      if (!name) { errors.push(`${i + 1}行目：食品名がありません`); return; }
      const per100: Food['per100'] = {};
      CSV_KEYS.forEach((k, j) => {
        const raw = (r[6 + j] ?? '').trim().replace(/[()（）]/g, '');
        if (raw === '' || raw === '-' || raw === '—' || raw === 'Tr') { per100[k] = raw === 'Tr' ? 0 : null; return; }
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) { errors.push(`${i + 1}行目：${NUTRIENTS[j].name}の値「${raw}」が数値ではありません`); per100[k] = null; } else per100[k] = n;
      });
      const su = (r[4] ?? '').trim();
      const sg = Number((r[5] ?? '').trim());
      const f: Food = {
        ...newFood(), id: uid('f'), name, kana: (r[1] ?? '').trim(), category: FOOD_CATEGORIES.includes((r[2] ?? '').trim() as (typeof FOOD_CATEGORIES)[number]) ? (r[2] ?? '').trim() : '市販食品・院内商品',
        state: (r[3] ?? '').trim() || '—', source: 'manual', per100,
        units: [{ unit: 'g', grams: 1, basis: '重量' }, ...(su && sg > 0 ? [{ unit: su, grams: sg, basis: 'CSV取り込み' }] : [])],
        serving: su && sg > 0 ? { label: `${su}（${sg}g）`, grams: sg } : { label: '100g', grams: 100 },
        note: 'CSVで一括登録',
      };
      foods.push(f);
    });
    return { foods, errors };
  }, [text]);
  return (
    <Modal open={open} onClose={onClose} wide="xl" title="食品をCSVで一括登録" footer={<><Button onClick={onClose}>閉じる</Button><Button variant="primary" disabled={!parsed.foods.length || busy} onClick={async () => {
      setBusy(true);
      for (const f of parsed.foods) await save('foods', f);
      setBusy(false); toast(`${parsed.foods.length}件の食品を登録しました`); setText(''); onClose();
    }}>{parsed.foods.length}件を登録</Button></>}>
      <div className="space-y-3">
        <Notice tone="info">成分表のExcelなどから、下の列の順番で貼り付けてください（カンマ区切り・タブ区切りのどちらでも可）。値は可食部100gあたり。空欄は「未確認」、「Tr」（微量）は0として登録します。</Notice>
        <div className="scroll-x rounded-lg bg-stone-50 p-2 text-[12px]"><code className="whitespace-nowrap">{CSV_HEADER.join(',')}</code></div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(CSV_HEADER.join(',')); toast('見出し行をコピーしました'); } catch { toast('コピーできませんでした', 'warn'); } }}>見出し行をコピー</Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-sage-200 bg-white px-3 text-sm text-brand hover:bg-brand-50">
            <FileUp size={15} />CSVファイルを選ぶ
            <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
          </label>
        </div>
        <TextArea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[180px] font-mono text-[13px]" placeholder="ここに貼り付け" />
        {parsed.errors.length > 0 && <Notice tone="warn" title={`確認が必要な行 ${parsed.errors.length}件`}>{parsed.errors.slice(0, 8).join('／')}{parsed.errors.length > 8 ? '…' : ''}</Notice>}
        {parsed.foods.length > 0 && <p className="text-sm">取り込み予定：<strong>{parsed.foods.length}件</strong>（例：{parsed.foods.slice(0, 3).map((f) => f.name).join('、')}）</p>}
      </div>
    </Modal>
  );
}

export default function FoodsPage() {
  const { foods } = useStore();
  const [tab, setTab] = useState<'search' | 'rank' | 'compare' | 'reverse'>('search');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [detail, setDetail] = useState<Food | null>(null);
  const [editing, setEditing] = useState<Food | null>(null);
  const [csv, setCsv] = useState(false);
  const [rankKey, setRankKey] = useState<NutrientKey>('protein');
  const [rankPer, setRankPer] = useState<'100' | 'serving'>('serving');
  const [cmp, setCmp] = useState<string[]>(['f-chicken-breast', 'f-salmon-raw', 'f-egg-raw', 'f-tofu-momen']);
  const [cmpPer, setCmpPer] = useState<'100' | 'serving'>('100');
  const [revKey, setRevKey] = useState<NutrientKey>('protein');
  const [revAmt, setRevAmt] = useState<number | null>(20);
  const [revFoods, setRevFoods] = useState<string[]>(['f-chicken-breast', 'f-salmon-raw', 'f-egg-raw', 'f-tofu-momen']);
  const [addSel, setAddSel] = useState('');

  const filtered = useMemo(() => foods.filter((f) => (!cat || f.category === cat) && foodMatches(f, q)), [foods, q, cat]);
  const ranked = useMemo(() => filtered.filter((f) => f.per100[rankKey] != null).sort((a, b) => (val(b, rankKey, rankPer) ?? 0) - (val(a, rankKey, rankPer) ?? 0)), [filtered, rankKey, rankPer]);
  const fm = useMemo(() => Object.fromEntries(foods.map((f) => [f.id, f])), [foods]);
  const verifiedCount = foods.filter((f) => f.verified).length;

  const FoodSelect = ({ onPick, exclude }: { onPick: (id: string) => void; exclude: string[] }) => (
    <Select value={addSel} onChange={(e) => { if (e.target.value) { onPick(e.target.value); setAddSel(''); } }} className="w-auto min-w-[240px]" aria-label="食品を追加">
      <option value="">＋ 食品を追加</option>
      {FOOD_CATEGORIES.map((c) => {
        const xs = foods.filter((f) => f.category === c && !exclude.includes(f.id));
        return xs.length ? <optgroup key={c} label={c}>{xs.map((f) => <option key={f.id} value={f.id}>{f.name}（{f.state}）</option>)}</optgroup> : null;
      })}
    </Select>
  );

  return (
    <div>
      <PageHeader
        title="食品データベース"
        icon={<Database size={26} />}
        subtitle={<>{foods.length}食品（公式値と照合済み {verifiedCount}件）・{FOOD_SOURCE}を基本とした設計</>}
        actions={<><Button icon={<FileUp size={17} />} onClick={() => setCsv(true)}>CSVで一括登録</Button><Button variant="primary" icon={<Plus size={17} />} onClick={() => setEditing(newFood())}>食品を登録</Button></>}
      />
      <Notice tone="warn" className="mb-4" title="初期の食品データは試作用です">
        成分表（八訂）を参考に手入力した値で、公式値との照合は未実施です。正式運用の前に<a className="underline" href={FOOD_URL} target="_blank" rel="noreferrer">文部科学省の成分表</a>と照合し、各食品を「照合済み」にしてください（CSV一括登録で公式データに置き換えることもできます）。空欄の値は「未確認」として扱い、0とは区別しています。
      </Notice>
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'search', label: '食品名から検索' }, { key: 'rank', label: '栄養素から探す・並べ替え' }, { key: 'compare', label: '食品の比較' }, { key: 'reverse', label: '必要量の逆算' }]} />

      {(tab === 'search' || tab === 'rank') && (
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="食品名・よみ（例：とうふ、さば）" className="pl-10" aria-label="食品検索" />
          </div>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto" aria-label="カテゴリー"><option value="">すべてのカテゴリー</option>{FOOD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
        </div>
      )}

      {tab === 'search' && (
        filtered.length === 0 ? <EmptyState title="該当する食品がありません" action={<Button onClick={() => setEditing({ ...newFood(), name: q })}>「{q}」を登録する</Button>} /> : (
          <Card bodyClass="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-2 font-medium">食品（状態）</th><th className="py-2 font-medium">カテゴリー</th><th className="py-2 text-right font-medium">エネルギー</th><th className="py-2 text-right font-medium">たんぱく質</th><th className="py-2 text-right font-medium">脂質</th><th className="py-2 text-right font-medium">炭水化物</th><th className="py-2 pl-3 font-medium">一般的な1食</th></tr></thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id} className="cursor-pointer border-b border-line hover:bg-brand-50/50" onClick={() => setDetail(f)}>
                      <td className="py-2"><span className="font-medium text-ink">{f.name}</span><span className="ml-1 text-[12px] text-muted">{f.state}</span>{f.verified ? <Badge tone="good" className="ml-1">照合済</Badge> : null}</td>
                      <td className="py-2 text-muted">{f.category}</td>
                      <td className="num py-2 text-right">{fmt(f.per100.energy)}<span className="text-[11px] text-muted"> kcal</span></td>
                      <td className="num py-2 text-right">{fmt(f.per100.protein, 1)}<span className="text-[11px] text-muted"> g</span></td>
                      <td className="num py-2 text-right">{fmt(f.per100.fat, 1)}<span className="text-[11px] text-muted"> g</span></td>
                      <td className="num py-2 text-right">{fmt(f.per100.carb, 1)}<span className="text-[11px] text-muted"> g</span></td>
                      <td className="py-2 pl-3 text-[13px]"><span className="text-muted">{f.serving.label}</span><span className="num ml-1">{fmt(val(f, 'energy', 'serving'))}kcal・P{fmt(val(f, 'protein', 'serving'), 1)}g</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-muted">左の4項目は可食部100gあたり。行を押すと全栄養素を表示します。</p>
          </Card>
        )
      )}

      {tab === 'rank' && (
        <Card title={<><ArrowDownWideNarrow size={18} />{NUTRIENT_MAP[rankKey].name}の多い順</>} actions={
          <>
            <Select value={rankKey} onChange={(e) => setRankKey(e.target.value as NutrientKey)} className="h-9 w-auto" aria-label="栄養素">{NUTRIENTS.map((n) => <option key={n.key} value={n.key}>{n.name}</option>)}</Select>
            <Chips size="sm" options={['1食あたり', '100gあたり']} value={rankPer === '100' ? '100gあたり' : '1食あたり'} onChange={(v) => setRankPer(v === '100gあたり' ? '100' : 'serving')} />
          </>
        }>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-2 font-medium">順位</th><th className="py-2 font-medium">食品</th><th className="py-2 font-medium">1食の目安</th><th className="py-2 text-right font-medium">1食あたり</th><th className="py-2 text-right font-medium">100gあたり</th></tr></thead>
              <tbody>
                {ranked.slice(0, 40).map((f, i) => (
                  <tr key={f.id} className="cursor-pointer border-b border-line hover:bg-brand-50/50" onClick={() => setDetail(f)}>
                    <td className="num py-2 text-muted">{i + 1}</td>
                    <td className="py-2">{f.name}<span className="ml-1 text-[12px] text-muted">{f.state}</span></td>
                    <td className="py-2 text-muted">{f.serving.label}</td>
                    <td className={`num py-2 text-right ${rankPer === 'serving' ? 'font-bold' : ''}`}>{fmt(val(f, rankKey, 'serving'), NUTRIENT_MAP[rankKey].digits)} {NUTRIENT_MAP[rankKey].unit}</td>
                    <td className={`num py-2 text-right ${rankPer === '100' ? 'font-bold' : ''}`}>{fmt(val(f, rankKey, '100'), NUTRIENT_MAP[rankKey].digits)} {NUTRIENT_MAP[rankKey].unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-muted">値が未確認の食品は除外しています（{filtered.length - ranked.length}件）。</p>
        </Card>
      )}

      {tab === 'compare' && (
        <Card title={<><Scale size={18} />食品同士の栄養成分比較</>} actions={<Chips size="sm" options={['100gあたり', '1食あたり']} value={cmpPer === '100' ? '100gあたり' : '1食あたり'} onChange={(v) => setCmpPer(v === '1食あたり' ? 'serving' : '100')} />}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {cmp.map((id) => fm[id] && <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand">{fm[id].name}<button type="button" aria-label="外す" onClick={() => setCmp(cmp.filter((x) => x !== id))}><X size={14} /></button></span>)}
            {cmp.length < 5 && <FoodSelect exclude={cmp} onPick={(id) => setCmp([...cmp, id])} />}
          </div>
          {cmp.length < 2 ? <p className="text-sm text-muted">2つ以上の食品を選んでください（最大5つ）。</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-2 font-medium">栄養素</th>{cmp.map((id) => <th key={id} className="py-2 text-right font-medium">{fm[id]?.name}<span className="block text-[11px] font-normal">{cmpPer === '100' ? '100g' : fm[id]?.serving.label}</span></th>)}</tr></thead>
                <tbody>
                  {NUTRIENTS.map((n) => {
                    const vs = cmp.map((id) => (fm[id] ? val(fm[id], n.key, cmpPer) : null));
                    const max = Math.max(...vs.map((x) => x ?? -1));
                    return (
                      <tr key={n.key} className="border-b border-line">
                        <td className="py-1.5">{n.name}<span className="ml-1 text-[11px] text-muted">{n.unit}</span></td>
                        {vs.map((x, i) => <td key={i} className={`py-1.5 text-right ${x != null && x === max && max > 0 ? 'font-bold text-brand' : ''}`}><Num v={x} k={n.key} /></td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'reverse' && (
        <Card title={<><Target size={18} />目標栄養量から必要な食品重量を逆算</>} subtitle="例：たんぱく質20gを摂るには、鶏むね肉・鮭・卵・豆腐をそれぞれ何g食べればよいか">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label="栄養素"><Select value={revKey} onChange={(e) => setRevKey(e.target.value as NutrientKey)} className="w-auto">{NUTRIENTS.map((n) => <option key={n.key} value={n.key}>{n.name}</option>)}</Select></Field>
            <Field label="目標量" error={revAmt != null && revAmt <= 0 ? '0より大きい値' : null}><NumberInput value={revAmt} onChange={setRevAmt} unit={NUTRIENT_MAP[revKey].unit} className="w-40" /></Field>
            <FoodSelect exclude={revFoods} onPick={(id) => setRevFoods([...revFoods, id])} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead><tr className="border-b border-line text-left text-[13px] text-muted"><th className="py-2 font-medium">食品（状態）</th><th className="py-2 text-right font-medium">100gあたり</th><th className="py-2 text-right font-medium">必要な重量</th><th className="py-2 font-medium pl-3">目安</th><th className="py-2 text-right font-medium">そのときのエネルギー</th><th /></tr></thead>
              <tbody>
                {revFoods.map((id) => {
                  const f = fm[id];
                  if (!f) return null;
                  const g = revAmt ? gramsForTarget(f.per100[revKey], revAmt) : null;
                  const u = f.units.find((x) => x.unit !== 'g' && x.unit !== 'ml');
                  return (
                    <tr key={id} className="border-b border-line">
                      <td className="py-2">{f.name}<span className="ml-1 text-[12px] text-muted">{f.state}</span></td>
                      <td className="py-2 text-right"><Num v={f.per100[revKey] ?? null} k={revKey} /> <span className="text-[11px] text-muted">{NUTRIENT_MAP[revKey].unit}</span></td>
                      <td className="num py-2 text-right text-[16px] font-bold text-brand">{g != null ? `${fmt(g)} g` : '—'}</td>
                      <td className="py-2 pl-3 text-muted">{g != null && u ? `${approxUnit(u.unit, round(g / u.grams, 1))}（${u.basis}）` : '—'}</td>
                      <td className="num py-2 text-right">{g != null && f.per100.energy != null ? `${fmt((f.per100.energy * g) / 100)} kcal` : '—'}</td>
                      <td className="py-2 text-right"><button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-stone-100" aria-label="外す" onClick={() => setRevFoods(revFoods.filter((x) => x !== id))}><X size={15} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-muted">必要な重量＝目標量÷100gあたりの含有量×100（可食部・記載の状態での重量）。含有量が未確認または0の食品は計算できません。</p>
        </Card>
      )}

      {detail && <FoodDetail f={fm[detail.id] ?? detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(fm[detail.id] ?? detail); setDetail(null); }} />}
      {editing && <FoodEditor open initial={editing} onClose={() => setEditing(null)} />}
      <CsvImport open={csv} onClose={() => setCsv(false)} />
    </div>
  );
}
