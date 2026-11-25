import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X, Minus } from 'lucide-react';
import type { Tone } from '../lib/calc';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export function Button({
  variant = 'secondary', size = 'md', icon, className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md'; icon?: React.ReactNode }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-700 border border-brand shadow-sm',
    secondary: 'bg-white text-brand border border-sage-200 hover:bg-brand-50',
    ghost: 'bg-transparent text-brand hover:bg-brand-50 border border-transparent',
    danger: 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50',
    subtle: 'bg-beige text-ink border border-beige-200 hover:bg-beige-200',
  };
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-[15px]',
        v[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Card({ title, subtitle, actions, children, className, bodyClass, icon }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; className?: string; bodyClass?: string; icon?: React.ReactNode;
}) {
  return (
    <section className={cx('rounded-2xl border border-line bg-white', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-2 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            {title && <h3 className="flex items-center gap-2 text-[16px] font-bold text-ink">{icon}{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx('px-4 pb-4 pt-3 sm:px-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-[24px] font-bold leading-tight text-brand sm:text-[28px]">{icon}{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, required, hint, error, children, className }: {
  label: React.ReactNode; required?: boolean; hint?: React.ReactNode; error?: string | null; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 flex items-center gap-1 text-sm font-medium text-ink">
        {label}
        {required && <span className="rounded bg-rose-50 px-1 text-[11px] font-bold text-rose-700">必須</span>}
      </span>
      {children}
      {error ? <span className="mt-1 block text-[13px] text-rose-700">{error}</span> : hint ? <span className="mt-1 block text-[13px] text-muted">{hint}</span> : null}
    </label>
  );
}

const inputCls = 'w-full rounded-lg border border-sage-200 bg-white px-3 h-11 text-ink placeholder:text-stone-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-100';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return <input type="text" className={cx(inputCls, invalid && 'border-rose-400', className)} {...rest} />;
}

/** 数値入力：空欄はnull。範囲外はエラー表示用に onValidity で通知 */
export function NumberInput({ value, onChange, min, max, step = 'any', unit, invalid, placeholder, className, ...rest }: {
  value: number | null; onChange: (v: number | null) => void; min?: number; max?: number; step?: string | number; unit?: string; invalid?: boolean; placeholder?: string; className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) { setText(value == null ? '' : String(value)); last.current = value; }
  }, [value]);
  return (
    <div className={cx('relative', className)}>
      <input
        inputMode="decimal"
        className={cx(inputCls, 'num text-right', unit && 'pr-14', invalid && 'border-rose-400')}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          const t = e.target.value.replace(/[０-９．]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
          setText(t);
          if (t.trim() === '') { last.current = null; onChange(null); return; }
          const n = Number(t);
          if (Number.isFinite(n)) { last.current = n; onChange(n); }
        }}
        {...rest}
      />
      {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{unit}</span>}
    </div>
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputCls, 'pr-8', className)} {...rest}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, 'h-auto min-h-[88px] py-2 leading-relaxed', className)} {...rest} />;
}

export function Chips({ options, value, onChange, multi, size = 'md' }: {
  options: string[]; value: string | string[] | undefined; onChange: (v: string | string[]) => void; multi?: boolean; size?: 'sm' | 'md';
}) {
  const sel = (o: string) => (multi ? Array.isArray(value) && value.includes(o) : value === o);
  return (
    <div className="flex flex-wrap gap-2" role={multi ? 'group' : 'radiogroup'}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role={multi ? 'checkbox' : 'radio'}
          aria-checked={sel(o)}
          onClick={() => {
            if (multi) {
              const cur = Array.isArray(value) ? value : [];
              onChange(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]);
            } else onChange(value === o ? '' : o);
          }}
          className={cx(
            'rounded-full border text-left transition-colors',
            size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-[15px]',
            sel(o) ? 'border-brand bg-brand text-white' : 'border-sage-200 bg-white text-ink hover:bg-brand-50',
          )}
        >
          {multi && <span className="mr-1">{sel(o) ? '✓' : '＋'}</span>}
          {o}
        </button>
      ))}
    </div>
  );
}

const toneCls: Record<Tone, string> = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
  warn: 'bg-amber-50 text-amber-900 border-amber-200',
  alert: 'bg-rose-50 text-rose-800 border-rose-200',
  muted: 'bg-stone-100 text-stone-600 border-stone-200',
};
const ToneIcon = ({ tone, size = 14 }: { tone: Tone; size?: number }) =>
  tone === 'good' ? <CheckCircle2 size={size} /> : tone === 'alert' ? <AlertOctagon size={size} /> : tone === 'warn' ? <AlertTriangle size={size} /> : tone === 'info' ? <Info size={size} /> : <Minus size={size} />;

export function Badge({ tone = 'muted', children, icon = true, className }: { tone?: Tone; children: React.ReactNode; icon?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium', toneCls[tone], className)}>
      {icon && <ToneIcon tone={tone} size={12} />}
      {children}
    </span>
  );
}

export function Notice({ tone = 'info', title, children, className }: { tone?: Tone; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cx('flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm', toneCls[tone], className)} role={tone === 'alert' ? 'alert' : undefined}>
      <span className="mt-0.5 shrink-0"><ToneIcon tone={tone} size={16} /></span>
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cx(title ? 'mt-0.5' : '', 'leading-relaxed')}>{children}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scroll-x -mx-1 mb-4">
      <div className="flex min-w-max gap-1 border-b border-line px-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cx(
              'relative h-11 whitespace-nowrap px-3 text-[15px] font-medium',
              value === t.key ? 'text-brand after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-full after:bg-brand' : 'text-muted hover:text-ink',
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1 rounded-full bg-beige px-1.5 text-[12px] text-muted">{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }: {
  open: boolean; title: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          wide === 'xl' ? 'sm:max-w-5xl' : wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-stone-100" aria-label="閉じる">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ── 確認ダイアログ（ブラウザのconfirmは使えないため自前） ──
type ConfirmOpts = { title: string; message?: React.ReactNode; ok?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [st, setSt] = useState<(ConfirmOpts & { resolve: (b: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setSt({ ...o, resolve })), []);
  const close = (b: boolean) => { st?.resolve(b); setSt(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!st}
        title={st?.title ?? ''}
        onClose={() => close(false)}
        footer={
          <>
            <Button onClick={() => close(false)}>キャンセル</Button>
            <Button variant={st?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{st?.ok ?? 'OK'}</Button>
          </>
        }
      >
        <div className="text-[15px] leading-relaxed text-ink">{st?.message}</div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

// ── トースト ──
type ToastItem = { id: number; text: string; tone: Tone };
const ToastCtx = createContext<(text: string, tone?: Tone) => void>(() => undefined);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, tone: Tone = 'good') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm shadow-lg', toneCls[t.tone], 'bg-white')}>
            <ToneIcon tone={t.tone} size={16} />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-sage-200 bg-beige-50 px-6 py-10 text-center">
      {icon && <div className="text-sage">{icon}</div>}
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, unit, sub, tone }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="num mt-0.5 text-[26px] font-bold leading-tight text-ink">
        {value}
        {unit && <span className="ml-1 whitespace-nowrap text-sm font-medium text-muted">{unit}</span>}
      </p>
      {sub && <div className={cx('mt-1 text-[13px]', tone ? '' : 'text-muted')}>{sub}</div>}
    </div>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-full bg-beige px-2 py-0.5 text-[12px] text-muted', className)}>{children}</span>;
}

export function DemoBadge() {
  return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">架空データ</span>;
}
