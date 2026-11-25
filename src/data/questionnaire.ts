// 栄養問診の設問と、回答から「追加で確認すべきこと」を出すルール
import type { AnswerValue, NutrientKey } from '../types';

export interface Question {
  id: string;
  label: string;
  type: 'single' | 'multi' | 'text';
  options?: string[];
  note?: boolean; // 自由記述欄を付ける
  help?: string;
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export const QUESTION_SECTIONS: Section[] = [
  {
    id: 'habit',
    title: '食習慣',
    questions: [
      { id: 'breakfast', label: '朝食', type: 'single', options: ['毎日食べる', '週4〜6日', '週1〜3日', 'ほとんど食べない'], note: true },
      { id: 'meals', label: '1日の食事回数', type: 'single', options: ['1回', '2回', '3回', '4回以上（補食を含む）'] },
      { id: 'regular', label: '食事時間の規則性', type: 'single', options: ['ほぼ決まっている', 'ややばらつく', 'かなり不規則（夜勤・シフト等）'] },
      { id: 'staple', label: '主食（ごはん・パン・麺）', type: 'single', options: ['毎食とる', '1日1〜2回', 'ほとんどとらない・控えている'] },
      { id: 'protein', label: '肉・魚・卵・大豆製品のおかず', type: 'single', options: ['毎食ある', '1日1〜2回', '1日1回未満'], note: true },
      { id: 'protein_kinds', label: 'よく食べるもの（複数選択）', type: 'multi', options: ['肉', '魚', '卵', '大豆製品'] },
      { id: 'veg', label: '野菜', type: 'single', options: ['毎食とる', '1日1〜2回', 'ほとんど食べない'] },
      { id: 'fruit', label: '果物', type: 'single', options: ['毎日', '週に数回', 'ほとんど食べない'] },
      { id: 'dairy', label: '乳製品（牛乳・ヨーグルト・チーズ）', type: 'single', options: ['毎日', '週に数回', 'ほとんどとらない'] },
      { id: 'snack', label: '間食', type: 'single', options: ['ほぼなし', '1日1回', '1日2回以上'] },
      { id: 'snack_kinds', label: '間食の内容（複数選択）', type: 'multi', options: ['菓子・菓子パン', '甘い飲み物', '果物・乳製品', 'おにぎり等の補食'], note: true },
      { id: 'eatout', label: '外食・中食・加工食品の利用', type: 'single', options: ['週1回未満', '週1〜3回', '週4回以上'] },
      { id: 'water', label: '水分（水・お茶など）の摂取量', type: 'single', options: ['1L未満', '1〜1.5L', '1.5L以上'] },
      { id: 'caffeine', label: 'カフェイン（コーヒー・緑茶・エナジードリンク）', type: 'single', options: ['ほぼ飲まない', '1日1〜2杯', '1日3杯以上'] },
      { id: 'caffeine_late', label: '夕方以降もカフェインをとる', type: 'single', options: ['いいえ', 'はい'] },
      { id: 'alcohol', label: '飲酒', type: 'single', options: ['飲まない', '週1〜2日', '週3日以上', 'ほぼ毎日'], note: true },
      { id: 'supplement', label: 'サプリメント・栄養補助食品', type: 'single', options: ['使っていない', '使っている'], note: true, help: '使っている場合は商品名・量を自由記述欄へ' },
    ],
  },
  {
    id: 'body',
    title: '生活習慣・身体の状態',
    questions: [
      { id: 'fatigue', label: '疲労感', type: 'single', options: ['ほとんどない', 'ときどきある', 'いつも疲れている'] },
      { id: 'sleep', label: '睡眠の質', type: 'single', options: ['よく眠れる', '寝つきが悪い・途中で目が覚める', '眠りが浅く疲れが取れない'] },
      { id: 'bowel', label: '便通', type: 'single', options: ['毎日〜2日に1回', '3日以上出ないことがある', '下痢しやすい'] },
      { id: 'appetite', label: '食欲', type: 'single', options: ['ある', 'やや落ちている', '著しく落ちている'] },
      { id: 'weakness', label: '筋力低下', type: 'single', options: ['感じない', '少し感じる', 'はっきり感じる（立ち上がり・歩行がつらい）'] },
      { id: 'weight_change', label: '体重の変化（この6か月）', type: 'single', options: ['ほぼ変化なし', '意図して減らした', '意図せず減った', '増えた'], note: true },
      { id: 'skin', label: '肌・髪・爪の悩み（複数選択）', type: 'multi', options: ['肌荒れ・乾燥', '髪のパサつき・抜け毛', '爪が割れやすい', '口内炎・口角炎', '特になし'] },
      { id: 'exercise', label: '運動習慣', type: 'single', options: ['ほとんどしない', '週1〜2回', '週3回以上', '部活・競技（ほぼ毎日）'] },
      { id: 'injury', label: '怪我の回復状況', type: 'single', options: ['怪我はない', '回復中（順調）', '回復が遅い・痛みが長引く'], note: true },
      {
        id: 'signs',
        label: '当てはまるもの（複数選択）',
        type: 'multi',
        options: ['立ちくらみ・息切れがよくある', 'すねなど骨の痛みが続く', '月経が止まった・3か月以上こない', '飲み込みにくい・むせる', '体重を気にして食事を極端に減らしている', '特になし'],
      },
    ],
  },
];

export interface Suggestion {
  id: string;
  title: string;
  detail: string;
  nutrients: NutrientKey[];
}

export interface RedFlag {
  id: string;
  message: string;
}

const has = (v: AnswerValue | undefined, x: string) => (Array.isArray(v) ? v.includes(x) : v === x);

/** 回答から、追加で確認すべき食習慣・栄養素を返す（診断ではない） */
export function analyzeAnswers(a: Record<string, AnswerValue>): { suggestions: Suggestion[]; flags: RedFlag[] } {
  const s: Suggestion[] = [];
  const f: RedFlag[] = [];
  const add = (id: string, title: string, detail: string, nutrients: NutrientKey[]) => s.push({ id, title, detail, nutrients });

  if (a.breakfast && a.breakfast !== '毎日食べる')
    add('breakfast', '朝食の確保', '朝食が不規則だと、1日のエネルギー・たんぱく質が不足しやすくなります。朝に食べられるものを一緒に探します。', ['energy', 'protein']);
  if (has(a.meals, '1回') || has(a.meals, '2回'))
    add('meals', '食事回数と1日の総量', '食事回数が少ないと必要量に届きにくくなります。食事分析で1日の総量を確認しましょう。', ['energy', 'protein']);
  if (has(a.regular, 'かなり不規則（夜勤・シフト等）'))
    add('regular', '食事時間のリズム', '食事時間の乱れは睡眠や疲労感にも影響します。勤務に合わせた「食べるタイミング」を確認します。', ['energy']);
  if (has(a.staple, 'ほとんどとらない・控えている'))
    add('staple', '主食の量（エネルギー・炭水化物）', '主食を控えるとエネルギー不足や、たんぱく質がエネルギー源に回る原因になります。極端な糖質制限は院の方針として勧めません。', ['energy', 'carb', 'vitB1']);
  if (has(a.protein, '1日1回未満'))
    add('protein', 'たんぱく質源の頻度', '肉・魚・卵・大豆製品が少ないと、たんぱく質に加えて鉄・亜鉛・ビタミンB群も不足しやすくなります。', ['protein', 'fe', 'zn', 'vitB12', 'vitB6']);
  if (Array.isArray(a.protein_kinds) && a.protein_kinds.length > 0 && !a.protein_kinds.includes('魚'))
    add('fish', '魚の摂取', '魚をあまり食べない場合、ビタミンDやn-3系脂肪酸が不足しやすくなります。缶詰（さば・鮭）の活用を提案できます。', ['vitD']);
  if (has(a.veg, 'ほとんど食べない'))
    add('veg', '野菜の摂取', '食物繊維・ビタミンC・カリウム・葉酸・ビタミンKの不足につながりやすいです。', ['fiber', 'vitC', 'k', 'folate', 'vitK']);
  if (has(a.fruit, 'ほとんど食べない')) add('fruit', '果物の摂取', 'ビタミンC・カリウムの供給源。1日1回の果物を提案できます。', ['vitC', 'k']);
  if (has(a.dairy, 'ほとんどとらない'))
    add('dairy', 'カルシウム源', '乳製品が少ない場合は、小魚・大豆製品・青菜でカルシウムを補えているか確認します。', ['ca', 'vitB2']);
  if (has(a.snack, '1日2回以上') && Array.isArray(a.snack_kinds) && (a.snack_kinds.includes('菓子・菓子パン') || a.snack_kinds.includes('甘い飲み物')))
    add('snack', '間食の内容', '菓子・甘い飲み物が多い場合は、果物・乳製品・おにぎりなど「食事を補う間食」への置き換えを検討します。', ['energy', 'fat']);
  if (has(a.eatout, '週4回以上'))
    add('eatout', '外食・加工食品と食塩', '外食・加工食品が多いと食塩が増え、野菜が不足しがちです。選び方のコツを伝えます。', ['salt', 'na', 'fiber']);
  if (has(a.water, '1L未満')) add('water', '水分補給', '食事以外の水分が少ない可能性があります。こまめな水分補給を提案します（腎臓・心臓の病気で水分制限がある方は主治医の指示を優先）。', []);
  if (has(a.caffeine, '1日3杯以上') || has(a.caffeine_late, 'はい'))
    add('caffeine', 'カフェインのとり方', 'カフェインのとりすぎや夕方以降の摂取は睡眠に影響しやすいです。食事中の濃いお茶・コーヒーは鉄の吸収も妨げます。', ['fe']);
  if (has(a.alcohol, '週3日以上') || has(a.alcohol, 'ほぼ毎日'))
    add('alcohol', '飲酒の頻度', '飲酒が多いとビタミンB1・葉酸の不足や睡眠の質の低下につながりやすいです。', ['vitB1', 'folate']);
  if (has(a.supplement, '使っている'))
    add('supplement', 'サプリメントの内容確認', '商品名・成分・量を確認し、食事と合わせて耐容上限量を超えていないか、服用薬との関係はないかを確認します。', []);
  if (has(a.fatigue, 'いつも疲れている'))
    add('fatigue', '疲労感の背景', 'エネルギー不足・鉄・ビタミンB1・たんぱく質の不足のほか、睡眠や病気が原因のこともあります。', ['energy', 'fe', 'vitB1', 'protein']);
  if (a.sleep && a.sleep !== 'よく眠れる')
    add('sleep', '睡眠と食事', '夕食の時間、カフェイン・飲酒のタイミングを確認します。', []);
  if (has(a.bowel, '3日以上出ないことがある'))
    add('bowel', '便通（食物繊維・水分）', '食物繊維と水分が足りているかを確認します。', ['fiber']);
  if (has(a.appetite, 'やや落ちている'))
    add('appetite', '食欲低下への工夫', '少量でも栄養がとれる食品（卵・乳製品・豆腐など）や、食事回数を増やす工夫を提案します。', ['energy', 'protein']);
  if (a.weakness && a.weakness !== '感じない')
    add('weakness', '筋力低下と栄養', 'たんぱく質・エネルギー・ビタミンDの摂取状況を確認します。ダイナフィット等の運動と組み合わせます。', ['protein', 'energy', 'vitD']);
  if (Array.isArray(a.skin) && a.skin.some((x) => x !== '特になし'))
    add('skin', '肌・髪・爪', 'たんぱく質・亜鉛・鉄・ビタミンC・ビタミンB2・B6、脂質（必須脂肪酸）の摂取状況を確認します。原因は栄養以外のことも多いです。', ['protein', 'zn', 'fe', 'vitC', 'vitB2', 'vitB6']);
  if (has(a.exercise, '部活・競技（ほぼ毎日）'))
    add('exercise', '練習量に見合うエネルギー', '練習量に対して食事量が足りているか、補食のとり方を確認します。', ['energy', 'carb', 'ca', 'fe']);
  if (has(a.injury, '回復が遅い・痛みが長引く') || has(a.injury, '回復中（順調）'))
    add('injury', '回復を支える栄養', 'エネルギー・たんぱく質・ビタミンC・亜鉛・カルシウム・ビタミンDを確認します。', ['energy', 'protein', 'vitC', 'zn', 'ca', 'vitD']);

  // 医療機関への相談を促すサイン
  if (has(a.appetite, '著しく落ちている'))
    f.push({ id: 'appetite', message: '著しい食欲低下があります。原因の確認のため、医療機関（かかりつけ医）への相談を勧めてください。' });
  if (has(a.weight_change, '意図せず減った'))
    f.push({ id: 'weight', message: '意図しない体重減少があります。病気が隠れている可能性もあるため、医療機関への相談を勧めてください。' });
  if (has(a.signs, 'すねなど骨の痛みが続く'))
    f.push({ id: 'bone', message: '骨の痛みが続いています。疲労骨折などの可能性もあるため、画像検査ができる医療機関への受診を検討してください。' });
  if (has(a.signs, '月経が止まった・3か月以上こない'))
    f.push({ id: 'menses', message: '無月経の訴えがあります。エネルギー不足などが関係することもあるため、婦人科への相談を勧めてください。' });
  if (has(a.signs, '飲み込みにくい・むせる'))
    f.push({ id: 'swallow', message: '飲み込みにくさ・むせがあります。医療機関（かかりつけ医・歯科等）への相談を勧めてください。' });
  if (has(a.signs, '体重を気にして食事を極端に減らしている'))
    f.push({ id: 'restrict', message: '極端な食事制限の訴えがあります。食事量を減らす指導は行わず、必要に応じて医療機関・専門家への相談を勧めてください。' });
  if (has(a.signs, '立ちくらみ・息切れがよくある'))
    f.push({ id: 'anemia', message: '立ちくらみ・息切れが続く場合は、貧血などの確認のため内科での血液検査を勧めてください（問診だけで貧血とは判断しません）。' });

  return { suggestions: s, flags: f };
}
