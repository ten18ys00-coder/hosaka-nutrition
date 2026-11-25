// 患者情報＋栄養計算の設定から、目標値一式を計算（画面から独立した純関数）
import type { NutrientKey, NutritionPlan, Patient } from '../types';
import { MICRO_KEYS } from '../data/nutrients';
import { PURPOSE_MAP } from '../data/purposes';
import { calcAge, calcBmi, calcEnergy, calcMacros, defaultPfc, driFor, evaluateBmi, primaryTarget, round, todayStr, type EnergyResult, type MacroTargets, type Target } from './calc';
import type { DriEntry } from '../data/dri2025';

export interface NutrientTarget {
  key: NutrientKey;
  dri: DriEntry | null;
  primary: Target;
  override: number | null;
  overrideNote: string;
  final: number | null; // 比較に使う値（院内目標があればそれ）
}

export interface PlanResult {
  age: number;
  bmi: number | null;
  bmiEval: ReturnType<typeof evaluateBmi>;
  energy: EnergyResult;
  bmrUsed: number | null;
  energyTarget: number | null;
  energyWarnings: string[];
  macros: MacroTargets | null;
  proteinClinic: { min: number; max: number; label: string; source: string; purpose: string } | null;
  proteinPerKgTarget: number | null; // g/日
  targets: Record<NutrientKey, NutrientTarget>;
}

export function defaultPlan(p: Patient, staff: string, id: string): NutritionPlan {
  const age = calcAge(p.birth_date) ?? 30;
  const clinic = p.purposes.map((k) => PURPOSE_MAP[k].proteinPerKg).find(Boolean);
  return {
    id, created_at: '', updated_at: '', patient_id: p.id, date: todayStr(), staff, bmr_method: age >= 18 ? 'dri' : 'dri', energy_source: 'individual',
    energy_manual: null, activity_level: p.activity_level, pfc: defaultPfc(age), protein_per_kg: clinic ? clinic.min : null, adjustments: {}, memo: '',
  };
}

export function computePlan(p: Patient, plan: NutritionPlan): PlanResult | null {
  const age = calcAge(p.birth_date);
  if (age == null) return null;
  const bmi = calcBmi(p.height_cm, p.weight_kg);
  const energy = calcEnergy({ sex: p.sex, age, heightCm: p.height_cm, weightKg: p.weight_kg, activity: plan.activity_level });
  const useNihn = plan.bmr_method === 'nihn' && age >= 18 && energy.bmrNihn != null;
  const bmrUsed = useNihn ? energy.bmrNihn : energy.bmrDri;
  let energyTarget: number | null = null;
  if (plan.energy_source === 'manual') energyTarget = plan.energy_manual;
  else if (plan.energy_source === 'reference') energyTarget = energy.eerReference;
  else energyTarget = useNihn ? energy.eerNihn : energy.eerDri;
  const warnings: string[] = [];
  if (energyTarget != null && bmrUsed != null && energyTarget < bmrUsed) warnings.push(`目標エネルギー（${energyTarget}kcal）が推定基礎代謝量（${bmrUsed}kcal）を下回っています。極端な制限にならないよう見直してください。`);
  if (plan.energy_source === 'manual' && energyTarget != null) {
    const ref = useNihn ? energy.eerNihn : energy.eerDri;
    if (ref && energyTarget < ref * 0.8) warnings.push('推定エネルギー必要量より20%以上低い設定です。継続できる範囲か確認してください。');
  }
  if (age < 18 && plan.energy_source === 'manual') warnings.push('成長期のエネルギー制限は成長に影響するおそれがあります。');

  const macros = energyTarget ? calcMacros(energyTarget, plan.pfc, age) : null;
  const clinicDef = p.purposes.map((k) => ({ k, d: PURPOSE_MAP[k].proteinPerKg })).find((x) => x.d);
  const proteinClinic = clinicDef?.d ? { ...clinicDef.d, purpose: PURPOSE_MAP[clinicDef.k].label } : null;
  const proteinPerKgTarget = plan.protein_per_kg && p.weight_kg ? round(plan.protein_per_kg * p.weight_kg, 0) : null;

  const targets = {} as Record<NutrientKey, NutrientTarget>;
  const keys: NutrientKey[] = ['protein', ...MICRO_KEYS];
  for (const k of keys) {
    const dri = driFor(k, p.sex, age, p.menstruation);
    const primary = primaryTarget(k, dri);
    const adj = plan.adjustments[k];
    const override = adj?.value ?? null;
    let final = override ?? primary.value;
    if (k === 'protein' && override == null) final = proteinPerKgTarget ?? primary.value;
    targets[k] = { key: k, dri, primary, override, overrideNote: adj?.note ?? '', final };
  }
  // エネルギー・脂質・炭水化物
  for (const k of ['energy', 'fat', 'carb'] as NutrientKey[]) {
    const adj = plan.adjustments[k];
    const base = k === 'energy' ? energyTarget : k === 'fat' ? macros?.fat.target ?? null : macros?.carb.target ?? null;
    targets[k] = {
      key: k, dri: null, primary: { value: base, basis: 'dg', kind: 'reference' }, override: adj?.value ?? null, overrideNote: adj?.note ?? '',
      final: adj?.value ?? base,
    };
  }
  return { age, bmi, bmiEval: evaluateBmi(bmi, age), energy, bmrUsed, energyTarget, energyWarnings: warnings, macros, proteinClinic, proteinPerKgTarget, targets };
}

/** 患者の最新の保存済み栄養目標（なければ既定値） */
export function latestPlan(plans: NutritionPlan[], p: Patient, staff: string): NutritionPlan {
  return plans.find((x) => x.patient_id === p.id) ?? defaultPlan(p, staff, `plan-default-${p.id}`);
}
