// 架空の初期データ（試作用）。実在の人物・患者とは関係ありません。
import type {
  ClinicSettings, Distribution, MealDay, MealItem, MealType, NutritionPlan, Patient, Product, ProgressRecord, QuestionnaireRecord,
} from '../types';

const T = '2026-11-25T00:00:00.000Z';
const base = { created_at: T, updated_at: T, is_demo: true as const };

const emptyStudent = { sport: '', practice_frequency: '', practice_hours: null, injury: '', growth: '', snacking: '' };

export const DEMO_PATIENTS: Patient[] = [
  {
    ...base, id: 'pt-demo-1', patient_no: 'P-0001', name: '山本 花子（架空）', name_kana: 'やまもと はなこ', birth_date: '1974-06-12', sex: 'female',
    height_cm: 158.0, weight_kg: 57.2, body_fat_pct: 31.5, skeletal_muscle_kg: 19.8, occupation: '事務職（デスクワーク中心）', activity_level: 'low',
    exercise_habit: 'ダイナフィット週1回、ウォーキング週2回（30分）', sleep_hours: 6.0, medical_history: '腰痛で通院中。その他特記なし', medications: 'なし', allergies: 'なし',
    visit_status: '通院中', purposes: ['beauty', 'bone', 'muscle'], purpose_note: '閉経後の骨の健康と筋力の維持。肌・髪のハリも気になる。', menstruation: 'no',
    staff_memo: '朝食はパンとコーヒーだけの日が多い。昼はコンビニのおにぎりが中心。', is_student: false, student: { ...emptyStudent }, guidance_active: true,
  },
  {
    ...base, id: 'pt-demo-2', patient_no: 'P-0002', name: '佐藤 翔太（架空）', name_kana: 'さとう しょうた', birth_date: '2011-04-20', sex: 'male',
    height_cm: 168.5, weight_kg: 56.0, body_fat_pct: 12.0, skeletal_muscle_kg: 26.5, occupation: '高校1年生', activity_level: 'high',
    exercise_habit: 'サッカー部（ほぼ毎日）', sleep_hours: 7.0, medical_history: '右足関節捻挫（2026年10月）', medications: 'なし', allergies: 'なし',
    visit_status: '通院中', purposes: ['athlete', 'recovery'], purpose_note: '捻挫からの復帰と、当たり負けしない体づくり。', menstruation: 'unknown',
    staff_memo: '保護者（母）が食事を作っている。指導書は保護者にも渡す。', is_student: true,
    student: { sport: 'サッカー（ミッドフィルダー）', practice_frequency: '週6日', practice_hours: 2.5, injury: '右足関節捻挫（2026年10月受傷、リハビリ中）', growth: 'この1年で身長＋5cm（伸びている途中）', snacking: '練習後はコンビニのおにぎりかパン。夕食まで2時間以上空く。' },
    guidance_active: true,
  },
  {
    ...base, id: 'pt-demo-3', patient_no: 'P-0003', name: '鈴木 一郎（架空）', name_kana: 'すずき いちろう', birth_date: '1946-02-03', sex: 'male',
    height_cm: 162.0, weight_kg: 52.5, body_fat_pct: 18.0, skeletal_muscle_kg: 21.0, occupation: '無職（元会社員）', activity_level: 'low',
    exercise_habit: '散歩 週2〜3回（以前より減った）', sleep_hours: 8.0, medical_history: '高血圧', medications: '降圧薬（内科で処方）', allergies: 'なし',
    visit_status: '経過観察', purposes: ['frailty', 'muscle', 'bone'], purpose_note: '立ち上がりがつらくなってきた。転ばない体づくり。', menstruation: 'unknown',
    staff_memo: '妻と二人暮らし。調理は妻。半年で体重が約2kg減少（内科受診を勧め済み）。', is_student: false, student: { ...emptyStudent }, guidance_active: true,
  },
];

let seq = 0;
const it = (meal: MealType, food_id: string, amount: number, unit: string, grams: number, memo = ''): MealItem => ({
  id: `mi-demo-${++seq}`, meal, food_id, amount, unit, grams, memo,
});

