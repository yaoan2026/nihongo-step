import { STUDY_CONFIG } from "../config/studyConfig.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import {
  setGrammarMastery,
  setGrammarNote,
  toggleGrammarRead
} from "../core/studyLogic.js";
import { escapeHtml, renderRubyText, stripRubyMarkup } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";
import {
  checkJapaneseSentenceWithAi,
  loadGeminiKey,
  loadGeminiModel
} from "../core/geminiAi.js";

export function renderGrammarPage(container, { state, updateState, params = {} }) {
  const ui = {
    levelFilter: params.levelFilter || "all",
    readFilter: "all",
    draftNotes: {},
    savedNoticeId: "",
    aiLoadingId: "",
    aiResults: {},
    aiErrors: {}
  };

  function getFiltered() {
    return GRAMMAR_LIST.filter((item) => {
      if (ui.levelFilter !== "all" && item.levelCategory !== ui.levelFilter) {
        return false;
      }
      const prog = state.grammarProgress[item.id];
      if (ui.readFilter === "unread") {
        return !prog?.isRead;
      }
      if (ui.readFilter === "read") {
        return Boolean(prog?.isRead);
      }
      return true;
    });
  }

  function render() {
    const list = getFiltered();
    const readCount = GRAMMAR_LIST.filter((g) => state.grammarProgress[g.id]?.isRead).length;
    const apiKey = loadGeminiKey();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">文法筆記</h1>
        <p class="page-desc">已閱讀：<strong>${readCount} / ${GRAMMAR_LIST.length}</strong> 篇。「已閱讀」與「熟練度」分開記錄，可在各篇下方練習造句。</p>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label" for="grammar-level-filter">學習分類</label>
          <select id="grammar-level-filter">
            <option value="all" ${ui.levelFilter === "all" ? "selected" : ""}>全部分類</option>
            <option value="N4" ${ui.levelFilter === "N4" ? "selected" : ""}>N4 分類</option>
            <option value="N3" ${ui.levelFilter === "N3" ? "selected" : ""}>N3 分類</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="grammar-read-filter">閱讀狀態</label>
          <select id="grammar-read-filter">
            <option value="all" ${ui.readFilter === "all" ? "selected" : ""}>全部文法</option>
            <option value="unread" ${ui.readFilter === "unread" ? "selected" : ""}>未閱讀</option>
            <option value="read" ${ui.readFilter === "read" ? "selected" : ""}>已閱讀</option>
          </select>
        </div>
      </div>

      <div class="stack">
        ${
          list.length === 0
            ? `
          <section class="card empty-state">
            <h2 class="card-title">沒有符合條件的文法筆記</h2>
            <p class="page-desc">請嘗試調整上方分類或閱讀狀態篩選。</p>
          </section>
        `
            : list.map((g) => renderGrammarCard(g, state.grammarProgress[g.id], apiKey)).join("")
        }
      </div>
    `;

    bindEvents(apiKey);
  }

  function renderGrammarCard(item, prog, apiKey) {
    const isRead = Boolean(prog?.isRead);
    const mastery = prog?.mastery || "unrated";
    const speechAvailable = isSpeechSupported();
    const noteValue =
      ui.draftNotes[item.id] !== undefined
        ? ui.draftNotes[item.id]
        : state.grammarNotes?.[item.id] || "";
    const isAiBusy = ui.aiLoadingId === item.id;
    const aiText = ui.aiResults[item.id] || "";
    const aiErr = ui.aiErrors[item.id] || "";

    return `
      <article class="card ${isRead ? "" : "card-subtle"}">
        <div class="badge-row">
          <span class="badge badge-accent">${escapeHtml(item.levelCategory)}</span>
          <span class="badge ${isRead ? "badge-correct" : "badge-warning"}">
            ${isRead ? `${LUCIDE_ICONS.check}<span>已閱讀</span>` : "未閱讀"}
          </span>
          <span class="checklist-detail">熟練度：${escapeHtml(STUDY_CONFIG.grammarMasteryLabels[mastery])}・${escapeHtml(item.reviewStatus)}</span>
        </div>

        <h2 class="card-title mt-3" lang="ja">${escapeHtml(item.title)}</h2>
        <p><strong>意思：</strong>${escapeHtml(item.meaning)}</p>
        <p><strong>接續：</strong>${escapeHtml(item.connection)}</p>
        <p><strong>使用情境：</strong>${escapeHtml(item.situation)}</p>

        <div class="example-box">
          <strong>例句（語境理解）：</strong>
          ${item.examples
            .map(
              (ex) => `
            <div class="example-item">
              <div class="example-ja" lang="ja">${renderRubyText(ex.ja)}</div>
              <div class="example-zh">${escapeHtml(ex.zh)}</div>
              <div class="btn-row">
                <button
                  class="btn btn-sm"
                  type="button"
                  data-speak-ja="${escapeHtml(stripRubyMarkup(ex.ja))}"
                  ${speechAvailable ? "" : "disabled"}
                >
                  ${LUCIDE_ICONS.volume2}
                  <span>朗讀例句</span>
                </button>
              </div>
            </div>
          `
            )
            .join("")}
        </div>

        <div class="notice-box notice-warning mt-3">
          ${LUCIDE_ICONS.alertTriangle}
          <div class="notice-content">
            <strong>補充提醒：</strong>${escapeHtml(item.notes)}
          </div>
        </div>

        <div class="btn-row card-divider">
          <button
            class="btn ${isRead ? "btn-correct" : ""}"
            type="button"
            data-toggle-read="${escapeHtml(item.id)}"
            aria-pressed="${isRead}"
          >
            ${isRead ? `${LUCIDE_ICONS.check}<span>已閱讀（取消）</span>` : "標記為已閱讀"}
          </button>
        </div>

        <p class="filter-label mt-3">熟練度評估（與已閱讀分開記錄）：</p>
        <div class="btn-row mt-0">
          ${["unrated", "unfamiliar", "somewhat", "familiar"]
            .map(
              (key) => `
            <button
              class="btn btn-sm ${mastery === key ? "btn-active" : ""}"
              type="button"
              data-grammar-id="${escapeHtml(item.id)}"
              data-mastery="${key}"
            >
              ${escapeHtml(STUDY_CONFIG.grammarMasteryLabels[key])}
            </button>
          `
            )
            .join("")}
        </div>

        <div class="card-divider">
          <label class="filter-label" for="grammar-note-${escapeHtml(item.id)}">
            ${LUCIDE_ICONS.edit}
            <span>造句筆記：用「${escapeHtml(item.title)}」寫一個例句</span>
          </label>
          <textarea
            class="mt-2"
            id="grammar-note-${escapeHtml(item.id)}"
            data-note-input="${escapeHtml(item.id)}"
            rows="2"
            placeholder="用這個句型寫一句自己的日文例句…"
          >${escapeHtml(noteValue)}</textarea>
          <div class="btn-row">
            <button class="btn" type="button" data-save-note="${escapeHtml(item.id)}">
              儲存例句
            </button>
            ${
              apiKey
                ? `
              <button class="btn btn-active" type="button" data-ai-check-note="${escapeHtml(item.id)}" ${isAiBusy ? "disabled" : ""}>
                ${isAiBusy ? "批改中…" : "AI 批改造句"}
              </button>
            `
                : ""
            }
          </div>
          ${
            ui.savedNoticeId === item.id
              ? `<div class="notice-box notice-success mt-2">${LUCIDE_ICONS.check}<div class="notice-content">已儲存至本機造句筆記。</div></div>`
              : ""
          }
          ${
            aiErr
              ? `<div class="notice-box notice-danger mt-2">${LUCIDE_ICONS.x}<div class="notice-content">${escapeHtml(aiErr)}</div></div>`
              : ""
          }
          ${
            aiText
              ? `<div class="notice-box notice-info mt-2">${LUCIDE_ICONS.messageCircle}<div class="notice-content pre-line">${escapeHtml(aiText)}</div></div>`
              : ""
          }
        </div>
      </article>
    `;
  }

  function bindEvents(apiKey) {
    container.querySelector("#grammar-level-filter")?.addEventListener("change", (e) => {
      ui.levelFilter = e.target.value;
      render();
    });
    container.querySelector("#grammar-read-filter")?.addEventListener("change", (e) => {
      ui.readFilter = e.target.value;
      render();
    });

    container.querySelectorAll("[data-toggle-read]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-toggle-read");
        const next = toggleGrammarRead(state.grammarProgress, id, new Date().toISOString());
        state = updateState({ ...state, grammarProgress: next });
        render();
      });
    });

    container.querySelectorAll("[data-mastery]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-grammar-id");
        const mastery = btn.getAttribute("data-mastery");
        const next = setGrammarMastery(state.grammarProgress, id, mastery);
        state = updateState({ ...state, grammarProgress: next });
        render();
      });
    });

    container.querySelectorAll("[data-note-input]").forEach((ta) => {
      ta.addEventListener("input", (e) => {
        const id = ta.getAttribute("data-note-input");
        ui.draftNotes[id] = e.target.value;
      });
    });

    container.querySelectorAll("[data-save-note]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-save-note");
        const ta = container.querySelector(`[data-note-input="${id}"]`);
        const text = ta ? ta.value : ui.draftNotes[id] || "";
        const nextNotes = setGrammarNote(state.grammarNotes, id, text);
        state = updateState({ ...state, grammarNotes: nextNotes });
        ui.savedNoticeId = id;
        render();
      });
    });

    container.querySelectorAll("[data-ai-check-note]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-ai-check-note");
        const ta = container.querySelector(`[data-note-input="${id}"]`);
        const text = ta ? ta.value : ui.draftNotes[id] || state.grammarNotes?.[id] || "";
        ui.draftNotes[id] = text;
        ui.aiLoadingId = id;
        ui.aiErrors[id] = "";
        render();
        try {
          ui.aiResults[id] = await checkJapaneseSentenceWithAi({
            apiKey,
            model: loadGeminiModel(),
            sentence: text
          });
        } catch (err) {
          ui.aiErrors[id] = err?.message || "AI 批改失敗，請稍後再試。";
        } finally {
          ui.aiLoadingId = "";
          render();
        }
      });
    });

    container.querySelectorAll("[data-speak-ja]").forEach((btn) => {
      btn.addEventListener("click", () => {
        speakJapanese(btn.getAttribute("data-speak-ja"));
      });
    });
  }

  render();
}
