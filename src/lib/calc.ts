// 栄養計算ロジック（画面表示から分離した決定論的な純関数）
import type { ActivityLevel, Menstruation, NutrientKey, Sex } from '../types';
import {
  AGE_GROUP_LABEL,
  BMR_STANDARD,
  DRI,
  EER_REF,
  ENERGY_STORAGE,
  PAL,
  TARGET_BMI,
  ageGroupOf,
  pfcGoalRange,
  type AgeGroup,
  type DriEntry,
} from '../data/dri2025';

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calcAge(birth: string, on: string = todayStr()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = on.split('-').map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export function round(v: number, digits = 0): number {
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

export function calcBmi(heightCm: number | null | undefined, weightKg: number | null | undefined): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const m = heightCm / 100;
  return round(weightKg / (m * m), 1);
}

export type Tone = 'good' | 'info' | 'warn' | 'alert' | 'muted';

export interface BmiEvaluation {
  label: string;
  tone: Tone;
  target?: { min: number; max: number };
  note: string;
}

/** BMI評価：18歳以上のみ成人基準（日本肥満学会の判定基準＋食事摂取基準の目標とするBMI）で評価 */
export function evaluateBmi(bmi: number | null, age: number | null): BmiEvaluation {
  if (bmi == null || age == null) return { label: '未計算', tone: 'muted', note: '身長・体重・生年月日を入力してください。' };
  if (age < 18) {
    return {
      label: '成人基準では評価しません',
      tone: 'info',
      note: '18歳未満は成人のBMI基準を当てはめず、成長曲線や肥満度（性別・年齢・身長別標準体重）で評価します。',
    };
  }
  let label = '';
  let tone: Tone = 'good';
  if (bmi < 18.5) { label = '低体重'; tone = 'warn'; }
  else if (bmi < 25) { label = '普通体重'; tone = 'good'; }
  else if (bmi < 30) { label = '肥満（1度）'; tone = 'warn'; }
  else if (bmi < 35) { label = '肥満（2度）'; tone = 'alert'; }
  else if (bmi < 40) { label = '肥満（3度）'; tone = 'alert'; }
  else { label = '肥満（4度）'; tone = 'alert'; }
  const t = TARGET_BMI.find((r) => age >= r.from && age <= r.to);
  let note = '判定区分：日本肥満学会。';
  if (t) {
    if (bmi < t.min) {
      note += `食事摂取基準の目標とするBMI（${t.min}〜${t.max}）を下回っています。`;
      if (age >= 65) { tone = 'warn'; note += '高齢者では低栄養・フレイルに注意。'; }
    } else if (bmi > t.max) {
      note += `目標とするBMI（${t.min}〜${t.max}）を上回っています。`;
    } else {
      note += `目標とするBMI（${t.min}〜${t.max}）の範囲内です。`;
    }
  }
  return { label, tone, target: t ? { min: t.min, max: t.max } : undefined, note };
}

export interface EnergyInput {
  sex: Sex;
  age: number;
  heightCm: number | null;
  weightKg: number | null;
  activity: ActivityLevel;
}

export interface EnergyResult {
  group: AgeGroup | null;
  groupLabel: string;
  stage: 'child' | 'adult' | 'elderly' | 'out';
  bmrStandard: number | null; // 基礎代謝基準値
  bmrDri: number | null; // 基礎代謝基準値×実体重
  bmrNihn: number | null; // 国立健康・栄養研究所の式
  pal: number | null;
  palAvailable: boolean;
  storage: number; // エネルギー蓄積量
  eerDri: number | null; // 基礎代謝基準値×体重×PAL(+蓄積量)
  eerNihn: number | null;
  eerReference: number | null; // 参照体位での推定エネルギー必要量（告示 参考一）
  notes: string[];
}

/** 国立健康・栄養研究所の式（Ganpule et al. 2007）kcal/日。18歳以上のみ */
export function bmrNihnFormula(sex: Sex, age: number, heightCm: number, weightKg: number): number {
  const c = sex === 'male' ? 0.4235 : 0.9708;
  const mj = 0.0481 * weightKg + 0.0234 * heightCm - 0.0138 * age - c;
  return round((mj * 1000) / 4.186, 0);
}

export function calcEnergy(input: EnergyInput): EnergyResult {
  const { sex, age, heightCm, weightKg, activity } = input;
  const group = ageGroupOf(age);
  const notes: string[] = [];
  if (!group) {
    return {
      group: null, groupLabel: '対象外', stage: 'out', bmrStandard: null, bmrDri: null, bmrNihn: null, pal: null,
      palAvailable: false, storage: 0, eerDri: null, eerNihn: null, eerReference: null,
      notes: ['本アプリは6歳以上を対象としています。乳幼児は医師・管理栄養士にご相談ください。'],
    };
  }
  const stage = age < 18 ? 'child' : age >= 65 ? 'elderly' : 'adult';
  const std = BMR_STANDARD[sex][group];
  const palV = PAL[group][activity];
  const storage = ENERGY_STORAGE[sex][group] ?? 0;
  const bmrDri = std != null && weightKg ? round(std * weightKg, 0) : null;
  let bmrNihn: number | null = null;
  if (age >= 18 && heightCm && weightKg) bmrNihn = bmrNihnFormula(sex, age, heightCm, weightKg);
  if (age < 18) notes.push('18歳未満のため、成人用の推定式（国立健康・栄養研究所の式）は使用しません。基礎代謝基準値×体重×身体活動レベル＋エネルギー蓄積量で算出しています。');
  if (!palV) notes.push(`${AGE_GROUP_LABEL[group]}では身体活動レベル「高い」は設定されていません。「ふつう」で計算してください。`);
  const eerDri = bmrDri != null && palV ? round(bmrDri * palV + storage, 0) : null;
  const eerNihn = bmrNihn != null && palV ? round(bmrNihn * palV, 0) : null;
  const eerReference = EER_REF[sex][group][activity];
  if (age >= 18 && heightCm && weightKg) {
    const b = weightKg / (heightCm / 100) ** 2;
    if (b >= 25) notes.push('BMI 25以上では、基礎代謝基準値×実体重は基礎代謝量を過大評価しやすいため、国立健康・栄養研究所の式の値も参考にしてください。');
    if (b < 18.5) notes.push('BMI 18.5未満では、基礎代謝基準値×実体重は基礎代謝量を過小評価する可能性があります。');
  }
  notes.push('推定エネルギー必要量はあくまで推定値です。体重・体組成の変化を見ながら調整します（体重の変化がエネルギー収支の最もよい指標）。');
  return {
    group, groupLabel: AGE_GROUP_LABEL[group], stage, bmrStandard: std, bmrDri, bmrNihn, pal: palV,
    palAvailable: palV != null, storage, eerDri, eerNihn, eerReference, notes,
  };
}

/** 指定した栄養素の食事摂取基準（年齢・性別・月経の有無） */
export function driFor(key: NutrientKey, sex: Sex, age: number, menses: Menstruation = 'unknown'): DriEntry | null {
  const group = ageGroupOf(age);
  const def = DRI[key];
  if (!group || !def) return null;
  if (key === 'fe' && sex === 'female' && menses === 'yes' && def.femaleMenses) {
    const m = def.femaleMenses[group];
    if (m.rda != null) return m;
  }
  return def[sex][group];
}

export interface Target {
  value: number | null;
  basis: 'rda' | 'ai' | 'dg' | 'manual' | 'none';
  kind: 'atLeast' | 'lessThan' | 'range' | 'reference';
  min?: number | null;
  max?: number | null;
}

/** 比較に使う基準：推奨量 → 目安量 → 目標量 の順 */
export function primaryTarget(key: NutrientKey, e: DriEntry | null): Target {
  if (!e) return { value: null, basis: 'none', kind: 'reference' };
  if (key === 'salt' && e.dgMax != null) return { value: e.dgMax, basis: 'dg', kind: 'lessThan', max: e.dgMax };
  if (e.rda != null) return { value: e.rda, basis: 'rda', kind: 'atLeast' };
  if (key === 'k' && e.dgMin != null) return { value: e.dgMin, basis: 'dg', kind: 'atLeast', min: e.dgMin };
  if (e.ai != null) return { value: e.ai, basis: 'ai', kind: 'atLeast' };
  if (e.dgMin != null) return { value: e.dgMin, basis: 'dg', kind: 'atLeast', min: e.dgMin };
  if (e.ear != null) return { value: e.ear, basis: 'none', kind: 'reference' };
  return { value: null, basis: 'none', kind: 'reference' };
}

export interface MacroTargets {
  energy: number;
  protein: { min: number; max: number; target: number };
  fat: { min: number; max: number; target: number };
  carb: { min: number; max: number; target: number };
}

/** PFCの目標量（%エネルギー）からg/日を計算 */
export function calcMacros(energy: number, pfc: { p: number; f: number; c: number }, age: number): MacroTargets {
  const r = pfcGoalRange(age);
  return {
    energy,
    protein: { min: round((energy * r.p.min) / 100 / 4, 0), max: round((energy * r.p.max) / 100 / 4, 0), target: round((energy * pfc.p) / 100 / 4, 0) },
    fat: { min: round((energy * r.f.min) / 100 / 9, 0), max: round((energy * r.f.max) / 100 / 9, 0), target: round((energy * pfc.f) / 100 / 9, 0) },
    carb: { min: round((energy * r.c.min) / 100 / 4, 0), max: round((energy * r.c.max) / 100 / 4, 0), target: round((energy * pfc.c) / 100 / 4, 0) },
  };
}

export function defaultPfc(age: number): { p: number; f: number; c: number } {
  if (age >= 65) return { p: 17, f: 25, c: 58 };
  if (age >= 50) return { p: 16, f: 25, c: 59 };
  return { p: 15, f: 25, c: 60 };
}

export interface PfcCheck {
  ok: boolean;
  messages: string[];
}

export function checkPfc(pfc: { p: number; f: number; c: number }, age: number): PfcCheck {
  const r = pfcGoalRange(age);
  const msgs: string[] = [];
  const sum = round(pfc.p + pfc.f + pfc.c, 1);
  if (sum !== 100) msgs.push(`合計が${sum}%です（100%にしてください）。`);
  if (pfc.p < r.p.min || pfc.p > r.p.max) msgs.push(`たんぱく質が目標量（${r.p.min}〜${r.p.max}%）の範囲外です。`);
  if (pfc.f < r.f.min || pfc.f > r.f.max) msgs.push(`脂質が目標量（${r.f.min}〜${r.f.max}%）の範囲外です。`);
  if (pfc.c < r.c.min || pfc.c > r.c.max) msgs.push(`炭水化物が目標量（${r.c.min}〜${r.c.max}%）の範囲外です。`);
  return { ok: msgs.length === 0, messages: msgs };
}

export interface IntakeStatus {
  label: string;
  tone: Tone;
  pct: number | null;
}

/**
 * 摂取量の評価（食事摂取基準の指標ごとの考え方に沿って表示）
 * ・推定平均必要量未満：不足の確率が高い／推奨量以上：不足の確率は低い
 * ・目安量以上：不足の可能性は低い／目安量未満：不足かどうか判断できない
 * ・目標量：範囲内か（以上・未満）
 * ・耐容上限量：通常の食品が対象の栄養素のみ判定
 */
export function evaluateIntake(key: NutrientKey, intake: number | null, e: DriEntry | null, override?: number | null): IntakeStatus {
  if (intake == null) return { label: '未確認', tone: 'muted', pct: null };
  const def = DRI[key];
  if (override != null && override > 0) {
    const pct = round((intake / override) * 100, 0);
    if (key === 'salt') return { label: intake < override ? '院内目標の範囲内' : '院内目標を超過', tone: intake < override ? 'good' : 'warn', pct };
    return { label: pct >= 100 ? '院内目標を達成' : '院内目標未満', tone: pct >= 100 ? 'good' : 'warn', pct };
  }
  if (!e) return { label: '基準なし', tone: 'muted', pct: null };
  if (e.ul != null && def?.ulScope === 'food' && intake >= e.ul) {
    return { label: '耐容上限量以上（要確認）', tone: 'alert', pct: null };
  }
  if (key === 'salt' && e.dgMax != null) {
    const pct = round((intake / e.dgMax) * 100, 0);
    return intake < e.dgMax ? { label: '目標量の範囲内', tone: 'good', pct } : { label: '目標量を超えている', tone: 'warn', pct };
  }
  if (e.rda != null) {
    const pct = round((intake / e.rda) * 100, 0);
    if (e.ear != null && intake < e.ear) return { label: '推定平均必要量未満', tone: 'alert', pct };
    if (intake < e.rda) return { label: '推奨量未満', tone: 'warn', pct };
    return { label: '推奨量以上', tone: 'good', pct };
  }
  if (key === 'k' && e.dgMin != null) {
    const pct = round((intake / e.dgMin) * 100, 0);
    if (intake >= e.dgMin) return { label: '目標量以上', tone: 'good', pct };
    if (e.ai != null && intake >= e.ai) return { label: '目安量以上・目標量未満', tone: 'info', pct };
    return { label: '目標量未満', tone: 'warn', pct };
  }
  if (e.ai != null) {
    const pct = round((intake / e.ai) * 100, 0);
    return intake >= e.ai
      ? { label: '目安量以上', tone: 'good', pct }
      : { label: '目安量未満', tone: 'info', pct };
  }
  if (e.dgMin != null) {
    const pct = round((intake / e.dgMin) * 100, 0);
    return intake >= e.dgMin ? { label: '目標量以上', tone: 'good', pct } : { label: '目標量未満', tone: 'warn', pct };
  }
  if (e.ear != null) {
    const pct = round((intake / e.ear) * 100, 0);
    return intake >= e.ear ? { label: '推定平均必要量以上', tone: 'good', pct } : { label: '推定平均必要量未満', tone: 'warn', pct };
  }
  return { label: '基準なし', tone: 'muted', pct: null };
}

/** 目標栄養量から必要な食品重量を逆算（可食部g） */
export function gramsForTarget(per100: number | null | undefined, target: number): number | null {
  if (per100 == null || per100 <= 0 || target <= 0) return null;
  return round((target / per100) * 100, 0);
}

export function fmt(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—';
  return v.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** 「約1.3人前」「大さじ約2」のような目安表記 */
export function approxUnit(unit: string, n: number): string {
  const name = unit.replace(/（.*?）/g, '');
  if (/^(大さじ|小さじ)/.test(name)) return `${name}約${n}`;
  return `約${n}${name}`;
}