export const DEMO_MEAL_DAYS: MealDay[] = [
  {
    ...base, id: 'pt-demo-1_2026-11-23', patient_id: 'pt-demo-1', date: '2026-11-23', note: '日曜日', items: [
      it('breakfast', 'f-bread', 1, '枚（6枚切り）', 60), it('breakfast', 'f-butter', 1, '小さじ', 4), it('breakfast', 'f-coffee', 1, '杯', 150),
      it('lunch', 'f-rice', 2, '個（おにぎり）', 200, 'コンビニおにぎり（具は鮭・昆布）'), it('lunch', 'f-greentea', 1, '杯', 120),
      it('snack', 'f-mikan', 1, '個', 80),
      it('dinner', 'f-rice', 1, '杯', 150), it('dinner', 'f-pork-loin', 1, '人前', 100, 'しょうが焼き'), it('dinner', 'f-cabbage', 1, '皿', 50),
      it('dinner', 'f-tofu-kinu', 50, 'g', 50, 'みそ汁'), it('dinner', 'f-wakame', 1, '杯分', 10), it('dinner', 'f-miso', 1, '杯分', 12), it('dinner', 'f-spinach-boiled', 1, '皿', 70),
    ],
  },
  {
    ...base, id: 'pt-demo-1_2026-11-24', patient_id: 'pt-demo-1', date: '2026-11-24', note: '', items: [
      it('breakfast', 'f-bread', 1, '枚（6枚切り）', 60), it('breakfast', 'f-egg-boiled', 1, '個', 50), it('breakfast', 'f-yogurt', 1, '食', 100), it('breakfast', 'f-coffee', 1, '杯', 150),
      it('lunch', 'f-udon', 1, '玉', 230), it('lunch', 'f-egg-raw', 1, '個', 50, '月見うどん'), it('lunch', 'f-greentea', 1, '杯', 120),
      it('snack', 'f-banana', 1, '本', 100),
      it('dinner', 'f-rice', 1, '杯', 150), it('dinner', 'f-salmon-grilled', 1, '切れ', 65), it('dinner', 'f-broccoli-boiled', 1, '皿', 60),
      it('dinner', 'f-tofu-momen', 1, '切れ（1/3丁）', 100, '湯豆腐'), it('dinner', 'f-hakusai', 0.5, '枚', 50), it('dinner', 'f-soysauce', 1, '小さじ', 6),
    ],
  },
  {
    ...base, id: 'pt-demo-2_2026-11-24', patient_id: 'pt-demo-2', date: '2026-11-24', note: '練習日（2.5時間）', items: [
      it('breakfast', 'f-rice', 1, '杯（大盛り）', 250), it('breakfast', 'f-egg-raw', 1, '個', 50), it('breakfast', 'f-natto', 1, 'パック', 45), it('breakfast', 'f-milk', 1, '杯', 206),
      it('lunch', 'f-rice', 1, '杯（大盛り）', 250, '弁当'), it('lunch', 'f-chicken-thigh', 4, '個（から揚げ）', 120, 'から揚げ'), it('lunch', 'f-cabbage', 1, '皿', 50), it('lunch', 'f-tomato', 5, '個（ミニ）', 50),
      it('post_ex', 'f-rice', 1, '個（おにぎり）', 100, 'コンビニおにぎり'), it('post_ex', 'f-orangejuice', 1, '杯', 208),
      it('dinner', 'f-rice', 1, '杯（大盛り）', 250), it('dinner', 'f-pork-loin', 1, '枚（とんかつ）', 120, 'しょうが焼き'), it('dinner', 'f-spinach-boiled', 1, '皿', 70),
      it('dinner', 'f-tofu-kinu', 50, 'g', 50, 'みそ汁'), it('dinner', 'f-miso', 1, '杯分', 12), it('dinner', 'f-mikan', 2, '個', 160),
    ],
  },
  {
    ...base, id: 'pt-demo-3_2026-11-24', patient_id: 'pt-demo-3', date: '2026-11-24', note: '', items: [
      it('breakfast', 'f-rice', 100, 'g', 100), it('breakfast', 'f-tofu-kinu', 50, 'g', 50, 'みそ汁'), it('breakfast', 'f-wakame', 1, '杯分', 10), it('breakfast', 'f-miso', 1, '杯分', 12),
      it('lunch', 'f-udon', 200, 'g', 200), it('lunch', 'f-egg-raw', 1, '個', 50),
      it('dinner', 'f-rice', 120, 'g', 120), it('dinner', 'f-aji', 1, '尾', 70, '焼き魚（生の重量で入力）'), it('dinner', 'f-daikon', 1, '皿', 50), it('dinner', 'f-komatsuna', 1, '皿', 70), it('dinner', 'f-soysauce', 1, '小さじ', 6),
    ],
  },
];

export const DEMO_PLANS: NutritionPlan[] = [
  {
    ...base, id: 'pl-demo-1', patient_id: 'pt-demo-1', date: '2026-11-15', staff: '保坂', bmr_method: 'dri', energy_source: 'individual', energy_manual: null,
    activity_level: 'low', pfc: { p: 17, f: 25, c: 58 }, protein_per_kg: 1.2,
    adjustments: { ca: { value: 700, note: '骨の健康目的。推奨量（650mg）より少し高めの院内目標' } },
    memo: '体重は維持。たんぱく質を朝食で増やす方針。',
  },
];

