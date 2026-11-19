import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import {
  getLocalDateString,
  hiraganaToKatakana,
  isVocabDue,
  rateVocabCard,
  shuffleArray,
  toggleReviewMark
} from "../core/studyLogic.js";
import { escapeHtml, renderRubyText, stripRubyMarkup } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderVocabPage(container, { state, updateState, params = {} }) {
  const ui = {
    mode: "active-recall", // "active-recall" | "quiz"
    contextFirst: false,
    levelFilter: params.levelFilter || "all",
    groupFilter: "all",
    statusFilter: "due",
    showKatakana: false,
    index: 0,
    revealed: false,
    choiceOptions: [],
    choiceKey: "",
    selectedChoiceId: null,
    choiceSubmitted: false,
    pinnedCard: null
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
      if (ui.statusFilter === "marked") {
        return Boolean(state.reviewMarks?.vocab?.[item.id]);
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
    const current = ui.pinnedCard || list[ui.index] || null;
    if (ui.mode === "quiz" && !ui.pinnedCard) {
      ensureChoiceOptions(current);
    }

    const dueTotal = VOCAB_LIST.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
    const reviewedCount = VOCAB_LIST.length - dueTotal;
    const progressPct = Math.round((reviewedCount / VOCAB_LIST.length) * 100);

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">單字練習</h1>
        <p class="page-desc">
          以「主動回想翻卡」提取記憶（可搭配「語境句子優先」從例句推敲詞義），或切換「看日文選中文」。待複習總數：<strong>${dueTotal}</strong> 個。
        </p>
      </div>

      <div class="progress-row mt-0 mb-3" aria-label="今日單字完成進度">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${progressPct}%;"></div>
        </div>
        <span class="progress-bar-label">今日已完成 ${reviewedCount} / ${VOCAB_LIST.length}</span>
      </div>

      <div class="filter-bar">
        <div class="btn-row mt-0">
          <button class="btn ${ui.mode === "active-recall" ? "btn-active" : ""}" type="button" id="vocab-mode-flashcard">
            主動回想翻卡
          </button>
          <button class="btn ${ui.mode === "quiz" ? "btn-active" : ""}" type="button" id="vocab-mode-quiz">
            看日文選中文
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
            <option value="marked" ${ui.statusFilter === "marked" ? "selected" : ""}>已標記複習</option>
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

        ${
          ui.mode === "active-recall"
            ? `
          <label class="checkbox-inline">
            <input type="checkbox" id="vocab-context-toggle" ${ui.contextFirst ? "checked" : ""} />
            <span class="filter-label">語境句子優先（i+1）</span>
          </label>
        `
            : ""
        }
      </div>

      ${
        !current
          ? `
        <section class="card empty-state">
          <h2 class="card-title">目前沒有符合條件的單字</h2>
          <p class="page-desc">${ui.statusFilter === "due" ? "今日待複習的單字已全部完成。" : "請嘗試切換其他分類或學習狀態篩選。"}</p>
          <div class="btn-row justify-center">
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
    const isMarked = Boolean(state.reviewMarks?.vocab?.[item.id]);
    const plainExample = stripRubyMarkup(item.exampleJa);

    return `
      <section class="card">
        <div class="badge-row">
          <span class="badge badge-accent">${escapeHtml(item.levelCategory)}・${escapeHtml(item.group)}</span>
          ${isMarked ? `<span class="badge badge-warning">已標記待複習</span>` : ""}
          <span class="checklist-detail">第 ${ui.index + 1} / ${total || 1} 張・${escapeHtml(item.reviewStatus)}</span>
        </div>

        <div class="flashcard-header">
          <div class="flashcard-word" lang="ja">${escapeHtml(item.word)}</div>
          ${
            ui.showKatakana
              ? `<span class="flashcard-katakana-inline" lang="ja">${escapeHtml(katakanaReading)}</span>`
              : ""
          }
        </div>

        ${
          ui.mode === "active-recall" && ui.contextFirst && !ui.revealed
            ? `
          <div class="example-box">
            <p class="filter-label">i+1 語境提示</p>
            <div class="example-ja" lang="ja">${renderRubyText(item.exampleJa)}</div>
            <div class="btn-row">
              <button
                class="btn btn-sm"
                type="button"
                data-speak-ja="${escapeHtml(plainExample)}"
                ${speechAvailable ? "" : "disabled"}
              >
                ${LUCIDE_ICONS.volume2}
                <span>朗讀例句</span>
              </button>
            </div>
          </div>
        `
            : ""
        }

        <div class="btn-row">
          <button
            class="btn btn-sm"
            type="button"
            data-speak-ja="${escapeHtml(item.kana)}"
            ${speechAvailable ? "" : "disabled"}
          >
            ${LUCIDE_ICONS.volume2}
            <span>朗讀單字</span>
          </button>
          <button
            class="btn btn-sm ${isMarked ? "btn-active" : ""}"
            type="button"
            id="vocab-mark-review-btn"
            aria-pressed="${isMarked}"
          >
            ${LUCIDE_ICONS.bookmark}
            <span>${isMarked ? "已標記（取消）" : "標記待複習"}</span>
          </button>
        </div>

        <p class="flashcard-meta">
          熟悉度：<strong>${escapeHtml(famLabel)}</strong>｜下次複習：<strong>${escapeHtml(nextDateText)}</strong>
        </p>

        ${
          ui.mode === "quiz"
            ? `
          <div class="card-divider">
            <p class="filter-label">請選出正確的中文意思：</p>
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
                class="btn ${ui.choiceSubmitted ? "" : "btn-primary"}"
                type="button"
                id="vocab-check-choice-btn"
                ${ui.choiceSubmitted || !ui.selectedChoiceId ? "disabled" : ""}
              >
                ${ui.choiceSubmitted ? "已完成評估" : "確認答案"}
              </button>
              ${
                ui.choiceSubmitted
                  ? `<button class="btn btn-primary" type="button" id="vocab-next-btn">繼續下一個</button>`
                  : ""
              }
            </div>

            ${
              ui.choiceSubmitted
                ? `
              <div class="notice-box ${isCorrectChoice ? "notice-success" : "notice-danger"} mt-3">
                ${isCorrectChoice ? LUCIDE_ICONS.check : LUCIDE_ICONS.x}
                <div class="notice-content">
                  <strong>${isCorrectChoice ? "答對，已排定 3 天後複習（有點熟）" : "答錯，已排定 1 天後複習（不熟）"}</strong>
                  <div class="mt-2">讀音：<strong lang="ja">${escapeHtml(item.kana)}${ui.showKatakana ? `（${escapeHtml(katakanaReading)}）` : ""}</strong>｜正解：<strong>${escapeHtml(item.meaning)}</strong>（${escapeHtml(item.pos)}）</div>
                  <div class="example-box mt-2">
                    <div class="example-ja" lang="ja">${renderRubyText(item.exampleJa)}</div>
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
              <div class="example-ja" lang="ja"><strong>例句：</strong>${renderRubyText(item.exampleJa)}</div>
              <div class="example-zh">翻譯：${escapeHtml(item.exampleZh)}</div>
              <div class="btn-row">
                <button
                  class="btn btn-sm"
                  type="button"
                  data-speak-ja="${escapeHtml(plainExample)}"
                  ${speechAvailable ? "" : "disabled"}
                >
                  ${LUCIDE_ICONS.volume2}
                  <span>朗讀例句</span>
                </button>
              </div>
            </div>

            <p class="flashcard-meta">點選熟悉度完成此卡並排定下次複習日（翻面不會自動計分）：</p>
            <div class="btn-row">
              <button class="btn btn-danger" type="button" data-rate="unfamiliar">
                不熟・${STUDY_CONFIG.reviewIntervalsDays.unfamiliar} 天
              </button>
              <button class="btn btn-warning" type="button" data-rate="somewhat">
                有點熟・${STUDY_CONFIG.reviewIntervalsDays.somewhat} 天
              </button>
              <button class="btn btn-correct" type="button" data-rate="familiar">
                熟悉・${STUDY_CONFIG.reviewIntervalsDays.familiar} 天
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
      ui.pinnedCard = null;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-mode-flashcard")?.addEventListener("click", () => {
      ui.mode = "active-recall";
      ui.pinnedCard = null;
      ui.revealed = false;
      render();
    });

    container.querySelector("#vocab-level-filter")?.addEventListener("change", (e) => {
      ui.levelFilter = e.target.value;
      ui.pinnedCard = null;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-group-filter")?.addEventListener("change", (e) => {
      ui.groupFilter = e.target.value;
      ui.pinnedCard = null;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-status-filter")?.addEventListener("change", (e) => {
      ui.statusFilter = e.target.value;
      ui.pinnedCard = null;
      ui.index = 0;
      ui.revealed = false;
      ui.choiceKey = "";
      render();
    });
    container.querySelector("#vocab-katakana-toggle")?.addEventListener("change", (e) => {
      ui.showKatakana = e.target.checked;
      render();
    });
    container.querySelector("#vocab-context-toggle")?.addEventListener("change", (e) => {
      ui.contextFirst = e.target.checked;
      render();
    });
    container.querySelector("#vocab-show-all-btn")?.addEventListener("click", () => {
      ui.levelFilter = "all";
      ui.groupFilter = "all";
      ui.statusFilter = "all";
      ui.pinnedCard = null;
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
      ui.pinnedCard = current;
      ui.choiceSubmitted = true;
      render();
    });

    container.querySelector("#vocab-mark-review-btn")?.addEventListener("click", () => {
      if (!current) return;
      const nextMarks = toggleReviewMark(state.reviewMarks, "vocab", current.id);
      state = updateState({ ...state, reviewMarks: nextMarks });
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
      ui.pinnedCard = null;
      if (list.length > 0) {
        ui.index = (ui.index - 1 + list.length) % list.length;
        ui.revealed = false;
        ui.choiceKey = "";
        render();
      }
    });

    const goNext = () => {
      ui.pinnedCard = null;
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
        ui.pinnedCard = null;
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
