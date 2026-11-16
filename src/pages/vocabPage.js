import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import {
  getLocalDateString,
  hiraganaToKatakana,
  isVocabDue,
  rateVocabCard
} from "../core/studyLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderVocabPage(container, { state, updateState }) {
  const ui = {
    levelFilter: "all",
    groupFilter: "all",
    statusFilter: "due",
    showKatakana: false,
    index: 0,
    revealed: false
  };

  const groups = Array.from(new Set(VOCAB_LIST.map((v) => v.group)));

  function getFilteredList() {
    const today = getLocalDateString();
    return VOCAB_LIST.filter((item) => {
      if (ui.levelFilter !== "all" && item.levelCategory !== ui.levelFilter) {
        return false;
      }
      if (ui.groupFilter !== "all" && item.group !== ui.groupFilter) {
        return false;
      }
      const prog = state.vocabProgress[item.id];
      if (ui.statusFilter === "due") {
        return isVocabDue(prog, today);
      }
      if (ui.statusFilter === "unlearned") {
        return !prog;
      }
      if (["unfamiliar", "somewhat", "familiar"].includes(ui.statusFilter)) {
        return prog?.familiarity === ui.statusFilter;
      }
      return true;
    });
  }

  function render() {
    const today = getLocalDateString();
    const list = getFilteredList();
    if (ui.index >= list.length) {
      ui.index = 0;
    }
    const current = list[ui.index] || null;
    const dueTotal = VOCAB_LIST.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">單字卡</h2>
        <p class="page-desc">先看題面回想讀音與意思，點擊「顯示答案」後再自行評估熟悉度（單純翻面不會自動計為已熟悉）。目前待複習總數：<strong>${dueTotal}</strong> 個。</p>
      </div>

      <div class="filter-bar">
        <div class="filter-group">
          <label class="filter-label" for="vocab-level-filter">學習分類</label>
          <select id="vocab-level-filter">
            <option value="all" ${ui.levelFilter === "all" ? "selected" : ""}>全部分類</option>
            <option value="N4" ${ui.levelFilter === "N4" ? "selected" : ""}>N4 分類</option>
            <option value="N3" ${ui.levelFilter === "N3" ? "selected" : ""}>N3 分類</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="vocab-group-filter">主題分組</label>
          <select id="vocab-group-filter">
            <option value="all" ${ui.groupFilter === "all" ? "selected" : ""}>全部分組</option>
            ${groups
              .map(
                (g) =>
                  `<option value="${escapeHtml(g)}" ${ui.groupFilter === g ? "selected" : ""}>${escapeHtml(g)}</option>`
              )
              .join("")}
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="vocab-status-filter">學習狀態</label>
          <select id="vocab-status-filter">
            <option value="due" ${ui.statusFilter === "due" ? "selected" : ""}>待複習</option>
            <option value="all" ${ui.statusFilter === "all" ? "selected" : ""}>全部單字</option>
            <option value="unlearned" ${ui.statusFilter === "unlearned" ? "selected" : ""}>未學習</option>
            <option value="unfamiliar" ${ui.statusFilter === "unfamiliar" ? "selected" : ""}>不熟</option>
            <option value="somewhat" ${ui.statusFilter === "somewhat" ? "selected" : ""}>有點熟</option>
            <option value="familiar" ${ui.statusFilter === "familiar" ? "selected" : ""}>熟悉</option>
          </select>
        </div>

        <label class="checkbox-inline">
          <input type="checkbox" id="vocab-katakana-toggle" ${ui.showKatakana ? "checked" : ""} />
          <span class="filter-label">顯示片假名</span>
        </label>
      </div>

      ${
        !current
          ? `
        <section class="card empty-state">
          <h3 class="card-title">目前沒有符合條件的單字卡</h3>
          <p class="page-desc">${ui.statusFilter === "due" ? "太棒了！目前沒有待複習的單字。" : "請嘗試切換其他分類或學習狀態篩選。"}</p>
          <div class="btn-row" style="justify-content: center;">
            <button class="btn btn-primary" type="button" id="vocab-show-all-btn">查看全部單字</button>
          </div>
        </section>
      `
          : renderCard(current, state.vocabProgress[current.id], list.length)
      }
    `;

    bindEvents(list, current);
  }

  function renderCard(item, prog, total) {
    const famLabel = prog?.familiarity
      ? STUDY_CONFIG.familiarityLabels[prog.familiarity]
      : "未學習";
    const nextDateText = prog?.nextReviewDate || "尚未排定";
    const speechAvailable = isSpeechSupported();
    const katakanaReading = hiraganaToKatakana(item.kana);

    return `
      <section class="card">
        <div class="badge-row">
          <span class="badge badge-primary">${escapeHtml(item.levelCategory)} 分類</span>
          <span class="badge">${escapeHtml(item.group)}</span>
          <span class="badge">${escapeHtml(item.reviewStatus)}</span>
          <span class="badge">第 ${ui.index + 1} / ${total} 張</span>
        </div>

        <div class="flashcard-header">
          <div class="flashcard-word" lang="ja">${escapeHtml(item.word)}</div>
          ${
            ui.showKatakana
              ? `<span class="flashcard-katakana-inline" lang="ja">${escapeHtml(katakanaReading)}</span>`
              : ""
          }
        </div>
        <div class="btn-row">
          <button
            class="btn"
            type="button"
            data-speak-ja="${escapeHtml(item.kana)}"
            ${speechAvailable ? "" : "disabled"}
          >
            ${LUCIDE_ICONS.volume2}
            <span>朗讀單字</span>
          </button>
          ${
            speechAvailable
              ? ""
              : `<span class="page-desc">（目前瀏覽器不支援語音朗讀）</span>`
          }
        </div>
        <p class="flashcard-meta">
          目前熟悉度：<strong>${escapeHtml(famLabel)}</strong>｜下次複習日：<strong>${escapeHtml(nextDateText)}</strong>
        </p>

        ${
          !ui.revealed
            ? `
          <div class="btn-row">
            <button class="btn btn-primary" type="button" id="vocab-reveal-btn">顯示答案</button>
          </div>
        `
            : `
          <div class="flashcard-answer">
            <div class="flashcard-kana" lang="ja">
              ${escapeHtml(item.kana)}${ui.showKatakana ? `（${escapeHtml(katakanaReading)}）` : ""}
            </div>
            <p class="flashcard-meaning">${escapeHtml(item.meaning)}</p>
            <p class="flashcard-meta">詞性：${escapeHtml(item.pos)}</p>
            <div class="example-box">
              <div lang="ja"><strong>例句：</strong>${escapeHtml(item.exampleJa)}</div>
              <div class="example-zh">翻譯：${escapeHtml(item.exampleZh)}</div>
              <div class="btn-row">
                <button
                  class="btn"
                  type="button"
                  data-speak-ja="${escapeHtml(item.exampleJa)}"
                  ${speechAvailable ? "" : "disabled"}
                >
                  ${LUCIDE_ICONS.volume2}
                  <span>朗讀例句</span>
                </button>
              </div>
            </div>

            <p class="flashcard-meta">請評估此單字熟悉度（更新下次複習日期）：</p>
            <div class="btn-row">
              <button class="btn btn-danger" type="button" data-rate="unfamiliar">
                不熟（${STUDY_CONFIG.reviewIntervalsDays.unfamiliar} 天後複習）
              </button>
              <button class="btn btn-warning" type="button" data-rate="somewhat">
                有點熟（${STUDY_CONFIG.reviewIntervalsDays.somewhat} 天後複習）
              </button>
              <button class="btn btn-success" type="button" data-rate="familiar">
                熟悉（${STUDY_CONFIG.reviewIntervalsDays.familiar} 天後複習）
              </button>
            </div>
          </div>
        `
        }

        <div class="btn-row card-divider">
          <button class="btn" type="button" id="vocab-prev-btn" ${total <= 1 ? "disabled" : ""}>上一張</button>
          <button class="btn" type="button" id="vocab-next-btn" ${total <= 1 ? "disabled" : ""}>下一張</button>
        </div>
      </section>
    `;
  }

  function bindEvents(list, current) {
    container.querySelector("#vocab-level-filter")?.addEventListener("change", (e) => {
      ui.levelFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      render();
    });
    container.querySelector("#vocab-group-filter")?.addEventListener("change", (e) => {
      ui.groupFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      render();
    });
    container.querySelector("#vocab-status-filter")?.addEventListener("change", (e) => {
      ui.statusFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      render();
    });
    container.querySelector("#vocab-katakana-toggle")?.addEventListener("change", (e) => {
      ui.showKatakana = e.target.checked;
      render();
    });
    container.querySelector("#vocab-show-all-btn")?.addEventListener("click", () => {
      ui.levelFilter = "all";
      ui.groupFilter = "all";
      ui.statusFilter = "all";
      ui.index = 0;
      ui.revealed = false;
      render();
    });

    container.querySelector("#vocab-reveal-btn")?.addEventListener("click", () => {
      ui.revealed = true;
      render();
    });

    container.querySelectorAll("[data-speak-ja]").forEach((btn) => {
      btn.addEventListener("click", () => {
        speakJapanese(btn.getAttribute("data-speak-ja"));
      });
    });

    container.querySelector("#vocab-prev-btn")?.addEventListener("click", () => {
      if (list.length > 0) {
        ui.index = (ui.index - 1 + list.length) % list.length;
        ui.revealed = false;
        render();
      }
    });

    container.querySelector("#vocab-next-btn")?.addEventListener("click", () => {
      if (list.length > 0) {
        ui.index = (ui.index + 1) % list.length;
        ui.revealed = false;
        render();
      }
    });

    container.querySelectorAll("[data-rate]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!current) return;
        const rating = btn.getAttribute("data-rate");
        const today = getLocalDateString();
        const nextVocabProgress = rateVocabCard(
          state.vocabProgress,
          current.id,
          rating,
          STUDY_CONFIG,
          today
        );
        updateState({ ...state, vocabProgress: nextVocabProgress });
        ui.revealed = false;
        const nextList = getFilteredList();
        if (nextList.length > 0) {
          ui.index = ui.index % nextList.length;
        } else {
          ui.index = 0;
        }
        render();
      });
    });
  }

  render();
}
