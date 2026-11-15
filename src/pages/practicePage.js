import { QUIZ_LIST } from "../data/quizzes.js";
import { prepareQuizQuestion, recordQuizSubmission } from "../core/studyLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";

export function renderPracticePage(container, { state, updateState, params = {} }) {
  const ui = {
    wrongOnly: Boolean(params.wrongOnly),
    shuffleOptions: true,
    index: 0,
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
      <h2 class="page-title">練習與錯題本</h2>
      <p class="page-desc">單選題練習支援選項隨機打亂，並依選項 ID 判分。答錯的題目會自動收入下方錯題本，同一題不會重複建立卡片。</p>

      <div class="filter-bar">
        <div class="btn-row" style="margin-top: 0;">
          <button class="btn ${!ui.wrongOnly ? "btn-primary" : ""}" type="button" id="mode-all-btn">
            全部練習（${QUIZ_LIST.length} 題）
          </button>
          <button class="btn ${ui.wrongOnly ? "btn-primary" : ""}" type="button" id="mode-wrong-btn">
            只練錯題（${wrongEntries.length} 題）
          </button>
        </div>

        <label class="filter-group" style="cursor: pointer;">
          <input type="checkbox" id="shuffle-toggle" ${ui.shuffleOptions ? "checked" : ""} />
          <span>打亂選項順序</span>
        </label>
      </div>

      ${
        !current
          ? `
        <section class="card empty-state">
          <h3>目前沒有錯題可練習</h3>
          <p>太棒了！錯題本目前是空的，您可以切換回「全部練習」繼續做題。</p>
          <div class="btn-row" style="justify-content: center;">
            <button class="btn btn-primary" type="button" id="empty-back-all-btn">切換為全部練習</button>
          </div>
        </section>
      `
          : renderQuizCard(current, pool.length)
      }

      <section class="card" style="margin-top: 18px;">
        <h3 style="margin-top: 0;">錯題本紀錄（共 ${wrongEntries.length} 題）</h3>
        ${
          wrongEntries.length === 0
            ? `<p class="page-desc" style="margin-bottom: 0;">目前沒有任何錯題紀錄。</p>`
            : renderWrongBookList(wrongEntries)
        }
      </section>
    `;

    bindEvents(pool, current);
  }

  function renderQuizCard(question, total) {
    const speechAvailable = isSpeechSupported();
    return `
      <section class="card">
        <div class="badge-row">
          <span class="badge badge-primary">${escapeHtml(question.levelCategory)} 分類</span>
          <span class="badge">${escapeHtml(question.reviewStatus)}</span>
          <span class="badge">第 ${ui.index + 1} / ${total} 題</span>
          <span class="badge">題號：${escapeHtml(question.id)}</span>
        </div>

        <div class="quiz-prompt" lang="ja">${escapeHtml(question.prompt)}</div>
        <div class="btn-row" style="margin-top: 6px; margin-bottom: 10px;">
          <button
            class="btn"
            type="button"
            data-speak-ja="${escapeHtml(question.prompt)}"
            ${speechAvailable ? "" : "disabled"}
          >
            🔊 朗讀題目
          </button>
        </div>

        <div class="option-list" role="radiogroup" aria-label="單選題選項">
          ${question.options
            .map((opt) => {
              const checked = ui.selectedOptionId === opt.id;
              return `
                <label class="option-label ${checked ? "selected" : ""}">
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
            ${ui.submitted ? "已提交（不可重複計分）" : "提交答案"}
          </button>
          <button class="btn" type="button" id="next-quiz-btn" ${total <= 1 ? "disabled" : ""}>
            下一題
          </button>
        </div>

        ${
          ui.submitted && ui.lastResult
            ? `
          <div class="notice-box ${ui.lastResult.isCorrect ? "notice-success" : "notice-danger"}" style="margin-top: 14px;">
            <strong>${ui.lastResult.isCorrect ? "✓ 答對了！" : "✕ 答錯了"}</strong><br />
            <span>正確答案：<strong lang="ja">${escapeHtml(ui.lastResult.correctOption?.text || "")}</strong></span><br />
            <span>解析：${escapeHtml(question.explanation)}</span>
          </div>
        `
            : ""
        }
      </section>
    `;
  }

  function renderWrongBookList(wrongEntries) {
    return `
      <div style="display: grid; gap: 10px;">
        ${wrongEntries
          .map((entry) => {
            const q = QUIZ_LIST.find((item) => item.id === entry.questionId);
            const statusText = entry.lastIsCorrect
              ? "✓ 最近已重新答對（保留歷史紀錄）"
              : "✕ 最近仍答錯（建議重練）";
            const statusClass = entry.lastIsCorrect ? "badge-success" : "badge-danger";
            const timeText = entry.lastAnsweredAt
              ? new Date(entry.lastAnsweredAt).toLocaleString("zh-TW", { hour12: false })
              : "未知";

            return `
              <div class="example-box">
                <div class="badge-row" style="margin-bottom: 6px;">
                  <span class="badge">${escapeHtml(entry.questionId)}</span>
                  <span class="badge ${statusClass}">${statusText}</span>
                  <span class="badge badge-warning">累計答錯 ${entry.wrongCount} 次</span>
                </div>
                <div lang="ja" style="font-weight: 600;">${escapeHtml(q?.prompt || "題目不存在")}</div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-top: 4px;">
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
