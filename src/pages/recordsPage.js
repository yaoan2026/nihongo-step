import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import {
  exportStateJson,
  validateImportPayload,
  applyImportedState,
  resetState
} from "../core/storage.js";
import { getAllVocabList, getLocalDateString } from "../core/studyLogic.js";
import { escapeHtml, renderRubyText } from "../core/dom.js";
import { LUCIDE_ICONS } from "../core/icons.js";
import {
  DEFAULT_GEMINI_MODEL,
  PRESET_GEMINI_MODELS,
  fetchAvailableGeminiModels,
  loadGeminiKey,
  loadGeminiModel,
  saveGeminiKey,
  saveGeminiModel
} from "../core/geminiAi.js";

export function renderRecordsPage(container, { state, updateState }) {
  const ui = {
    importPreview: null,
    importError: "",
    statusMessage: "",
    aiStatusMessage: "",
    aiErrorMessage: "",
    aiDetecting: false,
    detectedModels: null,
    confirmReset: false
  };

  function render() {
    const allVocab = getAllVocabList(VOCAB_LIST, state.aiVocabList);
    const vocabAssessed = allVocab.filter((v) => Boolean(state.vocabProgress?.[v.id])).length;
    const vocabFamiliar = allVocab.filter(
      (v) => state.vocabProgress?.[v.id]?.familiarity === "familiar"
    ).length;
    const grammarRead = Object.values(state.grammarProgress || {}).filter((g) => g?.isRead).length;
    const totalAnswered = state.quizStats?.totalAnswered || 0;
    const totalCorrect = state.quizStats?.totalCorrect || 0;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const wrongCount = Object.keys(state.wrongBook || {}).length;
    const savedKey = loadGeminiKey();
    const savedModel = loadGeminiModel();
    const modelOptions = Array.from(
      new Set([...(ui.detectedModels || []), ...PRESET_GEMINI_MODELS, savedModel])
    );

    container.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">學習紀錄與設定</h1>
        <p class="page-desc">管理本機瀏覽器學習進度、Gemini AI 設定與 JSON 備份還原。</p>
      </div>

      <section class="notice-box notice-warning mb-3">
        ${LUCIDE_ICONS.alertTriangle}
        <div class="notice-content">
          <strong>本機資料保存提醒：</strong>${escapeHtml(STUDY_CONFIG.disclaimer.storageNotice)}
        </div>
      </section>

      <section class="card">
        <h2 class="section-heading">學習統計</h2>
        <div class="stat-tiles">
          <div class="stat-tile is-accent">
            <div class="stat-tile-value">${vocabAssessed}/${allVocab.length}</div>
            <div class="stat-tile-label">單字已評估</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">${vocabFamiliar}</div>
            <div class="stat-tile-label">熟悉單字</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">${grammarRead}/${GRAMMAR_LIST.length}</div>
            <div class="stat-tile-label">文法已讀</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">${accuracy}%</div>
            <div class="stat-tile-label">測驗正確率</div>
          </div>
        </div>
        <p class="flashcard-meta mt-3">
          累計作答：${totalCorrect} / ${totalAnswered} 題｜錯題本：${wrongCount} 題
        </p>
      </section>

      <section class="card card-subtle">
        <h2 class="section-heading">Gemini AI 設定</h2>
        <p class="page-desc">
          填入個人 Gemini API Key 後，即可在「練習」與「文法」頁使用 AI 出題、題目解析與造句確認。API Key 僅保存於目前瀏覽器，不會包含於匯出的 JSON 備份檔中。
        </p>

        <div class="stack mt-3">
          <div>
            <label class="filter-label" for="gemini-key-input">Gemini API Key（狀態：${savedKey ? "已設定" : "未設定"}）</label>
            <input
              type="password"
              id="gemini-key-input"
              class="mt-2"
              placeholder="貼上 AIza... API Key"
              value="${escapeHtml(savedKey)}"
              autocomplete="off"
            />
          </div>

          <div>
            <label class="filter-label" for="gemini-model-select">模型選擇</label>
            <div class="filter-group mt-2">
              <select id="gemini-model-select">
                ${modelOptions
                  .map(
                    (m) =>
                      `<option value="${escapeHtml(m)}" ${savedModel === m ? "selected" : ""}>${escapeHtml(m)}${m === DEFAULT_GEMINI_MODEL ? "（預設）" : ""}</option>`
                  )
                  .join("")}
              </select>
              <button class="btn" type="button" id="detect-models-btn" ${ui.aiDetecting ? "disabled" : ""}>
                ${ui.aiDetecting ? "偵測中…" : "自動偵測可用模型"}
              </button>
            </div>
          </div>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="save-gemini-btn">儲存 AI 設定</button>
          <button class="btn" type="button" id="clear-gemini-btn" ${savedKey ? "" : "disabled"}>清除 API Key</button>
        </div>

        ${
          ui.aiErrorMessage
            ? `
          <div class="notice-box notice-danger mt-3">
            ${LUCIDE_ICONS.x}
            <div class="notice-content">${escapeHtml(ui.aiErrorMessage)}</div>
          </div>
        `
            : ""
        }

        ${
          ui.aiStatusMessage
            ? `
          <div class="notice-box notice-success mt-3">
            ${LUCIDE_ICONS.check}
            <div class="notice-content"><strong>${escapeHtml(ui.aiStatusMessage)}</strong></div>
          </div>
        `
            : ""
        }
      </section>

      <section class="card">
        <h2 class="section-heading">JSON 匯出與匯入</h2>
        <p class="page-desc">匯入時會驗證 JSON 格式與版本（目前支援 v${STUDY_CONFIG.schemaVersion}），經確認後才會寫入；若格式不符，原有紀錄不受影響。</p>

        <div class="btn-row">
          <button class="btn ${ui.importPreview ? "" : "btn-primary"}" type="button" id="export-json-btn">匯出 JSON 備份</button>
        </div>

        <div class="card-divider">
          <label class="filter-label" for="import-json-input">選擇要匯入的 JSON 備份檔</label>
          <input type="file" id="import-json-input" accept=".json,application/json" class="mt-2" />
        </div>

        ${
          ui.importError
            ? `
          <div class="notice-box notice-danger mt-3">
            ${LUCIDE_ICONS.x}
            <div class="notice-content"><strong>匯入失敗：</strong>${escapeHtml(ui.importError)}</div>
          </div>
        `
            : ""
        }

        ${
          ui.importPreview
            ? `
          <div class="notice-box notice-warning mt-3">
            ${LUCIDE_ICONS.alertTriangle}
            <div class="notice-content">
              <strong>確認覆蓋目前紀錄：</strong><br />
              備份時間：${escapeHtml(ui.importPreview.summary.exportedAt)}<br />
              單字：${ui.importPreview.summary.vocabCount} 筆｜已讀文法：${ui.importPreview.summary.grammarReadCount} 篇｜作答：${ui.importPreview.summary.totalAnswered} 題｜錯題：${ui.importPreview.summary.wrongBookCount} 題
              <div class="btn-row">
                <button class="btn btn-primary" type="button" id="confirm-import-btn">確認匯入並覆蓋</button>
                <button class="btn" type="button" id="cancel-import-btn">取消</button>
              </div>
            </div>
          </div>
        `
            : ""
        }

        ${
          ui.statusMessage
            ? `
          <div class="notice-box notice-success mt-3">
            ${LUCIDE_ICONS.check}
            <div class="notice-content"><strong>${escapeHtml(ui.statusMessage)}</strong></div>
          </div>
        `
            : ""
        }
      </section>

      <section class="card">
        <h2 class="section-heading">作答歷史紀錄</h2>
        <p class="page-desc">跨日保留於目前瀏覽器（最多保留 200 筆，顯示最新 20 筆）。</p>
        ${
          !state.quizHistory || state.quizHistory.length === 0
            ? `<p class="page-desc mt-2">目前尚無作答紀錄。</p>`
            : `
          <div class="stack mt-3">
            ${state.quizHistory
              .slice(0, 20)
              .map((h) => {
                const timeText = h.answeredAt
                  ? new Date(h.answeredAt).toLocaleString("zh-TW", { hour12: false })
                  : "未知";
                return `
                  <div class="entry-item ${h.isCorrect ? "is-correct" : ""}">
                    <div class="badge-row">
                      <span class="badge ${h.isCorrect ? "badge-correct" : "badge-incorrect"}">
                        ${h.isCorrect ? `${LUCIDE_ICONS.check}<span>答對</span>` : `${LUCIDE_ICONS.x}<span>答錯</span>`}
                      </span>
                      <span class="flashcard-meta mt-0">${escapeHtml(h.questionId)}・${escapeHtml(timeText)}</span>
                    </div>
                    <div class="flashcard-meta">選擇：<span lang="ja">${renderRubyText(h.selectedOptionText)}</span></div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
        }
      </section>

      <section class="card">
        <h2 class="section-heading text-danger">重設學習紀錄</h2>
        <p class="page-desc">清除目前瀏覽器內所有的單字進度、文法閱讀與筆記、練習統計與錯題本。</p>

        ${
          !ui.confirmReset
            ? `<div class="btn-row"><button class="btn" type="button" id="ask-reset-btn">重設所有學習紀錄</button></div>`
            : `
          <div class="notice-box notice-danger mt-3">
            ${LUCIDE_ICONS.alertTriangle}
            <div class="notice-content">
              <strong>確定要清空所有學習紀錄嗎？此動作無法復原。</strong>
              <div class="btn-row">
                <button class="btn btn-danger" type="button" id="confirm-reset-btn">確定重設</button>
                <button class="btn" type="button" id="cancel-reset-btn">取消</button>
              </div>
            </div>
          </div>
        `
        }
      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector("#detect-models-btn")?.addEventListener("click", async () => {
      const keyInput = container.querySelector("#gemini-key-input");
      const keyVal = keyInput?.value?.trim() || loadGeminiKey();
      ui.aiDetecting = true;
      ui.aiErrorMessage = "";
      ui.aiStatusMessage = "";
      render();
      try {
        saveGeminiKey(keyVal);
        const list = await fetchAvailableGeminiModels(keyVal);
        ui.detectedModels = list;
        if (list.length > 0 && !list.includes(loadGeminiModel())) {
          const preferred = list.find((m) => m.includes("flash")) || list[0];
          saveGeminiModel(preferred);
        }
        ui.aiStatusMessage = `已偵測到 ${list.length} 個可用模型，請確認下拉選單後按「儲存 AI 設定」。`;
      } catch (err) {
        ui.aiErrorMessage = err?.message || "偵測失敗，請檢查 API Key。";
      } finally {
        ui.aiDetecting = false;
        render();
      }
    });

    container.querySelector("#save-gemini-btn")?.addEventListener("click", () => {
      const keyInput = container.querySelector("#gemini-key-input");
      const modelSelect = container.querySelector("#gemini-model-select");
      saveGeminiKey(keyInput?.value || "");
      saveGeminiModel(modelSelect?.value || DEFAULT_GEMINI_MODEL);
      ui.aiErrorMessage = "";
      ui.aiStatusMessage = loadGeminiKey()
        ? `已儲存 Gemini API Key 與模型（${loadGeminiModel()}），可前往練習頁開啟 AI 模式。`
        : "已清除 Gemini API Key。";
      render();
    });

    container.querySelector("#clear-gemini-btn")?.addEventListener("click", () => {
      saveGeminiKey("");
      ui.aiStatusMessage = "已清除 Gemini API Key。";
      render();
    });

    container.querySelector("#export-json-btn")?.addEventListener("click", () => {
      const jsonText = exportStateJson(state);
      const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nihongo-step-backup-${getLocalDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      ui.statusMessage = "已匯出 JSON 備份檔。";
      ui.importError = "";
      render();
    });

    container.querySelector("#import-json-input")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      ui.statusMessage = "";
      try {
        const text = await file.text();
        const check = validateImportPayload(text, STUDY_CONFIG.schemaVersion);
        if (!check.ok) {
          ui.importPreview = null;
          ui.importError = check.error;
        } else {
          ui.importError = "";
          ui.importPreview = check;
        }
      } catch {
        ui.importPreview = null;
        ui.importError = "讀取檔案時發生錯誤，原本的學習紀錄未受影響。";
      }
      render();
    });

    container.querySelector("#confirm-import-btn")?.addEventListener("click", () => {
      if (!ui.importPreview) return;
      state = updateState(applyImportedState(ui.importPreview.data));
      ui.importPreview = null;
      ui.importError = "";
      ui.statusMessage = "已成功匯入並還原學習紀錄。";
      render();
    });

    container.querySelector("#cancel-import-btn")?.addEventListener("click", () => {
      ui.importPreview = null;
      ui.importError = "";
      render();
    });

    container.querySelector("#ask-reset-btn")?.addEventListener("click", () => {
      ui.confirmReset = true;
      render();
    });

    container.querySelector("#cancel-reset-btn")?.addEventListener("click", () => {
      ui.confirmReset = false;
      render();
    });

    container.querySelector("#confirm-reset-btn")?.addEventListener("click", () => {
      state = updateState(resetState());
      ui.confirmReset = false;
      ui.statusMessage = "已重設所有學習紀錄。";
      render();
    });
  }

  render();
}
