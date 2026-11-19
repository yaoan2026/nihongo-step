import { STUDY_CONFIG } from "./config/studyConfig.js";
import { loadState, saveState } from "./core/storage.js";
import { LUCIDE_ICONS } from "./core/icons.js";
import { renderTodayPage } from "./pages/todayPage.js";
import { renderVocabPage } from "./pages/vocabPage.js";
import { renderGrammarPage } from "./pages/grammarPage.js";
import { renderPracticePage } from "./pages/practicePage.js";
import { renderRecordsPage } from "./pages/recordsPage.js";

const ROUTES = {
  today: renderTodayPage,
  vocab: renderVocabPage,
  grammar: renderGrammarPage,
  practice: renderPracticePage,
  records: renderRecordsPage
};

let appState = loadState();
let pendingParams = {};

function updateState(nextState) {
  appState = nextState;
  saveState(appState);
  return appState;
}

function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, "").trim();
  return ROUTES[raw] ? raw : "today";
}

function navigate(route, params = {}) {
  pendingParams = params;
  if (window.location.hash !== `#${route}`) {
    window.location.hash = `#${route}`;
  } else {
    renderCurrentRoute();
  }
}

function renderCurrentRoute() {
  const route = getRouteFromHash();
  const root = document.getElementById("app-root");
  if (!root) return;

  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.getAttribute("data-route") === route;
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const renderFn = ROUTES[route] || renderTodayPage;
  const params = pendingParams;
  pendingParams = {};

  renderFn(root, {
    state: appState,
    updateState,
    navigate,
    params
  });
}

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  const saved = window.localStorage?.getItem("nihongo_step_theme");
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initialTheme = saved || (prefersDark ? "dark" : "light");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    btn.innerHTML = theme === "dark" ? LUCIDE_ICONS.sun : LUCIDE_ICONS.moon;
    const label = theme === "dark" ? "切換為淺色模式" : "切換為深色模式";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.setAttribute("aria-pressed", String(theme === "dark"));
  }

  applyTheme(initialTheme);
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    window.localStorage?.setItem("nihongo_step_theme", next);
    applyTheme(next);
  });
}

function init() {
  initThemeToggle();
  document.querySelector(".skip-link")?.addEventListener("click", (event) => {
    event.preventDefault();
    document.getElementById("app-root")?.focus();
  });
  const footer = document.getElementById("footer-disclaimer");
  if (footer) {
    footer.textContent = `${STUDY_CONFIG.appName}｜${STUDY_CONFIG.disclaimer.contentNotice}`;
  }

  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}

init();
