import { STUDY_CONFIG } from "../config/studyConfig.js";

export function createDefaultState() {
  return {
    schemaVersion: STUDY_CONFIG.schemaVersion,
    vocabProgress: {},
    grammarProgress: {},
    quizStats: {
      totalAnswered: 0,
      totalCorrect: 0
    },
    wrongBook: {},
    quizHistory: [],
    reviewMarks: { vocab: {}, quiz: {} },
    grammarNotes: {},
    aiVocabList: [],
    lastDailyVocabDate: null,
    aiGrammarList: [],
    lastDailyGrammarDate: null
  };
}

function getStorage(customStorage) {
  if (customStorage) {
    return customStorage;
  }
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

function isPlainObject(val) {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

export function loadState(customStorage) {
  const storage = getStorage(customStorage);
  if (!storage) {
    return createDefaultState();
  }
  try {
    const raw = storage.getItem(STUDY_CONFIG.storageKey);
    if (!raw) {
      return createDefaultState();
    }
    const check = validateImportPayload(raw, STUDY_CONFIG.schemaVersion);
    if (!check.ok) {
      return createDefaultState();
    }
    return check.data;
  } catch {
    return createDefaultState();
  }
}

export function saveState(state, customStorage) {
  const storage = getStorage(customStorage);
  if (!storage) {
    return;
  }
  storage.setItem(STUDY_CONFIG.storageKey, JSON.stringify(state));
}

export function exportStateJson(state, nowIso = new Date().toISOString()) {
  const payload = {
    schemaVersion: STUDY_CONFIG.schemaVersion,
    exportedAt: nowIso,
    vocabProgress: state.vocabProgress || {},
    grammarProgress: state.grammarProgress || {},
    quizStats: state.quizStats || { totalAnswered: 0, totalCorrect: 0 },
    wrongBook: state.wrongBook || {},
    quizHistory: Array.isArray(state.quizHistory) ? state.quizHistory : [],
    reviewMarks: state.reviewMarks || { vocab: {}, quiz: {} },
    grammarNotes: isPlainObject(state.grammarNotes) ? state.grammarNotes : {},
    aiVocabList: Array.isArray(state.aiVocabList) ? state.aiVocabList : [],
    lastDailyVocabDate: typeof state.lastDailyVocabDate === "string" ? state.lastDailyVocabDate : null,
    aiGrammarList: Array.isArray(state.aiGrammarList) ? state.aiGrammarList : [],
    lastDailyGrammarDate:
      typeof state.lastDailyGrammarDate === "string" ? state.lastDailyGrammarDate : null
  };
  return JSON.stringify(payload, null, 2);
}

export function validateImportPayload(rawText, expectedSchemaVersion = STUDY_CONFIG.schemaVersion) {
  if (typeof rawText !== "string" || !rawText.trim()) {
    return { ok: false, error: "匯入內容為空，請選擇有效的 JSON 備份檔。" };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "JSON 格式錯誤，無法解析檔案內容。" };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: "資料格式錯誤：最外層必須為 JSON 物件。" };
  }

  if (parsed.schemaVersion !== expectedSchemaVersion) {
    return {
      ok: false,
      error: `資料版本不相容（預期版本 v${expectedSchemaVersion}，檔案為 v${parsed.schemaVersion ?? "未知"}）。`
    };
  }

  if (!isPlainObject(parsed.vocabProgress) || !isPlainObject(parsed.grammarProgress) || !isPlainObject(parsed.wrongBook)) {
    return { ok: false, error: "資料欄位缺失或型別錯誤（vocabProgress / grammarProgress / wrongBook 必須為物件）。" };
  }

  if (
    !isPlainObject(parsed.quizStats) ||
    !Number.isInteger(parsed.quizStats.totalAnswered) ||
    parsed.quizStats.totalAnswered < 0 ||
    !Number.isInteger(parsed.quizStats.totalCorrect) ||
    parsed.quizStats.totalCorrect < 0 ||
    parsed.quizStats.totalCorrect > parsed.quizStats.totalAnswered
  ) {
    return { ok: false, error: "quizStats 統計欄位格式不正確。" };
  }

  const normalized = {
    schemaVersion: expectedSchemaVersion,
    vocabProgress: parsed.vocabProgress,
    grammarProgress: parsed.grammarProgress,
    quizStats: {
      totalAnswered: parsed.quizStats.totalAnswered,
      totalCorrect: parsed.quizStats.totalCorrect
    },
    wrongBook: parsed.wrongBook,
    quizHistory: Array.isArray(parsed.quizHistory) ? parsed.quizHistory : [],
    reviewMarks: isPlainObject(parsed.reviewMarks)
      ? {
          vocab: isPlainObject(parsed.reviewMarks.vocab) ? parsed.reviewMarks.vocab : {},
          quiz: isPlainObject(parsed.reviewMarks.quiz) ? parsed.reviewMarks.quiz : {}
        }
      : { vocab: {}, quiz: {} },
    grammarNotes: isPlainObject(parsed.grammarNotes) ? parsed.grammarNotes : {},
    aiVocabList: Array.isArray(parsed.aiVocabList)
      ? parsed.aiVocabList.filter(
          (v) =>
            isPlainObject(v) &&
            typeof v.id === "string" &&
            v.id.trim() &&
            typeof v.word === "string" &&
            v.word.trim() &&
            typeof v.kana === "string" &&
            v.kana.trim() &&
            typeof v.meaning === "string" &&
            v.meaning.trim()
        )
      : [],
    lastDailyVocabDate:
      typeof parsed.lastDailyVocabDate === "string" ? parsed.lastDailyVocabDate : null,
    aiGrammarList: Array.isArray(parsed.aiGrammarList)
      ? parsed.aiGrammarList
          .filter(
            (g) =>
              isPlainObject(g) &&
              typeof g.id === "string" &&
              g.id.trim() &&
              typeof g.title === "string" &&
              g.title.trim() &&
              typeof g.meaning === "string" &&
              g.meaning.trim()
          )
          .map((g) => ({
            ...g,
            id: g.id.trim(),
            levelCategory: g.levelCategory === "N3" ? "N3" : "N4",
            title: g.title.trim(),
            meaning: g.meaning.trim(),
            connection: typeof g.connection === "string" ? g.connection.trim() : "",
            situation: typeof g.situation === "string" ? g.situation.trim() : "",
            notes: typeof g.notes === "string" ? g.notes.trim() : "",
            reviewStatus:
              typeof g.reviewStatus === "string" && g.reviewStatus.trim()
                ? g.reviewStatus.trim()
                : "AI 即時生成（建議自行核對）",
            examples: Array.isArray(g.examples)
              ? g.examples
                  .filter(
                    (ex) =>
                      isPlainObject(ex) &&
                      typeof ex.ja === "string" &&
                      ex.ja.trim() &&
                      typeof ex.zh === "string" &&
                      ex.zh.trim()
                  )
                  .map((ex) => ({ ja: ex.ja.trim(), zh: ex.zh.trim() }))
              : []
          }))
      : [],
    lastDailyGrammarDate:
      typeof parsed.lastDailyGrammarDate === "string" ? parsed.lastDailyGrammarDate : null
  };

  const summary = {
    vocabCount: Object.keys(normalized.vocabProgress).length,
    grammarReadCount: Object.values(normalized.grammarProgress).filter((g) => g?.isRead).length,
    totalAnswered: normalized.quizStats.totalAnswered,
    wrongBookCount: Object.keys(normalized.wrongBook).length,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "未記錄"
  };

  return { ok: true, data: normalized, summary };
}

export function applyImportedState(validatedData, customStorage) {
  saveState(validatedData, customStorage);
  return validatedData;
}

export function resetState(customStorage) {
  const fresh = createDefaultState();
  saveState(fresh, customStorage);
  return fresh;
}
