import type { NutrientKey, PurposeKey } from '../types';

export interface PurposeDef {
  key: PurposeKey;
  label: string;
  short: string;
  focus: string[]; // 指導の柱
  nutrients: NutrientKey[]; // 重点栄養素
  points: string[]; // 指導のポイント（スタッフ向け）
  patientTips: string[]; // 患者さんに伝える具体策
  foods: string[]; // おすすめ食品ID
  proteinPerKg?: { min: number; max: number; label: string; source: string };
  caution?: string;
}

export const PURPOSES: PurposeDef[] = [
  {
    key: 'athlete',
    label: '学生アスリート',
    short: 'アスリート',
    focus: ['成長期の栄養', '練習前後の補食', 'エネルギー不足の予防', '鉄・カルシウム・ビタミンD', '水分補給', '怪我からの回復を支える食事'],
    nutrients: ['energy', 'carb', 'protein', 'ca', 'fe', 'vitD', 'vitB1'],
    points: [
      '成長に使う分と練習で使う分の両方が必要。まずは「量が足りているか」を体重と成長の推移で確認する。',
      '練習の1〜2時間前は消化のよい糖質（おにぎり・バナナ・もち）、練習後はできるだけ早く糖質＋たんぱく質（おにぎり＋牛乳、肉まん、ヨーグルト＋果物）。',
      '鉄は赤身の肉・魚・あさり・小松菜など。ビタミンC（果物・野菜）と一緒にとる。',
      'カルシウムは12〜14歳男子で推奨量が全年齢で最も高い（1,000mg/日）。牛乳・ヨーグルト・小魚・大豆製品を毎日。',
      '体重を気にして食事を減らす、月経が止まる、すねの痛みが続く場合は、エネルギー不足（相対的エネルギー不足）や疲労骨折を疑い、医療機関につなぐ。',
    ],
    patientTips: [
      '朝ごはんを必ず食べる（おにぎり＋卵＋牛乳でもOK）',
      '練習の前は「おにぎり・バナナ」、練習の後は「おにぎり＋牛乳」をできるだけ早く',
      '牛乳・ヨーグルトを1日2回',
      '水やお茶はのどが渇く前に、練習中は15〜20分ごとに少しずつ',
    ],
    foods: ['f-rice', 'f-banana', 'f-mochi', 'f-milk', 'f-yogurt', 'f-egg-raw', 'f-beef-round', 'f-asari', 'f-komatsuna', 'f-salmon-raw'],
    proteinPerKg: {
      min: 1.2,
      max: 2.0,
      label: '1.2〜2.0 g/kg体重/日（成人アスリートの目安。成長期は個別に判断）',
      source: 'Thomas DT, Erdman KA, Burke LM. ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc. 2016;48(3):543-568.',
    },
    caution: '中高生にサプリメントを勧める前に、まず食事量と食事回数を確認する。',
  },
  {
    key: 'muscle',
    label: '筋力向上・ダイナフィット',
    short: '筋力向上',
    focus: ['たんぱく質', 'エネルギー摂取量', '毎食の栄養バランス', '筋肉量の維持'],
    nutrients: ['protein', 'energy', 'vitD', 'vitB6'],
    points: [
      'ダイナフィット等で筋肉に刺激を入れても、材料（たんぱく質）と燃料（エネルギー）が足りなければ筋肉はつきにくい。',
      'たんぱく質は1日の合計量に加え、朝・昼・夕に分けてとる（朝食が少ない人が多い）。1食あたり手のひら1枚分の主菜を目安に。',
      'エネルギーが不足すると、たんぱく質がエネルギー源として使われてしまう。主食を抜かない。',
      '体重・骨格筋量の推移（経過管理）で効果を確認する。',
    ],
    patientTips: [
      '毎食、手のひら1枚分の「肉・魚・卵・大豆製品」をのせる',
      '朝食にたんぱく質を1品足す（卵・納豆・ヨーグルト・牛乳）',
      '主食（ごはん・パン）は抜かない',
    ],
    foods: ['f-chicken-breast', 'f-egg-raw', 'f-natto', 'f-tofu-momen', 'f-salmon-raw', 'f-yogurt', 'f-milk', 'f-saba-can'],
    proteinPerKg: {
      min: 1.2,
      max: 1.6,
      label: '1.2〜1.6 g/kg体重/日（レジスタンス運動を行う成人の目安）',
      source: 'Morton RW, et al. A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults. Br J Sports Med. 2018;52:376-384.（約1.6 g/kg/日で効果が頭打ち）',
    },
    caution: '腎臓の病気がある方、医師から食事制限を受けている方は、たんぱく質を増やす前に主治医に確認する。',
  },
  {
    key: 'frailty',
    label: '高齢者・フレイル予防',
    short: 'フレイル予防',
    focus: ['低栄養予防', '筋力維持', '食事量の確保', '食べやすい食品'],
    nutrients: ['energy', 'protein', 'vitD', 'ca'],
    points: [
      '高齢者では「食べすぎ」より「食べなさすぎ（低栄養）」が問題になりやすい。体重減少・食欲低下を最優先で確認する。',
      '65歳以上の目標とするBMIは21.5〜24.9（食事摂取基準2025）。',
      '量が食べられない人は、1日3食＋間食（乳製品・卵・果物など）で回数を増やす。',
      '噛みにくい・飲み込みにくい人は、卵・豆腐・魚の缶詰・ヨーグルト・やわらかく煮た肉など食べやすい形に。むせる場合は医療機関へ。',
      '一人暮らし・調理が負担な人には、缶詰・冷凍食品・惣菜の上手な使い方を提案する。',
    ],
    patientTips: [
      '毎食「主食・主菜・副菜」をそろえる。量が少なくてもOK',
      '肉・魚・卵・大豆製品を毎食ひとつ',
      '間食に牛乳・ヨーグルト・チーズ・卵',
      'さば缶・ツナ缶・豆腐など、手間のかからない食品を常備',
    ],
    foods: ['f-egg-raw', 'f-tofu-kinu', 'f-saba-can', 'f-yogurt', 'f-milk', 'f-cheese', 'f-natto', 'f-salmon-raw'],
    proteinPerKg: {
      min: 1.0,
      max: 1.2,
      label: '1.0〜1.2 g/kg体重/日（健康な高齢者の目安）',
      source: 'Bauer J, et al. Evidence-based recommendations for optimal dietary protein intake in older people: a position paper from the PROT-AGE Study Group. J Am Med Dir Assoc. 2013;14:542-559.',
    },
    caution: '意図しない体重減少・著しい食欲低下・飲み込みにくさがある場合は医療機関への相談を勧める。',
  },
  {
    key: 'bone',
    label: '骨の健康',
    short: '骨',
    focus: ['カルシウム', 'ビタミンD', 'ビタミンK', 'たんぱく質'],
    nutrients: ['ca', 'vitD', 'vitK', 'protein', 'mg'],
    points: [
      'カルシウムは乳製品・小魚・大豆製品・青菜から。乳製品は吸収率が比較的よい。',
      'ビタミンDはカルシウムの吸収を助ける。鮭・さば・いわし・きのこ類。日光（適度な日光浴）でも皮膚で作られる。',
      'ビタミンKは骨の形成にかかわる。納豆・青菜。ワルファリン服用中の方は主治医の指示を優先。',
      'たんぱく質は骨の土台（コラーゲン）の材料。',
      '骨粗鬆症の診断・治療中の方は、医師の指示を優先する。',
    ],
    patientTips: [
      '牛乳・ヨーグルト・チーズを1日2回',
      '週に3回以上、鮭・さば・あじなどの魚',
      '納豆・青菜を毎日どこかで',
      '晴れた日は少し外を歩く',
    ],
    foods: ['f-milk', 'f-yogurt', 'f-cheese', 'f-shirasu', 'f-saba-can', 'f-salmon-raw', 'f-natto', 'f-komatsuna', 'f-tofu-momen'],
  },
  {
    key: 'beauty',
    label: '美容・エイジングケア',
    short: '美容',
    focus: ['肌・髪・爪の健康', 'たんぱく質', 'ビタミンC', '鉄・亜鉛', '必須脂肪酸'],
    nutrients: ['protein', 'vitC', 'fe', 'zn', 'vitA', 'vitB2', 'vitB6', 'vitE'],
    points: [
      '肌・髪・爪はたんぱく質でできている。極端な食事制限はまず髪や爪に表れやすい。',
      'ビタミンCはコラーゲンの合成に必要。果物・野菜を毎日。',
      '鉄・亜鉛は不足しやすい。赤身の肉・魚・あさり・卵・大豆製品。',
      '脂質を極端に減らすと必須脂肪酸（n-3系・n-6系）や脂溶性ビタミンも不足しやすい。青魚・くるみ・植物油を適量。',
      '特定の食品やサプリメントで「肌がよくなる」と断定しない。',
    ],
    patientTips: [
      '毎食たんぱく質のおかずを1品',
      '果物を1日1回（キウイ・みかん・いちご など）',
      '週2〜3回は青魚',
      '脂質を抜きすぎない（油は「質」を選んで適量）',
    ],
    foods: ['f-kiwi', 'f-mikan', 'f-redpaprika', 'f-broccoli-boiled', 'f-salmon-raw', 'f-mackerel', 'f-egg-raw', 'f-walnut', 'f-asari'],
  },
  {
    key: 'weight',
    label: 'ダイエット・体型維持',
    short: '体型維持',
    focus: ['エネルギー収支', 'PFCバランス', '筋肉量の維持', '継続可能な食習慣'],
    nutrients: ['energy', 'protein', 'fiber', 'fat'],
    points: [
      'ほさか整骨院では、ファスティングや極端な食事制限は指導しない。',
      'まず「今の食べ方」を知る（食事分析）。間食・飲料・外食の頻度から見直す。',
      '減量中もたんぱく質を確保し、筋肉量を落とさない（体組成で確認）。',
      '目標エネルギーを推定基礎代謝量より下げない。急激な減量は避ける（院内目安：1か月に1〜2kg程度まで。スタッフが個別に調整）。',
      '主食を抜くのではなく、量を整える。野菜・きのこ・海藻で食物繊維を増やす。',
    ],
    patientTips: [
      '甘い飲み物を水・お茶に',
      '主食は抜かずに「いつもの8割」',
      '野菜・きのこ・海藻から先に食べる',
      '夕食は寝る2〜3時間前までに',
    ],
    foods: ['f-chicken-breast', 'f-tofu-momen', 'f-broccoli-boiled', 'f-shimeji', 'f-wakame', 'f-egg-raw', 'f-natto', 'f-brownrice'],
    proteinPerKg: {
      min: 1.2,
      max: 1.6,
      label: '1.2〜1.6 g/kg体重/日（院内目安：減量中の筋肉量維持のため）',
      source: '院内目安。参考：Morton RW, et al. Br J Sports Med. 2018;52:376-384.',
    },
    caution: '摂食障害が疑われる様子（極端な食事制限・体重への強いこだわり等）がある場合は、医療機関・専門家への相談を勧める。',
  },
  {
    key: 'sleep',
    label: '睡眠・疲労',
    short: '睡眠・疲労',
    focus: ['食事時間', 'カフェイン', '飲酒', 'エネルギー不足', '食事バランス'],
    nutrients: ['energy', 'vitB1', 'fe', 'protein'],
    points: [
      '夕食が遅い・寝る直前に食べる習慣は、睡眠の質に影響しやすい。夕食は就寝2〜3時間前までに。',
      'カフェイン（コーヒー・緑茶・エナジードリンク）は夕方以降控えめに。',
      '寝酒は寝つきをよくしても、睡眠の後半を浅くしやすい。',
      '慢性的な疲労は、エネルギー不足・鉄不足・ビタミンB1不足などが隠れていることもある。ただし疲労の原因は多様で、続く場合は医療機関へ。',
    ],
    patientTips: [
      '朝ごはんを食べて体内時計を整える',
      'コーヒーは15時まで',
      '夕食は寝る2〜3時間前まで',
      '寝酒をやめる',
    ],
    foods: ['f-pork-fillet', 'f-rice', 'f-natto', 'f-beef-round', 'f-asari', 'f-banana'],
  },
  {
    key: 'recovery',
    label: '怪我・身体の回復',
    short: '回復',
    focus: ['エネルギー確保', 'たんぱく質', 'ビタミンC', '亜鉛', 'その他の関連栄養素'],
    nutrients: ['energy', 'protein', 'vitC', 'zn', 'vitD', 'ca'],
    points: [
      '組織の修復にはエネルギーが必要。安静中でも「食べる量を極端に減らさない」ことが大切。',
      'たんぱく質は傷んだ組織（筋肉・靭帯・骨）の材料。毎食とる。',
      'ビタミンCはコラーゲンの合成に、亜鉛は細胞の増殖にかかわる。',
      '骨折の場合はカルシウム・ビタミンD・たんぱく質も。',
      '「痛みが消えた＝治った」ではない。再発しない身体づくりまで食事面から伴走する。',
    ],
    patientTips: [
      '安静中も3食しっかり食べる',
      '毎食たんぱく質のおかず＋果物か野菜',
      '牛乳・ヨーグルト・小魚でカルシウム',
    ],
    foods: ['f-chicken-breast', 'f-egg-raw', 'f-beef-round', 'f-kiwi', 'f-broccoli-boiled', 'f-asari', 'f-milk', 'f-salmon-raw'],
    proteinPerKg: {
      min: 1.2,
      max: 1.6,
      label: '1.2〜1.6 g/kg体重/日（院内目安）',
      source: '院内目安。参考：負傷したアスリートでは1.6〜2.5 g/kg/日が提案されている（Tipton KD. Nutritional support for exercise-induced injuries. Sports Med. 2015;45 Suppl 1:S93-104）。',
    },
    caution: '腎臓の病気がある方、医師から食事制限を受けている方は主治医の指示を優先する。',
  },
];

export const PURPOSE_MAP: Record<PurposeKey, PurposeDef> = Object.fromEntries(PURPOSES.map((p) => [p.key, p])) as Record<
  PurposeKey,
  PurposeDef
>;
