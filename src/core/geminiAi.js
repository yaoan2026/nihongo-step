import { stripRubyMarkup } from "./dom.js";

const API_KEY_STORAGE_KEY = "nihongo_step_gemini_api_key";
const MODEL_STORAGE_KEY = "nihongo_step_gemini_model";
const DAILY_AI_PREFIX = "nihongo_step_ai_daily_";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

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
    return storage?.getItem(MODEL_STORAGE_KEY) || DEFAULT_GEMINI_MODEL;
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

    const options = item.options.map((opt, idx) => ({
      id: validOptionIds.has(opt?.id) ? opt.id : ["opt_a", "opt_b", "opt_c", "opt_d"][idx],
      text: String(opt?.text || "").trim()
    }));
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

async function callGemini({ apiKey, model = DEFAULT_GEMINI_MODEL, prompt, jsonMode = false }) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw new Error("請先至「學習紀錄與設定」填入您的 Gemini API Key。");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: jsonMode
      ? { responseMimeType: "application/json", temperature: 0.7 }
      : { temperature: 0.5 }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    if (res.status === 400 || res.status === 403) {
      throw new Error("Gemini API Key 無效或權限不足，請檢查設定中的 API Key。");
    }
    if (res.status === 429) {
      throw new Error("已達 Gemini API 速率或免費額度上限，請稍後再試。");
    }
    throw new Error(`Gemini API 呼叫失敗（HTTP ${res.status}）${errText ? `：${errText.slice(0, 120)}` : ""}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API 未回傳文字內容，請稍後再試。");
  }
  return text;
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
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI 回傳的 JSON 無法解析，請再試一次。");
  }
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
