import { QUIZ_LIST } from "../data/quizzes.js";
import { prepareQuizQuestion, recordQuizSubmission } from "../core/studyLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderPracticePage(container, { state, updateState, params = {} }) {
  const ui = {
    wrongOnly: Boolean(params.wrongOnly),
    shuffleOptions: true,
    index: 0,
    combo: 0,
    selectedOptionId: null,
    submitted: false,
    lastResult: null,
    preparedQuestion: null,
    preparedKey: ""
  };

  function getQuestionPool() {
    if (!ui.wrongOnly) {
      return QUIZ_LIST;
    }
    const wrongIds = new Set(Object.keys(state.wrongBook || {}));
    return QUIZ_LIST.filter((q) => wrongIds.has(q.id));
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
    const key = `${raw.id}:${ui.shuffleOptions ? "s" : "o"}:${ui.wrongOnly ? "w" : "a"}:${ui.index}`;
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
    const pool = getQuestionPool();
    const current = ensurePrepared(pool);
    const wrongEntries = Object.values(state.wrongBook || {});

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">練習與錯題本</h2>
        <p class="page-desc">單選題練習支援選項隨機打亂，並依選項 ID 判分。答錯的題目會自動收入下方錯題本，同一題不會重複建立卡片。</p>
      </div>

      <div class="filter-bar">
        <div class="btn-row" style="margin-top: 0;">
          <button class="btn ${!ui.wrongOnly ? "btn-primary" : ""}" type="button" id="mode-all-btn">
            全部練習（${QUIZ_LIST.length} 題）
          </button>
          <button class="btn ${ui.wrongOnly ? "btn-primary" : ""}" type="button" id="mode-wrong-btn">
            只練錯題（${wrongEntries.length} 題）
          </button>
        </div>

        <label class="checkbox-inline">
          <input type="checkbox" id="shuffle-toggle" ${ui.shuffleOptions ? "checked" : ""} />
          <span class="filter-label">打亂選項順序</span>
        </label>
      </div>

      ${
        !current
          ? `
        <section class="card empty-state">
          <h3 class="card-title">目前沒有錯題可練習</h3>
          <p class="page-desc">太棒了！錯題本目前是空的，您可以切換回「全部練習」繼續做題。</p>
          <div class="btn-row" style="justify-content: center;">
            <button class="btn btn-primary" type="button" id="empty-back-all-btn">切換為全部練習</button>
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
          <span class="badge">題號：${escapeHtml(question.id)}</span>
        </div>

        <div class="duo-mascot-row">
          <div class="duo-mascot-avatar" aria-hidden="true">${LUCIDE_ICONS.owl}</div>
          <div class="duo-speech-bubble">
            <div class="quiz-prompt" lang="ja">${escapeHtml(question.prompt)}</div>
            <div class="btn-row" style="margin-top: 10px;">
              <button
                class="btn"
                type="button"
                data-speak-ja="${escapeHtml(question.prompt)}"
                ${speechAvailable ? "" : "disabled"}
              >
                ${LUCIDE_ICONS.volume2}
                <span>朗讀題目</span>
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
                  <span lang="ja">${escapeHtml(opt.text)}</span>
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
              <span>正確答案：<strong lang="ja">${escapeHtml(ui.lastResult.correctOption?.text || "")}</strong></span><br />
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
                <div lang="ja" style="margin-top: 8px; font-weight: 500;">${escapeHtml(q?.prompt || "題目不存在")}</div>
                <div class="flashcard-meta">
                  最近錯選：<span lang="ja">${escapeHtml(entry.lastWrongOptionText)}</span>｜最近作答：${escapeHtml(timeText)}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function bindEvents(pool, current) {
    container.querySelector("#mode-all-btn")?.addEventListener("click", () => {
      ui.wrongOnly = false;
      ui.index = 0;
      ui.preparedKey = "";
      render();
    });

    container.querySelector("#mode-wrong-btn")?.addEventListener("click", () => {
      ui.wrongOnly = true;
      ui.index = 0;
      ui.preparedKey = "";
      render();
    });

    container.querySelector("#empty-back-all-btn")?.addEventListener("click", () => {
      ui.wrongOnly = false;
      ui.index = 0;
      ui.preparedKey = "";
      render();
    });

    container.querySelector("#shuffle-toggle")?.addEventListener("change", (e) => {
      ui.shuffleOptions = e.target.checked;
      ui.preparedKey = "";
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
        updateState(outcome.state);
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
