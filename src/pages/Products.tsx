import React, { useMemo, useState } from 'react';
import { Database, Edit3, Package, Plus, Search, Send, Trash2 } from 'lucide-react';
import type { Food, NutrientKey, Product } from '../types';
import { uid, useStore } from '../store/store';
import { useNav } from '../components/nav';
import { Badge, Button, Card, Chips, DemoBadge, EmptyState, Field, Modal, Notice, NumberInput, PageHeader, Pill, Select, TextArea, TextInput, useConfirm, useToast } from '../components/ui';
import { NUTRIENT_MAP } from '../data/nutrients';
import { fmt, todayStr } from '../lib/calc';

const P_KEYS: NutrientKey[] = ['energy', 'protein', 'fat', 'carb', 'salt', 'ca', 'fe', 'zn', 'vitD', 'vitC', 'vitB1', 'vitB2', 'fiber'];

function blank(): Product {
  return { id: uid('p'), created_at: '', updated_at: '', name: '', maker: '', ingredients: '', serving_label: '1食', serving_grams: null, nutrients: {}, allergens: '', intake_guide: '', price: null, cautions: '', description: '', active: true };
}

function ProductForm({ initial, onClose }: { initial: Product; onClose: () => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [p, setP] = useState(initial);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  const errs = [!p.name.trim() && '商品名を入力してください', p.price != null && p.price < 0 && '価格がマイナスです', p.serving_grams != null && p.serving_grams <= 0 && '1回量のgは0より大きく'].filter(Boolean) as string[];
  return (
    <Modal open onClose={onClose} wide title={initial.created_at ? '商品の編集' : '商品の登録'} footer={<><Button onClick={onClose}>キャンセル</Button><Button variant="primary" onClick={async () => { setTouched(true); if (errs.length) return; await save('products', { ...p, name: p.name.trim() }, '商品を保存'); toast('商品を保存しました'); onClose(); }}>保存する</Button></>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="商品名" required><TextInput value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="メーカー"><TextInput value={p.maker} onChange={(e) => set('maker', e.target.value)} /></Field>
          <Field label="1回の摂取目安（表示）"><TextInput value={p.serving_label} onChange={(e) => set('serving_label', e.target.value)} placeholder="例：1食（スプーン2杯）" /></Field>
          <Field label="1回量の重量"><NumberInput value={p.serving_grams} onChange={(v) => set('serving_grams', v)} unit="g" /></Field>
          <Field label="価格（税込）"><NumberInput value={p.price} onChange={(v) => set('price', v)} unit="円" /></Field>
          <Field label="取り扱い"><Chips size="sm" options={['取扱中', '取扱終了']} value={p.active ? '取扱中' : '取扱終了'} onChange={(v) => set('active', v !== '取扱終了')} /></Field>
        </div>
        <Field label="原材料"><TextArea value={p.ingredients} onChange={(e) => set('ingredients', e.target.value)} /></Field>
        <div>
          <p className="mb-2 font-bold text-ink">栄養成分（1回の摂取目安あたり・表示から）</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {P_KEYS.map((k) => (
              <label key={k} className="grid grid-cols-[1fr_130px] items-center gap-2 text-sm"><span>{NUTRIENT_MAP[k].name}</span><NumberInput value={p.nutrients[k] ?? null} onChange={(v) => set('nutrients', { ...p.nutrients, [k]: v })} unit={NUTRIENT_MAP[k].unit} /></label>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="アレルギー情報"><TextInput value={p.allergens} onChange={(e) => set('allergens', e.target.value)} placeholder="例：乳成分・大豆" /></Field>
          <Field label="摂取目安量・飲み方"><TextInput value={p.intake_guide} onChange={(e) => set('intake_guide', e.target.value)} /></Field>
        </div>
        <Field label="注意事項"><TextArea value={p.cautions} onChange={(e) => set('cautions', e.target.value)} placeholder="例：食事の代わりにはなりません。腎臓の病気がある方は主治医に確認。" /></Field>
        <Field label="商品説明"><TextArea value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
        {touched && errs.length > 0 && <Notice tone="alert">{errs.join('／')}</Notice>}
      </div>
    </Modal>
  );
}

export default function ProductsPage() {
  const { products, distributions, patients, patientMap, save, remove, staff, foods } = useStore();
  const { patientId } = useNav();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [propose, setPropose] = useState<{ product: Product; patient_id: string; date: string; note: string } | null>(null);
  const list = useMemo(() => products.filter((p) => !q.trim() || [p.name, p.maker, p.description].some((x) => x.includes(q.trim()))), [products, q]);

  const toFood = async (p: Product) => {
    if (!p.serving_grams) { toast('1回量の重量（g）を入力すると食品データベースに登録できます', 'warn'); return; }
    const per100: Food['per100'] = {};
    for (const [k, v] of Object.entries(p.nutrients)) per100[k as NutrientKey] = v == null ? null : Math.round(((v * 100) / p.serving_grams) * 1000) / 1000;
    const existing = foods.find((f) => f.product_id === p.id);
    const f: Food = {
      id: existing?.id ?? uid('f'), created_at: existing?.created_at ?? '', updated_at: '', name: p.name, kana: `${p.maker} 院内商品`, category: '市販食品・院内商品', state: '院内商品',
      source: 'product', verified: true, per100, units: [{ unit: 'g', grams: 1, basis: '重量' }, { unit: '回分', grams: p.serving_grams, basis: `${p.serving_label}（商品表示）` }],
      serving: { label: `回分（${p.serving_grams}g）`, grams: p.serving_grams }, note: '商品管理から登録。表示にない栄養素は未確認。', product_id: p.id,
    };
    await save('foods', f, '院内商品を食品データベースに登録');
    toast(existing ? '食品データベースの内容を更新しました' : '食品データベースに登録しました（食事分析で選べます）');
  };

  return (
    <div>
      <PageHeader title="商品管理" icon={<Package size={26} />} subtitle="院内で取り扱うプロテイン・栄養補助食品" actions={<Button variant="primary" icon={<Plus size={17} />} onClick={() => setEditing(blank())}>商品を登録</Button>} />
      <Notice tone="info" className="mb-4" title="指導の方針">商品販売ありきの栄養指導にはしません。まず通常の食事での改善を優先し、食事だけでは難しい場合の選択肢として提案します。提案した場合は履歴を残してください。</Notice>
      <div className="relative mb-4 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="商品名・メーカーで検索" className="pl-10" aria-label="商品検索" />
      </div>
      {list.length === 0 ? <EmptyState icon={<Package size={32} />} title="商品が登録されていません" action={<Button variant="primary" onClick={() => setEditing(blank())}>商品を登録</Button>} /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((p) => {
            const hist = distributions.filter((d) => d.kind === 'product' && d.ref_id === p.id);
            return (
              <Card key={p.id} title={<span className="flex flex-wrap items-center gap-2">{p.name}{p.is_demo && <DemoBadge />}{!p.active && <Badge tone="muted">取扱終了</Badge>}</span>} subtitle={`${p.maker}${p.price != null ? `　${p.price.toLocaleString()}円` : ''}`}>
                <p className="text-sm">{p.description}</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="pb-1 text-left text-[13px] text-muted">{p.serving_label}{p.serving_grams ? `（${p.serving_grams}g）` : ''}あたり</caption>
                    <tbody className="divide-y divide-line">
                      {P_KEYS.filter((k) => p.nutrients[k] != null).map((k) => <tr key={k}><td className="py-1">{NUTRIENT_MAP[k].name}</td><td className="num py-1 text-right">{fmt(p.nutrients[k], NUTRIENT_MAP[k].digits)} {NUTRIENT_MAP[k].unit}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div><dt className="inline text-muted">原材料：</dt><dd className="inline">{p.ingredients || '—'}</dd></div>
                  <div><dt className="inline text-muted">アレルギー：</dt><dd className="inline">{p.allergens || '—'}</dd></div>
                  <div><dt className="inline text-muted">摂取目安：</dt><dd className="inline">{p.intake_guide || '—'}</dd></div>
                  {p.cautions && <div><dt className="inline text-muted">注意事項：</dt><dd className="inline">{p.cautions}</dd></div>}
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" icon={<Send size={15} />} onClick={() => setPropose({ product: p, patient_id: patientId ?? '', date: todayStr(), note: '' })}>提案を記録</Button>
                  <Button size="sm" icon={<Database size={15} />} onClick={() => toFood(p)}>食品DBに登録</Button>
                  <Button size="sm" icon={<Edit3 size={15} />} onClick={() => setEditing(p)}>編集</Button>
                  <Button size="sm" variant="danger" icon={<Trash2 size={15} />} onClick={async () => { if (!(await confirm({ title: '商品を削除しますか？', message: `「${p.name}」を削除します。`, ok: '削除する', danger: true }))) return; await remove('products', p.id, '商品を削除'); toast('削除しました'); }}>削除</Button>
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="mb-1 text-[13px] font-bold text-sage">患者への提案履歴（{hist.length}件）</p>
                  {hist.length === 0 ? <p className="text-sm text-muted">まだありません</p> : (
                    <ul className="text-sm">{hist.map((d) => <li key={d.id} className="flex justify-between gap-2 border-b border-line py-1.5"><span><span className="num text-muted">{d.date}</span>　{patientMap[d.patient_id]?.name ?? '—'}{d.note && <span className="text-muted">　{d.note}</span>}</span><Pill>{d.staff}</Pill></li>)}</ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && <ProductForm initial={editing} onClose={() => setEditing(null)} />}
      <Modal open={!!propose} onClose={() => setPropose(null)} title="商品の提案を記録" footer={<><Button onClick={() => setPropose(null)}>キャンセル</Button><Button variant="primary" onClick={async () => {
        if (!propose) return;
        if (!propose.patient_id) { toast('患者を選んでください', 'warn'); return; }
        await save('distributions', { id: uid('d'), created_at: '', updated_at: '', kind: 'product', ref_id: propose.product.id, patient_id: propose.patient_id, date: propose.date, staff, note: propose.note }, '商品の提案を記録');
        toast('提案を記録しました'); setPropose(null);
      }}>記録する</Button></>}>
        {propose && (
          <div className="space-y-3">
            <p className="text-sm text-muted">商品：{propose.product.name}</p>
            <Field label="患者" required><Select value={propose.patient_id} onChange={(e) => setPropose({ ...propose, patient_id: e.target.value })}><option value="">— 選択 —</option>{patients.map((x) => <option key={x.id} value={x.id}>{x.patient_no} {x.name}</option>)}</Select></Field>
            <Field label="提案日"><TextInput type="date" value={propose.date} onChange={(e) => setPropose({ ...propose, date: e.target.value })} /></Field>
            <Field label="提案の理由・メモ" hint="食事での改善を試したうえでの提案か、などを残しておくと安心です"><TextArea value={propose.note} onChange={(e) => setPropose({ ...propose, note: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
