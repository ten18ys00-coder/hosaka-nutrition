import React, { useMemo, useState } from 'react';
import { BookOpen, Copy, Search } from 'lucide-react';
import type { NutrientKey } from '../types';
import { useStore } from '../store/store';
import { useNav } from '../components/nav';
import { Button, Card, PageHeader, Pill, TextInput, useToast, cx } from '../components/ui';
import { DICTIONARY, DICT_MAP, type DictEntry } from '../data/dictionary';
import { DRI_DIGITS, NUTRIENT_MAP } from '../data/nutrients';
import { AGE_GROUPS, AGE_GROUP_LABEL, DRI, DRI_SOURCE, EER_REF, INDICATOR_LABEL, pfcGoalRange, type DriTable } from '../data/dri2025';
import { NutrientRank } from '../components/MaterialBody';
import { fmt } from '../lib/calc';
import { foodMatches } from './Meals';

type Ind = 'ear' | 'rda' | 'ai' | 'dg' | 'ul';

function usedIndicators(t: DriTable): Ind[] {
  const out: Ind[] = [];
  const any = (f: (e: DriTable[keyof DriTable]) => number | null) => AGE_GROUPS.some((g) => f(t[g]) != null);
  if (any((e) => e.ear)) out.push('ear');
  if (any((e) => e.rda)) out.push('rda');
  if (any((e) => e.ai)) out.push('ai');
  if (any((e) => e.dgMin ?? e.dgMax)) out.push('dg');
  if (any((e) => e.ul)) out.push('ul');
  return out;
}

function cell(e: DriTable[keyof DriTable], ind: Ind, digits: number) {
  if (ind === 'dg') {
    if (e.dgMax != null) return `${fmt(e.dgMax, digits)}未満`;
    if (e.dgMin != null) return `${fmt(e.dgMin, digits)}以上`;
    return '—';
  }
  const v = e[ind];
  return v == null ? '—' : fmt(v, digits);
}

