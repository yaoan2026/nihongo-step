import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import { QUIZ_LIST } from "../data/quizzes.js";
import {
  computeStudyReadiness,
  getAllGrammarList,
  getAllVocabList,
  getJapanTimeString,
  getLocalDateString
} from "../core/studyLogic.js";
import { LUCIDE_ICONS } from "../core/icons.js";

function renderHeroIllustration() {
  return `
    <div class="hero-illustration-wrap" aria-hidden="true">
      <svg class="hero-illustration-svg" viewBox="0 0 600 164" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="600" height="164" fill="var(--illus-sky)"/>
        <path d="M24 34H576" stroke="var(--illus-stroke)" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.22"/>
        <!-- 雲朵 -->
        <path d="M56 54C49 54 43 49 43 42C43 36 47.5 31 53.5 30.2C56 22.5 63 17 71.5 17C81.5 17 89.8 25 90.3 34.8C96 35.8 100 40.8 100 46.8C100 53.2 94.8 58 88.5 58H56V54Z" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M484 50C477.5 50 472.5 45.2 472.5 39.5C472.5 34.2 476.3 29.8 481.5 29C483.8 22.5 490 18 497.2 18C505.8 18 513 24.8 513.5 33.2C518.8 34.2 522.5 38.5 522.5 43.8C522.5 49.5 518 54 512.2 54H484V50Z" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <!-- 太陽／月亮 -->
        <circle cx="142" cy="44" r="14" fill="var(--illus-sun)" stroke="var(--illus-stroke)" stroke-width="1.8"/>
        <!-- 遠山與富士山 -->
        <path d="M0 132L84 92L156 132H0Z" fill="var(--illus-hill)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M212 132L294 46H326L410 132H212Z" fill="var(--illus-fuji)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M275 67L294 46H326L345 67L332 74L320 67L310 76L299 67L287 74L275 67Z" fill="var(--illus-snow)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M402 132L492 88L600 132H402Z" fill="var(--illus-hill)" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linejoin="round"/>
        <!-- 鳥居 -->
        <path d="M450 84H494M455 93H489M463 84V132M481 84V132" stroke="var(--illus-stroke)" stroke-width="1.8" stroke-linecap="round"/>
        <rect x="448" y="79" width="48" height="5.5" rx="2" fill="var(--illus-accent)" stroke="var(--illus-stroke)" stroke-width="1.8"/>
        <!-- 地面線 -->
        <rect y="132" width="600" height="32" fill="var(--illus-ground)"/>
        <line x1="0" y1="132" x2="600" y2="132" stroke="var(--illus-stroke)" stroke-width="1.8"/>
        <!-- 日系小火車 -->
        <rect x="118" y="112" width="136" height="20" rx="5" fill="var(--illus-accent)" stroke="var(--illus-stroke)" stroke-width="1.8"/>
        <rect x="129" y="117" width="18" height="8" rx="1.5" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.5"/>
        <rect x="155" y="117" width="18" height="8" rx="1.5" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.5"/>
        <rect x="181" y="117" width="18" height="8" rx="1.5" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.5"/>
        <rect x="207" y="117" width="18" height="8" rx="1.5" fill="var(--illus-cloud)" stroke="var(--illus-stroke)" stroke-width="1.5"/>
        <rect x="233" y="117" width="11" height="8" rx="1.5" fill="var(--illus-sun)" stroke="var(--illus-stroke)" stroke-width="1.5"/>
      </svg>
    </div>
  `;
}

export function renderTodayPage(container, { state, navigate }) {
  const today = getLocalDateString();
  const japanTime = getJapanTimeString();
  const allVocab = getAllVocabList(VOCAB_LIST, state.aiVocabList);
  const allGrammar = getAllGrammarList(GRAMMAR_LIST, state.aiGrammarList);
  const stats = computeStudyReadiness({
    state,
    vocabList: allVocab,
    grammarList: allGrammar,
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
          ? `${allGrammar.length} 篇文法已全數閱讀`
          : `已讀 ${stats.readGrammarCount} / ${allGrammar.length} 篇`,
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
      ${renderHeroIllustration()}

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
