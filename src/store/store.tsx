import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuditDay, ClinicSettings, CollectionMap, CollectionName, Distribution, Food, GuidanceDoc, MaterialDoc, MealDay, NutritionPlan, Patient,
  Product, ProgressRecord, QuestionnaireRecord,
} from '../types';
import { COLLECTIONS, lsGetJSON, lsSetJSON, resolveBackend, type Backend, type BackendStatus, type Docs } from './backend';
import { BUILTIN_FOODS, SAMPLE_MANUAL_FOODS } from '../data/foods';
import { BUILTIN_MATERIALS } from '../data/materials';
import {
  DEFAULT_SETTINGS, DEMO_DISTRIBUTIONS, DEMO_MEAL_DAYS, DEMO_PATIENTS, DEMO_PLANS, DEMO_PROGRESS, DEMO_PRODUCTS, DEMO_QUESTIONNAIRES,
} from '../data/demo';
import { todayStr } from '../lib/calc';

const BUILTINS: { [C in CollectionName]: CollectionMap[C][] } = {
  patients: DEMO_PATIENTS,
  questionnaires: DEMO_QUESTIONNAIRES,
  plans: DEMO_PLANS,
  meal_days: DEMO_MEAL_DAYS,
  foods: [...BUILTIN_FOODS, ...SAMPLE_MANUAL_FOODS],
  materials: BUILTIN_MATERIALS,
  distributions: DEMO_DISTRIBUTIONS,
  guidance_docs: [],
  progress: DEMO_PROGRESS,
  products: DEMO_PRODUCTS,
  settings: [DEFAULT_SETTINGS],
  audit_logs: [],
};

const BUILTIN_IDS: Record<CollectionName, Set<string>> = Object.fromEntries(
  COLLECTIONS.map((c) => [c, new Set((BUILTINS[c] as { id: string }[]).map((x) => x.id))]),
) as Record<CollectionName, Set<string>>;

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function merge<T extends { id: string }>(builtin: T[], stored: Docs | undefined): T[] {
  const map = new Map<string, T>();
  for (const b of builtin) map.set(b.id, b);
  for (const [id, raw] of Object.entries(stored ?? {})) {
    if ((raw as { _deleted?: boolean })._deleted) map.delete(id);
    else map.set(id, { ...(raw as unknown as T), id });
  }
  return [...map.values()];
}

