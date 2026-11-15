const META = {
  source: "自編示範教材",
  contentVersion: "1.0.0",
  reviewStatus: "示範內容，待校對"
};

export const QUIZ_LIST = [
  {
    id: "quiz_001",
    levelCategory: "N4",
    targetId: "vocab_n4_001",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「来月の旅行の日程を（　）。」",
    options: [
      { id: "opt_a", text: "決めます" },
      { id: "opt_b", text: "間に合います" },
      { id: "opt_c", text: "増えます" },
      { id: "opt_d", text: "緊張します" }
    ],
    correctOptionId: "opt_a",
    explanation: "「日程を決める」是「決定日程」；其餘選項皆為自動詞或語意不合。",
    ...META
  },
  {
    id: "quiz_002",
    levelCategory: "N4",
    targetId: "vocab_n4_003",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「急いで走ったので、九時の電車に（　）。」",
    options: [
      { id: "opt_a", text: "片付けました" },
      { id: "opt_b", text: "間に合いました" },
      { id: "opt_c", text: "比べました" },
      { id: "opt_d", text: "調べました" }
    ],
    correctOptionId: "opt_b",
    explanation: "「電車に間に合う」表示「趕上電車」，助詞用「に」。",
    ...META
  },
  {
    id: "quiz_003",
    levelCategory: "N4",
    targetId: "vocab_n4_004",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「分からない漢字の意味を辞書で（　）。」",
    options: [
      { id: "opt_a", text: "断ります" },
      { id: "opt_b", text: "乗り換えます" },
      { id: "opt_c", text: "調べます" },
      { id: "opt_d", text: "届けます" }
    ],
    correctOptionId: "opt_c",
    explanation: "「辞書で調べる」為「用字典查詢」的固定搭配。",
    ...META
  },
  {
    id: "quiz_004",
    levelCategory: "N4",
    targetId: "vocab_n4_006",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「無事に着いたと聞いて、（　）しました。」",
    options: [
      { id: "opt_a", text: "安心" },
      { id: "opt_b", text: "混雑" },
      { id: "opt_c", text: "目標" },
      { id: "opt_d", text: "予定" }
    ],
    correctOptionId: "opt_a",
    explanation: "聽到平安抵達的消息而「放心（安心しました）」。",
    ...META
  },
  {
    id: "quiz_005",
    levelCategory: "N4",
    targetId: "vocab_n4_008",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「部屋が散らかっているので、今から（　）。」",
    options: [
      { id: "opt_a", text: "片付けます" },
      { id: "opt_b", text: "増えます" },
      { id: "opt_c", text: "相談します" },
      { id: "opt_d", text: "緊張します" }
    ],
    correctOptionId: "opt_a",
    explanation: "「部屋を片付ける」為「整理房間」。",
    ...META
  },
  {
    id: "quiz_006",
    levelCategory: "N4",
    targetId: "vocab_n4_009",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「新宿駅で山手線に（　）ください。」",
    options: [
      { id: "opt_a", text: "まとめて" },
      { id: "opt_b", text: "乗り換えて" },
      { id: "opt_c", text: "比べて" },
      { id: "opt_d", text: "断って" }
    ],
    correctOptionId: "opt_b",
    explanation: "「（路線）に乗り換える」表示「轉乘某路線」。",
    ...META
  },
  {
    id: "quiz_007",
    levelCategory: "N3",
    targetId: "vocab_n3_001",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「メールを送る前に、宛先に間違いがないか（　）します。」",
    options: [
      { id: "opt_a", text: "確認" },
      { id: "opt_b", text: "自然" },
      { id: "opt_c", text: "丁寧" },
      { id: "opt_d", text: "混雑" }
    ],
    correctOptionId: "opt_a",
    explanation: "寄信前「確認（確認します）」收件人有無錯誤；「自然」「丁寧」不接「します」。",
    ...META
  },
  {
    id: "quiz_008",
    levelCategory: "N3",
    targetId: "vocab_n3_002",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「一人で決められないので、先輩に（　）しました。」",
    options: [
      { id: "opt_a", text: "準備" },
      { id: "opt_b", text: "相談" },
      { id: "opt_c", text: "緊張" },
      { id: "opt_d", text: "予定" }
    ],
    correctOptionId: "opt_b",
    explanation: "「先輩に相談する」表示「向前輩商量／請教」。",
    ...META
  },
  {
    id: "quiz_009",
    levelCategory: "N3",
    targetId: "vocab_n3_005",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「会議で出た意見をノートに（　）。」",
    options: [
      { id: "opt_a", text: "まとめました" },
      { id: "opt_b", text: "増えました" },
      { id: "opt_c", text: "間に合いました" },
      { id: "opt_d", text: "安心しました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「意見をまとめる」為「把意見彙整起來」。",
    ...META
  },
  {
    id: "quiz_010",
    levelCategory: "N3",
    targetId: "vocab_n3_006",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「先約があったので、友達の誘いを（　）。」",
    options: [
      { id: "opt_a", text: "届けました" },
      { id: "opt_b", text: "断りました" },
      { id: "opt_c", text: "比べました" },
      { id: "opt_d", text: "乗り換えました" }
    ],
    correctOptionId: "opt_b",
    explanation: "「誘いを断る」表示「婉拒／拒絕邀請」。",
    ...META
  },
  {
    id: "quiz_011",
    levelCategory: "N4",
    targetId: "gram_n4_001",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「この靴が合うかどうか、一度履いて（　）ください。」",
    options: [
      { id: "opt_a", text: "みて" },
      { id: "opt_b", text: "おいて" },
      { id: "opt_c", text: "なって" },
      { id: "opt_d", text: "して" }
    ],
    correctOptionId: "opt_a",
    explanation: "「履いてみる」為「試穿看看」，符合「適不適合先穿穿看」的語意。",
    ...META
  },
  {
    id: "quiz_012",
    levelCategory: "N4",
    targetId: "gram_n4_002",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「お客様が来る前に、冷たいお茶を用意して（　）。」",
    options: [
      { id: "opt_a", text: "おきます" },
      { id: "opt_b", text: "みます" },
      { id: "opt_c", text: "なります" },
      { id: "opt_d", text: "わけではありません" }
    ],
    correctOptionId: "opt_a",
    explanation: "「用意しておく」表示「事先準備好」。",
    ...META
  },
  {
    id: "quiz_013",
    levelCategory: "N3",
    targetId: "gram_n3_001",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「来年留学するために、毎日貯金する（　）。」",
    options: [
      { id: "opt_a", text: "ことにしました" },
      { id: "opt_b", text: "ておきました" },
      { id: "opt_c", text: "てみました" },
      { id: "opt_d", text: "わけではありません" }
    ],
    correctOptionId: "opt_a",
    explanation: "「貯金することにしました」表達說話者自己決定每天存錢。",
    ...META
  },
  {
    id: "quiz_014",
    levelCategory: "N3",
    targetId: "gram_n3_002",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「毎日練習したおかげで、漢字が読める（　）。」",
    options: [
      { id: "opt_a", text: "ようにしました" },
      { id: "opt_b", text: "ようになりました" },
      { id: "opt_c", text: "ておきました" },
      { id: "opt_d", text: "わけではありません" }
    ],
    correctOptionId: "opt_b",
    explanation: "「読めるようになる」表示能力上的變化「變得能夠讀懂」。",
    ...META
  },
  {
    id: "quiz_015",
    levelCategory: "N3",
    targetId: "gram_n3_003",
    prompt: "次の文の（　）に入る最もよいものを一つ選びなさい。\n「仕事が嫌いな（　）が、少し休みたいです。」",
    options: [
      { id: "opt_a", text: "わけではありません" },
      { id: "opt_b", text: "ことにしました" },
      { id: "opt_c", text: "ようになりました" },
      { id: "opt_d", text: "ておきました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「嫌いなわけではありませんが…」表示「並不是討厭工作，只是想休息一下」。",
    ...META
  }
];
