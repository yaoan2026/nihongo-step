import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import {
  getAllVocabList,
  getLocalDateString,
  hiraganaToKatakana,
  isVocabDue,
  mergeAiVocabList,
  rateVocabCard,
  shuffleArray,
  toggleReviewMark
} from "../core/studyLogic.js";
import { escapeHtml, renderRubyText, stripRubyMarkup } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";
import {
  generateAiVocab,
  loadGeminiKey,
  loadGeminiModel
} from "../core/geminiAi.js";

const attemptedDailyAutoDates = new Set();

export function renderVocabPage(container, { state, updateState, navigate, params = {} }) {
  let destroyed = false;
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
    pinnedCard: null,
    aiLevel: "mixed",
    aiCount: "5",
    aiTopic: "",
    aiLoading: false,
    aiNotice: "",
    aiError: ""
  };

  function getCombinedVocab() {
    return getAllVocabList(VOCAB_LIST, state.aiVocabList);
  }

  function getFilteredList() {
    const today = getLocalDateString();
    const allVocab = getCombinedVocab();
    return allVocab.filter((item) => {
      if (ui.levelFilter !== "all" && item.levelCategory !== ui.levelFilter) {
        return false;
      }
      if (ui.groupFilter !== "all" && item.group !== ui.groupFilter) {
        return false;
      }
      if (ui.statusFilter === "ai") {
        return item.id.startsWith("ai_vocab_");
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
      const allVocab = getCombinedVocab();
      const distractors = shuffleArray(
        allVocab.filter((v) => v.id !== item.id)
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

  function isStillOnVocabRoute() {
    return !destroyed && container.isConnected && window.location.hash.replace(/^#/, "") === "vocab";
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
    ui.aiNotice = "AI 正在生成新單字，請稍候…";
    render();

    try {
      const allVocab = getCombinedVocab();
      const generated = await generateAiVocab({
        apiKey,
        model: loadGeminiModel(),
        dateStr: today,
        existingList: allVocab,
        count: Number(ui.aiCount) || 5,
        levelFocus: ui.aiLevel,
        topic: ui.aiTopic
      });
      let addedCount = 0;
      state = updateState((latestState) => {
        const mergeRes = mergeAiVocabList(
          latestState.aiVocabList,
          generated,
          VOCAB_LIST
        );
        addedCount = mergeRes.addedCount;
        return {
          ...latestState,
          aiVocabList: mergeRes.merged,
          lastDailyVocabDate:
            mergeRes.addedCount > 0 ? today : latestState.lastDailyVocabDate
        };
      });

      if (!isStillOnVocabRoute()) return;

      if (addedCount > 0) {
        ui.statusFilter = "ai";
        ui.levelFilter = "all";
        ui.groupFilter = "all";
        ui.index = 0;
        ui.pinnedCard = null;
        ui.revealed = false;
        ui.choiceKey = "";
        ui.aiNotice = `已新增 ${addedCount} 個 AI 新單字，已切換至「AI 生成單字」清單。`;
      } else {
        ui.aiNotice = "本次未新增不重複單字，可試著調整主題後再生成。";
      }
    } catch (err) {
      if (!isStillOnVocabRoute()) return;
      ui.aiNotice = "";
      ui.aiError = err?.message || "AI 生成單字失敗，請稍後再試。";
    } finally {
      if (isStillOnVocabRoute()) {
        ui.aiLoading = false;
        render();
      }
    }
  }

  async function triggerDailyAutoVocabIfNeeded() {
    const apiKey = loadGeminiKey();
    const today = getLocalDateString();
    if (!apiKey || state.lastDailyVocabDate === today || attemptedDailyAutoDates.has(today)) {
      return;
    }
    attemptedDailyAutoDates.add(today);
    ui.aiLoading = true;
    ui.aiError = "";
    ui.aiNotice = "正在為今日自動更新 5 個 AI 新單字…";
    render();

    try {
      const allVocab = getCombinedVocab();
      const generated = await generateAiVocab({
        apiKey,
        model: loadGeminiModel(),
        dateStr: today,
        existingList: allVocab,
        count: 5,
        levelFocus: "mixed"
      });
      let addedCount = 0;
      state = updateState((latestState) => {
        const mergeRes = mergeAiVocabList(
          latestState.aiVocabList,
          generated,
          VOCAB_LIST
        );
        addedCount = mergeRes.addedCount;
        return {
          ...latestState,
          aiVocabList: mergeRes.merged,
          lastDailyVocabDate: today
        };
      });

      if (!isStillOnVocabRoute()) return;
      ui.aiNotice =
        addedCount > 0
          ? `今日已自動更新並新增 ${addedCount} 個 AI 新單字（已納入待複習清單）。`
          : "今日自動更新檢查完成，目前無須新增重複單字。";
    } catch (err) {
      attemptedDailyAutoDates.delete(today);
      if (!isStillOnVocabRoute()) return;
      ui.aiNotice = "";
      ui.aiError = `今日自動更新單字暫時失敗：${err?.message || "請稍後手動重試。"}`;
    } finally {
      if (isStillOnVocabRoute()) {
        ui.aiLoading = false;
        render();
      }
    }
  }

  function render() {
    const today = getLocalDateString();
    const allVocab = getCombinedVocab();
    const groups = Array.from(new Set(allVocab.map((v) => v.group)));
    const list = getFilteredList();
    if (ui.index >= list.length) {
      ui.index = 0;
    }
    const current = ui.pinnedCard || list[ui.index] || null;
    if (ui.mode === "quiz" && !ui.pinnedCard) {
      ensureChoiceOptions(current);
    }

    const dueTotal = allVocab.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
    const reviewedCount = allVocab.length - dueTotal;
    const progressPct = allVocab.length > 0 ? Math.round((reviewedCount / allVocab.length) * 100) : 0;
    const apiKey = loadGeminiKey();
    const aiVocabCount = Array.isArray(state.aiVocabList) ? state.aiVocabList.length : 0;

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
        <span class="progress-bar-label">今日已完成 ${reviewedCount} / ${allVocab.length}</span>
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
            <option value="ai" ${ui.statusFilter === "ai" ? "selected" : ""}>AI 生成單字（${aiVocabCount}）</option>
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
        ui.aiNotice
          ? `<div class="notice-box notice-info mb-3">${LUCIDE_ICONS.info}<div class="notice-content">${escapeHtml(ui.aiNotice)}</div></div>`
          : ""
      }

      ${
        ui.aiError
          ? `<div class="notice-box notice-danger mb-3">${LUCIDE_ICONS.x}<div class="notice-content">${escapeHtml(ui.aiError)}</div></div>`
          : ""
      }

      ${
        !current
          ? `
        <section class="card empty-state">
          <h2 class="card-title">目前沒有符合條件的單字</h2>
          <p class="page-desc">${
            ui.statusFilter === "due"
              ? "今日待複習的單字已全部完成，可使用下方 AI 生成新單字補充練習。"
              : ui.statusFilter === "ai"
                ? "目前尚未收錄 AI 生成單字，請使用下方區塊生成新單字。"
                : "請嘗試切換其他分類或學習狀態篩選。"
          }</p>
          <div class="btn-row justify-center">
            <button class="btn btn-primary" type="button" id="vocab-show-all-btn">查看全部單字</button>
          </div>
        </section>
      `
          : renderCard(current, state.vocabProgress[current.id], list.length)
      }

      ${renderAiVocabPanel(apiKey, aiVocabCount, today)}
    `;

    bindEvents(list, current);
  }

  function renderAiVocabPanel(apiKey, aiVocabCount, today) {
    if (!apiKey) {
      return `
        <section class="card card-subtle mt-4">
          <h2 class="section-heading">AI 單字擴充</h2>
          <p class="page-desc">
            設定個人的 Gemini API Key 後，每天開啟單字頁會自動更新 5 個新單字，也可隨時手動生成指定程度與主題的 N4／N3 新單字並永久保存。
          </p>
          <div class="btn-row">
            <button class="btn btn-primary" type="button" id="vocab-go-records-btn">前往設定 API Key</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="card card-subtle mt-4">
        <div class="section-heading-row mt-0 mb-3">
          <div class="section-heading-left">
            ${LUCIDE_ICONS.bookOpen}
            <h2 class="section-heading mt-0">AI 生成新單字</h2>
          </div>
          <span class="section-meta">
            已收錄 ${aiVocabCount} 字・${state.lastDailyVocabDate === today ? "今日已自動更新" : "可手動補充"}
          </span>
        </div>
        <p class="page-desc">
          除了每日自動更新外，可依需求手動生成不重複的 N4／N3 新單字（含讀音、例句與標音），生成後會存入本機清單並納入 1 / 3 / 7 天複習排程。
        </p>

        <div class="filter-bar mt-3 mb-3">
          <div class="filter-group">
            <label class="filter-label" for="vocab-ai-level">程度</label>
            <select id="vocab-ai-level" ${ui.aiLoading ? "disabled" : ""}>
              <option value="mixed" ${ui.aiLevel === "mixed" ? "selected" : ""}>N4＋N3 混合</option>
              <option value="N4" ${ui.aiLevel === "N4" ? "selected" : ""}>N4 單字</option>
              <option value="N3" ${ui.aiLevel === "N3" ? "selected" : ""}>N3 單字</option>
            </select>
          </div>

          <div class="filter-group">
            <label class="filter-label" for="vocab-ai-count">數量</label>
            <select id="vocab-ai-count" ${ui.aiLoading ? "disabled" : ""}>
              <option value="5" ${ui.aiCount === "5" ? "selected" : ""}>5 個</option>
              <option value="10" ${ui.aiCount === "10" ? "selected" : ""}>10 個</option>
            </select>
          </div>
        </div>

        <div>
          <label class="filter-label" for="vocab-ai-topic">主題關鍵字（選填）</label>
          <input
            type="text"
            id="vocab-ai-topic"
            class="mt-2"
            placeholder="例如：旅遊、職場、點餐、情緒表達…"
            value="${escapeHtml(ui.aiTopic)}"
            ${ui.aiLoading ? "disabled" : ""}
          />
        </div>

        <div class="btn-row">
          <button
            class="btn btn-primary"
            type="button"
            id="vocab-generate-ai-btn"
            ${ui.aiLoading ? "disabled" : ""}
          >
            ${ui.aiLoading ? "AI 生成單字中…" : "手動生成 AI 新單字"}
          </button>
        </div>
      </section>
    `;
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

    container.querySelector("#vocab-go-records-btn")?.addEventListener("click", () => {
      navigate?.("records");
    });

    container.querySelector("#vocab-ai-level")?.addEventListener("change", (e) => {
      ui.aiLevel = e.target.value;
    });
    container.querySelector("#vocab-ai-count")?.addEventListener("change", (e) => {
      ui.aiCount = e.target.value;
    });
    container.querySelector("#vocab-ai-topic")?.addEventListener("input", (e) => {
      ui.aiTopic = e.target.value;
    });
    container.querySelector("#vocab-generate-ai-btn")?.addEventListener("click", runManualAiGenerate);

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
  triggerDailyAutoVocabIfNeeded();
  return () => {
    destroyed = true;
  };
}
