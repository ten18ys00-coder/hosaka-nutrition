import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarHeart, ChefHat, ClipboardList, Leaf, Search, Sprout } from 'lucide-react';
import { useStore } from '../store/store';
import { PAGES, useNav } from '../components/nav';
import { Button, Card, DemoBadge, Pill, Stat, TextInput } from '../components/ui';
import { MONTHLY_THEMES, RECIPES } from '../data/seasonal';
import { calcAge, fmt } from '../lib/calc';
import { recipeTotals } from '../components/MaterialBody';
import { PURPOSE_MAP } from '../data/purposes';

export default function HomePage() {
  const { patients, progress, questionnaires, guidanceDocs, materials, foodMap, patientMap, settings } = useStore();
  const { go } = useNav();
  const [q, setQ] = useState('');
  const now = new Date();
  const month = now.getMonth() + 1;
  const ym = `${now.getFullYear()}-${String(month).padStart(2, '0')}`;
  const theme = MONTHLY_THEMES.find((t) => t.month === month)!;
  const recipes = RECIPES.filter((r) => r.months.includes(month)).slice(0, 3);
  const monthlyMaterials = materials.filter((m) => m.category === '季節・毎月' || m.month === month).slice(0, 4);
  const active = patients.filter((p) => p.guidance_active);

  const recent = useMemo(() => {
    const rows: { date: string; patientId: string; kind: string; text: string; page: 'progress' | 'questionnaire' | 'guidance'; sub?: string }[] = [];
    progress.forEach((r) => rows.push({ date: r.date, patientId: r.patient_id, kind: '経過・指導', text: r.guidance_content || r.habit_improvement, page: 'progress' }));
    questionnaires.forEach((r) => rows.push({ date: r.date, patientId: r.patient_id, kind: '栄養問診', text: r.free_text, page: 'questionnaire', sub: r.id }));
    guidanceDocs.forEach((r) => rows.push({ date: r.date, patientId: r.patient_id, kind: '指導書', text: r.priorities, page: 'guidance', sub: r.id }));
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  }, [progress, questionnaires, guidanceDocs]);

  const hits = q.trim() ? patients.filter((p) => [p.name, p.name_kana, p.patient_no].some((x) => x.toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-brand px-5 py-6 text-white sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/70">{settings.clinic_name} 栄養指導システム</p>
            <h1 className="mt-1 font-serif text-[28px] font-bold leading-tight sm:text-[36px]">HOSAKA Nutrition</h1>
            <p className="mt-2 max-w-xl text-[15px] text-white/85">痛みは結果。食事は、体を修理するための材料です。根拠に基づいた栄養指導で、10年後の体に伴走します。</p>
          </div>
          <div className="w-full max-w-sm">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="患者を検索（氏名・ふりがな・番号）" className="pl-10" aria-label="患者検索" />
            </div>
            {hits.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-xl bg-white text-ink shadow-lg">
                {hits.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-brand-50" onClick={() => go('patients', { patientId: p.id, sub: p.id })}>
                      <span><span className="text-[12px] text-muted">{p.patient_no}</span> {p.name}</span>
                      <span className="text-sm text-muted">{calcAge(p.birth_date)}歳</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {q.trim() && hits.length === 0 && <p className="mt-2 text-sm text-white/80">該当する患者がいません</p>}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="登録患者数" value={patients.length} unit="名" sub={settings.show_demo ? '架空データを含む' : undefined} />
        <Stat label="栄養指導中" value={active.length} unit="名" />
        <Stat label="今月の問診" value={questionnaires.filter((x) => x.date.startsWith(ym)).length} unit="件" />
        <Stat label="今月の指導記録" value={progress.filter((x) => x.date.startsWith(ym)).length + guidanceDocs.filter((x) => x.date.startsWith(ym)).length} unit="件" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title="最近の栄養指導記録" icon={<ClipboardList size={18} />} actions={<Button size="sm" variant="ghost" onClick={() => go('patients')}>患者一覧 <ArrowRight size={14} /></Button>}>
          <ul className="divide-y divide-line">
            {recent.map((r, i) => {
              const p = patientMap[r.patientId];
              return (
                <li key={i}>
                  <button type="button" onClick={() => go(r.page, { patientId: r.patientId, sub: r.sub })} className="flex w-full items-start gap-3 py-2.5 text-left hover:bg-brand-50/50">
                    <span className="num w-[84px] shrink-0 pt-0.5 text-sm text-muted">{r.date}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5"><Pill>{r.kind}</Pill><span className="font-medium text-ink">{p?.name ?? '—'}</span>{p?.is_demo && <DemoBadge />}</span>
                      {r.text && <span className="mt-0.5 block truncate text-sm text-muted">{r.text}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
            {recent.length === 0 && <li className="py-6 text-center text-sm text-muted">記録はまだありません</li>}
          </ul>
        </Card>

        <div className="space-y-5">
          <Card title={`${month}月の栄養テーマ`} icon={<CalendarHeart size={18} />}>
            <p className="text-[17px] font-bold text-brand">{theme.theme}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{theme.message}</p>
          </Card>
          <Card title={`${month}月の旬の食材`} icon={<Sprout size={18} />}>
            <div className="flex flex-wrap gap-2">{theme.foods.map((f) => <span key={f} className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-3 py-1 text-sm text-brand"><Leaf size={13} />{f}</span>)}</div>
          </Card>
        </div>
      </div>

      <Card title="各機能へ">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PAGES.filter((p) => p.key !== 'home').map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.key} type="button" onClick={() => go(p.key)} className="flex min-h-[84px] flex-col items-start justify-between rounded-xl border border-line bg-beige-50 p-3 text-left transition-colors hover:border-sage hover:bg-brand-50">
                <Icon size={20} />
                <span className="text-[14px] font-medium text-ink">{p.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="おすすめレシピ" icon={<ChefHat size={18} />} actions={<Button size="sm" variant="ghost" onClick={() => go('library', { sub: 'm-recipes' })}>資料で見る <ArrowRight size={14} /></Button>}>
          <ul className="space-y-3">
            {recipes.map((r) => {
              const t = recipeTotals(r.id, foodMap);
              return (
                <li key={r.id} className="rounded-xl border border-line p-3">
                  <p className="font-bold text-ink">{r.title}</p>
                  <p className="text-[13px] text-muted">{r.purpose}</p>
                  {t && <p className="num mt-1 text-[13px]">1人分 {fmt(t.values.energy)}kcal・たんぱく質 {fmt(t.values.protein, 1)}g・食塩 {fmt(t.values.salt, 1)}g</p>}
                </li>
              );
            })}
          </ul>
        </Card>
        <Card title="今月の配布資料" icon={<ClipboardList size={18} />} actions={<Button size="sm" variant="ghost" onClick={() => go('library')}>資料ライブラリ <ArrowRight size={14} /></Button>}>
          <ul className="space-y-2">
            {monthlyMaterials.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => go('library', { sub: m.id })} className="flex w-full items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-brand-50">
                  <span><span className="font-medium text-ink">{m.title}</span><span className="block text-[13px] text-muted">{m.summary}</span></span>
                  <ArrowRight size={16} className="shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {active.flatMap((p) => p.purposes).filter((v, i, a) => a.indexOf(v) === i).map((k) => <Pill key={k}>指導中の目的：{PURPOSE_MAP[k].short}</Pill>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