export const DEMO_QUESTIONNAIRES: QuestionnaireRecord[] = [
  {
    ...base, id: 'q-demo-2', patient_id: 'pt-demo-2', date: '2026-11-20', staff: '保坂', free_text: '練習後から夕食まで時間が空く。菓子パンを食べることが多い。',
    notes: { snack_kinds: '練習後に菓子パン1個' },
    answers: {
      breakfast: '毎日食べる', meals: '4回以上（補食を含む）', regular: 'ほぼ決まっている', staple: '毎食とる', protein: '1日1〜2回', protein_kinds: ['肉', '卵'],
      veg: '1日1〜2回', fruit: '週に数回', dairy: '週に数回', snack: '1日1回', snack_kinds: ['菓子・菓子パン'], eatout: '週1〜3回', water: '1〜1.5L',
      caffeine: 'ほぼ飲まない', caffeine_late: 'いいえ', alcohol: '飲まない', supplement: '使っていない', fatigue: 'ときどきある', sleep: 'よく眠れる',
      bowel: '毎日〜2日に1回', appetite: 'ある', weakness: '感じない', weight_change: '増えた', skin: ['特になし'], exercise: '部活・競技（ほぼ毎日）',
      injury: '回復中（順調）', signs: ['特になし'],
    },
  },
  {
    ...base, id: 'q-demo-3', patient_id: 'pt-demo-3', date: '2026-11-05', staff: '保坂', free_text: '量が食べられなくなってきた。肉は硬くて食べにくい。',
    notes: { weight_change: '半年で約2kg減' },
    answers: {
      breakfast: '毎日食べる', meals: '3回', regular: 'ほぼ決まっている', staple: '毎食とる', protein: '1日1〜2回', protein_kinds: ['魚', '大豆製品'],
      veg: '1日1〜2回', fruit: '週に数回', dairy: 'ほとんどとらない', snack: 'ほぼなし', snack_kinds: [], eatout: '週1回未満', water: '1L未満',
      caffeine: '1日1〜2杯', caffeine_late: 'いいえ', alcohol: '週1〜2日', supplement: '使っていない', fatigue: 'ときどきある', sleep: '寝つきが悪い・途中で目が覚める',
      bowel: '3日以上出ないことがある', appetite: 'やや落ちている', weakness: 'はっきり感じる（立ち上がり・歩行がつらい）', weight_change: '意図せず減った', skin: ['特になし'],
      exercise: '週1〜2回', injury: '怪我はない', signs: ['特になし'],
    },
  },
];

