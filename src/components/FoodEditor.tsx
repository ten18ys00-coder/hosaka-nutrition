import React, { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Food, FoodUnit, NutrientKey } from '../types';
import { uid, useStore } from '../store/store';
import { Button, Chips, Field, Modal, Notice, NumberInput, Select, TextArea, TextInput, useToast } from './ui';
import { FOOD_CATEGORIES } from '../data/foods';
import { NUTRIENTS, NUTRIENT_GROUPS } from '../data/nutrients';

export function newFood(): Food {
  return {
    id: uid('f'), created_at: '', updated_at: '', name: '', kana: '', category: '市販食品・院内商品', state: '市販品', source: 'manual', verified: false,
    per100: {}, units: [{ unit: 'g', grams: 1, basis: '重量' }], serving: { label: '1食', grams: 100 }, note: '',
  };
}

/** 食品の登録・編集（市販食品・院内商品の手動登録を含む） */
export function FoodEditor({ open, initial, onClose, onSaved }: { open: boolean; initial: Food; onClose: () => void; onSaved?: (f: Food) => void }) {
  const { save } = useStore();
  const toast = useToast();
  const [f, setF] = useState<Food>(initial);
  const [basis, setBasis] = useState<'100g' | 'serving'>('100g');
  const [servingG, setServingG] = useState<number | null>(initial.serving.grams);
  const [perServing, setPerServing] = useState<Partial<Record<NutrientKey, number | null>>>({});
  const [touched, setTouched] = useState(false);
  React.useEffect(() => { setF(initial); setServingG(initial.serving.grams); setPerServing({}); setTouched(false); setBasis('100g'); }, [initial, open]);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!f.name.trim()) e.push('食品名を入力してください');
    if (basis === 'serving' && (!servingG || servingG <= 0)) e.push('1食あたりの重量を入力してください');
    for (const u of f.units) if (!u.unit.trim() || !(u.grams > 0)) e.push('単位名とグラム数を正しく入力してください');
    for (const n of NUTRIENTS) {
      const v = basis === '100g' ? f.per100[n.key] : perServing[n.key];
      if (v != null && v < 0) e.push(`${n.name}がマイナスです`);
    }
    return [...new Set(e)];
  }, [f, basis, servingG, perServing]);

  const setVal = (k: NutrientKey, v: number | null) => {
    if (basis === '100g') setF((x) => ({ ...x, per100: { ...x.per100, [k]: v } }));
    else setPerServing((x) => ({ ...x, [k]: v }));
  };
  const setUnit = (i: number, patch: Partial<FoodUnit>) => setF((x) => ({ ...x, units: x.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) }));

  const submit = async () => {
    setTouched(true);
    if (errors.length) return;
    let per100 = { ...f.per100 };
    if (basis === 'serving' && servingG) {
      per100 = {};
      for (const n of NUTRIENTS) {
        const v = perServing[n.key];
        per100[n.key] = v == null ? null : Math.round(((v * 100) / servingG) * 1000) / 1000;
      }
      // 食塩相当量だけ入力されている場合はナトリウムを換算（食塩相当量g＝ナトリウムmg×2.54÷1000）
    }
    if (per100.salt != null && per100.na == null) per100.na = Math.round((per100.salt * 1000) / 2.54);
    if (per100.na != null && per100.salt == null) per100.salt = Math.round(((per100.na * 2.54) / 1000) * 10) / 10;
    const servingUnit = f.units.find((u) => u.unit !== 'g' && u.unit !== 'ml');
    const out: Food = {
      ...f,
      name: f.name.trim(),
      per100,
      serving: servingUnit ? { label: `${servingUnit.unit}（${servingUnit.grams}g）`, grams: servingUnit.grams } : { label: `${servingG ?? 100}g`, grams: servingG ?? 100 },
    };
    await save('foods', out, '食品を登録・更新');
    toast('食品を保存しました');
    onSaved?.(out);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={f.created_at ? '食品の編集' : '食品の手動登録'}
      footer={<><Button onClick={onClose}>キャンセル</Button><Button variant="primary" onClick={submit}>保存する</Button></>}
    >
      <div className="space-y-5">
        {f.source === 'mext8' && <Notice tone="info">成分表を参考にした初期データです。公式値と照合したら「照合済み」にしてください。</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="食品名・商品名" required><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="例：〇〇プロテインバー" /></Field>
          <Field label="検索用のよみ・キーワード"><TextInput value={f.kana} onChange={(e) => setF({ ...f, kana: e.target.value })} placeholder="例：ぷろていんばー 補食" /></Field>
          <Field label="カテゴリー">
            <Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{FOOD_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          <Field label="状態" hint="生・ゆで・焼き・市販品 など"><TextInput value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></Field>
          <Field label="データの種類">
            <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as Food['source'] })}>
              <option value="manual">手動登録（市販食品など）</option>
              <option value="product">院内商品</option>
              <option value="mext8">成分表（八訂）</option>
            </Select>
          </Field>
          <Field label="公式値・表示値との照合">
            <Chips size="sm" options={['照合済み', '未照合']} value={f.verified ? '照合済み' : '未照合'} onChange={(v) => setF({ ...f, verified: v === '照合済み' })} />
          </Field>
        </div>

        <div>
          <p className="mb-2 font-bold text-ink">単位と換算</p>
          <div className="space-y-2">
            {f.units.map((u, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_2fr_auto] items-center gap-2">
                <TextInput value={u.unit} onChange={(e) => setUnit(i, { unit: e.target.value })} disabled={i === 0} aria-label="単位" placeholder="個・枚・杯・本・ml など" />
                <NumberInput value={u.grams} onChange={(v) => setUnit(i, { grams: v ?? 0 })} unit="g" aria-label="グラム" disabled={i === 0} />
                <TextInput value={u.basis} onChange={(e) => setUnit(i, { basis: e.target.value })} aria-label="換算根拠" placeholder="換算根拠（例：1袋の内容量）" disabled={i === 0} />
                {i === 0 ? <span className="w-9" /> : <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-rose-700 hover:bg-rose-50" onClick={() => setF({ ...f, units: f.units.filter((_, j) => j !== i) })} aria-label="単位を削除"><Trash2 size={16} /></button>}
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" icon={<Plus size={15} />} onClick={() => setF({ ...f, units: [...f.units, { unit: '', grams: 0, basis: '' }] })}>単位を追加</Button>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-ink">栄養成分</p>
            <Chips size="sm" options={['100gあたりで入力', '1食あたりで入力（商品の表示から）']} value={basis === '100g' ? '100gあたりで入力' : '1食あたりで入力（商品の表示から）'} onChange={(v) => setBasis(v === '100gあたりで入力' ? '100g' : 'serving')} />
          </div>
          {basis === 'serving' && <Field label="1食（表示単位）あたりの重量" className="mb-3 max-w-xs"><NumberInput value={servingG} onChange={setServingG} unit="g" /></Field>}
          <p className="mb-2 text-[13px] text-muted">わからない項目は空欄のままにしてください。空欄は「未確認」として扱い、0とは区別します。</p>
          {NUTRIENT_GROUPS.map((g) => (
            <div key={g} className="mb-3">
              <p className="mb-1 text-[13px] font-bold text-sage">{g}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {NUTRIENTS.filter((n) => n.group === g).map((n) => (
                  <label key={n.key} className="grid grid-cols-[1fr_140px] items-center gap-2 text-sm">
                    <span>{n.name}</span>
                    <NumberInput value={(basis === '100g' ? f.per100[n.key] : perServing[n.key]) ?? null} onChange={(v) => setVal(n.key, v)} unit={n.unit} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Field label="メモ・出典"><TextArea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="例：商品パッケージの栄養成分表示（2026年11月確認）" /></Field>
        {touched && errors.length > 0 && <Notice tone="alert">{errors.join('／')}</Notice>}
      </div>
    </Modal>
  );
}
