import React, { useState } from 'react';
import { Cloud, HardDrive, Loader2, Menu, ShieldAlert, X } from 'lucide-react';
import { StoreProvider, useStore } from './store/store';
import { NavProvider, PAGES, useNav, type PageKey } from './components/nav';
import { ConfirmProvider, ToastProvider, cx } from './components/ui';
import { AuthGate } from './components/AuthGate';
import { SupabaseBackend } from './store/supabase';
import { APP_VERSION, IS_WEB } from './config';
import HomePage from './pages/Home';
import PatientsPage from './pages/Patients';
import QuestionnairePage from './pages/Questionnaire';
import CalcPage from './pages/Calc';
import MealsPage from './pages/Meals';
import GuidancePage from './pages/Guidance';
import ProgressPage from './pages/Progress';
import DictionaryPage from './pages/Dictionary';
import FoodsPage from './pages/Foods';
import LibraryPage from './pages/Library';
import ProductsPage from './pages/Products';
import ConfigPage from './pages/Config';

const PAGE_COMPONENTS: Record<PageKey, React.ComponentType> = {
  home: HomePage, patients: PatientsPage, questionnaire: QuestionnairePage, calc: CalcPage, meals: MealsPage, guidance: GuidancePage,
  progress: ProgressPage, dictionary: DictionaryPage, foods: FoodsPage, library: LibraryPage, products: ProductsPage, config: ConfigPage,
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden>
        <rect width="34" height="34" rx="9" fill="#214d3d" />
        <path d="M10 24c0-7 4.5-12 14-13-1 9-6 13.5-14 13Z" fill="#cfdcd4" />
        <path d="M10.5 24c2.8-3.6 6-6.2 10-8" stroke="#214d3d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <p className="font-serif text-[17px] font-bold tracking-wide text-brand">HOSAKA Nutrition</p>
        <p className="text-[11px] text-muted">ほさか整骨院 栄養指導システム</p>
      </div>
    </div>
  );
}

function StatusChip() {
  const { status } = useStore();
  const label =
    status.state === 'loading' ? 'データ接続中' :
    status.kind === 'cloud' ? (status.state === 'ready' ? (IS_WEB ? '同期中（クラウド）' : 'クラウド保存') : status.state === 'readonly' ? '閲覧のみ' : '保存・通信エラー') :
    'この端末に保存';
  const Icon = status.state === 'loading' ? Loader2 : status.kind === 'cloud' ? Cloud : HardDrive;
  return (
    <span
      title={status.message ?? (status.kind === 'cloud' ? (IS_WEB ? 'Supabase（東京）に保存し、院のスマホ・パソコン間でリアルタイムに同期' : 'claude.ai のアーティファクト用データベースに保存（院内の端末間で共有）') : 'このブラウザだけに保存（他の端末とは共有されません）')}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
        status.state === 'error' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-sage-200 bg-white text-muted',
      )}
    >
      <Icon size={13} className={status.state === 'loading' ? 'animate-spin' : ''} />
      <span className={status.state === 'error' ? '' : 'hidden sm:inline'}>{label}</span>
    </span>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { page, go } = useNav();
  let lastGroup = '';
  return (
    <nav className="flex flex-col gap-0.5" aria-label="メニュー">
      {PAGES.map((p, i) => {
        const header = p.group && p.group !== lastGroup ? p.group : null;
        lastGroup = p.group;
        const Icon = p.icon;
        return (
          <React.Fragment key={p.key}>
            {header && <p className="mt-4 px-3 pb-1 text-[12px] font-bold text-sage">{header}</p>}
            <button
              type="button"
              onClick={() => { go(p.key); onNavigate?.(); }}
              className={cx(
                'flex h-11 items-center gap-3 rounded-lg px-3 text-left text-[15px] transition-colors',
                page === p.key ? 'bg-brand text-white' : 'text-ink hover:bg-brand-50',
              )}
              aria-current={page === p.key ? 'page' : undefined}
            >
              <Icon size={18} />
              <span className="flex-1">{p.label}</span>
              <span className={cx('num text-[11px]', page === p.key ? 'text-white/70' : 'text-stone-400')}>{i + 1}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function StaffSelect() {
  const { staff, setStaff, settings } = useStore();
  const list = settings.staff_list.includes(staff) ? settings.staff_list : [staff, ...settings.staff_list];
  return (
    <label className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted">
      <span className="hidden sm:inline">担当</span>
      <select value={staff} onChange={(e) => setStaff(e.target.value)} className="h-9 rounded-lg border border-sage-200 bg-white px-2 text-[14px] text-ink" aria-label="担当スタッフ">
        {list.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}

function Shell() {
  const { page } = useNav();
  const [open, setOpen] = useState(false);
  const Page = PAGE_COMPONENTS[page];
  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-beige-50 lg:flex">
        <div className="px-4 py-4"><Logo /></div>
        <div className="flex-1 overflow-y-auto px-3 pb-4"><Sidebar /></div>
        <div className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">
          {APP_VERSION}　栄養計算は決定論的プログラムで実施。医学的診断・疾患別の食事療法は行いません。
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-[280px] overflow-y-auto bg-beige-50 px-3 py-4 shadow-xl" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between px-1">
              <Logo />
              <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white" onClick={() => setOpen(false)} aria-label="メニューを閉じる"><X size={20} /></button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-2 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-6" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-brand-50 lg:hidden" onClick={() => setOpen(true)} aria-label="メニューを開く"><Menu size={22} /></button>
            <div className="lg:hidden"><span className="whitespace-nowrap font-serif text-[16px] font-bold text-brand">HOSAKA Nutrition</span></div>
            <p className="hidden text-sm text-muted lg:block">{PAGES.find((p) => p.key === page)?.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusChip />
            <StaffSelect />
          </div>
        </header>
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900 sm:px-6">
          <ShieldAlert size={15} className="mt-0.5 shrink-0" />
          <span><span className="sm:hidden">食品データは試作値を含みます。医学的診断は行いません。</span><span className="hidden sm:inline">{APP_VERSION}：初期の食品データは成分表を参考にした試作値（公式値と未照合）を含みます。本アプリは一般的な栄養指導を支援するツールで、医学的診断や疾患別の食事療法は行いません。</span></span>
        </div>
        <main className="mx-auto max-w-[1240px] px-3 py-5 sm:px-6 sm:py-7" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)' }}>
          <Page />
        </main>
      </div>
    </div>
  );
}

function Providers() {
  return (
    <NavProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Shell />
        </ConfirmProvider>
      </ToastProvider>
    </NavProvider>
  );
}

export default function App() {
  if (IS_WEB) {
    return (
      <AuthGate>
        <StoreProvider backend={async () => new SupabaseBackend()}>
          <Providers />
        </StoreProvider>
      </AuthGate>
    );
  }
  return (
    <StoreProvider>
      <Providers />
    </StoreProvider>
  );
}
