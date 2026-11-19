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
import {
  checkJapaneseSentenceWithAi,
  explainQuizWithAi,
  findCachedAiQuizById,
  generateDailyAiQuizzes,
  loadCachedDailyAiQuizzes,
  loadGeminiKey,
  loadGeminiModel
} from "../core/geminiAi.js";

export function renderPracticePage(container, { state, updateState, navigate, params = {} }) {
  const ui = {
    mode: params.wrongOnly ? "wrong" : "daily", // "daily" | "ai" | "all" | "wrong" | "marked"
    shuffleOptions: true,
    shuffleQuestions: false,
    sessionIds: null,
    index: 0,
    streak: 0,
    selectedOptionId: null,
    submitted: false,
    lastResult: null,
    preparedQuestion: null,
    preparedKey: "",
    aiLoading: false,
    aiError: "",
    aiExplainLoading: false,
    aiExplainText: "",
    aiExplainError: "",
    sentenceInput: "",
    sentenceLoading: false,
    sentenceFeedback: "",
    sentenceError: ""
  };

  function getActiveQuizSource() {
    const today = getLocalDateString();
    const cachedAi = loadCachedDailyAiQuizzes(today) || [];
    const byId = new Map(QUIZ_LIST.map((q) => [q.id, q]));
    for (const q of cachedAi) {
      byId.set(q.id, q);
    }
    return { today, cachedAi, byId };
  }

  function getBasePool() {
    const { today, cachedAi } = getActiveQuizSource();
    if (ui.mode === "ai") {
      return cachedAi;
    }
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
    const { byId } = getActiveQuizSource();
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
      ui.aiExplainText = "";
      ui.aiExplainError = "";
      ui.aiExplainLoading = false;
    }
    return ui.preparedQuestion;
  }

  function render() {
    const { today, cachedAi } = getActiveQuizSource();
    const pool = getQuestionPool();
    const current = ensurePrepared(pool);
    const wrongEntries = Object.values(state.wrongBook || {});
    const markedCount = Object.keys(state.reviewMarks?.quiz || {}).length;
    const apiKey = loadGeminiKey();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">練習與錯題本</h1>
        <p class="page-desc">
          今日日期：${today}｜語境填空測驗與錯題重練，提供每日 10 題、AI 出題、全部 ${QUIZ_LIST.length} 題與標記待複習。
        </p>
      </div>

      <div class="filter-bar">
        <div class="btn-row">
          <button class="btn btn-sm ${ui.mode === "daily" ? "btn-active" : "btn-subtle"}" type="button" id="mode-daily-btn">
            每日 10 題
          </button>
          <button class="btn btn-sm ${ui.mode === "ai" ? "btn-active" : "btn-subtle"}" type="button" id="mode-ai-btn">
            AI 新題（${cachedAi.length > 0 ? `${cachedAi.length}` : "生成"}）
          </button>
          <button class="btn btn-sm ${ui.mode === "all" ? "btn-active" : "btn-subtle"}" type="button" id="mode-all-btn">
            全部（${QUIZ_LIST.length}）
          </button>
          <button class="btn btn-sm ${ui.mode === "wrong" ? "btn-active" : "btn-subtle"}" type="button" id="mode-wrong-btn">
            錯題（${wrongEntries.length}）
          </button>
          <button class="btn btn-sm ${ui.mode === "marked" ? "btn-active" : "btn-subtle"}" type="button" id="mode-marked-btn">
            待複習（${markedCount}）
          </button>
        </div>

        <div class="filter-group">
          <label class="checkbox-inline">
            <input type="checkbox" id="shuffle-toggle" ${ui.shuffleOptions ? "checked" : ""} />
            <span class="filter-label">打亂選項</span>
          </label>

          <label class="checkbox-inline">
            <input type="checkbox" id="shuffle-questions-toggle" ${ui.shuffleQuestions ? "checked" : ""} />
            <span class="filter-label">隨機題序</span>
          </label>

          <button class="btn btn-sm btn-subtle" type="button" id="reshuffle-session-btn">
            ${LUCIDE_ICONS.rotateCcw}
            <span>重新洗牌</span>
          </button>
        </div>
      </div>

      ${ui.mode === "ai" ? renderAiPanel(apiKey, cachedAi) : ""}

      ${
        !current
          ? ui.mode === "ai"
            ? ""
            : `
        <section class="card empty-state">
          <h2 class="card-title">${ui.mode === "marked" ? "尚無標記待複習的題目" : "目前沒有錯題"}</h2>
          <p class="page-desc">${
            ui.mode === "marked"
              ? "作答時可點選「標記待複習」，將題目收入此清單。"
              : "錯題本目前為空，可切換回「每日 10 題」或「全部題庫」繼續練習。"
          }</p>
          <div class="btn-row justify-center">
            <button class="btn btn-primary" type="button" id="empty-back-all-btn">回到每日 10 題</button>
          </div>
        </section>
      `
          : renderQuizCard(current, pool.length, apiKey)
      }

      ${renderSentenceCheckerCard(apiKey)}

      <div class="section-heading-row">
        <div class="section-heading-left">
          ${LUCIDE_ICONS.bookmark}
          <h2 class="section-title">錯題本紀錄</h2>
        </div>
        <span class="section-meta">共 ${wrongEntries.length} 題</span>
      </div>

      <section class="card">
        ${
          wrongEntries.length === 0
            ? `<p class="page-desc">目前沒有錯題紀錄。</p>`
            : renderWrongBookList(wrongEntries)
        }
      </section>
    `;

    bindEvents(pool, current, apiKey);
  }

  function renderAiPanel(apiKey, cachedAi) {
    if (!apiKey) {
      return `
        <section class="card card-subtle">
          <h2 class="card-title">尚未設定 Gemini API Key</h2>
          <p class="page-desc">請先至「紀錄」頁填入個人 Gemini API Key（僅保存於目前瀏覽器），即可使用 AI 每日出題。</p>
          <div class="btn-row">
            <button class="btn btn-primary" type="button" id="go-records-for-key">前往設定</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="card card-subtle">
        <div class="badge-row">
          <span class="badge badge-accent">Gemini AI</span>
          <span class="badge">${cachedAi.length > 0 ? `今日已快取 ${cachedAi.length} 題` : "今日尚未生成"}</span>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="generate-ai-quizzes-btn" ${ui.aiLoading ? "disabled" : ""}>
            ${ui.aiLoading ? "出題生成中…" : cachedAi.length > 0 ? "重新生成今日 10 題" : "生成今日 AI 10 題"}
          </button>
        </div>
        ${
          ui.aiError
            ? `
          <div class="notice-box notice-danger mt-3">
            ${LUCIDE_ICONS.x}
            <div class="notice-content">${escapeHtml(ui.aiError)}</div>
          </div>
        `
            : ""
        }
      </section>
    `;
  }

  function renderQuizCard(question, total, apiKey) {
    const speechAvailable = isSpeechSupported();
    const progressPct = Math.round(((ui.index + (ui.submitted ? 1 : 0)) / total) * 100);
    const plainPrompt = stripRubyMarkup(question.prompt);
    const isMarked = Boolean(state.reviewMarks?.quiz?.[question.id]);

    return `
      <section class="card">
        <div class="progress-row mt-0 mb-3" aria-label="練習進度">
          <div class="progress-bar-track">
            <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
          </div>
          <span class="progress-bar-label">第 ${ui.index + 1} / ${total} 題</span>
          ${
            ui.streak >= 2
              ? `<span class="badge badge-correct">連對 ${ui.streak} 題</span>`
              : ""
          }
        </div>

        <div class="badge-row">
          <span class="badge badge-accent">${escapeHtml(question.levelCategory)}</span>
          ${isMarked ? `<span class="badge badge-warning">待複習</span>` : ""}
          <span class="flashcard-meta mt-0">${escapeHtml(question.id)}・${escapeHtml(question.reviewStatus)}</span>
        </div>

        <div class="quiz-prompt-box">
          <div class="quiz-prompt" lang="ja">${renderRubyText(question.prompt)}</div>
          <div class="btn-row">
            <button
              class="btn btn-sm"
              type="button"
              data-speak-ja="${escapeHtml(plainPrompt)}"
              ${speechAvailable ? "" : "disabled"}
            >
              ${LUCIDE_ICONS.volume2}
              <span>朗讀題目</span>
            </button>
            <button
              class="btn btn-sm ${isMarked ? "btn-warning" : ""}"
              type="button"
              id="quiz-mark-review-btn"
            >
              ${LUCIDE_ICONS.bookmark}
              <span>${isMarked ? "已標記待複習" : "標記待複習"}</span>
            </button>
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
            class="btn ${ui.submitted ? "" : "btn-primary"}"
            type="button"
            id="submit-quiz-btn"
            ${ui.submitted || !ui.selectedOptionId ? "disabled" : ""}
          >
            ${ui.submitted ? "已提交" : "檢查答案"}
          </button>
          <button
            class="btn ${ui.submitted ? "btn-primary" : ""}"
            type="button"
            id="next-quiz-btn"
            ${total <= 1 ? "disabled" : ""}
          >
            <span>下一題</span>
            ${LUCIDE_ICONS.arrowRight}
          </button>
        </div>

        ${
          ui.submitted && ui.lastResult
            ? `
          <div class="notice-box ${ui.lastResult.isCorrect ? "notice-success" : "notice-danger"} mt-3">
            ${ui.lastResult.isCorrect ? LUCIDE_ICONS.check : LUCIDE_ICONS.x}
            <div class="notice-content">
              <strong>${ui.lastResult.isCorrect ? "答對" : "答錯，已加入錯題本"}</strong><br />
              <span>正確答案：<strong lang="ja">${renderRubyText(ui.lastResult.correctOption?.text || "")}</strong></span><br />
              <span>解析：${escapeHtml(question.explanation)}</span>

              ${
                apiKey
                  ? `
                <div class="btn-row">
                  <button class="btn btn-sm" type="button" id="ai-explain-btn" ${ui.aiExplainLoading ? "disabled" : ""}>
                    ${LUCIDE_ICONS.messageCircle}
                    <span>${ui.aiExplainLoading ? "解析生成中…" : "AI 詳細解析"}</span>
                  </button>
                </div>
              `
                  : ""
              }
            </div>
          </div>
          ${
            ui.aiExplainError
              ? `<div class="notice-box notice-danger mt-2">${LUCIDE_ICONS.x}<div class="notice-content">${escapeHtml(ui.aiExplainError)}</div></div>`
              : ""
          }
          ${
            ui.aiExplainText
              ? `<div class="notice-box notice-info mt-2">${LUCIDE_ICONS.messageCircle}<div class="notice-content pre-line"><strong>AI 解析：</strong>\n${escapeHtml(ui.aiExplainText)}</div></div>`
              : ""
          }
        `
            : ""
        }
      </section>
    `;
  }

  function renderSentenceCheckerCard(apiKey) {
    if (!apiKey) {
      return "";
    }
    return `
      <section class="card">
        <h2 class="section-heading">AI 日文造句練習</h2>
        <p class="page-desc">輸入使用 N4／N3 單字或文法的日文句子，由 Gemini 協助確認語法與自然度。</p>
        <textarea
          id="ai-sentence-input"
          rows="2"
          placeholder="例如：毎日日本語を勉強することにしました。"
        >${escapeHtml(ui.sentenceInput)}</textarea>
        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="ai-check-sentence-btn" ${ui.sentenceLoading ? "disabled" : ""}>
            ${LUCIDE_ICONS.messageCircle}
            <span>${ui.sentenceLoading ? "批改中…" : "送出 AI 批改"}</span>
          </button>
        </div>
        ${
          ui.sentenceError
            ? `<div class="notice-box notice-danger mt-3">${LUCIDE_ICONS.x}<div class="notice-content">${escapeHtml(ui.sentenceError)}</div></div>`
            : ""
        }
        ${
          ui.sentenceFeedback
            ? `<div class="notice-box notice-info mt-3">${LUCIDE_ICONS.messageCircle}<div class="notice-content pre-line">${escapeHtml(ui.sentenceFeedback)}</div></div>`
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
            const q = QUIZ_LIST.find((item) => item.id === entry.questionId) || findCachedAiQuizById(entry.questionId);
            const statusHtml = entry.lastIsCorrect
              ? `${LUCIDE_ICONS.check}<span>已重新答對</span>`
              : `${LUCIDE_ICONS.x}<span>待重練</span>`;
            const statusClass = entry.lastIsCorrect ? "badge-correct" : "badge-incorrect";
            const timeText = entry.lastAnsweredAt
              ? new Date(entry.lastAnsweredAt).toLocaleString("zh-TW", { hour12: false })
              : "未知";

            return `
              <div class="entry-item ${entry.lastIsCorrect ? "is-correct" : ""}">
                <div class="badge-row">
                  <span class="badge ${statusClass}">${statusHtml}</span>
                  <span class="flashcard-meta mt-0">${escapeHtml(entry.questionId)}・累計錯 ${entry.wrongCount} 次</span>
                </div>
                <div class="mt-2" lang="ja">${renderRubyText(q?.prompt || "（歷史 AI 題目）")}</div>
                <div class="flashcard-meta">
                  錯選：<span lang="ja">${renderRubyText(entry.lastWrongOptionText)}</span>｜${escapeHtml(timeText)}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function bindEvents(pool, current, apiKey) {
    container.querySelector("#mode-daily-btn")?.addEventListener("click", () => {
      ui.mode = "daily";
      rebuildSessionPool();
      render();
    });

    container.querySelector("#mode-ai-btn")?.addEventListener("click", () => {
      ui.mode = "ai";
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

    container.querySelector("#go-records-for-key")?.addEventListener("click", () => {
      navigate("records");
    });

    container.querySelector("#generate-ai-quizzes-btn")?.addEventListener("click", async () => {
      if (ui.aiLoading) return;
      ui.aiLoading = true;
      ui.aiError = "";
      render();
      try {
        await generateDailyAiQuizzes({
          apiKey,
          model: loadGeminiModel(),
          dateStr: getLocalDateString(),
          count: 10
        });
        rebuildSessionPool();
      } catch (err) {
        ui.aiError = err?.message || "AI 出題失敗，請稍後再試。";
      } finally {
        ui.aiLoading = false;
        render();
      }
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
        ui.streak = outcome.result?.isCorrect ? ui.streak + 1 : 0;
        render();
      }
    });

    container.querySelector("#next-quiz-btn")?.addEventListener("click", () => {
      if (pool.length === 0) return;
      ui.index = (ui.index + 1) % pool.length;
      ui.preparedKey = "";
      render();
    });

    container.querySelector("#ai-explain-btn")?.addEventListener("click", async () => {
      if (!current || !ui.lastResult || ui.aiExplainLoading) return;
      ui.aiExplainLoading = true;
      ui.aiExplainError = "";
      render();
      try {
        ui.aiExplainText = await explainQuizWithAi({
          apiKey,
          model: loadGeminiModel(),
          question: current,
          selectedOptionText: ui.lastResult.selectedOption?.text || "",
          correctOptionText: ui.lastResult.correctOption?.text || ""
        });
      } catch (err) {
        ui.aiExplainError = err?.message || "無法取得 AI 解析，請稍後再試。";
      } finally {
        ui.aiExplainLoading = false;
        render();
      }
    });

    container.querySelector("#ai-sentence-input")?.addEventListener("input", (e) => {
      ui.sentenceInput = e.target.value;
    });

    container.querySelector("#ai-check-sentence-btn")?.addEventListener("click", async () => {
      if (ui.sentenceLoading) return;
      ui.sentenceLoading = true;
      ui.sentenceError = "";
      render();
      try {
        ui.sentenceFeedback = await checkJapaneseSentenceWithAi({
          apiKey,
          model: loadGeminiModel(),
          sentence: ui.sentenceInput
        });
      } catch (err) {
        ui.sentenceError = err?.message || "AI 批改失敗，請稍後再試。";
      } finally {
        ui.sentenceLoading = false;
        render();
      }
    });

    container.querySelectorAll("[data-speak-ja]").forEach((btn) => {
      btn.addEventListener("click", () => {
        speakJapanese(btn.getAttribute("data-speak-ja"));
      });
    });
  }

  render();
}
