export const STUDY_CONFIG = {
  appName: "日語階梯",
  appSubtitle: "N4 → N3 個人學習紀錄",
  storageKey: "nihongo_step_user_data_v1",
  schemaVersion: 1,
  reviewIntervalsDays: {
    unfamiliar: 1,
    somewhat: 3,
    familiar: 7
  },
  familiarityLabels: {
    unfamiliar: "不熟",
    somewhat: "有點熟",
    familiar: "熟悉"
  },
  grammarMasteryLabels: {
    unrated: "未評",
    unfamiliar: "不熟",
    somewhat: "有點熟",
    familiar: "熟悉"
  },
  disclaimer: {
    contentNotice: "所有示範教材皆標示「示範內容，待校對」，N4／N3 僅作為學習分類，非官方完整題庫或詞表。",
    storageNotice: "學習紀錄僅保存於目前瀏覽器，不同裝置不會自動同步，清除網站資料可能失去紀錄，建議定期匯出 JSON 備份。"
  }
};