export interface StoreValue {
  status: BackendStatus;
  staff: string;
  setStaff(s: string): void;
  settings: ClinicSettings;
  patients: Patient[];
  questionnaires: QuestionnaireRecord[];
  plans: NutritionPlan[];
  mealDays: MealDay[];
  foods: Food[];
  materials: MaterialDoc[];
  distributions: Distribution[];
  guidanceDocs: GuidanceDoc[];
  progress: ProgressRecord[];
  products: Product[];
  auditDays: AuditDay[];
  foodMap: Record<string, Food>;
  patientMap: Record<string, Patient>;
  save<C extends CollectionName>(c: C, entity: CollectionMap[C], logAction?: string): Promise<void>;
  remove(c: CollectionName, id: string, logAction?: string): Promise<void>;
  removePatient(id: string): Promise<void>;
  log(action: string, target: string): void;
  isBuiltin(c: CollectionName, id: string): boolean;
  exportAll(): Record<string, Docs>;
  importAll(data: Record<string, Docs>): Promise<number>;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children, backend }: { children: React.ReactNode; backend?: () => Promise<Backend> }) {
  const [stored, setStored] = useState<Record<CollectionName, Docs>>(
    () => Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as Record<CollectionName, Docs>,
  );
  const [status, setStatus] = useState<BackendStatus>({ kind: 'local', state: 'loading' });
  const [staff, setStaffState] = useState<string>(() => lsGetJSON('staff', '保坂'));
  const backendRef = useRef<Backend | null>(null);
  const pending = useRef<(() => Promise<void>)[]>([]);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  useEffect(() => {
    let cancelled = false;
    (backend ?? resolveBackend)().then((b) => {
      if (cancelled) return;
      backendRef.current = b;
      setStatus({ kind: b.kind, state: 'loading' });
      b.start(
        (c, docs) => setStored((prev) => ({ ...prev, [c]: docs })),
        (s) => setStatus(s),
      );
      const jobs = pending.current.splice(0);
      jobs.reduce((p, job) => p.then(job).catch(() => undefined), Promise.resolve());
    });
    return () => {
      cancelled = true;
      backendRef.current?.stop();
    };
  }, []);

  const run = useCallback((job: (b: Backend) => Promise<void>) => {
    const b = backendRef.current;
    if (b) return job(b);
    return new Promise<void>((resolve, reject) => {
      pending.current.push(() => job(backendRef.current as Backend).then(resolve, reject));
    });
  }, []);

  const setStaff = useCallback((s: string) => {
    setStaffState(s);
    lsSetJSON('staff', s);
  }, []);

  const writeDoc = useCallback(
    (c: CollectionName, id: string, doc: Record<string, unknown>) => {
      const clean = JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
      setStored((prev) => ({ ...prev, [c]: { ...prev[c], [id]: clean } }));
      return run((b) => b.set(c, id, clean));
    },
    [run],
  );

  const log = useCallback(
    (action: string, target: string) => {
      const day = todayStr();
      const cur = (storedRef.current.audit_logs[day] as unknown as AuditDay | undefined) ?? { id: day, entries: [] };
      const entries = [...cur.entries, { at: new Date().toISOString(), staff, action, target }].slice(-300);
      writeDoc('audit_logs', day, { id: day, entries }).catch(() => undefined);
    },
    [staff, writeDoc],
  );

  const save = useCallback(
    async <C extends CollectionName>(c: C, entity: CollectionMap[C], logAction?: string) => {
      const now = new Date().toISOString();
      const e = entity as unknown as Record<string, unknown> & { id: string };
      const doc: Record<string, unknown> = {
        ...e,
        updated_at: now,
        updated_by: staff,
        created_at: (e.created_at as string) || now,
        created_by: (e.created_by as string) || staff,
      };
      await writeDoc(c, e.id, doc);
      if (logAction) log(logAction, String((e as { name?: string; title?: string }).name ?? (e as { title?: string }).title ?? e.id));
    },
    [staff, writeDoc, log],
  );

  const remove = useCallback(
    async (c: CollectionName, id: string, logAction?: string) => {
      if (BUILTIN_IDS[c].has(id)) {
        await writeDoc(c, id, { id, _deleted: true, updated_at: new Date().toISOString() });
      } else {
        setStored((prev) => {
          const next = { ...prev[c] };
          delete next[id];
          return { ...prev, [c]: next };
        });
        await run((b) => b.remove(c, id));
      }
      if (logAction) log(logAction, id);
    },
    [writeDoc, run, log],
  );

  const settings = useMemo<ClinicSettings>(() => {
    const s = stored.settings.main as unknown as ClinicSettings | undefined;
    return s ? { ...DEFAULT_SETTINGS, ...s } : DEFAULT_SETTINGS;
  }, [stored.settings]);

  const demoFilter = useCallback(<T extends { is_demo?: boolean }>(xs: T[]) => (settings.show_demo ? xs : xs.filter((x) => !x.is_demo)), [settings.show_demo]);

  const patients = useMemo(
    () => demoFilter(merge(BUILTINS.patients, stored.patients)).sort((a, b) => a.patient_no.localeCompare(b.patient_no)),
    [stored.patients, demoFilter],
  );
  const patientIds = useMemo(() => new Set(patients.map((p) => p.id)), [patients]);
  const linked = useCallback(<T extends { patient_id: string }>(xs: T[]) => xs.filter((x) => patientIds.has(x.patient_id)), [patientIds]);

  const questionnaires = useMemo(() => linked(merge(BUILTINS.questionnaires, stored.questionnaires)).sort((a, b) => b.date.localeCompare(a.date)), [stored.questionnaires, linked]);
  const plans = useMemo(() => linked(merge(BUILTINS.plans, stored.plans)).sort((a, b) => b.date.localeCompare(a.date)), [stored.plans, linked]);
  const mealDays = useMemo(() => linked(merge(BUILTINS.meal_days, stored.meal_days)).sort((a, b) => b.date.localeCompare(a.date)), [stored.meal_days, linked]);
  const distributions = useMemo(() => linked(merge(BUILTINS.distributions, stored.distributions)).sort((a, b) => b.date.localeCompare(a.date)), [stored.distributions, linked]);
  const progress = useMemo(() => linked(merge(BUILTINS.progress, stored.progress)).sort((a, b) => a.date.localeCompare(b.date)), [stored.progress, linked]);
  const guidanceDocs = useMemo(() => linked(merge(BUILTINS.guidance_docs, stored.guidance_docs)).sort((a, b) => b.date.localeCompare(a.date)), [stored.guidance_docs, linked]);
  const foods = useMemo(() => merge(BUILTINS.foods, stored.foods), [stored.foods]);
  const materials = useMemo(() => merge(BUILTINS.materials, stored.materials), [stored.materials]);
  const products = useMemo(() => demoFilter(merge(BUILTINS.products, stored.products)), [stored.products, demoFilter]);
  const auditDays = useMemo(() => merge(BUILTINS.audit_logs, stored.audit_logs).sort((a, b) => b.id.localeCompare(a.id)), [stored.audit_logs]);
  const foodMap = useMemo(() => Object.fromEntries(foods.map((f) => [f.id, f])), [foods]);
  const patientMap = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);

  const removePatient = useCallback(
    async (id: string) => {
      const p = patientMap[id];
      const related: [CollectionName, { id: string; patient_id: string }[]][] = [
        ['questionnaires', questionnaires], ['plans', plans], ['meal_days', mealDays], ['distributions', distributions], ['progress', progress], ['guidance_docs', guidanceDocs],
      ];
      for (const [c, xs] of related) {
        for (const x of xs.filter((r) => r.patient_id === id)) await remove(c, x.id);
      }
      await remove('patients', id);
      log('患者情報を削除', p ? `${p.patient_no} ${p.name}` : id);
    },
    [patientMap, questionnaires, plans, mealDays, distributions, progress, guidanceDocs, remove, log],
  );

  const exportAll = useCallback(() => storedRef.current, []);
  const importAll = useCallback(
    async (data: Record<string, Docs>) => {
      let n = 0;
      for (const c of COLLECTIONS) {
        const docs = data[c];
        if (!docs || typeof docs !== 'object') continue;
        for (const [id, doc] of Object.entries(docs)) {
          if (!doc || typeof doc !== 'object') continue;
          await writeDoc(c, id, { ...doc, id });
          n += 1;
        }
      }
      log('データを取り込み', `${n}件`);
      return n;
    },
    [writeDoc, log],
  );

  const value: StoreValue = {
    status, staff, setStaff, settings, patients, questionnaires, plans, mealDays, foods, materials, distributions, guidanceDocs, progress, products,
    auditDays, foodMap, patientMap, save, remove, removePatient, log,
    isBuiltin: (c, id) => BUILTIN_IDS[c].has(id),
    exportAll, importAll,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider がありません');
  return v;
}

