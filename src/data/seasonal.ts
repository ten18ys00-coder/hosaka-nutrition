// 毎月の栄養テーマ・旬の食材・おすすめレシピ（院内コンテンツ。設定や資料ライブラリから追加・編集できます）

export interface MonthlyTheme {
  month: number;
  theme: string;
  message: string;
  foods: string[];
}

export const MONTHLY_THEMES: MonthlyTheme[] = [
  { month: 1, theme: '冬の体を内側から温める食事', message: '寒さで活動量が落ちる季節。温かい汁物に肉・魚・豆腐を入れて、たんぱく質と野菜を一緒にとりましょう。', foods: ['白菜', '大根', 'ぶり', 'ほうれん草', '小松菜', 'みかん'] },
  { month: 2, theme: '日照が少ない時期のビタミンDと骨', message: '冬は日照時間が短く、ビタミンDが不足しがち。鮭・さば・きのこを意識して。', foods: ['ブロッコリー', '小松菜', 'たら', 'かき（牡蠣）', 'ねぎ', 'いちご'] },
  { month: 3, theme: '新生活に向けた朝食習慣', message: '生活が変わる時期こそ朝食を。おにぎり＋卵＋牛乳など「3品そろう朝」を提案。', foods: ['菜の花', '新たまねぎ', 'あさり', 'いちご', '春キャベツ'] },
  { month: 4, theme: '部活シーズン開始！補食のとり方', message: '練習の前は糖質、練習の後は糖質＋たんぱく質。補食を「おやつ」ではなく「食事の一部」に。', foods: ['新じゃがいも', '春キャベツ', 'かつお', 'たけのこ', 'アスパラガス'] },
  { month: 5, theme: '疲れやすさとビタミンB群', message: '新生活の疲れが出る頃。豚肉・大豆製品・玄米などでビタミンB1を。', foods: ['アスパラガス', 'そら豆', 'かつお', '新茶', 'グリーンピース'] },
  { month: 6, theme: '梅雨の食欲と腸内環境', message: '食物繊維（野菜・きのこ・海藻・豆）と発酵食品で、おなかの調子を整えましょう。', foods: ['あじ', '梅', 'きゅうり', 'ズッキーニ', '枝豆'] },
  { month: 7, theme: '熱中症を防ぐ水分と塩分', message: 'のどが渇く前に水分を。大量に汗をかく練習・作業では塩分も一緒に補給します。', foods: ['トマト', 'きゅうり', '枝豆', 'とうもろこし', 'すいか'] },
  { month: 8, theme: '夏バテ予防は「食事量の確保」から', message: '冷たい麺だけで済ませず、卵・肉・豆腐をのせて。食欲がない日は回数を分けて。', foods: ['ゴーヤ', 'なす', 'オクラ', '桃', 'いわし'] },
  { month: 9, theme: '夏の疲れを回復させる鉄とたんぱく質', message: '汗とともに失われたミネラルを補充。赤身の肉・魚、青菜を意識して。', foods: ['さんま', 'さつまいも', 'きのこ類', 'ぶどう', '梨'] },
  { month: 10, theme: '秋は体づくりのチャンス', message: '食欲が戻るこの時期に、毎食たんぱく質のおかずを1品。筋力アップのトレーニングと一緒に。', foods: ['鮭', 'きのこ類', 'さつまいも', '栗', 'かぼちゃ'] },
  { month: 11, theme: '冬に備えるビタミンDと骨の健康', message: '日照時間が短くなる前に、鮭・さば・きのこでビタミンDを。カルシウムと一緒にとって骨を守りましょう。', foods: ['鮭', 'さば', 'ブロッコリー', '白菜', 'みかん', '柿', 'しいたけ'] },
  { month: 12, theme: '年末年始の食べすぎ・飲みすぎ対策', message: '会食が増える時期。翌日の食事で調整し、野菜・汁物で塩分と量のバランスを。', foods: ['ぶり', '大根', 'ほうれん草', '春菊', 'ゆず', 'みかん'] },
];

export interface Recipe {
  id: string;
  title: string;
  purpose: string;
  servings: 1;
  ingredients: { food_id: string; grams: number; label: string }[];
  extras: string[]; // 栄養計算に含めない材料（少量の調味料など）
  steps: string[];
  point: string;
  months: number[];
}

