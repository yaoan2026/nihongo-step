import { stripRubyMarkup } from "./dom.js";
import { normalizeGrammarTitleKey } from "./studyLogic.js";

const API_KEY_STORAGE_KEY = "nihongo_step_gemini_api_key";
const MODEL_STORAGE_KEY = "nihongo_step_gemini_model";
const DAILY_AI_PREFIX = "nihongo_step_ai_daily_";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

export const PRESET_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

let cachedAvailableModels = null;
let geminiRequestQueue = Promise.resolve();
let lastRequestFinishedAt = 0;

export function loadGeminiKey(storage = globalThis.localStorage) {
  try {
    return storage?.getItem(API_KEY_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveGeminiKey(apiKey, storage = globalThis.localStorage) {
  try {
    const trimmed = String(apiKey || "").trim();
    if (!trimmed) {
      storage?.removeItem(API_KEY_STORAGE_KEY);
    } else {
      storage?.setItem(API_KEY_STORAGE_KEY, trimmed);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadGeminiModel(storage = globalThis.localStorage) {
  try {
    const saved = String(storage?.getItem(MODEL_STORAGE_KEY) || "").trim();
    if (!saved || saved.startsWith("gemini-1.")) {
      return DEFAULT_GEMINI_MODEL;
    }
    return saved;
  } catch {
    return DEFAULT_GEMINI_MODEL;
  }
}

export function saveGeminiModel(model, storage = globalThis.localStorage) {
  try {
    storage?.setItem(MODEL_STORAGE_KEY, model || DEFAULT_GEMINI_MODEL);
  } catch {
    // ignore
  }
}

export function loadCachedDailyAiQuizzes(dateStr, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(`${DAILY_AI_PREFIX}${dateStr}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedDailyAiQuizzes(dateStr, quizzes, storage = globalThis.localStorage) {
  try {
    storage?.setItem(`${DAILY_AI_PREFIX}${dateStr}`, JSON.stringify(quizzes));
  } catch {
    // ignore
  }
}

export function findCachedAiQuizById(questionId, storage = globalThis.localStorage) {
  try {
    if (!storage) return null;
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && k.startsWith(DAILY_AI_PREFIX)) {
        const list = JSON.parse(storage.getItem(k) || "[]");
        const found = Array.isArray(list) ? list.find((q) => q.id === questionId) : null;
        if (found) return found;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function parseJsonArrayFromAi(rawText) {
  const text = String(rawText || "").trim();
  if (!text) {
    throw new Error("AI 回傳的內容為空，請再試一次。");
  }

  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const firstBracket = stripped.indexOf("[");
    const lastBracket = stripped.lastIndexOf("]");
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");

    let candidate = "";
    if (firstBracket !== -1 && lastBracket > firstBracket && (firstBrace === -1 || firstBracket < firstBrace)) {
      candidate = stripped.slice(firstBracket, lastBracket + 1);
    } else if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidate = stripped.slice(firstBrace, lastBrace + 1);
    }

    if (!candidate) {
      throw new Error("AI 回傳的 JSON 無法解析，請再試一次。");
    }
    try {
      parsed = JSON.parse(candidate);
    } catch {
      throw new Error("AI 回傳的 JSON 無法解析，請再試一次。");
    }
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    for (const val of Object.values(parsed)) {
      if (Array.isArray(val)) {
        return val;
      }
    }
    if (parsed.word || parsed.title || parsed.prompt) {
      return [parsed];
    }
  }

  throw new Error("AI 回傳的資料格式不正確（非陣列或為空）。");
}

export function validateAiQuizList(rawList, dateStr) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error("AI 回傳的題目格式不正確（非陣列或為空）。");
  }

  const validOptionIds = new Set(["opt_a", "opt_b", "opt_c", "opt_d"]);
  const normalized = [];

  for (let i = 0; i < rawList.length; i += 1) {
    const item = rawList[i];
    if (!item || typeof item !== "object") continue;
    if (typeof item.prompt !== "string" || !item.prompt.trim()) continue;
    if (!Array.isArray(item.options) || item.options.length !== 4) continue;

    const options = item.options.map((opt, idx) => {
      if (typeof opt === "string") {
        return {
          id: ["opt_a", "opt_b", "opt_c", "opt_d"][idx],
          text: opt.trim()
        };
      }
      return {
        id: validOptionIds.has(opt?.id) ? opt.id : ["opt_a", "opt_b", "opt_c", "opt_d"][idx],
        text: String(opt?.text ?? opt?.label ?? "").trim()
      };
    });
    if (options.some((o) => !o.text)) continue;

    const correctId = options.some((o) => o.id === item.correctOptionId)
      ? item.correctOptionId
      : options[0].id;

    normalized.push({
      id: `ai_${dateStr}_${String(i + 1).padStart(2, "0")}`,
      levelCategory: item.levelCategory === "N3" ? "N3" : "N4",
      prompt: item.prompt.trim(),
      options,
      correctOptionId: correctId,
      explanation: String(item.explanation || "請參考題意與選項搭配。").trim(),
      source: "Gemini AI 即時生成",
      contentVersion: dateStr,
      reviewStatus: "AI 即時生成（建議自行核對）"
    });
  }

  if (normalized.length === 0) {
    throw new Error("無法解析出有效的選擇題，請重試一次。");
  }
  return normalized;
}

export async function fetchAvailableGeminiModels(apiKey) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw new Error("請先填入 Gemini API Key 再偵測模型。");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`無法取得模型清單（HTTP ${res.status}），請確認 API Key 是否有效。`);
  }
  const data = await res.json();
  const models = (data?.models || [])
    .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter((id) => id.startsWith("gemini-") && !id.startsWith("gemini-1."));
  if (models.length > 0) {
    cachedAvailableModels = models;
  }
  return models;
}

async function singleGeminiRequest({ key, model, body }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function extractTextFromGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return "";
  }
  const nonThoughtText = parts
    .filter((p) => p && !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (nonThoughtText.trim()) {
    return nonThoughtText;
  }
  return parts
    .filter((p) => p && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

function enqueueGeminiTask(taskFn) {
  const run = async () => {
    const elapsed = Date.now() - lastRequestFinishedAt;
    if (lastRequestFinishedAt > 0 && elapsed < 350) {
      await new Promise((r) => setTimeout(r, 350 - elapsed));
    }
    try {
      return await taskFn();
    } finally {
      lastRequestFinishedAt = Date.now();
    }
  };
  const next = geminiRequestQueue.then(run, run);
  geminiRequestQueue = next.catch(() => {});
  return next;
}

async function callGemini({ apiKey, model = DEFAULT_GEMINI_MODEL, prompt, jsonMode = false }) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw new Error("請先至「學習紀錄與設定」填入您的 Gemini API Key。");
  }

  return enqueueGeminiTask(async () => {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode
        ? { responseMimeType: "application/json", temperature: 0.7 }
        : { temperature: 0.5 }
    };

    const detectedFlash = (cachedAvailableModels || []).filter((m) => m.includes("flash"));
    const candidates = Array.from(
      new Set([model, ...detectedFlash, ...PRESET_GEMINI_MODELS].filter(Boolean))
    );

    let lastStatus = 0;
    let lastErrText = "";
    let importantStatus = 0;
    let importantErrText = "";
    let primaryWas404 = false;
    let triedAutoDiscover = false;

    for (let i = 0; i < candidates.length; i += 1) {
      const targetModel = candidates[i];
      const res = await singleGeminiRequest({ key, model: targetModel, body });

      if (res.ok) {
        const data = await res.json();
        const text = extractTextFromGeminiResponse(data);
        if (!text) {
          throw new Error("Gemini API 未回傳文字內容，請稍後再試。");
        }
        if (primaryWas404 && targetModel !== model) {
          saveGeminiModel(targetModel);
        }
        return text;
      }

      lastStatus = res.status;
      lastErrText = await res.text().catch(() => "");

      if (res.status === 503 || res.status === 429) {
        importantStatus = res.status;
        importantErrText = lastErrText;
      }

      if (res.status === 403) {
        throw new Error("Gemini API Key 無效或權限不足，請檢查設定中的 API Key。");
      }

      if (res.status === 400) {
        const lowerErr = lastErrText.toLowerCase();
        if (lowerErr.includes("api_key_invalid") || lowerErr.includes("api key not valid")) {
          throw new Error("Gemini API Key 無效，請至「學習紀錄與設定」檢查您的 API Key。");
        }
        continue;
      }

      if (res.status === 404) {
        if (i === 0) {
          primaryWas404 = true;
        }
        if (!triedAutoDiscover && !cachedAvailableModels) {
          triedAutoDiscover = true;
          const discovered = await fetchAvailableGeminiModels(key).catch(() => []);
          const flashFirst = [
            ...discovered.filter((m) => m.includes("flash")),
            ...discovered.filter((m) => !m.includes("flash"))
          ];
          for (const dm of flashFirst) {
            if (!candidates.includes(dm)) {
              candidates.push(dm);
            }
          }
        }
        continue;
      }

      // 503 (High demand) / 429 -> 遞增等待後自動嘗試下一個備援模型
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, Math.min(2500, 900 * (i + 1))));
        continue;
      }

      throw new Error(
        `Gemini API 呼叫失敗（HTTP ${res.status}）${lastErrText ? `：${lastErrText.slice(0, 120)}` : ""}`
      );
    }

    const finalStatus = importantStatus || lastStatus;
    const finalErrText = importantErrText || lastErrText;

    if (finalStatus === 503 || finalErrText.toLowerCase().includes("high demand")) {
      throw new Error(
        "Google AI 伺服器目前尖峰負載中（High Demand），已自動切換備援模型仍忙碌，請等 10～20 秒後再試一次。"
      );
    }
    if (finalStatus === 429) {
      throw new Error("已達 Gemini API 速率或免費額度上限（429），請稍候 30～60 秒再試。");
    }
    throw new Error(`Gemini API 暫時無法回應（HTTP ${finalStatus}），請至設定頁點選「自動偵測可用模型」後再試。`);
  });
}

export async function generateDailyAiQuizzes({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  dateStr,
  count = 10
}) {
  const prompt = `
你是一位專業的繁體中文日語教師。請為一位目前程度約 JLPT N4、目標往 N3 邁進的台灣學習者，設計 ${count} 題全新的單選題（5 題 N4 程度、5 題 N3 程度，涵蓋單字搭配、副詞與核心文法）。

嚴格要求：
1. 每題只能有一個明確無爭議的最佳正解，不可出現多個選項都合理的情況。
2. 所有日文漢字都必須用 {漢字|かんじ} 的格式標註平假名讀音（例如：{明日|あした}、{電車|でんしゃ}、{決|き}めます）。
3. explanation 必須使用繁體中文，清楚說明為什麼正解正確以及其餘選項為何不合。
4. 只回傳 JSON 陣列，格式如下：
[
  {
    "levelCategory": "N4",
    "prompt": "{次|つぎ}の{文|ぶん}の（　）に{入|はい}る{最|もっと}もよいものを{一|ひと}つ{選|えら}びなさい。\\n「...（　）...」",
    "options": [
      { "id": "opt_a", "text": "..." },
      { "id": "opt_b", "text": "..." },
      { "id": "opt_c", "text": "..." },
      { "id": "opt_d", "text": "..." }
    ],
    "correctOptionId": "opt_a",
    "explanation": "繁體中文解析..."
  }
]
`;

  const rawText = await callGemini({ apiKey, model, prompt, jsonMode: true });
  const parsed = parseJsonArrayFromAi(rawText);
  const quizzes = validateAiQuizList(parsed, dateStr);
  saveCachedDailyAiQuizzes(dateStr, quizzes);
  return quizzes;
}

export async function explainQuizWithAi({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  question,
  selectedOptionText,
  correctOptionText
}) {
  const prompt = `
你是親切且專業的繁體中文日語家教。學生剛做完一題日文單選題，請用繁體中文簡潔清楚地說明：
1. 正確答案為什麼是「${stripRubyMarkup(correctOptionText)}」
2. 學生選的「${stripRubyMarkup(selectedOptionText)}」與正解的差異（若學生已答對，請補充該句型或單字的使用場合）
3. 補充 1 個實用的日文例句（附平假名與繁體中文翻譯）

題目：${stripRubyMarkup(question.prompt)}
原本簡短解析：${question.explanation}
`;
  return callGemini({ apiKey, model, prompt, jsonMode: false });
}

export async function checkJapaneseSentenceWithAi({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  sentence
}) {
  const cleaned = String(sentence || "").trim();
  if (!cleaned) {
    throw new Error("請先輸入一句日文再送出批改。");
  }
  const prompt = `
你是繁體中文日語家教。學生（N4 往 N3 程度）造了一句日文：「${cleaned}」
請用繁體中文簡潔回覆：
1. 語法是否自然正確？
2. 若有不自然或錯誤之處，請給出修正後的自然日文（附平假名讀音與中文意思）。
3. 給一句簡短鼓勵與學習重點。
`;
  return callGemini({ apiKey, model, prompt, jsonMode: false });
}

export function validateAiVocabList(
  rawList,
  dateStr,
  existingIds = [],
  existingWords = [],
  options = {}
) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error("AI 回傳的單字格式不正確（非陣列或為空）。");
  }

  const usedIds = new Set(Array.isArray(existingIds) ? existingIds : []);
  const usedWords = new Set(
    (Array.isArray(existingWords) ? existingWords : [])
      .map((w) => String(w || "").trim())
      .filter(Boolean)
  );

  const normalized = [];
  let seq = 1;
  let skippedDuplicates = 0;

  for (let i = 0; i < rawList.length; i += 1) {
    const item = rawList[i];
    if (!item || typeof item !== "object") continue;

    const word = stripRubyMarkup(String(item.word || "")).replace(/[{}]/g, "").trim();
    const kana = stripRubyMarkup(String(item.kana || "")).replace(/[{}]/g, "").trim();
    const meaning = String(item.meaning || "").trim();
    if (!word || !kana || !meaning) continue;
    if (usedWords.has(word)) {
      skippedDuplicates += 1;
      continue;
    }

    let id = `ai_vocab_${dateStr}_${String(seq).padStart(2, "0")}`;
    while (usedIds.has(id)) {
      seq += 1;
      id = `ai_vocab_${dateStr}_${String(seq).padStart(2, "0")}`;
    }
    usedIds.add(id);
    usedWords.add(word);
    seq += 1;

    const group = String(item.group || "").trim() || "AI 生成";
    const pos = String(item.pos || "").trim() || "詞彙";
    const exampleJa = String(item.exampleJa || "").trim() || `${word}を{使|つか}います。`;
    const exampleZh = String(item.exampleZh || "").trim() || `使用「${meaning}」造句練習。`;

    normalized.push({
      id,
      levelCategory: item.levelCategory === "N3" ? "N3" : "N4",
      group,
      word,
      kana,
      meaning,
      pos,
      exampleJa,
      exampleZh,
      source: "Gemini AI 即時生成",
      contentVersion: dateStr,
      reviewStatus: "AI 即時生成（建議自行核對）"
    });
  }

  if (normalized.length === 0) {
    if (options?.allowEmptyOnDuplicate && skippedDuplicates > 0) {
      return [];
    }
    throw new Error("無法解析出新的不重複單字，請稍後再試一次。");
  }
  return normalized;
}

export async function generateAiVocab({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  dateStr,
  existingList = [],
  count = 5,
  levelFocus = "mixed",
  topic = ""
}) {
  const safeCount = Math.max(1, Math.min(15, Number(count) || 5));
  const allWords = (Array.isArray(existingList) ? existingList : [])
    .map((v) => v?.word)
    .filter(Boolean);
  const avoidWords =
    allWords.length <= 180
      ? allWords
      : [...allWords.slice(0, 30), ...allWords.slice(-150)];

  const levelInstruction =
    levelFocus === "N4"
      ? "全部為 JLPT N4 程度單字（levelCategory 全填 \"N4\"）。"
      : levelFocus === "N3"
        ? "全部為 JLPT N3 程度單字（levelCategory 全填 \"N3\"）。"
        : "混合 JLPT N4 與 N3 實用單字（大約各半）。";

  const topicInstruction = String(topic || "").trim()
    ? `主題方向：請圍繞「${String(topic).trim()}」相關情境挑選詞彙。`
    : "主題方向：日常生活、工作、交通、情感表達或常用動詞／副詞。";

  const prompt = `
你是一位專業的繁體中文日語教師。請為目前程度約 JLPT N4、目標往 N3 學習的台灣學生，提供 ${safeCount} 個實用的全新日文單字。

嚴格要求：
1. ${levelInstruction}
2. ${topicInstruction}
3. 不得與以下已有單字重複（亦請勿輸出範例中的「経験」）：${avoidWords.length > 0 ? avoidWords.join("、") : "（無）"}
4. word 與 kana 欄位請填純日文文字（不要包含 {|} 標記）；word 寫常見漢字表記（若通常用假名則寫假名），kana 只寫平假名讀音。
5. exampleJa 請寫一句自然實用的 N4～N3 例句，並且句中所有漢字都必須用 {漢字|かんじ} 標註平假名讀音（例如：{明日|あした}、{電車|でんしゃ}）。
6. meaning、pos、group、exampleZh 必須使用繁體中文（台灣慣用語）。
7. 只回傳 JSON 陣列（頂層必須為 [...] 陣列），格式如下：
[
  {
    "levelCategory": "N3",
    "group": "日常生活",
    "word": "経験",
    "kana": "けいけん",
    "meaning": "經驗",
    "pos": "名詞・する動詞",
    "exampleJa": "{日本|にほん}での{生活|せいかつ}はとてもいい{経験|けいけん}になりました。",
    "exampleZh": "在日本的生活成了非常寶貴的經驗。"
  }
]
`;

  const rawText = await callGemini({ apiKey, model, prompt, jsonMode: true });
  const parsed = parseJsonArrayFromAi(rawText);

  const existingIds = (Array.isArray(existingList) ? existingList : []).map((v) => v?.id).filter(Boolean);
  const existingWords = (Array.isArray(existingList) ? existingList : []).map((v) => v?.word).filter(Boolean);
  return validateAiVocabList(parsed, dateStr, existingIds, existingWords, {
    allowEmptyOnDuplicate: true
  });
}

export function validateAiGrammarList(
  rawList,
  dateStr,
  existingIds = [],
  existingTitles = [],
  options = {}
) {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    throw new Error("AI 回傳的文法格式不正確（非陣列或為空）。");
  }

  const usedIds = new Set(Array.isArray(existingIds) ? existingIds : []);
  const usedTitles = new Set(
    (Array.isArray(existingTitles) ? existingTitles : [])
      .map((t) => normalizeGrammarTitleKey(stripRubyMarkup(String(t || "")).replace(/[{}]/g, "")))
      .filter(Boolean)
  );

  const normalized = [];
  let seq = 1;
  let skippedDuplicates = 0;

  for (let i = 0; i < rawList.length; i += 1) {
    const item = rawList[i];
    if (!item || typeof item !== "object") continue;

    const title = stripRubyMarkup(String(item.title || "")).replace(/[{}]/g, "").trim();
    const titleKey = normalizeGrammarTitleKey(title);
    const meaning = String(item.meaning || "").trim();
    if (!title || !titleKey || !meaning) continue;
    if (usedTitles.has(titleKey)) {
      skippedDuplicates += 1;
      continue;
    }

    const rawExamples = Array.isArray(item.examples) ? [...item.examples] : [];
    if (rawExamples.length === 0 && item.exampleJa && item.exampleZh) {
      rawExamples.push({ ja: item.exampleJa, zh: item.exampleZh });
    }

    const examples = rawExamples
      .map((ex) => {
        if (!ex || typeof ex !== "object") return null;
        const ja = String(ex.ja ?? ex.japanese ?? ex.exampleJa ?? "").trim();
        const zh = String(ex.zh ?? ex.chinese ?? ex.exampleZh ?? "").trim();
        return ja && zh ? { ja, zh } : null;
      })
      .filter(Boolean)
      .slice(0, 3);
    if (examples.length === 0) continue;

    let id = `ai_gram_${dateStr}_${String(seq).padStart(2, "0")}`;
    while (usedIds.has(id)) {
      seq += 1;
      id = `ai_gram_${dateStr}_${String(seq).padStart(2, "0")}`;
    }
    usedIds.add(id);
    usedTitles.add(titleKey);
    seq += 1;

    const connection = String(item.connection || "").trim() || "請參考例句接續方式";
    const situation = String(item.situation || "").trim() || "日常生活與職場常用表達。";
    const notes = String(item.notes || "").trim() || "建議搭配例句多加朗讀與造句練習。";

    normalized.push({
      id,
      levelCategory: item.levelCategory === "N3" ? "N3" : "N4",
      title,
      meaning,
      connection,
      situation,
      examples,
      notes,
      source: "Gemini AI 即時生成",
      contentVersion: dateStr,
      reviewStatus: "AI 即時生成（建議自行核對）"
    });
  }

  if (normalized.length === 0) {
    if (options?.allowEmptyOnDuplicate && skippedDuplicates > 0) {
      return [];
    }
    throw new Error("無法解析出新的不重複文法，請稍後再試一次。");
  }
  return normalized;
}

export async function generateAiGrammar({
  apiKey,
  model = DEFAULT_GEMINI_MODEL,
  dateStr,
  existingList = [],
  count = 2,
  levelFocus = "mixed",
  topic = ""
}) {
  const safeCount = Math.max(1, Math.min(5, Number(count) || 2));
  const allTitles = (Array.isArray(existingList) ? existingList : [])
    .map((g) => g?.title)
    .filter(Boolean);
  const avoidTitles =
    allTitles.length <= 180
      ? allTitles
      : [...allTitles.slice(0, 20), ...allTitles.slice(-160)];

  const levelInstruction =
    levelFocus === "N4"
      ? '全部為 JLPT N4 程度文法（levelCategory 全填 "N4"）。'
      : levelFocus === "N3"
        ? '全部為 JLPT N3 程度文法（levelCategory 全填 "N3"）。'
        : "混合 JLPT N4 與 N3 實用文法（盡量平均分配）。";

  const topicInstruction = String(topic || "").trim()
    ? `主題／語氣方向：請圍繞「${String(topic).trim()}」相關情境挑選句型。`
    : "主題／語氣方向：時間表現、條件推論、敬語／謙讓、口語接續或原因結果表達。";

  const prompt = `
你是一位專業的繁體中文日語教師。請為目前程度約 JLPT N4、目標往 N3 學習的台灣學生，編寫 ${safeCount} 篇實用的全新日文文法筆記。

嚴格要求：
1. ${levelInstruction}
2. ${topicInstruction}
3. 不得與以下已有文法重複（下方 JSON 範例僅供欄位結構參考，請挑選其他未出現過的句型）：${avoidTitles.length > 0 ? avoidTitles.join("、") : "（無）"}
4. title 欄位請寫乾淨純句型（不要包含 {|} 標記，例如「～最中に」、「～てばかりいる」）。
5. 每篇文法請提供 2 句自然實用的 N4～N3 例句（examples 陣列），且每句例句的 ja 中所有漢字都必須用 {漢字|かんじ} 標註平假名讀音（例如：{明日|あした}、{電車|でんしゃ}）。
6. meaning、connection、situation、notes 與每句例句的 zh 都必須使用繁體中文（台灣慣用語）。
7. 只回傳 JSON 陣列（頂層必須為 [...] 陣列），格式如下：
[
  {
    "levelCategory": "N3",
    "title": "～最中に",
    "meaning": "正在～的時候（恰好發生某事）",
    "connection": "動詞ている形＋の／名詞＋の ＋ 最中に",
    "situation": "表示某動作正進行到最高潮時，突然發生了意料之外的干擾事件。",
    "examples": [
      {
        "ja": "{会議|かいぎ}の{最中|さいちゅう}に、{突然|とつぜん}{停電|ていでん}になりました。",
        "zh": "正在開會的時候，突然停電了。"
      },
      {
        "ja": "{食事|しょくじ}をしている{最中|さいちゅう}に、{電話|でんわ}がかかってきました。",
        "zh": "正在吃飯的時候，電話響了。"
      }
    ],
    "notes": "後面常接意外或令人困擾的突發狀況。"
  }
]
`;

  const rawText = await callGemini({ apiKey, model, prompt, jsonMode: true });
  const parsed = parseJsonArrayFromAi(rawText);

  const existingIds = (Array.isArray(existingList) ? existingList : []).map((g) => g?.id).filter(Boolean);
  const existingTitles = (Array.isArray(existingList) ? existingList : []).map((g) => g?.title).filter(Boolean);
  return validateAiGrammarList(parsed, dateStr, existingIds, existingTitles, {
    allowEmptyOnDuplicate: true
  });
}