// ── 入力途中の下書き（画面遷移しても消えないように保持） ──
const draftMem = new Map<string, unknown>();

export function useDraft<T>(key: string, initial: () => T): [T, (v: T | ((p: T) => T)) => void, () => void] {
  const [val, setVal] = useState<T>(() => {
    if (draftMem.has(key)) return draftMem.get(key) as T;
    const fromLs = lsGetJSON<T | null>('draft:' + key, null);
    return fromLs ?? initial();
  });
  const keyRef = useRef(key);
  useEffect(() => {
    if (keyRef.current !== key) {
      keyRef.current = key;
      const next = draftMem.has(key) ? (draftMem.get(key) as T) : lsGetJSON<T | null>('draft:' + key, null) ?? initial();
      setVal(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
        draftMem.set(keyRef.current, next);
        lsSetJSON('draft:' + keyRef.current, next);
        return next;
      });
    },
    [],
  );
  const clear = useCallback(() => {
    draftMem.delete(keyRef.current);
    try { window.localStorage.removeItem('hosaka-nutrition:v1:draft:' + keyRef.current); } catch { /* noop */ }
  }, []);
  return [val, set, clear];
}

export function nextPatientNo(patients: Patient[]): string {
  const max = patients.reduce((m, p) => {
    const n = Number(p.patient_no.replace(/\D/g, ''));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `P-${String(max + 1).padStart(4, '0')}`;
}
