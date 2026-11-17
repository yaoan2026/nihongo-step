import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import {
  exportStateJson,
  validateImportPayload,
  applyImportedState,
  resetState
} from "../core/storage.js";
import { getLocalDateString } from "../core/studyLogic.js";
import { escapeHtml, renderRubyText } from "../core/dom.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderRecordsPage(container, { state, updateState }) {
  const ui = {
    importPreview: null,
    importError: "",
    statusMessage: "",
    confirmReset: false
  };

  function render() {
    const vocabAssessed = Object.keys(state.vocabProgress || {}).length;
    const vocabFamiliar = Object.values(state.vocabProgress || {}).filter(
      (v) => v?.familiarity === "familiar"
    ).length;
    const grammarRead = Object.values(state.grammarProgress || {}).filter((g) => g?.isRead).length;
    const totalAnswered = state.quizStats?.totalAnswered || 0;
    const totalCorrect = state.quizStats?.totalCorrect || 0;
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const wrongCount = Object.keys(state.wrongBook || {}).length;

    container.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">學習紀錄與設定</h2>
        <p class="page-desc">管理本機瀏覽器學習進度、匯出 JSON 備份或從備份還原。</p>
      </div>

      <section class="notice-box notice-warning">
        ${LUCIDE_ICONS.alertTriangle}
        <div class="notice-content">
          <strong>本機資料保存提醒：</strong>${escapeHtml(STUDY_CONFIG.disclaimer.storageNotice)}
        </div>
      </section>

      <section class="card" style="margin-top: 16px;">
        <h3 class="section-heading">目前學習統計</h3>
        <div class="grid-2">
          <div class="example-box">
            <div><strong>單字已評估：</strong>${vocabAssessed} / ${VOCAB_LIST.length} 個</div>
            <div><strong>已標記熟悉：</strong>${vocabFamiliar} 個</div>
          </div>
          <div class="example-box">
            <div><strong>文法已閱讀：</strong>${grammarRead} / ${GRAMMAR_LIST.length} 篇</div>
            <div><strong>練習累計：</strong>答對 ${totalCorrect} / ${totalAnswered} 題（正確率 ${accuracy}%）｜錯題紀錄 ${wrongCount} 題</div>
          </div>
        </div>
      </section>

      <section class="card">
        <h3 class="section-heading">JSON 匯出與匯入</h3>
        <p class="page-desc">匯入時會先檢查 JSON 格式與版本（目前支援 v${STUDY_CONFIG.schemaVersion}），驗證通過並經您確認後才會寫入；若檔案損壞，原紀錄不會受到影響。</p>

        <div class="btn-row">
          <button class="btn btn-primary" type="button" id="export-json-btn">匯出 JSON 備份</button>
        </div>

        <div class="card-divider">
          <label class="filter-label" for="import-json-input">選擇要匯入的 JSON 備份檔：</label><br />
          <input type="file" id="import-json-input" accept=".json,application/json" style="margin-top: 8px;" />
        </div>

        ${
          ui.importError
            ? `
          <div class="notice-box notice-danger" style="margin-top: 12px;">
            ${LUCIDE_ICONS.x}
            <div class="notice-content"><strong>匯入失敗：</strong>${escapeHtml(ui.importError)}</div>
          </div>
        `
            : ""
        }

        ${
          ui.importPreview
            ? `
          <div class="notice-box notice-warning" style="margin-top: 12px;">
            ${LUCIDE_ICONS.alertTriangle}
            <div class="notice-content">
              <strong>請確認是否覆蓋目前紀錄：</strong><br />
              備份時間：${escapeHtml(ui.importPreview.summary.exportedAt)}<br />
              單字紀錄：${ui.importPreview.summary.vocabCount} 筆｜已讀文法：${ui.importPreview.summary.grammarReadCount} 篇｜累計作答：${ui.importPreview.summary.totalAnswered} 題｜錯題紀錄：${ui.importPreview.summary.wrongBookCount} 題
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
          <div class="notice-box notice-success" style="margin-top: 12px;">
            ${LUCIDE_ICONS.check}
            <div class="notice-content"><strong>${escapeHtml(ui.statusMessage)}</strong></div>
          </div>
        `
            : ""
        }
      </section>

      <section class="card">
        <h3 class="section-heading">全部作答歷史紀錄（永久保存於此瀏覽器）</h3>
        <p class="page-desc">每次作答皆會跨日保留（最近保留最多 200 筆）。</p>
        ${
          !state.quizHistory || state.quizHistory.length === 0
            ? `<p class="page-desc">目前尚無作答紀錄。</p>`
            : `
          <div class="stack">
            ${state.quizHistory
              .slice(0, 20)
              .map((h) => {
                const timeText = h.answeredAt
                  ? new Date(h.answeredAt).toLocaleString("zh-TW", { hour12: false })
                  : "未知";
                return `
                  <div class="example-box">
                    <div class="badge-row">
                      <span class="badge">${escapeHtml(h.questionId)}</span>
                      <span class="badge ${h.isCorrect ? "badge-success" : "badge-danger"}">
                        ${h.isCorrect ? `${LUCIDE_ICONS.check}<span>答對</span>` : `${LUCIDE_ICONS.x}<span>答錯</span>`}
                      </span>
                      <span class="badge">${escapeHtml(timeText)}</span>
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
        <h3 class="section-heading" style="color: var(--danger);">重設學習紀錄</h3>
        <p class="page-desc">將清除目前瀏覽器內所有的單字進度、文法閱讀狀態、練習統計與錯題本。</p>

        ${
          !ui.confirmReset
            ? `<div class="btn-row"><button class="btn btn-danger" type="button" id="ask-reset-btn">重設所有學習紀錄</button></div>`
            : `
          <div class="notice-box notice-danger" style="margin-top: 12px;">
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
