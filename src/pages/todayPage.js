import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import { QUIZ_LIST } from "../data/quizzes.js";
import { getLocalDateString, isVocabDue } from "../core/studyLogic.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderTodayPage(container, { state, navigate }) {
  const today = getLocalDateString();
  const dueVocabCount = VOCAB_LIST.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
  const unreadGrammarCount = GRAMMAR_LIST.filter((g) => !state.grammarProgress[g.id]?.isRead).length;
  const wrongEntries = Object.values(state.wrongBook || {});
  const unresolvedWrongCount = wrongEntries.filter((w) => !w.lastIsCorrect).length;

  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">今天要學什麼</h2>
      <p class="page-desc">今日日期：${today}｜依照「單字 → 文法 → 練習 → 錯題重練」順序完成今日進度。</p>
    </div>

    <div class="stack">
      <section class="card card-focus">
        <div class="badge-row">
          <span class="badge badge-primary">今日焦點・步驟 1</span>
          <span class="badge">單字卡</span>
        </div>
        <div class="stat-number">${dueVocabCount} 個待複習</div>
        <p class="page-desc">共 ${VOCAB_LIST.length} 個示範單字（N4／N3 學習分類）。</p>
        <div class="btn-row">
          <button class="btn btn-primary" type="button" data-go="vocab">開始單字複習</button>
        </div>
      </section>

      <div class="grid-2">
        <section class="card">
          <div class="badge-row">
            <span class="badge">步驟 2</span>
            <span class="badge">文法筆記</span>
          </div>
          <div class="stat-number-sm">${unreadGrammarCount} 篇未閱讀</div>
          <p class="page-desc">共 ${GRAMMAR_LIST.length} 篇示範文法，已閱讀與熟練度分開記錄。</p>
          <div class="btn-row">
            <button class="btn" type="button" data-go="grammar">前往文法筆記</button>
          </div>
        </section>

        <section class="card">
          <div class="badge-row">
            <span class="badge">步驟 3 &amp; 4</span>
            <span class="badge">練習與錯題</span>
          </div>
          <div class="stat-number-sm">${wrongEntries.length} 題錯題紀錄</div>
          <p class="page-desc">題庫共 ${QUIZ_LIST.length} 題；待重練（最近答錯）：${unresolvedWrongCount} 題。</p>
          <div class="btn-row">
            <button class="btn" type="button" data-go="practice">開始單選練習</button>
            <button class="btn" type="button" data-go="practice-wrong" ${wrongEntries.length === 0 ? "disabled" : ""}>只練錯題</button>
          </div>
        </section>
      </div>

      <section class="notice-box notice-info">
        ${LUCIDE_ICONS.info}
        <div class="notice-content">
          <strong>學習與資料提醒</strong><br />
          1. ${STUDY_CONFIG.disclaimer.contentNotice}<br />
          2. ${STUDY_CONFIG.disclaimer.storageNotice}
        </div>
      </section>
    </div>
  `;

  container.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      if (target === "practice-wrong") {
        navigate("practice", { wrongOnly: true });
      } else {
        navigate(target);
      }
    });
  });
}
