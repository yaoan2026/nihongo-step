import {
  TOWER_FLOOR_NAMES,
  TOWER_LEVELS,
  TOWER_QUESTION_BANK
} from "../data/towerQuestions.js";
import {
  computeTowerResult,
  createEmptySeenMap,
  drawTowerQuestionsForLevel,
  getTowerPoolStats,
  loadTowerBestRecord,
  loadTowerSeenMap,
  markTowerQuestionSeen,
  saveTowerBestRecord,
  saveTowerSeenMap
} from "../core/towerLogic.js";
import { escapeHtml } from "../core/dom.js";
import { isSpeechSupported, speakJapanese } from "../core/speech.js";
import { LUCIDE_ICONS } from "../core/icons.js";

export function renderTowerPage(container) {
  let destroyed = false;
  let audioCtx = null;
  let timerIntervalId = null;
  let overlayIntervalId = null;
  let overlayTimeoutId = null;
  let toastTimeoutId = null;

  const ui = {
    screen: "start", // "start" | "quiz" | "result"
    soundEnabled: true,
    seenMap: loadTowerSeenMap(undefined, TOWER_LEVELS),
    bestRecord: loadTowerBestRecord(),
    gameMode: "NORMAL", // "NORMAL" | "EASY"
    timeLimit: 10,
    currentFloorIndex: 0,
    currentQuestionInFloor: 0,
    currentFloorQuestions: [],
    currentQuestionObj: null,
    totalCorrect: 0,
    streak: 0,
    clearedFloorCount: 0,
    attemptHistory: [],
    remainingMs: 0,
    isQuestionActive: false,
    answeredState: null, // null | { selectedIdx, isCorrect, timedOut }
    reviewOpen: false,
    isAllCleared: false,
    overlay: null, // null | { badge, title, sub, countdown }
    toastMsg: ""
  };

  function clearAllTimers() {
    if (timerIntervalId) {
      clearInterval(timerIntervalId);
      timerIntervalId = null;
    }
    if (overlayIntervalId) {
      clearInterval(overlayIntervalId);
      overlayIntervalId = null;
    }
    if (overlayTimeoutId) {
      clearTimeout(overlayTimeoutId);
      overlayTimeoutId = null;
    }
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId);
      toastTimeoutId = null;
    }
  }

  function cleanup() {
    destroyed = true;
    clearAllTimers();
    if (audioCtx && typeof audioCtx.close === "function") {
      try {
        audioCtx.close();
      } catch {
        // ignore audio close errors
      }
      audioCtx = null;
    }
  }

  function ensureAudio() {
    if (!ui.soundEnabled || typeof window === "undefined") return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          audioCtx = new AudioContextClass();
        } catch {
          return null;
        }
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = "sine") {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore audio errors
    }
  }

  function playSoundEffect(kind) {
    if (!ui.soundEnabled) return;
    if (kind === "correct") {
      playTone(587.33, 0.09, "triangle");
      setTimeout(() => !destroyed && playTone(880, 0.18, "triangle"), 80);
    } else if (kind === "wrong") {
      playTone(196, 0.2, "sawtooth");
      setTimeout(() => !destroyed && playTone(146.83, 0.32, "sawtooth"), 160);
    } else if (kind === "clear") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => !destroyed && playTone(f, 0.14, "triangle"), i * 90);
      });
    }
  }

  function showToast(msg) {
    ui.toastMsg = msg;
    renderToastDom();
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => {
      if (destroyed) return;
      ui.toastMsg = "";
      renderToastDom();
    }, 2200);
  }

  function renderToastDom() {
    const el = container.querySelector("#tower-toast");
    if (!el) return;
    if (ui.toastMsg) {
      el.textContent = ui.toastMsg;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }

  function renderOverlayDom() {
    const el = container.querySelector("#tower-overlay");
    if (!el) return;
    if (!ui.overlay) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const badgeEl = el.querySelector("#tower-overlay-badge");
    const titleEl = el.querySelector("#tower-overlay-title");
    const subEl = el.querySelector("#tower-overlay-sub");
    const countEl = el.querySelector("#tower-overlay-count");
    if (badgeEl) badgeEl.textContent = ui.overlay.badge;
    if (titleEl) titleEl.textContent = ui.overlay.title;
    if (subEl) subEl.textContent = ui.overlay.sub;
    if (countEl) {
      countEl.textContent = ui.overlay.countdown ? String(ui.overlay.countdown) : "";
      countEl.hidden = !ui.overlay.countdown;
    }
  }

  function startGame(mode) {
    clearAllTimers();
    ensureAudio();
    ui.gameMode = mode;
    ui.timeLimit = mode === "EASY" ? 20 : 10;
    ui.currentFloorIndex = 0;
    ui.currentQuestionInFloor = 0;
    ui.totalCorrect = 0;
    ui.streak = 0;
    ui.clearedFloorCount = 0;
    ui.attemptHistory = [];
    ui.reviewOpen = false;
    ui.isAllCleared = false;
    ui.overlay = null;

    const lvl = TOWER_LEVELS[0];
    const drawn = drawTowerQuestionsForLevel(TOWER_QUESTION_BANK, ui.seenMap, lvl, 10);
    ui.currentFloorQuestions = drawn.questions;
    ui.seenMap = drawn.nextSeenMap;
    saveTowerSeenMap(ui.seenMap);

    ui.screen = "quiz";
    presentCurrentQuestion();
  }

  function presentCurrentQuestion() {
    clearInterval(timerIntervalId);
    timerIntervalId = null;

    const lvl = TOWER_LEVELS[ui.currentFloorIndex];
    const qObj = ui.currentFloorQuestions[ui.currentQuestionInFloor];
    ui.currentQuestionObj = qObj;
    ui.answeredState = null;

    ui.seenMap = markTowerQuestionSeen(ui.seenMap, lvl, qObj.id, TOWER_LEVELS);
    saveTowerSeenMap(ui.seenMap);

    ui.isQuestionActive = true;
    ui.remainingMs = ui.timeLimit * 1000;
    render();

    timerIntervalId = setInterval(() => {
      if (destroyed || !ui.isQuestionActive) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        return;
      }
      ui.remainingMs -= 100;
      if (ui.remainingMs <= 0) {
        ui.remainingMs = 0;
        updateTimerDom();
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        handleTimeout();
      } else {
        updateTimerDom();
      }
    }, 100);
  }

  function updateTimerDom() {
    const sec = Math.ceil(ui.remainingMs / 1000);
    const pct = Math.max(0, (ui.remainingMs / (ui.timeLimit * 1000)) * 100);
    const numEl = container.querySelector("#tower-timer-num");
    const barEl = container.querySelector("#tower-timer-fill");
    if (numEl) {
      numEl.textContent = `${sec}s`;
      numEl.classList.toggle("is-danger", sec <= 3);
    }
    if (barEl) {
      barEl.style.width = `${pct}%`;
      barEl.classList.toggle("is-danger", sec <= 3);
    }
  }

  function finishRun(isAllCleared) {
    ui.isAllCleared = isAllCleared;
    const summary = computeTowerResult({
      totalCorrect: ui.totalCorrect,
      clearedFloorCount: ui.clearedFloorCount,
      currentFloorIndex: ui.currentFloorIndex,
      levels: TOWER_LEVELS
    });
    ui.bestRecord = saveTowerBestRecord({
      totalCorrect: summary.totalCorrect,
      clearedLabel: summary.clearedLabel
    });
    ui.screen = "result";
    ui.overlay = null;
    render();
  }

  function handleSelectOption(selectedIdx) {
    if (!ui.isQuestionActive || !ui.currentQuestionObj) return;
    ui.isQuestionActive = false;
    clearInterval(timerIntervalId);
    timerIntervalId = null;

    const q = ui.currentQuestionObj;
    const isCorrect = selectedIdx === q.ans;
    ui.answeredState = { selectedIdx, isCorrect, timedOut: false };

    ui.attemptHistory.push({
      qNum: ui.currentFloorIndex * 10 + ui.currentQuestionInFloor + 1,
      level: q.level,
      q: q.q,
      zh: q.zh,
      userAns: q.options[selectedIdx],
      correctAns: q.options[q.ans],
      isCorrect,
      exp: q.exp
    });

    if (isCorrect) {
      ui.totalCorrect += 1;
      ui.streak += 1;
      playSoundEffect("correct");
      render();
    } else {
      ui.streak = 0;
      playSoundEffect("wrong");
      render();
      overlayTimeoutId = setTimeout(() => {
        if (destroyed) return;
        triggerGameOver(`${q.level}・第 ${ui.currentQuestionInFloor + 1} 題答錯出局`);
      }, 650);
    }
  }

  function handleTimeout() {
    if (!ui.isQuestionActive || !ui.currentQuestionObj) return;
    ui.isQuestionActive = false;
    const q = ui.currentQuestionObj;
    ui.answeredState = { selectedIdx: -1, isCorrect: false, timedOut: true };

    ui.attemptHistory.push({
      qNum: ui.currentFloorIndex * 10 + ui.currentQuestionInFloor + 1,
      level: q.level,
      q: q.q,
      zh: q.zh,
      userAns: "超時未作答",
      correctAns: q.options[q.ans],
      isCorrect: false,
      exp: q.exp
    });

    ui.streak = 0;
    playSoundEffect("wrong");
    render();
    overlayTimeoutId = setTimeout(() => {
      if (destroyed) return;
      triggerGameOver(`${q.level}・第 ${ui.currentQuestionInFloor + 1} 題超時出局`);
    }, 550);
  }

  function handleNextStep() {
    if (ui.currentQuestionInFloor < 9) {
      ui.currentQuestionInFloor += 1;
      presentCurrentQuestion();
      return;
    }

    ui.clearedFloorCount = ui.currentFloorIndex + 1;
    if (ui.currentFloorIndex < TOWER_LEVELS.length - 1) {
      const clearedLvl = TOWER_LEVELS[ui.currentFloorIndex];
      const nextLvl = TOWER_LEVELS[ui.currentFloorIndex + 1];
      ui.currentFloorIndex += 1;
      ui.currentQuestionInFloor = 0;
      const drawn = drawTowerQuestionsForLevel(
        TOWER_QUESTION_BANK,
        ui.seenMap,
        nextLvl,
        10
      );
      ui.currentFloorQuestions = drawn.questions;
      ui.seenMap = drawn.nextSeenMap;
      saveTowerSeenMap(ui.seenMap);
      showFloorClearOverlay(ui.clearedFloorCount, clearedLvl, nextLvl);
    } else {
      showTowerClearOverlay();
    }
  }

  function showFloorClearOverlay(floorNum, clearedLvl, nextLvl) {
    playSoundEffect("clear");
    let count = 3;
    ui.overlay = {
      badge: `第 ${floorNum} 層通過`,
      title: `FLOOR ${floorNum} CLEAR`,
      sub: `${clearedLvl} 通關，準備進入 ${nextLvl}`,
      countdown: count
    };
    renderOverlayDom();

    overlayIntervalId = setInterval(() => {
      if (destroyed) {
        clearInterval(overlayIntervalId);
        return;
      }
      count -= 1;
      if (count > 0) {
        ui.overlay = { ...ui.overlay, countdown: count };
        renderOverlayDom();
      } else {
        clearInterval(overlayIntervalId);
        overlayIntervalId = null;
        ui.overlay = null;
        renderOverlayDom();
        presentCurrentQuestion();
      }
    }, 650);
  }

  function triggerGameOver(reasonText) {
    ui.overlay = {
      badge: "挑戰結束",
      title: "GAME OVER",
      sub: reasonText,
      countdown: null
    };
    renderOverlayDom();

    overlayTimeoutId = setTimeout(() => {
      if (destroyed) return;
      finishRun(false);
    }, 1300);
  }

  function showTowerClearOverlay() {
    playSoundEffect("clear");
    ui.overlay = {
      badge: "全 5 層制霸",
      title: "TOWER CLEAR",
      sub: "50 題全數通過，恭喜制霸 N5 → N1 文法塔。",
      countdown: null
    };
    renderOverlayDom();

    overlayTimeoutId = setTimeout(() => {
      if (destroyed) return;
      finishRun(true);
    }, 1600);
  }

  function getShareText() {
    const summary = computeTowerResult({
      totalCorrect: ui.totalCorrect,
      clearedFloorCount: ui.clearedFloorCount,
      currentFloorIndex: ui.currentFloorIndex,
      levels: TOWER_LEVELS
    });
    return `【日語階梯・文法爬塔闖關】\n到達樓層：${summary.reachedLevel}\n答對題數：${summary.totalCorrect} / 50\n通關等級：${summary.clearedLabel}`;
  }

  function copyResultToClipboard() {
    const text = getShareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("已複製成績文字"))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.className = "sr-only";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("已複製成績文字");
    } catch {
      showToast("複製失敗，請手動選取文字");
    }
    document.body.removeChild(ta);
  }

  function downloadScoreCardImage() {
    const canvas = container.querySelector("#tower-score-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const summary = computeTowerResult({
      totalCorrect: ui.totalCorrect,
      clearedFloorCount: ui.clearedFloorCount,
      currentFloorIndex: ui.currentFloorIndex,
      levels: TOWER_LEVELS
    });

    // Techou Cream Paper + Espresso Ink Score Card
    ctx.fillStyle = "#FBF7F0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);
    ctx.strokeStyle = "#2B2118";
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

    ctx.fillStyle = "#FAD460";
    ctx.fillRect(28, 28, canvas.width - 56, 86);
    ctx.strokeRect(28, 28, canvas.width - 56, 86);

    ctx.fillStyle = "#2B2118";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("日語階梯・文法爬塔闖關（N5 → N1）", canvas.width / 2, 80);

    ctx.font = "bold 30px sans-serif";
    ctx.fillText(
      summary.isAllCleared ? "TOWER CLEAR・全層通關" : "文法實力檢定成績單",
      canvas.width / 2,
      175
    );

    ctx.font = "bold 84px sans-serif";
    ctx.fillText(`${summary.totalCorrect} / 50`, canvas.width / 2, 275);

    ctx.fillStyle = "#6E6259";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(
      `到達樓層：${summary.reachedLevel}   ｜   通關等級：${summary.clearedLabel}`,
      canvas.width / 2,
      348
    );

    ctx.fillStyle = "#2B2118";
    ctx.font = "20px sans-serif";
    ctx.fillText("日本語文法力チェック ― 一命制闖關", canvas.width / 2, 435);

    try {
      const link = document.createElement("a");
      link.download = `nihongo-tower-score-${summary.totalCorrect}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("成績圖已下載");
    } catch {
      showToast("已產生成績圖");
    }
  }

  function renderStartScreen() {
    const poolStats = getTowerPoolStats(TOWER_QUESTION_BANK, ui.seenMap, TOWER_LEVELS);
    return `
      <div class="page-top-row">
        <h1 class="page-title">文法爬塔闖關</h1>
        <button class="btn btn-sm" type="button" id="tower-sound-btn">
          ${LUCIDE_ICONS.volume2}
          <span>${ui.soundEnabled ? "音效開" : "音效關"}</span>
        </button>
      </div>

      <section class="card hero-card">
        <div class="badge-row justify-center">
          <span class="badge badge-accent">N5 → N1 五層一命制</span>
        </div>

        <div class="tower-stack mt-3" aria-hidden="true">
          <div class="tower-tier tier-n1">N1 上級</div>
          <div class="tower-tier tier-n2">N2 中高級</div>
          <div class="tower-tier tier-n3">N3 中級</div>
          <div class="tower-tier tier-n4">N4 初中級</div>
          <div class="tower-tier tier-n5">N5 初級</div>
        </div>

        <h2 class="hero-title" style="text-align: center;">日語文法實力挑戰塔</h2>
        <p class="page-desc" style="text-align: center;">
          日本語文法力チェック ― 每層 10 題，答錯或超時即結束本次攀登
        </p>

        <div class="stat-tiles" aria-label="闖關規則與最佳紀錄">
          <div class="stat-tile is-accent">
            <div class="stat-tile-value">${ui.bestRecord.bestCorrect}/50</div>
            <div class="stat-tile-label">最高紀錄</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">5 層</div>
            <div class="stat-tile-label">N5 → N1</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">1 命</div>
            <div class="stat-tile-label">答錯即止</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-value">10 / 20s</div>
            <div class="stat-tile-label">雙速限時</div>
          </div>
        </div>

        <div class="notice-box notice-success mt-3">
          ${LUCIDE_ICONS.checkCircle}
          <div class="notice-content">
            <strong>防重複題庫已啟用：</strong>全 ${poolStats.totalQuestions} 題・未出題目剩餘 ${poolStats.remainingUnseen} 題
            <div class="btn-row mt-2">
              <button class="btn btn-sm btn-subtle" type="button" id="tower-reset-pool-btn">
                ${LUCIDE_ICONS.rotateCcw}
                <span>重置抽題紀錄</span>
              </button>
            </div>
          </div>
        </div>

        <div class="btn-row mt-4">
          <button class="btn btn-primary" type="button" id="tower-start-normal-btn">
            <span>開始攀登・標準 10 秒</span>
            ${LUCIDE_ICONS.arrowRight}
          </button>
          <button class="btn" type="button" id="tower-start-easy-btn">
            初學者模式・EASY 20 秒
          </button>
        </div>
      </section>
    `;
  }

  function renderQuizScreen() {
    const lvl = TOWER_LEVELS[ui.currentFloorIndex];
    const q = ui.currentQuestionObj;
    const totalIdx = ui.currentFloorIndex * 10 + ui.currentQuestionInFloor + 1;
    const sec = Math.ceil(ui.remainingMs / 1000);
    const pct = Math.max(0, (ui.remainingMs / (ui.timeLimit * 1000)) * 100);
    const labels = ["A", "B", "C", "D"];
    const speechAvailable = isSpeechSupported();
    const ans = ui.answeredState;

    return `
      <div class="page-top-row">
        <h1 class="page-title">文法爬塔闖關</h1>
        <div class="btn-row mt-0">
          <button class="btn btn-sm" type="button" id="tower-sound-btn">
            ${LUCIDE_ICONS.volume2}
            <span>${ui.soundEnabled ? "音效開" : "音效關"}</span>
          </button>
          <button class="btn btn-sm btn-subtle" type="button" id="tower-quit-btn">返回選單</button>
        </div>
      </div>

      <section class="tower-hud">
        <div class="tower-hud-top">
          <div class="badge-row">
            <span class="badge badge-accent">${escapeHtml(lvl)}</span>
            <span class="badge">${escapeHtml(TOWER_FLOOR_NAMES[lvl])}</span>
            ${
              ui.streak >= 2
                ? `<span class="badge badge-correct">連勝 ×${ui.streak}</span>`
                : ""
            }
          </div>
          <span class="section-meta">
            本層 ${String(ui.currentQuestionInFloor + 1).padStart(2, "0")}/10・總計 ${String(totalIdx).padStart(2, "0")}/50
          </span>
        </div>

        <div class="tower-timer-row">
          <div class="tower-timer-track">
            <div
              id="tower-timer-fill"
              class="tower-timer-fill ${sec <= 3 ? "is-danger" : ""}"
              style="width: ${pct}%;"
            ></div>
          </div>
          <span id="tower-timer-num" class="tower-timer-num ${sec <= 3 ? "is-danger" : ""}">
            ${sec}s
          </span>
        </div>
      </section>

      <section class="card">
        <div class="badge-row">
          <span class="badge badge-accent">Q${String(totalIdx).padStart(2, "0")}・${escapeHtml(lvl)}</span>
          <span class="badge">${ui.gameMode === "EASY" ? "EASY 20 秒" : "標準 10 秒"}</span>
        </div>

        <div class="quiz-prompt-box">
          <div class="quiz-prompt" lang="ja">${escapeHtml(q.q)}</div>
          <p class="flashcard-meta mt-2">句意：${escapeHtml(q.zh)}</p>
          <div class="btn-row">
            <button
              class="btn btn-sm"
              type="button"
              id="tower-speak-btn"
              ${speechAvailable ? "" : "disabled"}
            >
              ${LUCIDE_ICONS.volume2}
              <span>朗讀題目</span>
            </button>
          </div>
        </div>

        <div class="option-list">
          ${q.options
            .map((optText, idx) => {
              let cls = "tower-option-btn";
              if (ans) {
                if (idx === q.ans) {
                  cls += " is-correct";
                } else if (idx === ans.selectedIdx && !ans.isCorrect) {
                  cls += " is-wrong";
                }
              }
              return `
                <button
                  type="button"
                  class="${cls}"
                  data-tower-opt="${idx}"
                  ${ans ? "disabled" : ""}
                >
                  <span class="option-key">${labels[idx]}</span>
                  <span lang="ja">${escapeHtml(optText)}</span>
                </button>
              `;
            })
            .join("")}
        </div>

        ${
          ans && ans.isCorrect
            ? `
          <div class="notice-box notice-success mt-3">
            ${LUCIDE_ICONS.check}
            <div class="notice-content">
              <strong>答對</strong>
              <div class="mt-2">${escapeHtml(q.exp)}</div>
              <div class="btn-row">
                <button type="button" class="btn btn-primary" id="tower-next-btn">
                  <span>${ui.currentQuestionInFloor < 9 ? "下一題" : "完成本層"}</span>
                  ${LUCIDE_ICONS.arrowRight}
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </section>
    `;
  }

  function renderResultScreen() {
    const summary = computeTowerResult({
      totalCorrect: ui.totalCorrect,
      clearedFloorCount: ui.clearedFloorCount,
      currentFloorIndex: ui.currentFloorIndex,
      levels: TOWER_LEVELS
    });

    return `
      <div class="page-top-row">
        <h1 class="page-title">闖關結算</h1>
        <span class="jp-clock">最佳紀錄 ${ui.bestRecord.bestCorrect}/50</span>
      </div>

      <section class="card hero-card">
        <div class="badge-row">
          <span class="badge ${summary.isAllCleared ? "badge-correct" : "badge-accent"}">
            ${summary.isAllCleared ? "文法の神・ALL CLEAR" : `LEVEL ${ui.clearedFloorCount}`}
          </span>
        </div>

        <h2 class="hero-title mt-2">${summary.totalCorrect} / 50 題答對</h2>
        <p class="page-desc">
          到達樓層：<strong>${escapeHtml(summary.reachedLevel)}</strong>｜通關等級：<strong>${escapeHtml(summary.clearedLabel)}</strong>
        </p>

        <div class="tower-progress-strip" aria-label="樓層進度">
          ${TOWER_LEVELS.map((lvl, idx) => {
            let cls = "tower-step";
            if (idx < ui.clearedFloorCount) {
              cls += " is-cleared";
            } else if (idx === ui.currentFloorIndex && !summary.isAllCleared) {
              cls += " is-current";
            }
            return `<div class="${cls}">${escapeHtml(lvl)}</div>`;
          }).join("")}
        </div>

        <div class="btn-row mt-3">
          <button type="button" class="btn btn-primary" id="tower-retry-btn">
            ${LUCIDE_ICONS.rotateCcw}
            <span>再挑戰一次</span>
          </button>
          <button type="button" class="btn" id="tower-back-menu-btn">返回爬塔選單</button>
        </div>

        <div class="btn-row card-divider">
          <button type="button" class="btn btn-sm btn-subtle" id="tower-save-image-btn">
            下載成績圖 PNG
          </button>
          <button type="button" class="btn btn-sm btn-subtle" id="tower-copy-result-btn">
            複製成績文字
          </button>
        </div>
      </section>

      <section class="card">
        <div class="section-heading-row mt-0 mb-3">
          <div class="section-heading-left">
            ${LUCIDE_ICONS.bookOpen}
            <h2 class="section-heading mt-0">本局題目復習（${ui.attemptHistory.length} 題）</h2>
          </div>
          <button type="button" class="btn btn-sm" id="tower-toggle-review-btn">
            ${ui.reviewOpen ? "收合解析" : "展開解析"}
          </button>
        </div>

        ${
          !ui.reviewOpen
            ? `<p class="page-desc">點擊右上角「展開解析」可查看每題正確答案與文法解說。</p>`
            : `
          <div class="stack">
            ${ui.attemptHistory
              .map(
                (item) => `
              <div class="entry-item ${item.isCorrect ? "is-correct" : ""}">
                <div class="badge-row">
                  <span class="badge">Q${String(item.qNum).padStart(2, "0")}・${escapeHtml(item.level)}</span>
                  <span class="badge ${item.isCorrect ? "badge-correct" : "badge-incorrect"}">
                    ${item.isCorrect ? `${LUCIDE_ICONS.check}<span>答對</span>` : `${LUCIDE_ICONS.x}<span>答錯（選：${escapeHtml(item.userAns)}）</span>`}
                  </span>
                </div>
                <div class="example-ja mt-2" lang="ja"><strong>${escapeHtml(item.q)}</strong></div>
                <div class="flashcard-meta">正解：<strong lang="ja">${escapeHtml(item.correctAns)}</strong>（${escapeHtml(item.zh)}）</div>
                <div class="flashcard-meta">${escapeHtml(item.exp)}</div>
              </div>
            `
              )
              .join("")}
          </div>
        `
        }
      </section>

      <canvas id="tower-score-canvas" width="800" height="500" class="sr-only"></canvas>
    `;
  }

  function render() {
    if (destroyed) return;
    let bodyHtml = "";
    if (ui.screen === "start") {
      bodyHtml = renderStartScreen();
    } else if (ui.screen === "quiz") {
      bodyHtml = renderQuizScreen();
    } else {
      bodyHtml = renderResultScreen();
    }

    container.innerHTML = `
      ${bodyHtml}
      <div id="tower-overlay" class="tower-overlay" hidden>
        <div class="tower-overlay-card" role="dialog" aria-modal="true" aria-labelledby="tower-overlay-title">
          <div class="badge-row justify-center mb-3">
            <span id="tower-overlay-badge" class="badge badge-accent"></span>
          </div>
          <h2 id="tower-overlay-title" class="tower-overlay-title"></h2>
          <p id="tower-overlay-sub" class="page-desc"></p>
          <div id="tower-overlay-count" class="tower-overlay-count" hidden></div>
        </div>
      </div>
      <div id="tower-toast" class="tower-toast" role="status" aria-live="polite" hidden></div>
    `;

    renderOverlayDom();
    renderToastDom();
    bindEvents();
  }

  function bindEvents() {
    container.querySelector("#tower-sound-btn")?.addEventListener("click", () => {
      ui.soundEnabled = !ui.soundEnabled;
      render();
    });

    container.querySelector("#tower-reset-pool-btn")?.addEventListener("click", () => {
      ui.seenMap = createEmptySeenMap(TOWER_LEVELS);
      saveTowerSeenMap(ui.seenMap);
      playTone(660, 0.1, "sine");
      render();
      showToast("已重置題庫抽題紀錄");
    });

    container.querySelector("#tower-start-normal-btn")?.addEventListener("click", () => {
      startGame("NORMAL");
    });

    container.querySelector("#tower-start-easy-btn")?.addEventListener("click", () => {
      startGame("EASY");
    });

    container.querySelector("#tower-quit-btn")?.addEventListener("click", () => {
      clearAllTimers();
      ui.isQuestionActive = false;
      ui.overlay = null;
      ui.screen = "start";
      render();
    });

    container.querySelector("#tower-speak-btn")?.addEventListener("click", () => {
      if (ui.currentQuestionObj) {
        speakJapanese(ui.currentQuestionObj.q.replace(/（\s*）/g, ""));
      }
    });

    container.querySelectorAll("[data-tower-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-tower-opt"));
        handleSelectOption(idx);
      });
    });

    container.querySelector("#tower-next-btn")?.addEventListener("click", handleNextStep);

    container.querySelector("#tower-retry-btn")?.addEventListener("click", () => {
      startGame(ui.gameMode);
    });

    container.querySelector("#tower-back-menu-btn")?.addEventListener("click", () => {
      ui.screen = "start";
      render();
    });

    container.querySelector("#tower-toggle-review-btn")?.addEventListener("click", () => {
      ui.reviewOpen = !ui.reviewOpen;
      render();
    });

    container.querySelector("#tower-copy-result-btn")?.addEventListener("click", copyResultToClipboard);
    container.querySelector("#tower-save-image-btn")?.addEventListener("click", downloadScoreCardImage);
  }

  render();
  return cleanup;
}
