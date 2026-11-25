// ドメイン型定義
// フィールド名は将来 Supabase(PostgreSQL) のカラム名にそのまま使えるよう snake_case で統一しています。

export type Sex = 'male' | 'female';
export type ActivityLevel = 'low' | 'moderate' | 'high'; // 低い / ふつう / 高い
export type Menstruation = 'yes' | 'no' | 'unknown';

export type PurposeKey =
  | 'athlete'
  | 'muscle'
  | 'frailty'
  | 'bone'
  | 'beauty'
  | 'weight'
  | 'sleep'
  | 'recovery';

export type NutrientKey =
  | 'energy'
  | 'protein'
  | 'fat'
  | 'carb'
  | 'fiber'
  | 'vitA'
  | 'vitD'
  | 'vitE'
  | 'vitK'
  | 'vitB1'
  | 'vitB2'
  | 'niacin'
  | 'vitB6'
  | 'vitB12'
  | 'folate'
  | 'pantothenic'
  | 'biotin'
  | 'vitC'
  | 'na'
  | 'salt'
  | 'k'
  | 'ca'
  | 'mg'
  | 'p'
  | 'fe'
  | 'zn';

/** 栄養素量。null / undefined は「未確認（未収載）」で、0 とは区別する */
export type NutrientValues = Partial<Record<NutrientKey, number | null>>;

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  is_demo?: boolean;
}

export interface StudentInfo {
  sport: string;
  practice_frequency: string;
  practice_hours: number | null;
  injury: string;
  growth: string;
  snacking: string;
}

export interface Patient extends BaseEntity {
  patient_no: string;
  name: string;
  name_kana: string;
  birth_date: string; // YYYY-MM-DD
  sex: Sex;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  occupation: string;
  activity_level: ActivityLevel;
  exercise_habit: string;
  sleep_hours: number | null;
  medical_history: string;
  medications: string;
  allergies: string;
  visit_status: '通院中' | '経過観察' | '休止' | '終了';
  purposes: PurposeKey[];
  purpose_note: string;
  staff_memo: string;
  menstruation: Menstruation;
  is_student: boolean;
  student: StudentInfo;
  guidance_active: boolean; // 栄養指導中
}

export type AnswerValue = string | string[];

export interface QuestionnaireRecord extends BaseEntity {
  patient_id: string;
  date: string;
  answers: Record<string, AnswerValue>;
  notes: Record<string, string>; // 設問ごとの自由記述
  free_text: string;
  staff: string;
}

export interface NutrientAdjustment {
  value: number | null;
  note: string;
}

export interface NutritionPlan extends BaseEntity {
  patient_id: string;
  date: string;
  staff: string;
  bmr_method: 'dri' | 'nihn';
  energy_source: 'individual' | 'reference' | 'manual';
  energy_manual: number | null;
  activity_level: ActivityLevel;
  pfc: { p: number; f: number; c: number }; // % エネルギー
  protein_per_kg: number | null; // 院内目標 g/kg（任意）
  adjustments: Partial<Record<NutrientKey, NutrientAdjustment>>; // 院内独自目標
  memo: string;
  // 保存時点の計算結果スナップショット（指導書・経過管理で参照）
  snapshot?: {
    age: number;
    weight_kg: number | null;
    height_cm: number | null;
    bmr: number | null;
    energy: number | null;
    targets: Partial<Record<NutrientKey, number | null>>;
  };
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre_ex' | 'post_ex';

export interface MealItem {
  id: string;
  meal: MealType;
  food_id: string;
  amount: number;
  unit: string;
  grams: number;
  memo: string;
}

export interface MealDay extends BaseEntity {
  patient_id: string;
  date: string;
  items: MealItem[];
  note: string;
}

export interface FoodUnit {
  unit: string;
  grams: number;
  basis: string; // 換算根拠
}

export interface Food extends BaseEntity {
  name: string;
  kana: string;
  category: string;
  state: string; // 生・ゆで・焼き など
  source: 'mext8' | 'manual' | 'product';
  verified: boolean; // 公式値と照合済みか
  per100: NutrientValues; // 可食部100gあたり
  units: FoodUnit[];
  serving: { label: string; grams: number };
  note: string;
  product_id?: string;
}

export interface MaterialDoc extends BaseEntity {
  category: string;
  title: string;
  audience: '患者向け' | 'スタッフ向け';
  summary: string;
  body: string; // 簡易マークアップ
  tags: string[];
  month?: number | null;
}

export interface Distribution extends BaseEntity {
  kind: 'material' | 'guidance' | 'product';
  ref_id: string;
  patient_id: string;
  date: string;
  staff: string;
  note: string;
}

export interface GuidanceDoc extends BaseEntity {
  patient_id: string;
  date: string;
  staff: string;
  purposes: PurposeKey[];
  plan_id: string | null;
  targets_text: string;
  current_tendency: string;
  priorities: string;
  foods: { food_id: string; grams: number; note: string }[];
  menu: string;
  next_goals: string;
  closing: string;
  status: 'draft' | 'confirmed';
}

export interface ProgressRecord extends BaseEntity {
  patient_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  sleep_hours: number | null;
  fatigue: number | null; // 1(少ない)〜5(強い)
  meal_summary: string;
  intake_summary: string;
  habit_improvement: string;
  guidance_content: string;
  next_goal: string;
  next_check: string;
  staff: string;
}

export interface Product extends BaseEntity {
  name: string;
  maker: string;
  ingredients: string;
  serving_label: string;
  serving_grams: number | null;
  nutrients: NutrientValues; // 1回摂取目安量あたり
  allergens: string;
  intake_guide: string;
  price: number | null;
  cautions: string;
  description: string;
  active: boolean;
}

export interface ClinicSettings extends BaseEntity {
  clinic_name: string;
  clinic_address: string;
  staff_list: string[];
  show_demo: boolean;
}

export interface AuditDay {
  id: string; // YYYY-MM-DD
  entries: { at: string; staff: string; action: string; target: string }[];
}

export type Tombstone = { id: string; _deleted: true; updated_at: string };

export type CollectionName =
  | 'patients'
  | 'questionnaires'
  | 'plans'
  | 'meal_days'
  | 'foods'
  | 'materials'
  | 'distributions'
  | 'guidance_docs'
  | 'progress'
  | 'products'
  | 'settings'
  | 'audit_logs';

export interface CollectionMap {
  patients: Patient;
  questionnaires: QuestionnaireRecord;
  plans: NutritionPlan;
  meal_days: MealDay;
  foods: Food;
  materials: MaterialDoc;
  distributions: Distribution;
  guidance_docs: GuidanceDoc;
  progress: ProgressRecord;
  products: Product;
  settings: ClinicSettings;
  audit_logs: AuditDay;
}
