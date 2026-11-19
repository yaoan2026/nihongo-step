import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import { QUIZ_LIST } from "../data/quizzes.js";
import {
  computeStudyReadiness,
  getJapanTimeString,
  getLocalDateString
} from "../core/studyLogic.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderTodayPage(container, { state, navigate }) {
  const today = getLocalDateString();
  const japanTime = getJapanTimeString();
  const stats = computeStudyReadiness({
    state,
    vocabList: VOCAB_LIST,
    grammarList: GRAMMAR_LIST,
    quizList: QUIZ_LIST,
    todayStr: today
  });

  const priorityTask =
    stats.dueVocabCount > 0
      ? {
          tag: "步驟 1・SRS 到期複習",
          title: `還有 ${stats.dueVocabCount} 個單字待主動回想`,
          desc: "先看日文漢字或例句語境回想讀音與詞義，再顯示答案確認。",
          route: "vocab",
          params: {},
          btnText: "開始複習單字"
        }
      : stats.unreadGrammarCount > 0
        ? {
            tag: "步驟 2・語境理解輸入",
            title: `尚有 ${stats.unreadGrammarCount} 篇文法筆記未讀`,
            desc: "透過例句理解接續與語感差異，並試著在筆記區造一句自己的例句。",
            route: "grammar",
            params: {},
            btnText: "前往文法筆記"
          }
        : stats.unresolvedWrongCount > 0
          ? {
              tag: "步驟 4・錯題重練",
              title: `錯題本尚有 ${stats.unresolvedWrongCount} 題待重練`,
              desc: "集中重做曾答錯的題目，釐清容易混淆的 N4→N3 語法與詞彙細節。",
              route: "practice",
              params: { wrongOnly: true },
              btnText: "重練錯題"
            }
          : {
              tag: "步驟 3・克漏字測驗",
              title: "今日單字與文法已就緒，可開始每日 10 題",
              desc: "在完整句型語境中練習 Cloze 單選題，培養實際閱讀反應。",
              route: "practice",
              params: {},
              btnText: "開始每日測驗"
            };

  const checklistItems = [
    {
      label: "今日 SRS 到期單字複習",
      detail:
        stats.dueVocabCount === 0
          ? "今日到期單字已全數完成"
          : `已複習 ${stats.todayVocabDoneCount} 字，尚餘 ${stats.dueVocabCount} 字`,
      done: stats.dueVocabCount === 0
    },
    {
      label: "閱讀並練習 N4→N3 文法例句",
      detail:
        stats.unreadGrammarCount === 0
          ? `${GRAMMAR_LIST.length} 篇文法已全數閱讀`
          : `已讀 ${stats.readGrammarCount} / ${GRAMMAR_LIST.length} 篇`,
      done: stats.unreadGrammarCount === 0
    },
    {
      label: "完成今日語境克漏字練習",
      detail:
        stats.todayQuizDoneCount > 0
          ? `今日已作答 ${stats.todayQuizDoneCount} 題`
          : "今日尚未進行單選練習",
      done: stats.todayQuizDoneCount > 0
    },
    {
      label: "檢索重練錯題本",
      detail:
        stats.wrongTotalCount === 0
          ? "目前沒有未解決錯題"
          : stats.unresolvedWrongCount === 0
            ? "曾錯題目近期皆已答對"
            : `還有 ${stats.unresolvedWrongCount} 題待重新答對`,
      done: stats.unresolvedWrongCount === 0
    }
  ];
  const checklistDoneCount = checklistItems.filter((item) => item.done).length;

  const routineSteps = [
    {
      time: "10 分",
      done: stats.dueVocabCount === 0,
      title: `單字語境回想（待複習 ${stats.dueVocabCount} 字）`,
      sub: "先不看選項直接回想讀音與意思，依熟練度排 1 / 3 / 7 天後複習",
      go: "vocab",
      btnText: "開始",
      disabled: false
    },
    {
      time: "15 分",
      done: stats.unreadGrammarCount === 0,
      title: `文法筆記與造句（未讀 ${stats.unreadGrammarCount} 篇）`,
      sub: "理解接續差異後，寫 1 句自己的例句保存或請 AI 批改",
      go: "grammar",
      btnText: "閱讀",
      disabled: false
    },
    {
      time: "15 分",
      done: stats.todayQuizDoneCount > 0,
      title: `每日 10 題／AI 新題（已答對 ${stats.totalCorrect} 題）`,
      sub: "在完整日文句子中練習助詞、動詞搭配與語氣",
      go: "practice",
      btnText: "測驗",
      disabled: false
    },
    {
      time: "10 分",
      done: stats.unresolvedWrongCount === 0,
      title: `錯題本專攻（待重練 ${stats.unresolvedWrongCount} 題）`,
      sub: "重複修正易混淆選項，答對後仍保留歷史紀錄",
      go: "practice-wrong",
      btnText: "重練",
      disabled: stats.wrongTotalCount === 0
    }
  ];

  container.innerHTML = `
    <div class="page-top-row">
      <h1 class="page-title">首頁</h1>
      <span class="jp-clock">日本時間 ${japanTime}</span>
    </div>

    <section class="card hero-card">
      <div class="badge-row">
        <span class="badge badge-accent">N4 → N3 學習手帳</span>
      </div>
      <h2 class="hero-title mt-2">日語階梯每日進度</h2>
      <p class="page-desc">${today}・間隔複習、語境輸入與錯題檢索</p>

      <div class="stat-tiles" aria-label="學習進度統計">
        <div class="stat-tile is-accent">
          <div class="stat-tile-value">${stats.n3ProgressPct}%</div>
          <div class="stat-tile-label">N3 進度</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-value">${stats.dueVocabCount}</div>
          <div class="stat-tile-label">待複習字</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-value">${stats.unreadGrammarCount}</div>
          <div class="stat-tile-label">未讀文法</div>
        </div>
        <div class="stat-tile">
          <div class="stat-tile-value">${stats.unresolvedWrongCount}</div>
          <div class="stat-tile-label">待修錯題</div>
        </div>
      </div>

      <div class="progress-row" aria-label="距離 N3 目標進度條">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${stats.n3ProgressPct}%;"></div>
        </div>
        <span class="progress-bar-label">距離 N3 ${stats.n3ProgressPct}%</span>
      </div>
    </section>

    <div class="section-heading-row">
      <div class="section-heading-left">
        ${LUCIDE_ICONS.compass}
        <h2 class="section-title">今日重點任務</h2>
      </div>
      <span class="section-meta">${priorityTask.tag}</span>
    </div>

    <section class="card card-subtle">
      <h3 class="card-title">${priorityTask.title}</h3>
      <p class="page-desc">${priorityTask.desc}</p>
      <hr class="divider" />
      <div class="btn-row mt-0">
        <button class="btn btn-primary" type="button" id="priority-go-btn">
          <span>${priorityTask.btnText}</span>
          ${LUCIDE_ICONS.arrowRight}
        </button>
        <button class="btn" type="button" data-go="practice-wrong" ${stats.wrongTotalCount === 0 ? "disabled" : ""}>
          錯題重練（${stats.wrongTotalCount}）
        </button>
      </div>
    </section>

    <div class="section-heading-row">
      <div class="section-heading-left">
        ${LUCIDE_ICONS.checkCircle}
        <h2 class="section-title">今日學習檢核</h2>
      </div>
      <span class="section-meta">已完成 ${checklistDoneCount} / ${checklistItems.length}</span>
    </div>

    <section class="card">
      <div class="checklist">
        ${checklistItems
          .map(
            (item) => `
          <div class="checklist-item ${item.done ? "is-done" : ""}">
            <div class="checklist-left">
              ${item.done ? LUCIDE_ICONS.check : LUCIDE_ICONS.clock}
              <span>${item.label}</span>
            </div>
            <span class="checklist-detail">
              ${item.done ? "已完成" : "待進行"}・${item.detail}
            </span>
          </div>
        `
          )
          .join("")}
      </div>
    </section>

    <div class="section-heading-row">
      <div class="section-heading-left">
        ${LUCIDE_ICONS.layers}
        <h2 class="section-title">每日學習節奏</h2>
      </div>
      <span class="section-meta">建議每日 50 分鐘</span>
    </div>

    <div class="step-list">
      ${routineSteps
        .map(
          (step) => `
        <div class="step-row ${step.done ? "is-done" : ""}">
          <div class="step-time">${step.time}</div>
          <div class="step-body">
            <div class="step-title">${step.title}</div>
            <div class="step-sub">${step.sub}</div>
          </div>
          <button
            class="btn btn-sm"
            type="button"
            data-go="${step.go}"
            ${step.disabled ? "disabled" : ""}
          >
            ${step.btnText}
          </button>
        </div>
      `
        )
        .join("")}
    </div>

    <section class="notice-box notice-info mt-4">
      ${LUCIDE_ICONS.info}
      <div class="notice-content">
        <p><strong>教材與儲存說明</strong></p>
        <p>1. ${STUDY_CONFIG.disclaimer.contentNotice}</p>
        <p>2. ${STUDY_CONFIG.disclaimer.storageNotice}</p>
      </div>
    </section>
  `;

  container.querySelector("#priority-go-btn")?.addEventListener("click", () => {
    navigate(priorityTask.route, priorityTask.params);
  });

  container.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      if (target === "practice-wrong") {
        navigate("practice", { wrongOnly: true });
      } else {
        navigate(target);
      }
    });
  });
}
