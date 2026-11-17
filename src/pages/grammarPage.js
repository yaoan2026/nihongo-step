import { STUDY_CONFIG } from "../config/studyConfig.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import { toggleGrammarRead, setGrammarMastery } from "../core/studyLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderGrammarPage(container, { state, updateState, params = {} }) {
  const ui = {
    levelFilter: params.levelFilter || "all",
    readFilter: "all"
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

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">文法筆記</h2>
        <p class="page-desc">已閱讀：<strong>${readCount} / ${GRAMMAR_LIST.length}</strong> 篇。「已閱讀」與「熟練度」分開記錄，方便區分讀過與真正掌握。</p>
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

      ${list.length === 0
        ? `
        <section class="card empty-state">
          <h3>沒有符合條件的文法筆記</h3>
          <p>請嘗試調整上方分類或閱讀狀態篩選。</p>
        </section>
      `
        : list.map((g) => renderGrammarCard(g, state.grammarProgress[g.id])).join("")
      }
    `;

    bindEvents();
  }

  function renderGrammarCard(item, prog) {
    const isRead = Boolean(prog?.isRead);
    const mastery = prog?.mastery || "unrated";
    const speechAvailable = isSpeechSupported();

    return `
      <article class="card">
        <div class="badge-row">
          <span class="badge badge-primary">${escapeHtml(item.levelCategory)} 分類</span>
          <span class="badge ${isRead ? "badge-success" : "badge-warning"}">
            ${isRead ? `${LUCIDE_ICONS.check}<span>已閱讀</span>` : "未閱讀"}
          </span>
          <span class="badge">熟練度：${escapeHtml(STUDY_CONFIG.grammarMasteryLabels[mastery])}</span>
          <span class="badge">${escapeHtml(item.reviewStatus)}</span>
        </div>

        <h3 class="card-title" style="margin-top: 12px;" lang="ja">${escapeHtml(item.title)}</h3>
        <p><strong>意思：</strong>${escapeHtml(item.meaning)}</p>
        <p><strong>接續：</strong>${escapeHtml(item.connection)}</p>
        <p><strong>使用情境：</strong>${escapeHtml(item.situation)}</p>

        <div class="example-box">
          <strong>例句：</strong>
          ${item.examples
        .map(
          (ex) => `
            <div class="example-item">
              <div lang="ja">${escapeHtml(ex.ja)}</div>
              <div class="example-zh">${escapeHtml(ex.zh)}</div>
              <div class="btn-row">
                <button
                  class="btn"
                  type="button"
                  data-speak-ja="${escapeHtml(ex.ja)}"
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

        <p class="flashcard-meta"><strong>注意事項：</strong>${escapeHtml(item.notes)}</p>

        <div class="btn-row card-divider">
          <button class="btn ${isRead ? "btn-success" : "btn-primary"}" type="button" data-toggle-read="${escapeHtml(item.id)}">
            ${isRead ? `${LUCIDE_ICONS.check}<span>已標記已閱讀（點擊取消）</span>` : "標記為已閱讀"}
          </button>
        </div>

        <div class="btn-row">
          <span class="filter-label">熟練度（獨立於已閱讀）：</span>
          ${["unrated", "unfamiliar", "somewhat", "familiar"]
        .map(
          (key) => `
            <button
              class="btn ${mastery === key ? "btn-active" : ""}"
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
      </article>
    `;
  }

  function bindEvents() {
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
        updateState({ ...state, grammarProgress: next });
        render();
      });
    });

    container.querySelectorAll("[data-mastery]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-grammar-id");
        const mastery = btn.getAttribute("data-mastery");
        const next = setGrammarMastery(state.grammarProgress, id, mastery);
        updateState({ ...state, grammarProgress: next });
        render();
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
