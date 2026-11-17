import test from "node:test";
import assert from "node:assert/strict";
import { STUDY_CONFIG } from "../src/config/studyConfig.js";
import { VOCAB_LIST } from "../src/data/vocab.js";
import { GRAMMAR_LIST } from "../src/data/grammar.js";
import { QUIZ_LIST } from "../src/data/quizzes.js";
import {
  hiraganaToKatakana,
  addDays,
  isVocabDue,
  rateVocabCard,
  toggleGrammarRead,
  setGrammarMastery,
  prepareQuizQuestion,
  gradeQuizAnswer,
  recordQuizSubmission
} from "../src/core/studyLogic.js";
import {
  renderRubyText,
  stripRubyMarkup
} from "../src/core/dom.js";
import {
  createDefaultState,
  exportStateJson,
  validateImportPayload,
  applyImportedState,
  loadState
} from "../src/core/storage.js";

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(k) {
      return store.has(k) ? store.get(k) : null;
    },
    setItem(k, v) {
      store.set(k, String(v));
    }
  };
}

test("教材數量與唯一 ID 及校對標示檢查", () => {
  assert.equal(VOCAB_LIST.length, 20);
  assert.equal(GRAMMAR_LIST.length, 5);
  assert.equal(QUIZ_LIST.length, 40);

  const allIds = [
    ...VOCAB_LIST.map((v) => v.id),
    ...GRAMMAR_LIST.map((g) => g.id),
    ...QUIZ_LIST.map((q) => q.id)
  ];
  assert.equal(new Set(allIds).size, allIds.length);

  for (const item of [...VOCAB_LIST, ...GRAMMAR_LIST, ...QUIZ_LIST]) {
    assert.equal(item.reviewStatus, "示範內容，待校對");
    assert.ok(item.source);
    assert.ok(item.contentVersion);
  }
});

test("單字卡複習間隔依集中設定計算（1 / 3 / 7 天）與到期判斷", () => {
  let progress = {};
  const today = "2026-11-15";
  assert.equal(isVocabDue(progress["vocab_n4_001"], today), true);

  progress = rateVocabCard(progress, "vocab_n4_001", "unfamiliar", STUDY_CONFIG, today);
  assert.equal(progress["vocab_n4_001"].nextReviewDate, addDays(today, 1));
  assert.equal(isVocabDue(progress["vocab_n4_001"], today), false);
  assert.equal(isVocabDue(progress["vocab_n4_001"], "2026-11-16"), true);

  progress = rateVocabCard(progress, "vocab_n4_001", "somewhat", STUDY_CONFIG, today);
  assert.equal(progress["vocab_n4_001"].nextReviewDate, addDays(today, 3));

  progress = rateVocabCard(progress, "vocab_n4_001", "familiar", STUDY_CONFIG, today);
  assert.equal(progress["vocab_n4_001"].nextReviewDate, addDays(today, 7));
});

test("文法已閱讀與熟練度分開記錄", () => {
  let gProgress = {};
  gProgress = toggleGrammarRead(gProgress, "gram_n4_001", "2026-11-15T08:00:00Z");
  assert.equal(gProgress["gram_n4_001"].isRead, true);
  assert.equal(gProgress["gram_n4_001"].mastery, "unrated");

  gProgress = setGrammarMastery(gProgress, "gram_n4_001", "familiar");
  assert.equal(gProgress["gram_n4_001"].isRead, true);
  assert.equal(gProgress["gram_n4_001"].mastery, "familiar");

  gProgress = toggleGrammarRead(gProgress, "gram_n4_001", "2026-11-15T08:05:00Z");
  assert.equal(gProgress["gram_n4_001"].isRead, false);
  assert.equal(gProgress["gram_n4_001"].mastery, "familiar");
});

