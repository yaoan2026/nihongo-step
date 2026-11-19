import { STUDY_CONFIG } from "../config/studyConfig.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import {
  getAllGrammarList,
  getLocalDateString,
  mergeAiGrammarList,
  setGrammarMastery,
  setGrammarNote,
  toggleGrammarRead
} from "../core/studyLogic.js";
import { escapeHtml, renderRubyText, stripRubyMarkup } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";
import {
  checkJapaneseSentenceWithAi,
  generateAiGrammar,
  loadGeminiKey,
  loadGeminiModel
} from "../core/geminiAi.js";

const attemptedDailyAutoGrammarDates = new Set();

export function renderGrammarPage(container, { state, updateState, navigate, params = {} }) {
  let destroyed = false;
  const ui = {
    levelFilter: params.levelFilter || "all",
    readFilter: "all",
    draftNotes: {},
    savedNoticeId: "",
    aiLoadingId: "",
    aiResults: {},
    aiErrors: {},
    aiLevel: "mixed",
    aiCount: "2",
    aiTopic: "",
    aiLoading: false,
    aiNotice: "",
    aiError: ""
  };

  function getCombinedGrammar() {
    return getAllGrammarList(GRAMMAR_LIST, state.aiGrammarList);
  }

  function isStillOnGrammarRoute() {
    return !destroyed && container.isConnected && window.location.hash.replace(/^#/, "") === "grammar";
  }

  function getFiltered() {
    const allGrammar = getCombinedGrammar();
    const filtered = allGrammar.filter((item) => {
      if (ui.levelFilter !== "all" && item.levelCategory !== ui.levelFilter) {
        return false;
      }
      if (ui.readFilter === "ai") {
        return item.id.startsWith("ai_gram_");
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
    return ui.readFilter === "ai" ? filtered.reverse() : filtered;
  }

  async function runManualAiGenerate() {
    if (ui.aiLoading) return;
    const apiKey = loadGeminiKey();
    if (!apiKey) {
      ui.aiError = "請先至「學習紀錄與設定」填入 Gemini API Key。";
      render();
      return;
    }

    const today = getLocalDateString();
    ui.aiLoading = true;
    ui.aiError = "";
    ui.aiNotice = "AI 正在生成新文法筆記，請稍候…";
    render();

    try {
      const allGrammar = getCombinedGrammar();
      const generated = await generateAiGrammar({
        apiKey,
        model: loadGeminiModel(),
        dateStr: today,
        existingList: allGrammar,
        count: Number(ui.aiCount) || 2,
        levelFocus: ui.aiLevel,
        topic: ui.aiTopic
      });
      let addedCount = 0;
      state = updateState((latestState) => {
        const mergeRes = mergeAiGrammarList(
          latestState.aiGrammarList,
          generated,
          GRAMMAR_LIST
        );
        addedCount = mergeRes.addedCount;
        return {
          ...latestState,
          aiGrammarList: mergeRes.merged,
          lastDailyGrammarDate:
            mergeRes.addedCount > 0 ? today : latestState.lastDailyGrammarDate
        };
      });

      if (!isStillOnGrammarRoute()) return;

      if (addedCount > 0) {
        ui.readFilter = "ai";
        ui.levelFilter = "all";
        ui.aiNotice = `已新增 ${addedCount} 篇 AI 新文法，已切換至「AI 生成文法」清單。`;
      } else {
        ui.aiNotice = "本次未新增不重複文法，可試著調整主題後再生成。";
      }
    } catch (err) {
      if (!isStillOnGrammarRoute()) return;
      ui.aiNotice = "";
      ui.aiError = err?.message || "AI 生成文法失敗，請稍後再試。";
    } finally {
      if (isStillOnGrammarRoute()) {
        ui.aiLoading = false;
        render();
      }
    }
  }

  async function triggerDailyAutoGrammarIfNeeded() {
    const apiKey = loadGeminiKey();
    const today = getLocalDateString();
    if (
      !apiKey ||
      state.lastDailyGrammarDate === today ||
      attemptedDailyAutoGrammarDates.has(today)
    ) {
      return;
    }
    attemptedDailyAutoGrammarDates.add(today);
    ui.aiLoading = true;
    ui.aiError = "";
    ui.aiNotice = "正在為今日自動更新 2 篇 AI 新文法…";
    render();

    try {
      const allGrammar = getCombinedGrammar();
      const generated = await generateAiGrammar({
        apiKey,
        model: loadGeminiModel(),
        dateStr: today,
        existingList: allGrammar,
        count: 2,
        levelFocus: "mixed"
      });
      let addedCount = 0;
      state = updateState((latestState) => {
        const mergeRes = mergeAiGrammarList(
          latestState.aiGrammarList,
          generated,
          GRAMMAR_LIST
        );
        addedCount = mergeRes.addedCount;
        return {
          ...latestState,
          aiGrammarList: mergeRes.merged,
          lastDailyGrammarDate: today
        };
      });

      if (!isStillOnGrammarRoute()) return;
      ui.aiNotice =
        addedCount > 0
          ? `今日已自動更新並新增 ${addedCount} 篇 AI 新文法（可篩選「AI 生成文法」查看）。`
          : "今日自動更新檢查完成，目前無須新增重複文法。";
    } catch (err) {
      attemptedDailyAutoGrammarDates.delete(today);
      if (!isStillOnGrammarRoute()) return;
      ui.aiNotice = "";
      ui.aiError = `今日自動更新文法暫時失敗：${err?.message || "請稍後手動重試。"}`;
    } finally {
      if (isStillOnGrammarRoute()) {
        ui.aiLoading = false;
        render();
      }
    }
  }

  function renderAiGrammarPanel(apiKey, aiGrammarCount, today) {
    if (!apiKey) {
      return `
        <section class="card card-subtle mb-3">
          <h2 class="section-heading">AI 文法擴充</h2>
          <p class="page-desc">
            設定個人的 Gemini API Key 後，每天開啟文法頁會自動更新 2 篇新文法筆記，也可隨時手動生成指定程度與主題的 N4／N3 新文法並永久保存。
          </p>
          <div class="btn-row">
            <button class="btn btn-primary" type="button" id="grammar-go-records-btn">前往設定 API Key</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="card card-subtle mb-3">
        <div class="section-heading-row mt-0 mb-3">
          <div class="section-heading-left">
            ${LUCIDE_ICONS.bookOpen}
            <h2 class="section-heading mt-0">AI 生成新文法</h2>
          </div>
          <span class="section-meta">
            已收錄 ${aiGrammarCount} 篇・${state.lastDailyGrammarDate === today ? "今日已自動更新" : "可手動補充"}
          </span>
        </div>
        <p class="page-desc">
          除了每日自動更新外，可依需求手動生成不重複的 N4／N3 新文法（含意思、接續、使用情境與含標音例句），生成後會存入本機清單。
        </p>

        <div class="filter-bar mt-3 mb-3">
          <div class="filter-group">
            <label class="filter-label" for="grammar-ai-level">程度</label>
            <select id="grammar-ai-level" ${ui.aiLoading ? "disabled" : ""}>
              <option value="mixed" ${ui.aiLevel === "mixed" ? "selected" : ""}>N4＋N3 混合</option>
              <option value="N4" ${ui.aiLevel === "N4" ? "selected" : ""}>N4 文法</option>
              <option value="N3" ${ui.aiLevel === "N3" ? "selected" : ""}>N3 文法</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="grammar-ai-count">篇數</label>
            <select id="grammar-ai-count" ${ui.aiLoading ? "disabled" : ""}>
              <option value="2" ${ui.aiCount === "2" ? "selected" : ""}>2 篇</option>
              <option value="3" ${ui.aiCount === "3" ? "selected" : ""}>3 篇</option>
              <option value="5" ${ui.aiCount === "5" ? "selected" : ""}>5 篇</option>
            </select>
          </div>
        </div>

        <div>
          <label class="filter-label" for="grammar-ai-topic">主題關鍵字（選填）</label>
          <input
            type="text"
            id="grammar-ai-topic"
            class="mt-2"
            placeholder="例如：條件假設、敬語表達、原因理由、時間先後…"
            value="${escapeHtml(ui.aiTopic)}"
            ${ui.aiLoading ? "disabled" : ""}
          />
        </div>

        <div class="btn-row">
          <button
            class="btn btn-primary"
            type="button"
            id="grammar-generate-ai-btn"
            ${ui.aiLoading ? "disabled" : ""}
          >
            ${ui.aiLoading ? "AI 生成文法中…" : "手動生成 AI 新文法"}
          </button>
        </div>
      </section>
    `;
  }

  function render() {
    const today = getLocalDateString();
    const allGrammar = getCombinedGrammar();
    const list = getFiltered();
    const readCount = allGrammar.filter((g) => state.grammarProgress[g.id]?.isRead).length;
    const aiGrammarCount = Array.isArray(state.aiGrammarList) ? state.aiGrammarList.length : 0;
    const apiKey = loadGeminiKey();

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">文法筆記</h1>
        <p class="page-desc">已閱讀：<strong>${readCount} / ${allGrammar.length}</strong> 篇。「已閱讀」與「熟練度」分開記錄，可在各篇下方練習造句。</p>
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
            <option value="ai" ${ui.readFilter === "ai" ? "selected" : ""}>AI 生成文法（${aiGrammarCount}）</option>
          </select>
        </div>
      </div>

      ${renderAiGrammarPanel(apiKey, aiGrammarCount, today)}

      ${
        ui.aiNotice
          ? `<div class="notice-box notice-info mb-3">${LUCIDE_ICONS.info}<div class="notice-content">${escapeHtml(ui.aiNotice)}</div></div>`
          : ""
      }

      ${
        ui.aiError
          ? `<div class="notice-box notice-danger mb-3">${LUCIDE_ICONS.x}<div class="notice-content">${escapeHtml(ui.aiError)}</div></div>`
          : ""
      }

      <div class="stack">
        ${
          list.length === 0
            ? `
          <section class="card empty-state">
            <h2 class="card-title">沒有符合條件的文法筆記</h2>
            <p class="page-desc">${
              ui.readFilter === "ai"
                ? "目前尚未收錄 AI 生成文法，請使用上方「AI 生成新文法」區塊生成。"
                : "請嘗試調整上方分類或閱讀狀態篩選。"
            }</p>
            <div class="btn-row justify-center">
              <button class="btn btn-primary" type="button" id="grammar-show-all-btn">查看全部文法</button>
            </div>
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
    const examples = Array.isArray(item.examples) ? item.examples : [];

    return `
      <article class="card ${isRead ? "" : "card-subtle"}">
        <div class="badge-row">
          <span class="badge badge-accent">${escapeHtml(item.levelCategory)}</span>
          ${item.id.startsWith("ai_gram_") ? `<span class="badge">AI 生成</span>` : ""}
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
          ${examples
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

    container.querySelector("#grammar-show-all-btn")?.addEventListener("click", () => {
      ui.levelFilter = "all";
      ui.readFilter = "all";
      render();
    });

    container.querySelector("#grammar-go-records-btn")?.addEventListener("click", () => {
      navigate?.("records");
    });

    container.querySelector("#grammar-ai-level")?.addEventListener("change", (e) => {
      ui.aiLevel = e.target.value;
    });
    container.querySelector("#grammar-ai-count")?.addEventListener("change", (e) => {
      ui.aiCount = e.target.value;
    });
    container.querySelector("#grammar-ai-topic")?.addEventListener("input", (e) => {
      ui.aiTopic = e.target.value;
    });
    container.querySelector("#grammar-generate-ai-btn")?.addEventListener("click", runManualAiGenerate);

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
          if (!isStillOnGrammarRoute()) return;
          ui.aiErrors[id] = err?.message || "AI 批改失敗，請稍後再試。";
        } finally {
          if (isStillOnGrammarRoute()) {
            ui.aiLoadingId = "";
            render();
          }
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
  triggerDailyAutoGrammarIfNeeded();
  return () => {
    destroyed = true;
  };
}
