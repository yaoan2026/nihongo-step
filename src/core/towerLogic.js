import { shuffleArray } from "./studyLogic.js";

export const TOWER_SEEN_STORAGE_KEY = "nihongo_step_tower_seen_v1";
export const TOWER_BEST_STORAGE_KEY = "nihongo_step_tower_best_v1";

const DEFAULT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];

export function createEmptySeenMap(levels = DEFAULT_LEVELS) {
  const map = {};
  for (const lvl of levels) {
    map[lvl] = [];
  }
  return map;
}

function cloneSeenMap(seenMap, levels = DEFAULT_LEVELS) {
  const next = createEmptySeenMap(levels);
  if (seenMap && typeof seenMap === "object") {
    for (const lvl of levels) {
      if (Array.isArray(seenMap[lvl])) {
        next[lvl] = [...seenMap[lvl]];
      }
    }
  }
  return next;
}

export function getTowerPoolStats(questionBank, seenMap, levels = DEFAULT_LEVELS) {
  let totalQuestions = 0;
  let totalSeen = 0;
  for (const lvl of levels) {
    const bankList = Array.isArray(questionBank?.[lvl]) ? questionBank[lvl] : [];
    const seenIds = new Set(Array.isArray(seenMap?.[lvl]) ? seenMap[lvl] : []);
    const validIds = new Set(bankList.map((q) => q.id));
    totalQuestions += bankList.length;
    for (const id of seenIds) {
      if (validIds.has(id)) {
        totalSeen += 1;
      }
    }
  }
  const remainingUnseen = Math.max(0, totalQuestions - totalSeen);
  return { totalQuestions, totalSeen, remainingUnseen };
}

export function markTowerQuestionSeen(seenMap, lvl, qId, levels = DEFAULT_LEVELS) {
  const next = cloneSeenMap(seenMap, levels);
  if (!next[lvl]) {
    next[lvl] = [];
  }
  if (!next[lvl].includes(qId)) {
    next[lvl].push(qId);
  }
  return next;
}

export function drawTowerQuestionsForLevel(
  questionBank,
  seenMap,
  lvl,
  count = 10,
  rng = Math.random
) {
  const allForLevel = Array.isArray(questionBank?.[lvl]) ? questionBank[lvl] : [];
  const nextSeenMap = cloneSeenMap(seenMap, Object.keys(questionBank || DEFAULT_LEVELS));
  const seenSet = new Set(nextSeenMap[lvl] || []);
  const unseen = allForLevel.filter((item) => !seenSet.has(item.id));

  let selected = [];
  if (unseen.length >= count) {
    selected = shuffleArray(unseen, rng).slice(0, count);
  } else {
    selected = shuffleArray(unseen, rng);
    const needed = Math.min(count, allForLevel.length) - selected.length;
    const selectedIds = new Set(selected.map((q) => q.id));
    nextSeenMap[lvl] = Array.from(selectedIds);
    const refillPool = allForLevel.filter((item) => !selectedIds.has(item.id));
    selected = selected.concat(shuffleArray(refillPool, rng).slice(0, Math.max(0, needed)));
  }

  const questions = selected.map((q) => {
    const indexedOptions = q.options.map((text, idx) => ({
      text,
      isCorrect: idx === q.ans
    }));
    const shuffledOpts = shuffleArray(indexedOptions, rng);
    return {
      id: q.id,
      level: lvl,
      q: q.q,
      zh: q.zh,
      options: shuffledOpts.map((o) => o.text),
      ans: shuffledOpts.findIndex((o) => o.isCorrect),
      exp: q.exp
    };
  });

  return { questions, nextSeenMap };
}

export function computeTowerResult({
  totalCorrect,
  clearedFloorCount,
  currentFloorIndex,
  levels = DEFAULT_LEVELS
}) {
  const safeIndex = Math.max(0, Math.min(levels.length - 1, currentFloorIndex));
  const reachedLevel = levels[safeIndex] || levels[0];
  const isAllCleared = clearedFloorCount >= levels.length;
  const clearedLabel =
    clearedFloorCount <= 0
      ? "0"
      : levels[Math.min(levels.length - 1, clearedFloorCount - 1)];

  return {
    totalCorrect,
    reachedLevel,
    clearedLabel,
    isAllCleared
  };
}

function getStorage(customStorage) {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadTowerSeenMap(customStorage, levels = DEFAULT_LEVELS) {
  const storage = getStorage(customStorage);
  const empty = createEmptySeenMap(levels);
  if (!storage) return empty;
  try {
    const raw = storage.getItem(TOWER_SEEN_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return cloneSeenMap(parsed, levels);
  } catch {
    return empty;
  }
}

export function saveTowerSeenMap(seenMap, customStorage) {
  const storage = getStorage(customStorage);
  if (!storage) return;
  try {
    storage.setItem(TOWER_SEEN_STORAGE_KEY, JSON.stringify(seenMap));
  } catch {
    // ignore storage errors
  }
}

export function loadTowerBestRecord(customStorage) {
  const fallback = { bestCorrect: 0, bestClearedLevel: "0", updatedAt: null };
  const storage = getStorage(customStorage);
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(TOWER_BEST_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      bestCorrect: Number.isInteger(parsed.bestCorrect) ? parsed.bestCorrect : 0,
      bestClearedLevel:
        typeof parsed.bestClearedLevel === "string" ? parsed.bestClearedLevel : "0",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return fallback;
  }
}

export function saveTowerBestRecord(
  { totalCorrect, clearedLabel, updatedAt = new Date().toISOString() },
  customStorage
) {
  const prev = loadTowerBestRecord(customStorage);
  if (totalCorrect < prev.bestCorrect) {
    return prev;
  }
  const next = {
    bestCorrect: Math.max(prev.bestCorrect, totalCorrect),
    bestClearedLevel:
      totalCorrect >= prev.bestCorrect ? clearedLabel : prev.bestClearedLevel,
    updatedAt
  };
  const storage = getStorage(customStorage);
  if (storage) {
    try {
      storage.setItem(TOWER_BEST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}
