const META = {
  source: "自編示範教材",
  contentVersion: "1.1.0",
  reviewStatus: "示範內容，待校對"
};

export const QUIZ_LIST = [
  {
    id: "quiz_001",
    levelCategory: "N4",
    targetId: "vocab_n4_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{来月|らいげつ}の{旅行|りょこう}の{日程|にってい}を（　）。」",
    options: [
      { id: "opt_a", text: "{決|き}めます" },
      { id: "opt_b", text: "{間|ま}に{合|あ}います" },
      { id: "opt_c", text: "{増|ふ}えます" },
      { id: "opt_d", text: "{緊張|きんちょう}します" }
    ],
    correctOptionId: "opt_a",
    explanation: "「日程を決める」是「決定日程」；其餘選項皆為自動詞或語意不合。",
    ...META
  },
  {
    id: "quiz_002",
    levelCategory: "N4",
    targetId: "vocab_n4_003",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{急|いそ}いで{走|はし}ったので、{九時|くじ}の{電車|でんしゃ}に（　）。」",
    options: [
      { id: "opt_a", text: "{片付|かたづ}けました" },
      { id: "opt_b", text: "{間|ま}に{合|あ}いました" },
      { id: "opt_c", text: "{比|くら}べました" },
      { id: "opt_d", text: "{調|しら}べました" }
    ],
    correctOptionId: "opt_b",
    explanation: "「電車に間に合う」表示「趕上電車」，助詞用「に」。",
    ...META
  },
  {
    id: "quiz_003",
    levelCategory: "N4",
    targetId: "vocab_n4_004",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{分|わ}からない{漢字|かんじ}の{意味|いみ}を{辞書|じしょ}で（　）。」",
    options: [
      { id: "opt_a", text: "{断|ことわ}ります" },
      { id: "opt_b", text: "{乗|の}り{換|か}えます" },
      { id: "opt_c", text: "{調|しら}べます" },
      { id: "opt_d", text: "{届|とど}けます" }
    ],
    correctOptionId: "opt_c",
    explanation: "「辞書で調べる」為「用字典查詢」的固定搭配。",
    ...META
  },
  {
    id: "quiz_004",
    levelCategory: "N4",
    targetId: "vocab_n4_006",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{無事|ぶじ}に{着|つ}いたと{聞|き}いて、（　）しました。」",
    options: [
      { id: "opt_a", text: "{安心|あんしん}" },
      { id: "opt_b", text: "{混雑|こんざつ}" },
      { id: "opt_c", text: "{目標|もくひょう}" },
      { id: "opt_d", text: "{予定|よてい}" }
    ],
    correctOptionId: "opt_a",
    explanation: "聽到平安抵達的消息而「放心（安心しました）」。",
    ...META
  },
  {
    id: "quiz_005",
    levelCategory: "N4",
    targetId: "vocab_n4_008",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{部屋|へや}が{散|ち}らかっているので、{今|いま}から（　）。」",
    options: [
      { id: "opt_a", text: "{片付|かたづ}けます" },
      { id: "opt_b", text: "{増|ふ}えます" },
      { id: "opt_c", text: "{相談|そうだん}します" },
      { id: "opt_d", text: "{緊張|きんちょう}します" }
    ],
    correctOptionId: "opt_a",
    explanation: "「部屋を片付ける」為「整理房間」。",
    ...META
  },
  {
    id: "quiz_006",
    levelCategory: "N4",
    targetId: "vocab_n4_009",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{新宿駅|しんじゅくえき}で{山手線|やまのてせん}に（　）ください。」",
    options: [
      { id: "opt_a", text: "まとめて" },
      { id: "opt_b", text: "{乗|の}り{換|か}えて" },
      { id: "opt_c", text: "{比|くら}べて" },
      { id: "opt_d", text: "{断|ことわ}って" }
    ],
    correctOptionId: "opt_b",
    explanation: "「（路線）に乗り換える」表示「轉乘某路線」。",
    ...META
  },
  {
    id: "quiz_007",
    levelCategory: "N3",
    targetId: "vocab_n3_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「メールを{送|おく}る{前|まえ}に、{宛先|あてさき}に{間違|まちが}いがないか（　）します。」",
    options: [
      { id: "opt_a", text: "{確認|かくにん}" },
      { id: "opt_b", text: "{自然|しぜん}" },
      { id: "opt_c", text: "{丁寧|ていねい}" },
      { id: "opt_d", text: "{混雑|こんざつ}" }
    ],
    correctOptionId: "opt_a",
    explanation: "寄信前「確認（確認します）」收件人有無錯誤；「自然」「丁寧」不接「します」。",
    ...META
  },
  {
    id: "quiz_008",
    levelCategory: "N3",
    targetId: "vocab_n3_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{一人|ひとり}で{決|き}められないので、{先輩|せんぱい}に（　）しました。」",
    options: [
      { id: "opt_a", text: "{準備|じゅんび}" },
      { id: "opt_b", text: "{相談|そうだん}" },
      { id: "opt_c", text: "{緊張|きんちょう}" },
      { id: "opt_d", text: "{予定|よてい}" }
    ],
    correctOptionId: "opt_b",
    explanation: "「先輩に相談する」表示「向前輩商量／請教」。",
    ...META
  },
  {
    id: "quiz_009",
    levelCategory: "N3",
    targetId: "vocab_n3_005",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{会議|かいぎ}で{出|で}た{意見|いけん}をノートに（　）。」",
    options: [
      { id: "opt_a", text: "まとめました" },
      { id: "opt_b", text: "{増|ふ}えました" },
      { id: "opt_c", text: "{間|ま}に{合|あ}いました" },
      { id: "opt_d", text: "{安心|あんしん}しました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「意見をまとめる」為「把意見彙整起來」。",
    ...META
  },
  {
    id: "quiz_010",
    levelCategory: "N3",
    targetId: "vocab_n3_006",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{先約|せんやく}があったので、{友達|ともだち}の{誘|さそ}いを（　）。」",
    options: [
      { id: "opt_a", text: "{届|とど}けました" },
      { id: "opt_b", text: "{断|ことわ}りました" },
      { id: "opt_c", text: "{比|くら}べました" },
      { id: "opt_d", text: "{乗|の}り{換|か}えました" }
    ],
    correctOptionId: "opt_b",
    explanation: "「誘いを断る」表示「婉拒／拒絕邀請」。",
    ...META
  },
  {
    id: "quiz_011",
    levelCategory: "N4",
    targetId: "gram_n4_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「この{靴|くつ}が{合|あ}うかどうか、{一度|いちど}{履|は}いて（　）ください。」",
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
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「お{客様|きゃくさま}が{来|く}る{前|まえ}に、{冷|つめ}たいお{茶|ちゃ}を{用意|ようい}して（　）。」",
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
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{来年|らいねん}{留学|りゅうがく}するために、{毎日|まいにち}{貯金|ちょきん}する（　）。」",
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
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{毎日|まいにち}{練習|れんしゅう}したおかげで、{漢字|かんじ}が{読|よ}める（　）。」",
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
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{仕事|しごと}が{嫌|きら}いな（　）が、{少|すこ}し{休|やす}みたいです。」",
    options: [
      { id: "opt_a", text: "わけではありません" },
      { id: "opt_b", text: "ことにしました" },
      { id: "opt_c", text: "ようになりました" },
      { id: "opt_d", text: "ておきました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「嫌いなわけではありませんが…」表示「並不是討厭工作，只是想休息一下」。",
    ...META
  },
  {
    id: "quiz_016",
    levelCategory: "N4",
    targetId: "vocab_n4_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{友達|ともだち}の{家|いえ}まで{荷物|にもつ}を（　）きました。」",
    options: [
      { id: "opt_a", text: "{届|とど}けて" },
      { id: "opt_b", text: "{増|ふ}えて" },
      { id: "opt_c", text: "{間|ま}に{合|あ}って" },
      { id: "opt_d", text: "{緊張|きんちょう}して" }
    ],
    correctOptionId: "opt_a",
    explanation: "「荷物を届ける」表示「把行李送到／遞交」。",
    ...META
  },
  {
    id: "quiz_017",
    levelCategory: "N4",
    targetId: "vocab_n4_005",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{明日|あした}の{発表|はっぴょう}の（　）がまだ{終|お}わりません。」",
    options: [
      { id: "opt_a", text: "{準備|じゅんび}" },
      { id: "opt_b", text: "{混雑|こんざつ}" },
      { id: "opt_c", text: "{自然|しぜん}" },
      { id: "opt_d", text: "{丁寧|ていねい}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「発表の準備」為「發表的準備」。",
    ...META
  },
  {
    id: "quiz_018",
    levelCategory: "N4",
    targetId: "vocab_n4_007",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「その{店員|てんいん}さんはいつも（　）{話|はな}してくれます。」",
    options: [
      { id: "opt_a", text: "{丁寧|ていねい}に" },
      { id: "opt_b", text: "{混雑|こんざつ}に" },
      { id: "opt_c", text: "{予定|よてい}に" },
      { id: "opt_d", text: "{目標|もくひょう}に" }
    ],
    correctOptionId: "opt_a",
    explanation: "「丁寧に話す」表示「有禮貌且仔細地說話」。",
    ...META
  },
  {
    id: "quiz_019",
    levelCategory: "N4",
    targetId: "vocab_n4_010",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{来週|らいしゅう}の{土曜日|どようび}は、{京都|きょうと}へ{行|い}く（　）です。」",
    options: [
      { id: "opt_a", text: "{予定|よてい}" },
      { id: "opt_b", text: "{安心|あんしん}" },
      { id: "opt_c", text: "{緊張|きんちょう}" },
      { id: "opt_d", text: "{確認|かくにん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「～へ行く予定です」表示「預定要去某地」。",
    ...META
  },
  {
    id: "quiz_020",
    levelCategory: "N4",
    targetId: "gram_n4_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「おいしそうなので、このケーキを{食|た}べて（　）たいです。」",
    options: [
      { id: "opt_a", text: "み" },
      { id: "opt_b", text: "おき" },
      { id: "opt_c", text: "なり" },
      { id: "opt_d", text: "しまい" }
    ],
    correctOptionId: "opt_a",
    explanation: "「食べてみたい」表示「想吃吃看」。",
    ...META
  },
  {
    id: "quiz_021",
    levelCategory: "N4",
    targetId: "gram_n4_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{忘|わす}れないように、メモを{書|か}いて（　）ましょう。」",
    options: [
      { id: "opt_a", text: "おき" },
      { id: "opt_b", text: "み" },
      { id: "opt_c", text: "あり" },
      { id: "opt_d", text: "い" }
    ],
    correctOptionId: "opt_a",
    explanation: "「書いておきましょう」表示「先寫下來備忘吧」。",
    ...META
  },
  {
    id: "quiz_022",
    levelCategory: "N4",
    targetId: "vocab_n4_003",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{バス|ばす}が{遅|おく}れたので、{会議|かいぎ}に（　）ませんでした。」",
    options: [
      { id: "opt_a", text: "{間|ま}に{合|あ}い" },
      { id: "opt_b", text: "{調|しら}べ" },
      { id: "opt_c", text: "{片付|かたづ}け" },
      { id: "opt_d", text: "{決|き}め" }
    ],
    correctOptionId: "opt_a",
    explanation: "「会議に間に合いませんでした」表示「沒趕上會議」。",
    ...META
  },
  {
    id: "quiz_023",
    levelCategory: "N4",
    targetId: "vocab_n4_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「メニューを{見|み}て、{何|なに}を{食|た}べるか（　）ました。」",
    options: [
      { id: "opt_a", text: "{決|き}め" },
      { id: "opt_b", text: "{増|ふ}え" },
      { id: "opt_c", text: "{間|ま}に{合|あ}い" },
      { id: "opt_d", text: "{乗|の}り{換|か}え" }
    ],
    correctOptionId: "opt_a",
    explanation: "看著菜單「決定（決めました）」要吃什麼。",
    ...META
  },
  {
    id: "quiz_024",
    levelCategory: "N4",
    targetId: "vocab_n4_004",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「インターネットで{電車|でんしゃ}の{時間|じかん}を（　）おきます。」",
    options: [
      { id: "opt_a", text: "{調|しら}べて" },
      { id: "opt_b", text: "{断|ことわ}って" },
      { id: "opt_c", text: "{片付|かたづ}けて" },
      { id: "opt_d", text: "{届|とど}けて" }
    ],
    correctOptionId: "opt_a",
    explanation: "「調べておく」表示「先上網查好」。",
    ...META
  },
  {
    id: "quiz_025",
    levelCategory: "N4",
    targetId: "vocab_n4_009",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{東京駅|とうきょうえき}で{新幹線|しんかんせん}に（　）なければなりません。」",
    options: [
      { id: "opt_a", text: "{乗|の}り{換|か}え" },
      { id: "opt_b", text: "{比|くら}べ" },
      { id: "opt_c", text: "まとめ" },
      { id: "opt_d", text: "{届|とど}け" }
    ],
    correctOptionId: "opt_a",
    explanation: "「新幹線に乗り換えなければなりません」表示「必須轉乘新幹線」。",
    ...META
  },
  {
    id: "quiz_026",
    levelCategory: "N3",
    targetId: "vocab_n3_003",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{最近|さいきん}、この{町|まち}に{住|す}む{人|ひと}が（　）きました。」",
    options: [
      { id: "opt_a", text: "{増|ふ}えて" },
      { id: "opt_b", text: "{決|き}めて" },
      { id: "opt_c", text: "{調|しら}べて" },
      { id: "opt_d", text: "{片付|かたづ}けて" }
    ],
    correctOptionId: "opt_a",
    explanation: "「人が増えてきました」表示「住在這座城鎮的人漸漸增加了」，自動詞搭配助詞「が」。",
    ...META
  },
  {
    id: "quiz_027",
    levelCategory: "N3",
    targetId: "vocab_n3_004",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{面接|めんせつ}の{前|まえ}はいつも（　）してしまいます。」",
    options: [
      { id: "opt_a", text: "{緊張|きんちょう}" },
      { id: "opt_b", text: "{予定|よてい}" },
      { id: "opt_c", text: "{目標|もくひょう}" },
      { id: "opt_d", text: "{自然|しぜん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「緊張してしまいます」表示「總是會不小心緊張起來」。",
    ...META
  },
  {
    id: "quiz_028",
    levelCategory: "N3",
    targetId: "vocab_n3_007",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{連休|れんきゅう}の{高速道路|こうそくどうろ}はとても（　）しています。」",
    options: [
      { id: "opt_a", text: "{混雑|こんざつ}" },
      { id: "opt_b", text: "{安心|あんしん}" },
      { id: "opt_c", text: "{相談|そうだん}" },
      { id: "opt_d", text: "{確認|かくにん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "連假的高速公路非常「擁擠（混雑しています）」。",
    ...META
  },
  {
    id: "quiz_029",
    levelCategory: "N3",
    targetId: "vocab_n3_008",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「この{公園|こうえん}は{緑|みどり}が{多|おお}くて、（　）が{豊|ゆた}かです。」",
    options: [
      { id: "opt_a", text: "{自然|しぜん}" },
      { id: "opt_b", text: "{緊張|きんちょう}" },
      { id: "opt_c", text: "{準備|じゅんび}" },
      { id: "opt_d", text: "{予定|よてい}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「自然が豊かです」表示「自然環境豐富」。",
    ...META
  },
  {
    id: "quiz_030",
    levelCategory: "N3",
    targetId: "vocab_n3_009",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「A{社|しゃ}とB{社|しゃ}の{値段|ねだん}を（　）から{買|か}います。」",
    options: [
      { id: "opt_a", text: "{比|くら}べて" },
      { id: "opt_b", text: "{増|ふ}えて" },
      { id: "opt_c", text: "{間|ま}に{合|あ}って" },
      { id: "opt_d", text: "{安心|あんしん}して" }
    ],
    correctOptionId: "opt_a",
    explanation: "「値段を比べてから買います」表示「比較價格之後再買」。",
    ...META
  },
  {
    id: "quiz_031",
    levelCategory: "N3",
    targetId: "vocab_n3_010",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{今年|ことし}の（　）はN3に{合格|ごうかく}することです。」",
    options: [
      { id: "opt_a", text: "{目標|もくひょう}" },
      { id: "opt_b", text: "{混雑|こんざつ}" },
      { id: "opt_c", text: "{丁寧|ていねい}" },
      { id: "opt_d", text: "{自然|しぜん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「今年の目標は～ことです」表示「今年的目標是…」。",
    ...META
  },
  {
    id: "quiz_032",
    levelCategory: "N3",
    targetId: "gram_n3_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{夜遅|よるおそ}くは{お菓子|おかし}を{食|た}べない（　）しています。」",
    options: [
      { id: "opt_a", text: "ことに" },
      { id: "opt_b", text: "ように" },
      { id: "opt_c", text: "わけに" },
      { id: "opt_d", text: "ために" }
    ],
    correctOptionId: "opt_a",
    explanation: "「食べないことにしています」表達自己長期維持的習慣決定（不吃宵夜）。",
    ...META
  },
  {
    id: "quiz_033",
    levelCategory: "N3",
    targetId: "gram_n3_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{日本|にほん}に{住|す}んでから、{納豆|なっとう}が{食|た}べられる（　）。」",
    options: [
      { id: "opt_a", text: "ようになりました" },
      { id: "opt_b", text: "ことにしました" },
      { id: "opt_c", text: "ておきました" },
      { id: "opt_d", text: "わけではありません" }
    ],
    correctOptionId: "opt_a",
    explanation: "「食べられるようになりました」表示從原本不敢吃到「變得能吃了」。",
    ...META
  },
  {
    id: "quiz_034",
    levelCategory: "N3",
    targetId: "gram_n3_003",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{毎日|まいにち}{運動|うんどう}すれば、{必|かなら}ずやせる（　）。」",
    options: [
      { id: "opt_a", text: "わけではありません" },
      { id: "opt_b", text: "ことにしました" },
      { id: "opt_c", text: "てみました" },
      { id: "opt_d", text: "ておきました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「必ず～わけではありません」是常見部分否定搭配，表示「並不是一定會瘦」。",
    ...META
  },
  {
    id: "quiz_035",
    levelCategory: "N3",
    targetId: "vocab_n3_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「パスポートを{持|も}ったかどうか、もう{一度|いちど}（　）しましょう。」",
    options: [
      { id: "opt_a", text: "{確認|かくにん}" },
      { id: "opt_b", text: "{混雑|こんざつ}" },
      { id: "opt_c", text: "{緊張|きんちょう}" },
      { id: "opt_d", text: "{安心|あんしん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「もう一度確認しましょう」表示「再確認一次吧」。",
    ...META
  },
  {
    id: "quiz_036",
    levelCategory: "N3",
    targetId: "vocab_n3_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{家族|かぞく}とよく（　）してから、{引|ひ}っ{越|こ}しを{決|き}めました。」",
    options: [
      { id: "opt_a", text: "{相談|そうだん}" },
      { id: "opt_b", text: "{混雑|こんざつ}" },
      { id: "opt_c", text: "{目標|もくひょう}" },
      { id: "opt_d", text: "{自然|しぜん}" }
    ],
    correctOptionId: "opt_a",
    explanation: "「家族と相談する」表示「與家人商量」。",
    ...META
  },
  {
    id: "quiz_037",
    levelCategory: "N3",
    targetId: "vocab_n3_005",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{旅行|りょこう}の{写真|しゃしん}をアルバムに（　）おきました。」",
    options: [
      { id: "opt_a", text: "まとめて" },
      { id: "opt_b", text: "{増|ふ}えて" },
      { id: "opt_c", text: "{間|ま}に{合|あ}って" },
      { id: "opt_d", text: "{緊張|きんちょう}して" }
    ],
    correctOptionId: "opt_a",
    explanation: "「アルバムにまとめておく」表示「把照片整理彙整到相簿裡」。",
    ...META
  },
  {
    id: "quiz_038",
    levelCategory: "N3",
    targetId: "vocab_n3_006",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{忙|いそが}しいので、アルバイトの{依頼|いらい}を（　）ました。」",
    options: [
      { id: "opt_a", text: "{断|ことわ}り" },
      { id: "opt_b", text: "{増|ふ}え" },
      { id: "opt_c", text: "{間|ま}に{合|あ}い" },
      { id: "opt_d", text: "{安心|あんしん}し" }
    ],
    correctOptionId: "opt_a",
    explanation: "「依頼を断る」表示「拒絕／推辭委託」。",
    ...META
  },
  {
    id: "quiz_039",
    levelCategory: "N3",
    targetId: "gram_n3_001",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{電車|でんしゃ}が{止|と}まっているので、タクシーで{帰|かえ}る（　）。」",
    options: [
      { id: "opt_a", text: "ことにしました" },
      { id: "opt_b", text: "ようになりました" },
      { id: "opt_c", text: "ておきました" },
      { id: "opt_d", text: "わけではありません" }
    ],
    correctOptionId: "opt_a",
    explanation: "因為電車停駛，自己決定「搭計程車回去（帰ることにしました）」。",
    ...META
  },
  {
    id: "quiz_040",
    levelCategory: "N3",
    targetId: "gram_n3_002",
    prompt: "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\n「{眼鏡|めがね}をかけたら、{黒板|こくばん}の{字|じ}がはっきり{見|み}える（　）。」",
    options: [
      { id: "opt_a", text: "ようになりました" },
      { id: "opt_b", text: "ことにしました" },
      { id: "opt_c", text: "ておきました" },
      { id: "opt_d", text: "てみました" }
    ],
    correctOptionId: "opt_a",
    explanation: "「見えるようになりました」表示戴上眼鏡後「變得看清楚了」。",
    ...META
  }
];