export const RECIPES: Recipe[] = [
  {
    id: 'r-salmon-foil',
    title: '鮭ときのこのホイル焼き',
    purpose: '骨の健康・ビタミンD',
    servings: 1,
    ingredients: [
      { food_id: 'f-salmon-raw', grams: 80, label: '生鮭 1切れ' },
      { food_id: 'f-shimeji', grams: 50, label: 'しめじ 1/2パック' },
      { food_id: 'f-maitake', grams: 30, label: 'まいたけ 少々' },
      { food_id: 'f-onion', grams: 30, label: 'たまねぎ 1/6個' },
      { food_id: 'f-butter', grams: 4, label: 'バター 小さじ1' },
      { food_id: 'f-soysauce', grams: 3, label: 'しょうゆ 小さじ1/2' },
    ],
    extras: ['こしょう 少々', 'レモン（お好みで）'],
    steps: ['アルミホイルに薄切りのたまねぎ、鮭、ほぐしたきのこをのせる', 'バターをのせ、こしょうをふって包む', 'トースターかフライパン（ふた付き）で12〜15分加熱し、しょうゆをたらす'],
    point: '鮭ときのこは、ビタミンDを多く含む組み合わせ。牛乳やヨーグルトを添えるとカルシウムも一緒にとれます。',
    months: [9, 10, 11, 12, 1, 2],
  },
  {
    id: 'r-chicken-broccoli',
    title: '鶏むね肉とブロッコリーのごま和え',
    purpose: '筋力向上・たんぱく質',
    servings: 1,
    ingredients: [
      { food_id: 'f-chicken-breast', grams: 80, label: '鶏むね肉（皮なし） 80g' },
      { food_id: 'f-broccoli-boiled', grams: 60, label: 'ブロッコリー 4房' },
      { food_id: 'f-sesame', grams: 3, label: 'いりごま 小さじ1' },
      { food_id: 'f-soysauce', grams: 6, label: 'しょうゆ 小さじ1' },
    ],
    extras: ['砂糖 小さじ1/2'],
    steps: ['鶏むね肉はそぎ切りにし、沸騰した湯で弱火3〜4分ゆで、ふたをして余熱で火を通す', 'ブロッコリーは小房に分けてゆでる', 'ごま・しょうゆ・砂糖で和える'],
    point: 'たんぱく質が多く脂質の少ない組み合わせ。作り置きにも向きます。',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'r-saba-miso',
    title: 'さば缶と小松菜・豆腐のみそ汁',
    purpose: '高齢者・フレイル予防',
    servings: 1,
    ingredients: [
      { food_id: 'f-saba-can', grams: 50, label: 'さば水煮缶 1/3缶' },
      { food_id: 'f-komatsuna', grams: 40, label: '小松菜 1株' },
      { food_id: 'f-tofu-kinu', grams: 50, label: '絹ごし豆腐 1/6丁' },
      { food_id: 'f-miso', grams: 12, label: 'みそ 小さじ2' },
    ],
    extras: ['水 150ml'],
    steps: ['鍋に水を沸かし、ひと口大の豆腐と小松菜を入れる', 'さば缶を身ごと加えてひと煮立ち', '火を止めてみそを溶く'],
    point: '火を使う時間が短く、やわらかく食べやすい一品。さば缶の汁にもうま味があるので、みその量は控えめに。',
    months: [10, 11, 12, 1, 2, 3],
  },
  {
    id: 'r-onigiri-milk',
    title: '練習後の補食：鮭おにぎり＋牛乳',
    purpose: '学生アスリート',
    servings: 1,
    ingredients: [
      { food_id: 'f-rice', grams: 120, label: 'ごはん 120g' },
      { food_id: 'f-salmon-grilled', grams: 15, label: '焼き鮭（ほぐし） 15g' },
      { food_id: 'f-nori', grams: 1.5, label: '焼きのり 1/2枚' },
      { food_id: 'f-milk', grams: 206, label: '牛乳 200ml' },
    ],
    extras: ['塩 少々'],
    steps: ['ほぐした焼き鮭をごはんに混ぜてにぎる', 'のりを巻く', '練習後できるだけ早く、牛乳と一緒に食べる'],
    point: '糖質とたんぱく質を一緒に。練習後の30分〜1時間以内が目安です。',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: 'r-egg-udon',
    title: 'ほうれん草の卵とじうどん',
    purpose: '食欲がない日・食べやすさ',
    servings: 1,
    ingredients: [
      { food_id: 'f-udon', grams: 200, label: 'ゆでうどん 1玉弱' },
      { food_id: 'f-egg-raw', grams: 50, label: '卵 1個' },
      { food_id: 'f-spinach-boiled', grams: 30, label: 'ゆでほうれん草 少々' },
      { food_id: 'f-soysauce', grams: 9, label: 'しょうゆ 大さじ1/2' },
    ],
    extras: ['だし 300ml', 'みりん 小さじ1'],
    steps: ['だしにしょうゆ・みりんを入れて温め、うどんを煮る', 'ほうれん草を加え、溶き卵を回し入れてふたをする', '卵が半熟になったら火を止める'],
    point: 'やわらかく食べやすい一品。汁は残すと食塩を控えられます。',
    months: [11, 12, 1, 2, 3],
  },
  {
    id: 'r-natto-breakfast',
    title: '納豆ごはんと豆腐・わかめのみそ汁',
    purpose: '朝食の基本形',
    servings: 1,
    ingredients: [
      { food_id: 'f-rice', grams: 150, label: 'ごはん 茶碗1杯' },
      { food_id: 'f-natto', grams: 45, label: '納豆 1パック' },
      { food_id: 'f-tofu-kinu', grams: 50, label: '絹ごし豆腐 1/6丁' },
      { food_id: 'f-wakame', grams: 10, label: 'わかめ（戻し） 10g' },
      { food_id: 'f-miso', grams: 12, label: 'みそ 小さじ2' },
    ],
    extras: ['ねぎ 少々'],
    steps: ['豆腐とわかめでみそ汁をつくる', 'ごはんに納豆をのせる'],
    point: '主食・たんぱく質源・汁物がそろう朝食。卵や果物を足すとさらにバランスがよくなります。',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
];
