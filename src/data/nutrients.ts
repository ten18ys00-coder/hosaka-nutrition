import type { NutrientKey } from '../types';

export interface NutrientDef {
  key: NutrientKey;
  name: string;
  short: string;
  unit: string;
  group: '基本' | '三大栄養素' | 'ビタミン' | 'ミネラル・その他';
  digits: number;
  /** 食事摂取基準の単位注記 */
  unitNote?: string;
}

export const NUTRIENTS: NutrientDef[] = [
  { key: 'energy', name: 'エネルギー', short: 'エネルギー', unit: 'kcal', group: '基本', digits: 0 },
  { key: 'protein', name: 'たんぱく質', short: 'たんぱく質', unit: 'g', group: '三大栄養素', digits: 1 },
  { key: 'fat', name: '脂質', short: '脂質', unit: 'g', group: '三大栄養素', digits: 1 },
  { key: 'carb', name: '炭水化物', short: '炭水化物', unit: 'g', group: '三大栄養素', digits: 1 },
  { key: 'vitA', name: 'ビタミンA', short: 'ビタミンA', unit: 'μgRAE', group: 'ビタミン', digits: 0, unitNote: 'レチノール活性当量' },
  { key: 'vitB1', name: 'ビタミンB1', short: 'B1', unit: 'mg', group: 'ビタミン', digits: 2 },
  { key: 'vitB2', name: 'ビタミンB2', short: 'B2', unit: 'mg', group: 'ビタミン', digits: 2 },
  { key: 'vitB6', name: 'ビタミンB6', short: 'B6', unit: 'mg', group: 'ビタミン', digits: 2 },
  { key: 'vitB12', name: 'ビタミンB12', short: 'B12', unit: 'μg', group: 'ビタミン', digits: 1 },
  { key: 'niacin', name: 'ナイアシン', short: 'ナイアシン', unit: 'mgNE', group: 'ビタミン', digits: 1, unitNote: 'ナイアシン当量' },
  { key: 'folate', name: '葉酸', short: '葉酸', unit: 'μg', group: 'ビタミン', digits: 0 },
  { key: 'pantothenic', name: 'パントテン酸', short: 'パントテン酸', unit: 'mg', group: 'ビタミン', digits: 2 },
  { key: 'biotin', name: 'ビオチン', short: 'ビオチン', unit: 'μg', group: 'ビタミン', digits: 1 },
  { key: 'vitC', name: 'ビタミンC', short: 'ビタミンC', unit: 'mg', group: 'ビタミン', digits: 0 },
  { key: 'vitD', name: 'ビタミンD', short: 'ビタミンD', unit: 'μg', group: 'ビタミン', digits: 1 },
  { key: 'vitE', name: 'ビタミンE', short: 'ビタミンE', unit: 'mg', group: 'ビタミン', digits: 1, unitNote: 'α-トコフェロール' },
  { key: 'vitK', name: 'ビタミンK', short: 'ビタミンK', unit: 'μg', group: 'ビタミン', digits: 0 },
  { key: 'ca', name: 'カルシウム', short: 'カルシウム', unit: 'mg', group: 'ミネラル・その他', digits: 0 },
  { key: 'fe', name: '鉄', short: '鉄', unit: 'mg', group: 'ミネラル・その他', digits: 1 },
  { key: 'zn', name: '亜鉛', short: '亜鉛', unit: 'mg', group: 'ミネラル・その他', digits: 1 },
  { key: 'mg', name: 'マグネシウム', short: 'マグネシウム', unit: 'mg', group: 'ミネラル・その他', digits: 0 },
  { key: 'k', name: 'カリウム', short: 'カリウム', unit: 'mg', group: 'ミネラル・その他', digits: 0 },
  { key: 'p', name: 'リン', short: 'リン', unit: 'mg', group: 'ミネラル・その他', digits: 0 },
  { key: 'na', name: 'ナトリウム', short: 'ナトリウム', unit: 'mg', group: 'ミネラル・その他', digits: 0 },
  { key: 'salt', name: '食塩相当量', short: '食塩相当量', unit: 'g', group: 'ミネラル・その他', digits: 1 },
  { key: 'fiber', name: '食物繊維', short: '食物繊維', unit: 'g', group: 'ミネラル・その他', digits: 1 },
];

export const NUTRIENT_MAP: Record<NutrientKey, NutrientDef> = Object.fromEntries(
  NUTRIENTS.map((n) => [n.key, n]),
) as Record<NutrientKey, NutrientDef>;

/** ビタミン・ミネラルなど、食事摂取基準と比較する微量栄養素 */
export const MICRO_KEYS: NutrientKey[] = NUTRIENTS.filter(
  (n) => n.group === 'ビタミン' || n.group === 'ミネラル・その他',
).map((n) => n.key);

/** 食事摂取基準の表示桁（告示の表記に合わせる） */
export const DRI_DIGITS: Record<NutrientKey, number> = {
  energy: 0, protein: 0, fat: 0, carb: 0, fiber: 0, vitA: 0, vitD: 1, vitE: 1, vitK: 0, vitB1: 1, vitB2: 1, niacin: 0, vitB6: 1,
  vitB12: 1, folate: 0, pantothenic: 0, biotin: 0, vitC: 0, na: 0, salt: 1, k: 0, ca: 0, mg: 0, p: 0, fe: 1, zn: 1,
};

export const NUTRIENT_GROUPS: NutrientDef['group'][] = ['基本', '三大栄養素', 'ビタミン', 'ミネラル・その他'];