export const DEMO_PROGRESS: ProgressRecord[] = [
  { ...base, id: 'pr-demo-1a', patient_id: 'pt-demo-1', date: '2026-09-15', weight_kg: 58.6, body_fat_pct: 33.0, skeletal_muscle_kg: 19.2, sleep_hours: 5.5, fatigue: 4, meal_summary: '朝食はコーヒーのみの日が多い', intake_summary: '', habit_improvement: '初回', guidance_content: '初回問診・姿勢診断。朝食にたんぱく質を1品足すことから。', next_goal: '朝食にヨーグルトか卵', next_check: '朝食の記録', staff: '保坂' },
  { ...base, id: 'pr-demo-1b', patient_id: 'pt-demo-1', date: '2026-10-15', weight_kg: 57.9, body_fat_pct: 32.2, skeletal_muscle_kg: 19.5, sleep_hours: 6.0, fatigue: 3, meal_summary: '週4日は朝食に卵かヨーグルト', intake_summary: '', habit_improvement: '朝食のたんぱく質が増えた', guidance_content: 'カルシウム源（乳製品）を毎日に。', next_goal: '乳製品を1日1回', next_check: '乳製品の頻度', staff: '保坂' },
  { ...base, id: 'pr-demo-1c', patient_id: 'pt-demo-1', date: '2026-11-15', weight_kg: 57.2, body_fat_pct: 31.5, skeletal_muscle_kg: 19.8, sleep_hours: 6.0, fatigue: 3, meal_summary: '朝食はほぼ毎日。昼はおにぎり中心', intake_summary: '', habit_improvement: '乳製品がほぼ毎日に', guidance_content: '昼食にたんぱく質のおかずを。魚を週3回。', next_goal: '昼食にサラダチキンかゆで卵を追加', next_check: '昼食の内容、魚の回数', staff: '保坂' },
  { ...base, id: 'pr-demo-2a', patient_id: 'pt-demo-2', date: '2026-10-20', weight_kg: 55.0, body_fat_pct: 12.5, skeletal_muscle_kg: 26.0, sleep_hours: 7.0, fatigue: 3, meal_summary: '練習後は菓子パン', intake_summary: '', habit_improvement: '初回', guidance_content: '捻挫後の回復と補食の考え方', next_goal: '練習後はおにぎり＋牛乳', next_check: '補食の内容', staff: '保坂' },
  { ...base, id: 'pr-demo-2b', patient_id: 'pt-demo-2', date: '2026-11-20', weight_kg: 56.0, body_fat_pct: 12.0, skeletal_muscle_kg: 26.5, sleep_hours: 7.0, fatigue: 2, meal_summary: '補食がおにぎりになった日が増えた', intake_summary: '', habit_improvement: '補食の内容が改善', guidance_content: '乳製品を1日2回に', next_goal: '牛乳・ヨーグルトを1日2回', next_check: '乳製品と果物の頻度', staff: '保坂' },
  { ...base, id: 'pr-demo-3a', patient_id: 'pt-demo-3', date: '2026-10-01', weight_kg: 53.4, body_fat_pct: 18.5, skeletal_muscle_kg: 21.2, sleep_hours: 8.0, fatigue: 3, meal_summary: '1日3食だが量が少ない', intake_summary: '', habit_improvement: '初回', guidance_content: '低栄養予防の説明。卵・豆腐・魚の缶詰を常備。', next_goal: '毎食たんぱく質のおかず', next_check: '体重、食事量', staff: '保坂' },
  { ...base, id: 'pr-demo-3b', patient_id: 'pt-demo-3', date: '2026-11-05', weight_kg: 52.5, body_fat_pct: 18.0, skeletal_muscle_kg: 21.0, sleep_hours: 8.0, fatigue: 3, meal_summary: '朝食にみそ汁を追加', intake_summary: '', habit_improvement: '汁物に具を増やした', guidance_content: '体重減少が続くため内科受診を勧めた。間食に乳製品。', next_goal: '間食にヨーグルトかチーズ', next_check: '体重、間食、受診結果', staff: '保坂' },
];

export const DEMO_DISTRIBUTIONS: Distribution[] = [
  { ...base, id: 'd-demo-1', kind: 'material', ref_id: 'm-bone', patient_id: 'pt-demo-1', date: '2026-11-15', staff: '保坂', note: '' },
  { ...base, id: 'd-demo-2', kind: 'material', ref_id: 'm-athlete-snack', patient_id: 'pt-demo-2', date: '2026-11-20', staff: '保坂', note: '保護者にも説明' },
  { ...base, id: 'd-demo-3', kind: 'material', ref_id: 'm-elderly', patient_id: 'pt-demo-3', date: '2026-11-05', staff: '保坂', note: '奥様に渡した' },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    ...base, id: 'p-demo-whey', name: 'サンプル ホエイプロテイン（架空の見本）', maker: '架空の見本メーカー', ingredients: '乳清たんぱく（乳成分を含む）、ココアパウダー、甘味料（スクラロース）、乳化剤（大豆由来）',
    serving_label: '1食（付属スプーン2杯）', serving_grams: 30, nutrients: { energy: 115, protein: 21.0, fat: 1.8, carb: 3.5, salt: 0.2 }, allergens: '乳成分・大豆',
    intake_guide: '1日1回、運動後に水または牛乳200mlに溶かして', price: 4980, cautions: '食事の代わりにはなりません。腎臓の病気がある方は主治医に確認してください。',
    description: '試作用の架空商品です。実際の取扱商品に置き換えてください。', active: true,
  },
  {
    ...base, id: 'p-demo-jelly', name: 'サンプル エネルギーゼリー（架空の見本）', maker: '架空の見本メーカー', ingredients: '糖類（ぶどう糖、果糖）、果汁、ゲル化剤（増粘多糖類）、酸味料',
    serving_label: '1袋', serving_grams: 180, nutrients: { energy: 180, protein: 0, fat: 0, carb: 45.0, salt: 0.1 }, allergens: 'なし',
    intake_guide: '練習の30分〜1時間前の補食に', price: 220, cautions: '食事の代わりにはなりません。',
    description: '試作用の架空商品です。', active: true,
  },
];

export const DEFAULT_SETTINGS: ClinicSettings = {
  id: 'main', created_at: T, updated_at: T, clinic_name: 'ほさか整骨院', clinic_address: '栃木県宇都宮市上戸祭町702-4', staff_list: ['保坂'], show_demo: true,
};