test("打亂選項後仍依選項 ID 判分，且同次提交不重複計分", () => {
  const original = QUIZ_LIST[0];
  // 使用固定 rng 讓選項順序與原始不同
  const shuffled = prepareQuizQuestion(original, true, () => 0.1);
  const correctOpt = shuffled.options.find((o) => o.id === original.correctOptionId);
  assert.ok(correctOpt);

  const grade = gradeQuizAnswer(shuffled, correctOpt.id);
  assert.equal(grade.isCorrect, true);

  let state = createDefaultState();
  const first = recordQuizSubmission({
    state,
    question: shuffled,
    selectedOptionId: correctOpt.id,
    alreadySubmitted: false,
    nowIso: "2026-11-15T08:10:00Z"
  });
  assert.equal(first.duplicateBlocked, false);
  assert.equal(first.state.quizStats.totalAnswered, 1);
  assert.equal(first.state.quizStats.totalCorrect, 1);

  const duplicate = recordQuizSubmission({
    state: first.state,
    question: shuffled,
    selectedOptionId: correctOpt.id,
    alreadySubmitted: true,
    nowIso: "2026-11-15T08:10:01Z"
  });
  assert.equal(duplicate.duplicateBlocked, true);
  assert.equal(duplicate.state.quizStats.totalAnswered, 1);
});

test("錯題本不重複建立卡片，且重新答對後保留歷史紀錄", () => {
  const q = QUIZ_LIST[1];
  const wrongOpt = q.options.find((o) => o.id !== q.correctOptionId);
  const rightOpt = q.options.find((o) => o.id === q.correctOptionId);

  let state = createDefaultState();
  // 第一次答錯
  state = recordQuizSubmission({
    state,
    question: q,
    selectedOptionId: wrongOpt.id,
    alreadySubmitted: false,
    nowIso: "2026-11-15T08:00:00Z"
  }).state;
  assert.equal(Object.keys(state.wrongBook).length, 1);
  assert.equal(state.wrongBook[q.id].wrongCount, 1);
  assert.equal(state.wrongBook[q.id].lastWrongOptionId, wrongOpt.id);

  // 第二次同一題又答錯 -> 仍只有 1 張卡片，wrongCount 變 2
  state = recordQuizSubmission({
    state,
    question: q,
    selectedOptionId: wrongOpt.id,
    alreadySubmitted: false,
    nowIso: "2026-11-15T08:02:00Z"
  }).state;
  assert.equal(Object.keys(state.wrongBook).length, 1);
  assert.equal(state.wrongBook[q.id].wrongCount, 2);

  // 重新答對 -> 仍保留錯題紀錄與 wrongCount=2，lastIsCorrect 更新為 true
  state = recordQuizSubmission({
    state,
    question: q,
    selectedOptionId: rightOpt.id,
    alreadySubmitted: false,
    nowIso: "2026-11-15T08:05:00Z"
  }).state;
  assert.equal(Object.keys(state.wrongBook).length, 1);
  assert.equal(state.wrongBook[q.id].wrongCount, 2);
  assert.equal(state.wrongBook[q.id].lastIsCorrect, true);
  assert.equal(state.wrongBook[q.id].lastWrongOptionId, wrongOpt.id);
});

test("損壞或不相容的 JSON 匯入不會覆蓋有效資料", () => {
  const storage = createMemoryStorage();
  const validState = {
    ...createDefaultState(),
    quizStats: { totalAnswered: 5, totalCorrect: 4 }
  };
  applyImportedState(validState, storage);

  const badJson = validateImportPayload("{broken json");
  assert.equal(badJson.ok, false);

  const wrongVersion = validateImportPayload(
    JSON.stringify({ ...validState, schemaVersion: 999 })
  );
  assert.equal(wrongVersion.ok, false);

  // 原資料必須完好無損
  const loaded = loadState(storage);
  assert.equal(loaded.quizStats.totalAnswered, 5);
  assert.equal(loaded.quizStats.totalCorrect, 4);

  // 正確匯出與匯入驗證
  const exported = exportStateJson(validState, "2026-11-15T09:00:00Z");
  const validCheck = validateImportPayload(exported);
  assert.equal(validCheck.ok, true);
  assert.equal(validCheck.summary.totalAnswered, 5);
});

test("平假名轉換片假名輔助函式正確轉換", () => {
  assert.equal(hiraganaToKatakana("きめる"), "キメル");
  assert.equal(hiraganaToKatakana("まにあう"), "マニアウ");
  assert.equal(hiraganaToKatakana("あんしん"), "アンシン");
});

test("漢字平假名標音轉換與純文字還原正確", () => {
  assert.equal(
    renderRubyText("{来月|らいげつ}の{旅行|りょこう}"),
    "<ruby>来月<rt>らいげつ</rt></ruby>の<ruby>旅行<rt>りょこう</rt></ruby>"
  );
  assert.equal(stripRubyMarkup("{来月|らいげつ}の{旅行|りょこう}"), "来月の旅行");
});
