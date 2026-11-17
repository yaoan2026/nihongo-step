export function hiraganaToKatakana(text) {
  return String(text || "").replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getLocalDateString(dt);
}

export function isVocabDue(progressEntry, todayStr) {
  if (!progressEntry || !progressEntry.nextReviewDate) {
    return true;
  }
  return progressEntry.nextReviewDate <= todayStr;
}

export function rateVocabCard(vocabProgress, vocabId, rating, config, todayStr) {
  const intervalDays = config.reviewIntervalsDays[rating];
  if (typeof intervalDays !== "number") {
    throw new Error(`未知的熟悉度評分：${rating}`);
  }
  const prev = vocabProgress[vocabId];
  return {
    ...vocabProgress,
    [vocabId]: {
      familiarity: rating,
      lastReviewedAt: todayStr,
      nextReviewDate: addDays(todayStr, intervalDays),
      reviewCount: (prev?.reviewCount || 0) + 1
    }
  };
}

export function toggleGrammarRead(grammarProgress, grammarId, nowIso) {
  const prev = grammarProgress[grammarId] || {
    isRead: false,
    readAt: null,
    mastery: "unrated"
  };
  const nextIsRead = !prev.isRead;
  return {
    ...grammarProgress,
    [grammarId]: {
      ...prev,
      isRead: nextIsRead,
      readAt: nextIsRead ? nowIso : null
    }
  };
}

export function setGrammarMastery(grammarProgress, grammarId, mastery) {
  const prev = grammarProgress[grammarId] || {
    isRead: false,
    readAt: null,
    mastery: "unrated"
  };
  return {
    ...grammarProgress,
    [grammarId]: {
      ...prev,
      mastery
    }
  };
}

export function shuffleArray(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createSeededRng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i += 1) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function next() {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailyQuizSet(quizList, dateStr, count = 10) {
  const rng = createSeededRng(`nihongo-step-daily-${dateStr}`);
  return shuffleArray(quizList, rng).slice(0, Math.min(count, quizList.length));
}

export function toggleReviewMark(reviewMarks, kind, itemId) {
  const current = reviewMarks || { vocab: {}, quiz: {} };
  const bucket = { ...(current[kind] || {}) };
  if (bucket[itemId]) {
    delete bucket[itemId];
  } else {
    bucket[itemId] = true;
  }
  return {
    vocab: current.vocab || {},
    quiz: current.quiz || {},
    [kind]: bucket
  };
}

export function prepareQuizQuestion(question, shouldShuffle = true, rng = Math.random) {
  return {
    ...question,
    options: shouldShuffle ? shuffleArray(question.options, rng) : [...question.options]
  };
}

export function gradeQuizAnswer(question, selectedOptionId) {
  const selectedOption = question.options.find((opt) => opt.id === selectedOptionId) || null;
  const correctOption = question.options.find((opt) => opt.id === question.correctOptionId) || null;
  const isCorrect = Boolean(selectedOption && selectedOption.id === question.correctOptionId);
  return {
    isCorrect,
    selectedOption,
    correctOption
  };
}

export function recordQuizSubmission({
  state,
  question,
  selectedOptionId,
  alreadySubmitted,
  nowIso
}) {
  if (alreadySubmitted) {
    return {
      state,
      result: null,
      duplicateBlocked: true
    };
  }

  const grade = gradeQuizAnswer(question, selectedOptionId);
  if (!grade.selectedOption) {
    throw new Error("請先選擇一個選項再提交。");
  }

  const nextQuizStats = {
    totalAnswered: (state.quizStats?.totalAnswered || 0) + 1,
    totalCorrect: (state.quizStats?.totalCorrect || 0) + (grade.isCorrect ? 1 : 0)
  };

  const prevWrong = state.wrongBook?.[question.id];
  const nextWrongBook = { ...(state.wrongBook || {}) };

  if (!grade.isCorrect) {
    nextWrongBook[question.id] = {
      questionId: question.id,
      wrongCount: (prevWrong?.wrongCount || 0) + 1,
      lastWrongOptionId: grade.selectedOption.id,
      lastWrongOptionText: grade.selectedOption.text,
      lastAnsweredAt: nowIso,
      lastIsCorrect: false
    };
  } else if (prevWrong) {
    // 重新答對仍保留錯題歷史紀錄
    nextWrongBook[question.id] = {
      ...prevWrong,
      lastAnsweredAt: nowIso,
      lastIsCorrect: true
    };
  }

  const nextQuizHistory = [
    {
      questionId: question.id,
      isCorrect: grade.isCorrect,
      selectedOptionText: grade.selectedOption.text,
      answeredAt: nowIso
    },
    ...(state.quizHistory || [])
  ].slice(0, 200);

  return {
    state: {
      ...state,
      quizStats: nextQuizStats,
      wrongBook: nextWrongBook,
      quizHistory: nextQuizHistory
    },
    result: grade,
    duplicateBlocked: false
  };
}
