import { STUDY_CONFIG } from "../config/studyConfig.js";
import { VOCAB_LIST } from "../data/vocab.js";
import { GRAMMAR_LIST } from "../data/grammar.js";
import { QUIZ_LIST } from "../data/quizzes.js";
import { getLocalDateString, isVocabDue } from "../core/studyLogic.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderTodayPage(container, { state, navigate }) {
  const today = getLocalDateString();

  const n4Vocab = VOCAB_LIST.filter((v) => v.levelCategory === "N4");
  const n3Vocab = VOCAB_LIST.filter((v) => v.levelCategory === "N3");
  const n4Due = n4Vocab.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
  const n3Due = n3Vocab.filter((v) => isVocabDue(state.vocabProgress[v.id], today)).length;
  const totalDue = n4Due + n3Due;

  const n4Grammar = GRAMMAR_LIST.filter((g) => g.levelCategory === "N4");
  const n3Grammar = GRAMMAR_LIST.filter((g) => g.levelCategory === "N3");
  const n4Unread = n4Grammar.filter((g) => !state.grammarProgress[g.id]?.isRead).length;
  const n3Unread = n3Grammar.filter((g) => !state.grammarProgress[g.id]?.isRead).length;

  const wrongEntries = Object.values(state.wrongBook || {});
  const unresolvedWrongCount = wrongEntries.filter((w) => !w.lastIsCorrect).length;

  const vocabReviewedCount = Object.keys(state.vocabProgress || {}).length;
  const vocabFamiliarCount = Object.values(state.vocabProgress || {}).filter(
    (v) => v?.familiarity === "familiar"
  ).length;
  const grammarReadCount = Object.values(state.grammarProgress || {}).filter((g) => g?.isRead).length;
  const totalCorrect = state.quizStats?.totalCorrect || 0;
  const totalXp = vocabReviewedCount * 10 + grammarReadCount * 15 + totalCorrect * 10;

  // 距離 N3 綜合進度（單字 40% + 文法 30% + 測驗答對 30%，以題庫 40 題為基準）
  const vocabRatio = VOCAB_LIST.length > 0 ? Math.min(1, vocabReviewedCount / VOCAB_LIST.length) : 0;
  const grammarRatio = GRAMMAR_LIST.length > 0 ? Math.min(1, grammarReadCount / GRAMMAR_LIST.length) : 0;
  const quizRatio = QUIZ_LIST.length > 0 ? Math.min(1, totalCorrect / QUIZ_LIST.length) : 0;
  const n3ProgressPct = Math.round((vocabRatio * 0.4 + grammarRatio * 0.3 + quizRatio * 0.3) * 100);

  const primaryAction = n4Due > 0
    ? { route: "vocab", params: { levelFilter: "N4" }, label: "開始 N4 單字關卡" }
    : n4Unread > 0
      ? { route: "grammar", params: { levelFilter: "N4" }, label: "閱讀 N4 文法筆記" }
      : unresolvedWrongCount > 0
        ? { route: "practice", params: { wrongOnly: true }, label: "挑戰錯題特訓" }
        : { route: "practice", params: {}, label: "開始單選練習" };

  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">今日學習路徑</h2>
      <p class="page-desc">今日日期：${today}｜依序完成關卡，累積學習 XP。</p>
    </div>

    <section class="n3-goal-card" aria-label="距離 N3 學習進度">
      <div class="n3-goal-header">
        <span class="n3-goal-title">距離 N3 目標進度條</span>
        <span class="n3-goal-pct">${n3ProgressPct}%</span>
      </div>
      <div class="duo-progress-track">
        <div class="duo-progress-fill" style="width: ${n3ProgressPct}%;"></div>
      </div>
      <p class="n3-goal-sub">
        單字已學 ${vocabReviewedCount}/${VOCAB_LIST.length}（熟悉 ${vocabFamiliarCount}）｜文法已讀 ${grammarReadCount}/${GRAMMAR_LIST.length}｜測驗答對 ${totalCorrect}/${QUIZ_LIST.length} 題
      </p>
    </section>

    <div class="duo-stats-bar">
      <div class="duo-stat-pill">
        <div class="duo-stat-icon gold">${LUCIDE_ICONS.zap}</div>
        <div>
          <div class="duo-stat-value">${totalXp} XP</div>
          <div class="duo-stat-label">累計學習經驗</div>
        </div>
      </div>

      <div class="duo-stat-pill">
        <div class="duo-stat-icon green">${LUCIDE_ICONS.flame}</div>
        <div>
          <div class="duo-stat-value">${totalDue} 個</div>
          <div class="duo-stat-label">今日待複習單字</div>
        </div>
      </div>

      <div class="duo-stat-pill">
        <div class="duo-stat-icon blue">${LUCIDE_ICONS.target}</div>
        <div>
          <div class="duo-stat-value">${unresolvedWrongCount} 題</div>
          <div class="duo-stat-label">待重練錯題</div>
        </div>
      </div>
    </div>

    <section class="duo-unit-banner">
      <div>
        <div class="duo-unit-kicker">單元 1・N4 基礎穩固</div>
        <h3 class="duo-unit-title">從日常單字與基礎接續開始</h3>
      </div>
      <button class="btn" type="button" id="duo-quick-start-btn">${primaryAction.label}</button>
    </section>

    <div class="duo-path">
      <div class="duo-node-wrap">
        ${n4Due > 0 ? `<span class="duo-start-tag">目前焦點</span>` : ""}
        <button
          class="duo-node-btn ${n4Due === 0 ? "done" : "current"}"
          type="button"
          data-go="vocab"
          data-level="N4"
          aria-label="第 1 關：N4 核心單字"
        >
          ${n4Due === 0 ? LUCIDE_ICONS.check : LUCIDE_ICONS.star}
        </button>
        <div class="duo-node-title">第 1 關：N4 核心單字</div>
        <div class="duo-node-sub">${n4Due === 0 ? "今日已全數複習" : `待複習 ${n4Due} / ${n4Vocab.length} 個`}</div>
      </div>

      <div class="duo-node-wrap offset-left">
        <button
          class="duo-node-btn ${n4Unread === 0 ? "done" : n4Due === 0 ? "current" : "blue"}"
          type="button"
          data-go="grammar"
          data-level="N4"
          aria-label="第 2 關：N4 基礎文法"
        >
          ${n4Unread === 0 ? LUCIDE_ICONS.check : LUCIDE_ICONS.bookOpen}
        </button>
        <div class="duo-node-title">第 2 關：N4 基礎文法</div>
        <div class="duo-node-sub">${n4Unread === 0 ? "已全部閱讀" : `未讀 ${n4Unread} / ${n4Grammar.length} 篇`}</div>
      </div>

      <div class="duo-node-wrap offset-right">
        <button
          class="duo-node-btn ${totalCorrect >= 5 ? "done" : "blue"}"
          type="button"
          data-go="practice"
          aria-label="第 3 關：單選挑戰測驗"
        >
          ${LUCIDE_ICONS.award}
        </button>
        <div class="duo-node-title">第 3 關：單選挑戰測驗</div>
        <div class="duo-node-sub">題庫共 ${QUIZ_LIST.length} 題｜已答對 ${totalCorrect} 題</div>
      </div>
    </div>

    <section class="duo-unit-banner blue">
      <div>
        <div class="duo-unit-kicker">單元 2・N3 進階階梯</div>
        <h3 class="duo-unit-title">進階詞彙、語感文法與錯題特訓</h3>
      </div>
    </section>

    <div class="duo-path">
      <div class="duo-node-wrap offset-left">
        <button
          class="duo-node-btn ${n3Due === 0 ? "done" : "blue"}"
          type="button"
          data-go="vocab"
          data-level="N3"
          aria-label="第 4 關：N3 進階單字"
        >
          ${n3Due === 0 ? LUCIDE_ICONS.check : LUCIDE_ICONS.star}
        </button>
        <div class="duo-node-title">第 4 關：N3 進階單字</div>
        <div class="duo-node-sub">${n3Due === 0 ? "今日已全數複習" : `待複習 ${n3Due} / ${n3Vocab.length} 個`}</div>
      </div>

      <div class="duo-node-wrap offset-right">
        <button
          class="duo-node-btn ${n3Unread === 0 ? "done" : "blue"}"
          type="button"
          data-go="grammar"
          data-level="N3"
          aria-label="第 5 關：N3 核心文法"
        >
          ${n3Unread === 0 ? LUCIDE_ICONS.check : LUCIDE_ICONS.bookOpen}
        </button>
        <div class="duo-node-title">第 5 關：N3 核心文法</div>
        <div class="duo-node-sub">${n3Unread === 0 ? "已全部閱讀" : `未讀 ${n3Unread} / ${n3Grammar.length} 篇`}</div>
      </div>

      <div class="duo-node-wrap">
        <button
          class="duo-node-btn ${unresolvedWrongCount > 0 ? "danger" : wrongEntries.length > 0 ? "done" : ""}"
          type="button"
          data-go="practice-wrong"
          aria-label="第 6 關：錯題特訓關卡"
        >
          ${LUCIDE_ICONS.target}
        </button>
        <div class="duo-node-title">第 6 關：錯題特訓關卡</div>
        <div class="duo-node-sub">
          ${wrongEntries.length === 0 ? "目前無錯題紀錄" : `錯題本 ${wrongEntries.length} 題（待重練 ${unresolvedWrongCount} 題）`}
        </div>
      </div>
    </div>

    <section class="notice-box notice-info">
      ${LUCIDE_ICONS.info}
      <div class="notice-content">
        <strong>學習與資料提醒</strong><br />
        1. ${STUDY_CONFIG.disclaimer.contentNotice}<br />
        2. ${STUDY_CONFIG.disclaimer.storageNotice}
      </div>
    </section>
  `;

  container.querySelector("#duo-quick-start-btn")?.addEventListener("click", () => {
    navigate(primaryAction.route, primaryAction.params);
  });

  container.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-go");
      const level = btn.getAttribute("data-level");
      if (target === "practice-wrong") {
        navigate("practice", { wrongOnly: true });
      } else if (level) {
        navigate(target, { levelFilter: level });
      } else {
        navigate(target);
      }
    });
  });
}
