import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  BookOpen, Calculator, ClipboardList, Database, FileText, FolderOpen, Home, Package, Settings, TrendingUp, Users, UtensilsCrossed, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store/store';
import { lsGetJSON, lsSetJSON } from '../store/backend';
import { calcAge } from '../lib/calc';
import { Select, cx } from './ui';

export type PageKey = 'home' | 'patients' | 'questionnaire' | 'calc' | 'meals' | 'guidance' | 'progress' | 'dictionary' | 'foods' | 'library' | 'products' | 'config';

export const PAGES: { key: PageKey; label: string; icon: LucideIcon; group: string }[] = [
  { key: 'home', label: 'ホーム', icon: Home, group: '' },
  { key: 'patients', label: '患者管理', icon: Users, group: '患者' },
  { key: 'questionnaire', label: '栄養問診', icon: ClipboardList, group: '患者' },
  { key: 'calc', label: '栄養計算', icon: Calculator, group: '患者' },
  { key: 'meals', label: '食事分析', icon: UtensilsCrossed, group: '患者' },
  { key: 'guidance', label: '個別栄養指導', icon: FileText, group: '患者' },
  { key: 'progress', label: '経過管理', icon: TrendingUp, group: '患者' },
  { key: 'dictionary', label: '栄養素辞典', icon: BookOpen, group: '知識・資料' },
  { key: 'foods', label: '食品データベース', icon: Database, group: '知識・資料' },
  { key: 'library', label: '資料ライブラリ', icon: FolderOpen, group: '知識・資料' },
  { key: 'products', label: '商品管理', icon: Package, group: '院内' },
  { key: 'config', label: '設定', icon: Settings, group: '院内' },
];

interface NavValue {
  page: PageKey;
  go: (p: PageKey, opts?: { patientId?: string; sub?: string }) => void;
  patientId: string | null;
  setPatientId: (id: string | null) => void;
  sub: string | null;
  setSub: (s: string | null) => void;
}

const NavCtx = createContext<NavValue | null>(null);

function pageFromHash(): PageKey {
  const h = window.location.hash.replace('#', '');
  return (PAGES.find((p) => p.key === h)?.key ?? 'home') as PageKey;
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<PageKey>(pageFromHash);
  const [patientId, setPid] = useState<string | null>(() => lsGetJSON<string | null>('patient', 'pt-demo-1'));
  const [sub, setSub] = useState<string | null>(null);

  React.useEffect(() => {
    const h = () => setPage(pageFromHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const value = useMemo<NavValue>(
    () => ({
      page,
      sub,
      setSub,
      patientId,
      setPatientId: (id) => { setPid(id); lsSetJSON('patient', id); },
      go: (p, opts) => {
        if (opts?.patientId) { setPid(opts.patientId); lsSetJSON('patient', opts.patientId); }
        setSub(opts?.sub ?? null);
        setPage(p);
        try { if (window.location.hash !== '#' + p) window.history.replaceState(null, '', '#' + p); } catch { /* noop */ }
        window.scrollTo({ top: 0 });
      },
    }),
    [page, patientId, sub],
  );
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
}

export function useNav() {
  const v = useContext(NavCtx);
  if (!v) throw new Error('NavProvider がありません');
  return v;
}

/** 対象患者の選択（各機能の上部に表示） */
export function PatientPicker({ className }: { className?: string }) {
  const { patients } = useStore();
  const { patientId, setPatientId } = useNav();
  return (
    <div className={cx('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm font-medium text-muted">対象患者</span>
      <Select value={patientId ?? ''} onChange={(e) => setPatientId(e.target.value || null)} className="w-auto min-w-[260px] max-w-full" aria-label="対象患者">
        <option value="">— 患者を選択 —</option>
        {patients.map((p) => (
          <option key={p.id} value={p.id}>
            {p.patient_no} {p.name}（{calcAge(p.birth_date) ?? '?'}歳・{p.sex === 'male' ? '男' : '女'}）
          </option>
        ))}
      </Select>
    </div>
  );
}

export function useCurrentPatient() {
  const { patientMap } = useStore();
  const { patientId } = useNav();
  return patientId ? patientMap[patientId] ?? null : null;
}
