import { QUIZ_LIST } from "../data/quizzes.js";
import {
  getDailyQuizSet,
  getLocalDateString,
  prepareQuizQuestion,
  recordQuizSubmission,
  shuffleArray,
  toggleReviewMark
} from "../core/studyLogic.js";
import { escapeHtml, renderRubyText, stripRubyMarkup } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderPracticePage(container, { state, updateState, params = {} }) {
  const ui = {
    mode: params.wrongOnly ? "wrong" : "daily", // "daily" | "all" | "wrong" | "marked"
    shuffleOptions: true,
    shuffleQuestions: false,
    sessionIds: null,
    index: 0,
    combo: 0,
    selectedOptionId: null,
    submitted: false,
    lastResult: null,
    preparedQuestion: null,
    preparedKey: ""
  };

  function getBasePool() {
    const today = getLocalDateString();
    if (ui.mode === "daily") {
      return getDailyQuizSet(QUIZ_LIST, today, 10);
    }
    if (ui.mode === "wrong") {
      return QUIZ_LIST.filter((q) => Object.prototype.hasOwnProperty.call(state.wrongBook || {}, q.id));
    }
    if (ui.mode === "marked") {
      return QUIZ_LIST.filter((q) => Boolean(state.reviewMarks?.quiz?.[q.id]));
    }
    return QUIZ_LIST;
  }

  function rebuildSessionPool() {
    const base = getBasePool();
    const ordered = ui.shuffleQuestions ? shuffleArray(base) : base;
    ui.sessionIds = ordered.map((q) => q.id);
    ui.index = 0;
    ui.preparedKey = "";
  }

  function getQuestionPool() {
    if (!ui.sessionIds) {
      rebuildSessionPool();
    }
    const byId = new Map(QUIZ_LIST.map((q) => [q.id, q]));
    const pool = ui.sessionIds.map((id) => byId.get(id)).filter(Boolean);
    if (ui.mode === "wrong") {
      const wrongIds = new Set(Object.keys(state.wrongBook || {}));
      return pool.filter((q) => wrongIds.has(q.id));
    }
    if (ui.mode === "marked") {
      const markedIds = new Set(Object.keys(state.reviewMarks?.quiz || {}));
      return pool.filter((q) => markedIds.has(q.id));
    }
    return pool;
  }

  function ensurePrepared(pool) {
    if (pool.length === 0) {
      ui.preparedQuestion = null;
      ui.preparedKey = "";
      return null;
    }
    if (ui.index >= pool.length) {
      ui.index = 0;
    }
    const raw = pool[ui.index];
    const key = `${raw.id}:${ui.shuffleOptions ? "s" : "o"}:${ui.mode}:${ui.index}`;
    if (ui.preparedKey !== key) {
      ui.preparedQuestion = prepareQuizQuestion(raw, ui.shuffleOptions);
      ui.preparedKey = key;
      ui.selectedOptionId = null;
      ui.submitted = false;
      ui.lastResult = null;
    }
    return ui.preparedQuestion;
  }

  function render() {
    const today = getLocalDateString();
    const pool = getQuestionPool();
    const current = ensurePrepared(pool);
    const wrongEntries = Object.values(state.wrongBook || {});
    const markedCount = Object.keys(state.reviewMarks?.quiz || {}).length;

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">練習與錯題本</h2>
        <p class="page-desc">
          今日日期：${today}｜「今日每日題組」每天自動更換 10 題，也可切換練習全部 ${QUIZ_LIST.length} 題、錯題本或標記待複習題目。
        </p>
      </div>

      <div class="filter-bar">
        <div class="btn-row" style="margin-top: 0;">
          <button class="btn ${ui.mode === "daily" ? "btn-primary" : ""}" type="button" id="mode-daily-btn">
            今日每日 10 題
          </button>
          <button class="btn ${ui.mode === "all" ? "btn-primary" : ""}" type="button" id="mode-all-btn">
            全部題庫（${QUIZ_LIST.length} 題）
          </button>
          <button class="btn ${ui.mode === "wrong" ? "btn-primary" : ""}" type="button" id="mode-wrong-btn">
            只練錯題（${wrongEntries.length} 題）
          </button>
          <button class="btn ${ui.mode === "marked" ? "btn-primary" : ""}" type="button" id="mode-marked-btn">
            標記待複習（${markedCount} 題）
          </button>
        </div>

        <label class="checkbox-inline">
          <input type="checkbox" id="shuffle-toggle" ${ui.shuffleOptions ? "checked" : ""} />
          <span class="filter-label">打亂選項</span>
        </label>

        <label class="checkbox-inline">
          <input type="checkbox" id="shuffle-questions-toggle" ${ui.shuffleQuestions ? "checked" : ""} />
          <span class="filter-label">隨機抽題順序</span>
        </label>

        <button class="btn" type="button" id="reshuffle-session-btn">重新洗牌</button>
      </div>

      ${
        !current
          ? `
        <section class="card empty-state">
          <h3 class="card-title">${ui.mode === "marked" ? "目前沒有標記待複習的題目" : "目前沒有錯題可練習"}</h3>
          <p class="page-desc">${
            ui.mode === "marked"
              ? "作答時可點擊「標記此題待複習」，系統就會幫您存起來。"
              : "太棒了！錯題本目前是空的，您可以切換回「今日每日 10 題」或「全部題庫」繼續做題。"
          }</p>
          <div class="btn-row" style="justify-content: center;">
            <button class="btn btn-primary" type="button" id="empty-back-all-btn">切換為今日每日 10 題</button>
          </div>
        </section>
      `
          : renderQuizCard(current, pool.length)
      }

      <section class="card">
        <h3 class="section-heading">錯題本紀錄（共 ${wrongEntries.length} 題）</h3>
        ${
          wrongEntries.length === 0
            ? `<p class="page-desc">目前沒有任何錯題紀錄。</p>`
            : renderWrongBookList(wrongEntries)
        }
      </section>
    `;

    bindEvents(pool, current);
  }

  function renderQuizCard(question, total) {
    const speechAvailable = isSpeechSupported();
    const progressPct = Math.round(((ui.index + (ui.submitted ? 1 : 0)) / total) * 100);
    const plainPrompt = stripRubyMarkup(question.prompt);
    const isMarked = Boolean(state.reviewMarks?.quiz?.[question.id]);

    return `
      <section class="card">
        <div class="duo-progress-row" aria-label="練習進度">
          <div class="duo-progress-track">
            <div class="duo-progress-fill" style="width: ${progressPct}%;"></div>
          </div>
          <span class="duo-progress-text">第 ${ui.index + 1} / ${total} 題</span>
          ${
            ui.combo >= 2
              ? `<span class="badge badge-warning">連對 ${ui.combo} 題</span>`
              : ""
          }
        </div>

        <div class="badge-row" style="margin-bottom: 12px;">
          <span class="badge badge-primary">${escapeHtml(question.levelCategory)} 分類</span>
          <span class="badge">${escapeHtml(question.reviewStatus)}</span>
          ${isMarked ? `<span class="badge badge-warning">★ 已標記待複習</span>` : ""}
          <span class="badge">題號：${escapeHtml(question.id)}</span>
        </div>

        <div class="duo-mascot-row">
          <div class="duo-mascot-avatar" aria-hidden="true">${LUCIDE_ICONS.owl}</div>
          <div class="duo-speech-bubble">
            <div class="quiz-prompt" lang="ja">${renderRubyText(question.prompt)}</div>
            <div class="btn-row" style="margin-top: 10px;">
              <button
                class="btn"
                type="button"
                data-speak-ja="${escapeHtml(plainPrompt)}"
                ${speechAvailable ? "" : "disabled"}
              >
                ${LUCIDE_ICONS.volume2}
                <span>朗讀題目</span>
              </button>
              <button
                class="btn ${isMarked ? "btn-warning" : ""}"
                type="button"
                id="quiz-mark-review-btn"
              >
                ${LUCIDE_ICONS.star}
                <span>${isMarked ? "已標記待複習（點擊取消）" : "標記此題待複習"}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="option-list" role="radiogroup" aria-label="單選題選項">
          ${question.options
            .map((opt, idx) => {
              const checked = ui.selectedOptionId === opt.id;
              return `
                <label class="option-label ${checked ? "selected" : ""}">
                  <span class="option-key">${idx + 1}</span>
                  <input
                    type="radio"
                    name="quiz-option"
                    value="${escapeHtml(opt.id)}"
                    ${checked ? "checked" : ""}
                    ${ui.submitted ? "disabled" : ""}
                  />
                  <span lang="ja">${renderRubyText(opt.text)}</span>
                </label>
              `;
            })
            .join("")}
        </div>

        <div class="btn-row">
          <button
            class="btn btn-primary"
            type="button"
            id="submit-quiz-btn"
            ${ui.submitted || !ui.selectedOptionId ? "disabled" : ""}
          >
            ${ui.submitted ? "已提交（不可重複計分）" : "檢查答案"}
          </button>
          <button class="btn btn-blue" type="button" id="next-quiz-btn" ${total <= 1 ? "disabled" : ""}>
            繼續下一題
          </button>
        </div>

        ${
          ui.submitted && ui.lastResult
            ? `
          <div class="notice-box ${ui.lastResult.isCorrect ? "notice-success" : "notice-danger"}" style="margin-top: 16px;">
            ${ui.lastResult.isCorrect ? LUCIDE_ICONS.check : LUCIDE_ICONS.x}
            <div class="notice-content">
              <strong>${ui.lastResult.isCorrect ? "太棒了！答對了！（+10 XP）" : "再接再厲，答錯了"}</strong><br />
              <span>正確答案：<strong lang="ja">${renderRubyText(ui.lastResult.correctOption?.text || "")}</strong></span><br />
              <span>解析：${escapeHtml(question.explanation)}</span>
            </div>
          </div>
        `
            : ""
        }
      </section>
    `;
  }

  function renderWrongBookList(wrongEntries) {
    return `
      <div class="stack">
        ${wrongEntries
          .map((entry) => {
            const q = QUIZ_LIST.find((item) => item.id === entry.questionId);
            const statusHtml = entry.lastIsCorrect
              ? `${LUCIDE_ICONS.check}<span>最近已重新答對（保留歷史紀錄）</span>`
              : `${LUCIDE_ICONS.x}<span>最近仍答錯（建議重練）</span>`;
            const statusClass = entry.lastIsCorrect ? "badge-success" : "badge-danger";
            const timeText = entry.lastAnsweredAt
              ? new Date(entry.lastAnsweredAt).toLocaleString("zh-TW", { hour12: false })
              : "未知";

            return `
              <div class="example-box">
                <div class="badge-row">
                  <span class="badge">${escapeHtml(entry.questionId)}</span>
                  <span class="badge ${statusClass}">${statusHtml}</span>
                  <span class="badge badge-warning">累計答錯 ${entry.wrongCount} 次</span>
                </div>
                <div lang="ja" style="margin-top: 8px; font-weight: 500;">${renderRubyText(q?.prompt || "題目不存在")}</div>
                <div class="flashcard-meta">
                  最近錯選：<span lang="ja">${renderRubyText(entry.lastWrongOptionText)}</span>｜最近作答：${escapeHtml(timeText)}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function bindEvents(pool, current) {
    container.querySelector("#mode-daily-btn")?.addEventListener("click", () => {
      ui.mode = "daily";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#mode-all-btn")?.addEventListener("click", () => {
      ui.mode = "all";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#mode-wrong-btn")?.addEventListener("click", () => {
      ui.mode = "wrong";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#mode-marked-btn")?.addEventListener("click", () => {
      ui.mode = "marked";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#empty-back-all-btn")?.addEventListener("click", () => {
      ui.mode = "daily";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#shuffle-toggle")?.addEventListener("change", (e) => {
      ui.shuffleOptions = e.target.checked;
      ui.preparedKey = "";
      render();
    });

    container.querySelector("#shuffle-questions-toggle")?.addEventListener("change", (e) => {
      ui.shuffleQuestions = e.target.checked;
      rebuildSessionPool();
      render();
    });

    container.querySelector("#reshuffle-session-btn")?.addEventListener("click", () => {
      ui.shuffleQuestions = true;
      rebuildSessionPool();
      render();
    });

    container.querySelector("#quiz-mark-review-btn")?.addEventListener("click", () => {
      if (!current) return;
      const nextMarks = toggleReviewMark(state.reviewMarks, "quiz", current.id);
      state = updateState({ ...state, reviewMarks: nextMarks });
      render();
    });

    container.querySelectorAll('input[name="quiz-option"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (ui.submitted) return;
        ui.selectedOptionId = e.target.value;
        render();
      });
    });

    container.querySelector("#submit-quiz-btn")?.addEventListener("click", () => {
      if (!current || !ui.selectedOptionId || ui.submitted) return;
      const outcome = recordQuizSubmission({
        state,
        question: current,
        selectedOptionId: ui.selectedOptionId,
        alreadySubmitted: ui.submitted,
        nowIso: new Date().toISOString()
      });
      if (!outcome.duplicateBlocked) {
        state = updateState(outcome.state);
        ui.submitted = true;
        ui.lastResult = outcome.result;
        ui.combo = outcome.result?.isCorrect ? ui.combo + 1 : 0;
        render();
      }
    });

    container.querySelector("#next-quiz-btn")?.addEventListener("click", () => {
      if (pool.length === 0) return;
      ui.index = (ui.index + 1) % pool.length;
      ui.preparedKey = "";
      render();
    });

    container.querySelectorAll("[data-speak-ja]").forEach((btn) => {
      btn.addEventListener("click", () => {
        speakJapanese(btn.getAttribute("data-speak-ja"));
      });
    });
  }

  render();
}