export function DriTableView({ k }: { k: NutrientKey }) {
  if (k === 'energy') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr className="border-b border-line text-[13px] text-muted"><th className="py-1.5 text-left font-medium">年齢</th>{['男性 低い', '男性 ふつう', '男性 高い', '女性 低い', '女性 ふつう', '女性 高い'].map((h) => <th key={h} className="py-1.5 text-right font-medium">{h}</th>)}</tr></thead>
          <tbody>{AGE_GROUPS.map((g) => (
            <tr key={g} className="border-b border-line"><td className="py-1.5">{AGE_GROUP_LABEL[g]}</td>{(['male', 'female'] as const).flatMap((s) => (['low', 'moderate', 'high'] as const).map((a) => <td key={s + a} className="num py-1.5 text-right">{fmt(EER_REF[s][g][a])}</td>))}</tr>
          ))}</tbody>
        </table>
        <p className="mt-1 text-[12px] text-muted">推定エネルギー必要量（kcal/日、参照体位）</p>
      </div>
    );
  }
  if (k === 'fat' || k === 'carb') {
    const r = pfcGoalRange(30);
    return <p className="text-sm">目標量：{k === 'fat' ? `${r.f.min}〜${r.f.max}` : `${r.c.min}〜${r.c.max}`}%エネルギー（1歳以上の全年齢・男女共通）</p>;
  }
  const key = k === 'na' ? 'salt' : k;
  const def = DRI[key];
  if (!def) return <p className="text-sm text-muted">食事摂取基準の表はありません。</p>;
  const d = DRI_DIGITS[key];
  const mi = usedIndicators(def.male);
  const fi = usedIndicators(def.female);
  const menses = def.femaleMenses ? usedIndicators(def.femaleMenses) : [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="text-[12px] text-muted"><th /><th colSpan={mi.length} className="py-1 text-center font-medium">男性</th><th colSpan={fi.length} className="py-1 text-center font-medium">女性{menses.length ? '（月経なし）' : ''}</th>{menses.length > 0 && <th colSpan={menses.length} className="py-1 text-center font-medium">女性（月経あり）</th>}</tr>
          <tr className="border-b border-line text-[12px] text-muted"><th className="py-1.5 text-left font-medium">年齢</th>{[...mi, ...fi, ...menses].map((i, idx) => <th key={idx} className="py-1.5 text-right font-medium">{INDICATOR_LABEL[i]}</th>)}</tr>
        </thead>
        <tbody>
          {AGE_GROUPS.map((g) => (
            <tr key={g} className="border-b border-line">
              <td className="py-1.5">{AGE_GROUP_LABEL[g]}</td>
              {mi.map((i) => <td key={'m' + i} className="num py-1.5 text-right">{cell(def.male[g], i, d)}</td>)}
              {fi.map((i) => <td key={'f' + i} className="num py-1.5 text-right">{cell(def.female[g], i, d)}</td>)}
              {menses.map((i) => <td key={'x' + i} className="num py-1.5 text-right">{cell(def.femaleMenses![g], i, d)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[12px] text-muted">単位：{NUTRIENT_MAP[key].unit}/日。{def.note}{key === 'protein' ? `　目標量（%エネルギー）：1〜49歳13〜20、50〜64歳14〜20、65歳以上15〜20。` : ''}{key === 'salt' ? '　ナトリウムの推定平均必要量：成人600mg/日（食塩相当量1.5g/日）。' : ''}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <h3 className="mb-2 text-[15px] font-bold text-brand">{title}</h3>
      <div className="text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function EntryView({ e, onSelect }: { e: DictEntry; onSelect: (k: NutrientKey) => void }) {
  const { foods } = useStore();
  const toast = useToast();
  const n = NUTRIENT_MAP[e.key];
  const rankKey = e.key === 'salt' ? 'salt' : e.key;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[24px] font-bold text-brand">{n.name}</h2>
        <Pill>{e.kind}</Pill>
        <Pill>単位 {n.unit}{n.unitNote ? `（${n.unitNote}）` : ''}</Pill>
      </div>
      <Section title="基本情報">{e.basic}</Section>
      <Section title="身体での働き"><ul className="list-disc space-y-1 pl-5">{e.functions.map((x) => <li key={x}>{x}</li>)}</ul></Section>
      <Section title="代謝との関係">{e.metabolism}</Section>
      <Section title="年齢・性別ごとの食事摂取基準（2025年版）"><DriTableView k={e.key} /></Section>
      <Section title="不足した場合に起こり得る影響"><ul className="list-disc space-y-1 pl-5">{e.deficiency.map((x) => <li key={x}>{x}</li>)}</ul></Section>
      <Section title="過剰摂取の注意点">{e.excess}</Section>
      <Section title="多く含まれる食品">
        <p>{e.foodsText}</p>
        {e.key !== 'fat' && e.key !== 'carb' && e.key !== 'energy' && (
          <div className="doc mt-2">
            <p className="text-[13px] text-muted">食品データベースから自動作成（一般的な1食あたりの量の多い順。100gあたりも併記）</p>
            <NutrientRank k={rankKey} foods={foods} limit={8} />
          </div>
        )}
      </Section>
      <Section title="関連する栄養素">
        <div className="mb-2 flex flex-wrap gap-2">{e.related.map((k) => <button key={k} type="button" onClick={() => onSelect(k)} className="rounded-full border border-sage-200 px-3 py-1 text-sm text-brand hover:bg-brand-50">{NUTRIENT_MAP[k].name}</button>)}</div>
        <p>{e.relatedText}</p>
      </Section>
      <Section title="吸収や利用に関わる要因"><ul className="list-disc space-y-1 pl-5">{e.absorption.map((x) => <li key={x}>{x}</li>)}</ul></Section>
      <Section title="患者さん向けの説明">
        <div className="rounded-xl bg-beige-50 p-4">{e.patient}</div>
        <Button size="sm" variant="ghost" className="mt-2" icon={<Copy size={14} />} onClick={async () => { try { await navigator.clipboard.writeText(e.patient); toast('コピーしました'); } catch { toast('コピーできませんでした', 'warn'); } }}>説明文をコピー</Button>
      </Section>
      <Section title="スタッフ向けの専門的な解説"><div className="rounded-xl border border-sage-200 bg-brand-50 p-4">{e.staff}</div></Section>
      <Section title="参考文献・出典"><ul className="list-disc space-y-1 pl-5 text-sm text-muted">{e.refs.map((r) => <li key={r}>{r}</li>)}<li>{DRI_SOURCE}</li></ul></Section>
    </Card>
  );
}

export default function DictionaryPage() {
  const { foods } = useStore();
  const { sub } = useNav();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<NutrientKey>((sub as NutrientKey) && DICT_MAP[sub as NutrientKey] ? (sub as NutrientKey) : 'protein');
  const query = q.trim();
  const filtered = useMemo(() => {
    if (!query) return DICTIONARY;
    return DICTIONARY.filter((d) => [NUTRIENT_MAP[d.key].name, d.kind, d.foodsText, d.basic].some((x) => x.includes(query)));
  }, [query]);
  const foodHits = useMemo(() => (query ? foods.filter((f) => foodMatches(f, query)).slice(0, 6) : []), [foods, query]);
  const kinds = [...new Set(DICTIONARY.map((d) => d.kind))];
  const entry = DICT_MAP[sel] ?? DICTIONARY[0];

  return (
    <div>
      <PageHeader title="栄養素辞典" icon={<BookOpen size={26} />} subtitle="患者さんへの説明とスタッフの学習に。栄養素名・食品名のどちらでも検索できます" />
      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="例：カルシウム、納豆、鮭" className="pl-10" aria-label="栄養素・食品で検索" />
          </div>
          {foodHits.length > 0 && (
            <Card title="食品から探す" bodyClass="pt-2">
              <ul className="space-y-2">
                {foodHits.map((f) => {
                  const notable = (Object.keys(NUTRIENT_MAP) as NutrientKey[]).filter((k) => {
                    const ref = DRI[k]?.female['30-49'];
                    const base = ref?.rda ?? ref?.ai ?? ref?.dgMin ?? null;
                    const v = f.per100[k];
                    return base && v != null && k !== 'salt' && (v * f.serving.grams) / 100 >= base * 0.15;
                  });
                  return (
                    <li key={f.id} className="rounded-lg bg-beige-50 p-2.5 text-sm">
                      <p className="font-medium">{f.name}<span className="ml-1 text-[12px] text-muted">{f.state}・{f.serving.label}</span></p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {notable.length ? notable.map((k) => <button key={k} type="button" onClick={() => setSel(k)} className="rounded-full bg-white px-2 py-0.5 text-[12px] text-brand ring-1 ring-sage-200 hover:bg-brand-50">{NUTRIENT_MAP[k].name}</button>) : <span className="text-[12px] text-muted">1食で目立つ栄養素なし</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-muted">1回量で、成人女性（30〜49歳）の推奨量・目安量・目標量の15%以上を含む栄養素</p>
            </Card>
          )}
          <Card bodyClass="pt-3">
            {kinds.map((k) => {
              const xs = filtered.filter((d) => d.kind === k);
              if (!xs.length) return null;
              return (
                <div key={k} className="mb-3 last:mb-0">
                  <p className="mb-1 text-[12px] font-bold text-sage">{k}</p>
                  <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
                    {xs.map((d) => (
                      <button key={d.key} type="button" onClick={() => setSel(d.key)} className={cx('h-10 rounded-lg px-3 text-left text-[15px]', sel === d.key ? 'bg-brand text-white' : 'bg-stone-50 hover:bg-brand-50 lg:bg-transparent')}>{NUTRIENT_MAP[d.key].name}</button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted">該当する栄養素はありません</p>}
          </Card>
        </div>
        <EntryView e={entry} onSelect={setSel} />
      </div>
    </div>
  );
}
