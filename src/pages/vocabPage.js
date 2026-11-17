import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import {
  getLocalDateString,
  hiraganaToKatakana,
  isVocabDue,
  rateVocabCard,
  shuffleArray
} from "../core/studyLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderVocabPage(container, { state, updateState, params = {} }) {
  const ui = {
    mode: "quiz", // "quiz" = 看日文選中文 | "flashcard" = 翻卡記憶
    levelFilter: params.levelFilter || "all",
    groupFilter: "all",
    statusFilter: "due",
    showKatakana: false,
    index: 0,
    revealed: false,
    choiceOptions: [],
    choiceKey: "",
    selectedChoiceId: null,
    choiceSubmitted: false
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

  function ensureChoiceOptions(item) {
    if (!item) return;
    const key = `${item.id}:${ui.index}:${ui.statusFilter}:${ui.levelFilter}`;
    if (ui.choiceKey !== key) {
      const distractors = shuffleArray(
        VOCAB_LIST.filter((v) => v.id !== item.id)
      ).slice(0, 3);
      ui.choiceOptions = shuffleArray([
        { id: item.id, meaning: item.meaning },
        ...distractors.map((d) => ({ id: d.id, meaning: d.meaning }))
      ]);
      ui.choiceKey = key;
      ui.selectedChoiceId = null;
      ui.choiceSubmitted = false;
    }
  }

  function render() {
    const today = getLocalDateString();
    const list = getFilteredList();
    if (ui.index >= list.length) {
      ui.index = 0;
    }
    const current = list[ui.index] || null;
    if (ui.mode === "quiz") {
      ensureChoiceOptions(current);
    }

    const dueTotal = VOCAB_LIST.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
    const reviewedCount = VOCAB_LIST.length - dueTotal;
    const progressPct = Math.round((reviewedCount / VOCAB_LIST.length) * 100);

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">單字練習</h2>
        <p class="page-desc">
          可選擇「看日文選中文」直接作答完成，或切換「翻卡記憶」顯示答案後評估熟悉度。目前待複習總數：<strong>${dueTotal}</strong> 個。
        </p>
      </div>

      <div class="duo-progress-row" aria-label="今日單字完成進度">
        <div class="duo-progress-track">
          <div class="duo-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
        <span class="duo-progress-text">已完成 ${reviewedCount} / ${VOCAB_LIST.length}</span>
      </div>

      <div class="filter-bar">
        <div class="btn-row" style="margin-top: 0;">
          <button class="btn ${ui.mode === "quiz" ? "btn-primary" : ""}" type="button" id="vocab-mode-quiz">
            看日文選中文
          </button>
          <button class="btn ${ui.mode === "flashcard" ? "btn-primary" : ""}" type="button" id="vocab-mode-flashcard">
            翻卡記憶
          </button>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="vocab-level-filter">分類</label>
          <select id="vocab-level-filter">
            <option value="all" ${ui.levelFilter === "all" ? "selected" : ""}>全部分類</option>
            <option value="N4" ${ui.levelFilter === "N4" ? "selected" : ""}>N4 分類</option>
            <option value="N3" ${ui.levelFilter === "N3" ? "selected" : ""}>N3 分類</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="vocab-group-filter">主題</label>
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
          <label class="filter-label" for="vocab-status-filter">狀態</label>
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
          <h3 class="card-title">目前沒有符合條件的單字</h3>
          <p class="page-desc">${ui.statusFilter === "due" ? "太棒了！今日待複習的單字已全部完成。" : "請嘗試切換其他分類或學習狀態篩選。"}</p>
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
    const isCorrectChoice = ui.selectedChoiceId === item.id;

    return `
      <section class="card">
        <div class="badge-row">
          <span class="badge badge-primary">${escapeHtml(item.levelCategory)} 分類</span>
          <span class="badge">${escapeHtml(item.group)}</span>
          <span class="badge">${escapeHtml(item.reviewStatus)}</span>
          <span class="badge">第 ${ui.index + 1} / ${total} 張</span>
        </div>

        <div class="flashcard-header">
          <div class="flashcard-word" lang="ja">
            <ruby>${escapeHtml(item.word)}<rt>${escapeHtml(ui.showKatakana ? katakanaReading : item.kana)}</rt></ruby>
          </div>
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
        </div>

        <p class="flashcard-meta">
          目前熟悉度：<strong>${escapeHtml(famLabel)}</strong>｜下次複習日：<strong>${escapeHtml(nextDateText)}</strong>
        </p>

        ${
          ui.mode === "quiz"
            ? `
          <div class="card-divider">
            <p class="filter-label" style="margin: 0 0 8px;">請選出正確的中文意思：</p>
            <div class="option-list" role="radiogroup" aria-label="單字中文選項">
              ${ui.choiceOptions
                .map((opt, idx) => {
                  const selected = ui.selectedChoiceId === opt.id;
                  return `
                    <label class="option-label ${selected ? "selected" : ""}">
                      <span class="option-key">${idx + 1}</span>
                      <input
                        type="radio"
                        name="vocab-choice"
                        value="${escapeHtml(opt.id)}"
                        ${selected ? "checked" : ""}
                        ${ui.choiceSubmitted ? "disabled" : ""}
                      />
                      <span>${escapeHtml(opt.meaning)}</span>
                    </label>
                  `;
                })
                .join("")}
            </div>

            <div class="btn-row">
              <button
                class="btn btn-primary"
                type="button"
                id="vocab-check-choice-btn"
                ${ui.choiceSubmitted || !ui.selectedChoiceId ? "disabled" : ""}
              >
                ${ui.choiceSubmitted ? "已完成評估" : "確認答案並完成此字"}
              </button>
              ${
                ui.choiceSubmitted
                  ? `<button class="btn btn-blue" type="button" id="vocab-next-btn">繼續下一個</button>`
                  : ""
              }
            </div>

            ${
              ui.choiceSubmitted
                ? `
              <div class="notice-box ${isCorrectChoice ? "notice-success" : "notice-danger"}" style="margin-top: 14px;">
                ${isCorrectChoice ? LUCIDE_ICONS.check : LUCIDE_ICONS.x}
                <div class="notice-content">
                  <strong>${isCorrectChoice ? "答對了！已標記「有點熟」（3 天後複習）" : "答錯了，已標記「不熟」（1 天後複習）"}</strong><br />
                  <span>正解：<strong>${escapeHtml(item.meaning)}</strong>（${escapeHtml(item.pos)}）</span>
                  <div class="example-box" style="margin-top: 8px;">
                    <div lang="ja">${escapeHtml(item.exampleJa)}</div>
                    <div class="example-zh">${escapeHtml(item.exampleZh)}</div>
                  </div>
                </div>
              </div>
            `
                : ""
            }
          </div>
        `
            : !ui.revealed
              ? `
          <div class="btn-row">
            <button class="btn btn-primary" type="button" id="vocab-reveal-btn">顯示答案（再選擇熟悉度完成）</button>
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

            <p class="flashcard-meta">點選下方任一熟悉度即完成此卡並排定下次複習日：</p>
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
          <button class="btn" type="button" id="vocab-skip-btn" ${total <= 1 ? "disabled" : ""}>跳過／下一張</button>
        </div>
      </section>
    `;
  }

  function bindEvents(list, current) {
    container.querySelector("#vocab-mode-quiz")?.addEventListener("click", () => {
      ui.mode = "quiz";
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-mode-flashcard")?.addEventListener("click", () => {
      ui.mode = "flashcard";
      ui.revealed = false;
      render();
    });

    container.querySelector("#vocab-level-filter")?.addEventListener("change", (e) => {
      ui.levelFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-group-filter")?.addEventListener("change", (e) => {
      ui.groupFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-status-filter")?.addEventListener("change", (e) => {
      ui.statusFilter = e.target.value;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
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
      ui.choiceKey = "";
      render();
    });

    container.querySelectorAll('input[name="vocab-choice"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (ui.choiceSubmitted) return;
        ui.selectedChoiceId = e.target.value;
        render();
      });
    });

    container.querySelector("#vocab-check-choice-btn")?.addEventListener("click", () => {
      if (!current || !ui.selectedChoiceId || ui.choiceSubmitted) return;
      const rating = ui.selectedChoiceId === current.id ? "somewhat" : "unfamiliar";
      const today = getLocalDateString();
      const nextVocabProgress = rateVocabCard(
        state.vocabProgress,
        current.id,
        rating,
        STUDY_CONFIG,
        today
      );
      state = updateState({ ...state, vocabProgress: nextVocabProgress });
      ui.choiceSubmitted = true;
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
        ui.choiceKey = "";
        render();
      }
    });

    const goNext = () => {
      const nextList = getFilteredList();
      if (nextList.length > 0) {
        ui.index = (ui.index + 1) % nextList.length;
      } else {
        ui.index = 0;
      }
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    };

    container.querySelector("#vocab-next-btn")?.addEventListener("click", goNext);
    container.querySelector("#vocab-skip-btn")?.addEventListener("click", goNext);

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
        state = updateState({ ...state, vocabProgress: nextVocabProgress });
        ui.revealed = false;
        ui.choiceKey = "";
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
