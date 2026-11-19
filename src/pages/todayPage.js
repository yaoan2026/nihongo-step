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

function renderHeroIllustration() {
  return `
    <div class="hero-illustration-wrap" aria-hidden="true">
      <svg class="hero-illustration-svg" viewBox="0 0 600 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 天空背景與飄雲 -->
        <rect width="600" height="180" fill="#CBE4F9"/>
        <path d="M24 38H596" stroke="#2B2118" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.22"/>
        <!-- 雲朵 -->
        <path d="M58 58C50 58 44 52 44 45C44 38.5 49 33 55.5 32.2C58 24 65.5 18 74.5 18C85.2 18 94 26.5 94.5 37C100.5 38 105 43.2 105 49.5C105 56.4 99.4 62 92.5 62H58V58Z" fill="#FFFFFF" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M482 54C475 54 470 49 470 43C470 37.5 474 33 479.5 32.2C482 25.5 488.5 21 496 21C505 21 512.5 28 513 36.8C518.5 37.8 522.5 42.3 522.5 47.8C522.5 53.8 517.8 58.5 511.8 58.5H482V54Z" fill="#FFFFFF" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>
        <!-- 太陽 -->
        <circle cx="144" cy="48" r="16" fill="#FAD460" stroke="#2B2118" stroke-width="2.2"/>
        <!-- 遠山與富士山 -->
        <path d="M0 144L82 102L152 144H0Z" fill="#B5E2A8" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M210 144L296 50H328L416 144H210Z" fill="#8CC5E3" stroke="#2B2118" stroke-width="2.4" stroke-linejoin="round"/>
        <path d="M276 72L296 50H328L348 72L334 80L322 72L312 82L300 72L288 80L276 72Z" fill="#FFFFFF" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M406 144L492 98L600 144H406Z" fill="#B5E2A8" stroke="#2B2118" stroke-width="2.2" stroke-linejoin="round"/>
        <!-- 鳥居 -->
        <path d="M448 92H496M453 102H491M462 92V144M482 92V144" stroke="#2B2118" stroke-width="2.4" stroke-linecap="round"/>
        <rect x="446" y="87" width="52" height="6" rx="2" fill="#F6A6A6" stroke="#2B2118" stroke-width="2.2"/>
        <!-- 地面與鐵道 -->
        <rect y="144" width="600" height="36" fill="#FBF7F0"/>
        <line x1="0" y1="144" x2="600" y2="144" stroke="#2B2118" stroke-width="2.4"/>
        <!-- 日系小火車（手帳旅途意象） -->
        <rect x="116" y="122" width="146" height="22" rx="6" fill="#F6A6A6" stroke="#2B2118" stroke-width="2.2"/>
        <rect x="128" y="127" width="20" height="9" rx="2" fill="#FFFFFF" stroke="#2B2118" stroke-width="1.8"/>
        <rect x="156" y="127" width="20" height="9" rx="2" fill="#FFFFFF" stroke="#2B2118" stroke-width="1.8"/>
        <rect x="184" y="127" width="20" height="9" rx="2" fill="#FFFFFF" stroke="#2B2118" stroke-width="1.8"/>
        <rect x="212" y="127" width="20" height="9" rx="2" fill="#FFFFFF" stroke="#2B2118" stroke-width="1.8"/>
        <rect x="240" y="127" width="12" height="9" rx="2" fill="#FAD460" stroke="#2B2118" stroke-width="1.8"/>
        <!-- 學習筆記本 -->
        <rect x="526" y="106" width="46" height="38" rx="5" fill="#FAD460" stroke="#2B2118" stroke-width="2.2"/>
        <line x1="536" y1="116" x2="562" y2="116" stroke="#2B2118" stroke-width="2" stroke-linecap="round"/>
        <line x1="536" y1="124" x2="558" y2="124" stroke="#2B2118" stroke-width="2" stroke-linecap="round"/>
        <line x1="536" y1="132" x2="552" y2="132" stroke="#2B2118" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
  `;
}

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
          desc: "先看日文漢字或例句語境回想意思，再決定是否顯示答案，記憶留存效果最高。",
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
              tag: "步驟 4・錯題檢索強化",
              title: `錯題本還有 ${stats.unresolvedWrongCount} 題待重練`,
              desc: "集中重做曾答錯的題目，比盲目刷大量新題更能突破 N4→N3 盲點。",
              route: "practice",
              params: { wrongOnly: true },
              btnText: "只練錯題"
            }
          : {
              tag: "步驟 3・語境克漏字測驗",
              title: "今日單字與文法已就緒，來做每日 10 題！",
              desc: "在完整句型語境中練習 Cloze 單選題，強化實際閱讀反應速度。",
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
          ? "5 篇文法已全數閱讀"
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

  container.innerHTML = `
    <div class="page-top-row">
      <h2 class="page-title">首頁</h2>
      <span class="jp-clock">日本時間 ${japanTime}</span>
    </div>

    <section class="card hero-card">
      ${renderHeroIllustration()}

      <div class="pill-row">
        <span class="pill pill-coral">N4 → N3 高效衝刺</span>
        <span class="pill pill-green">SRS＋主動回想＋語境輸入</span>
      </div>

      <h3 class="hero-title">日語階梯學習手帳</h3>
      <p class="page-desc">今日日期 ${today}・依照記憶科學安排每日學習循環</p>

      <div class="stat-tiles" aria-label="學習進度統計">
        <div class="stat-tile tile-yellow">
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
        <span class="section-icon-circle coral">${LUCIDE_ICONS.sparkles}</span>
        <h3 class="section-title">今日重點任務</h3>
      </div>
      <span class="section-meta">${priorityTask.tag}</span>
    </div>

    <section class="card card-blush">
      <div class="pill-row">
        <span class="pill pill-yellow">間隔 1 / 3 / 7 天</span>
        <span class="pill pill-green">主動回想優先</span>
        <span class="pill pill-blue">i+1 語境輸入</span>
      </div>
      <h4 class="card-title" style="margin-top: 12px;">${priorityTask.title}</h4>
      <p class="page-desc">${priorityTask.desc}</p>
      <hr class="dashed-divider" />
      <div class="btn-row" style="margin-top: 0;">
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
        <span class="section-icon-circle green">${LUCIDE_ICONS.checkCircle}</span>
        <h3 class="section-title">今日高效檢核</h3>
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
            <span class="pill ${item.done ? "pill-green" : "pill-yellow"}">
              ${item.done ? "已完成" : "要注意"}・${item.detail}
            </span>
          </div>
        `
          )
          .join("")}
      </div>
    </section>

    <div class="section-heading-row">
      <div class="section-heading-left">
        <span class="section-icon-circle blue">${LUCIDE_ICONS.layers}</span>
        <h3 class="section-title">高效學習時間軸</h3>
      </div>
      <span class="section-meta">建議每日 50 分鐘</span>
    </div>

    <div class="timeline-list">
      <div class="timeline-row">
        <div class="timeline-time">10 分</div>
        <div class="timeline-rail">
          <span class="timeline-node ${stats.dueVocabCount === 0 ? "done" : ""}"></span>
        </div>
        <div class="timeline-content">
          <div class="timeline-connector">主動回想・SRS 間隔複習</div>
          <div class="timeline-card">
            <div class="timeline-card-text">
              <div class="timeline-card-title">單字語境回想（待複習 ${stats.dueVocabCount} 字）</div>
              <div class="timeline-card-sub">先不看選項直接回想讀音與意思，依熟練度排 1/3/7 天後複習</div>
            </div>
            <button class="btn btn-pill-sm btn-yellow" type="button" data-go="vocab">開始</button>
          </div>
        </div>
      </div>

      <div class="timeline-row">
        <div class="timeline-time">15 分</div>
        <div class="timeline-rail">
          <span class="timeline-node ${stats.unreadGrammarCount === 0 ? "done" : ""}"></span>
        </div>
        <div class="timeline-content">
          <div class="timeline-connector">i+1 理解輸入・主動輸出</div>
          <div class="timeline-card">
            <div class="timeline-card-text">
              <div class="timeline-card-title">文法筆記＋造句輸出（未讀 ${stats.unreadGrammarCount} 篇）</div>
              <div class="timeline-card-sub">理解接續差異後，親手寫 1 句自己的例句保存或給 AI 批改</div>
            </div>
            <button class="btn btn-pill-sm" type="button" data-go="grammar">閱讀</button>
          </div>
        </div>
      </div>

      <div class="timeline-row">
        <div class="timeline-time">15 分</div>
        <div class="timeline-rail">
          <span class="timeline-node ${stats.todayQuizDoneCount > 0 ? "done" : ""}"></span>
        </div>
        <div class="timeline-content">
          <div class="timeline-connector">Cloze 語境克漏字測驗</div>
          <div class="timeline-card">
            <div class="timeline-card-text">
              <div class="timeline-card-title">每日 10 題／AI 新題（已答對 ${stats.totalCorrect} 題）</div>
              <div class="timeline-card-sub">在完整日文句子中判斷助詞、動詞搭配與語氣</div>
            </div>
            <button class="btn btn-pill-sm" type="button" data-go="practice">測驗</button>
          </div>
        </div>
      </div>

      <div class="timeline-row">
        <div class="timeline-time">10 分</div>
        <div class="timeline-rail">
          <span class="timeline-node ${stats.unresolvedWrongCount === 0 ? "done" : ""}"></span>
        </div>
        <div class="timeline-content">
          <div class="timeline-connector">錯題檢索強化</div>
          <div class="timeline-card">
            <div class="timeline-card-text">
              <div class="timeline-card-title">錯題本專攻（待重練 ${stats.unresolvedWrongCount} 題）</div>
              <div class="timeline-card-sub">重複修正易混淆選項，答對後仍保留歷史紀錄</div>
            </div>
            <button class="btn btn-pill-sm" type="button" data-go="practice-wrong" ${stats.wrongTotalCount === 0 ? "disabled" : ""}>重練</button>
          </div>
        </div>
      </div>
    </div>

    <section class="notice-box notice-info" style="margin-top: 24px;">
      ${LUCIDE_ICONS.info}
      <div class="notice-content">
        <strong>教材與儲存說明</strong><br />
        1. ${STUDY_CONFIG.disclaimer.contentNotice}<br />
        2. ${STUDY_CONFIG.disclaimer.storageNotice}
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
