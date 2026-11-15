import { STUDY_CONFIG } from "./config/studyConfig.js";
import { loadState, saveState } from "./core/storage.js";
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

function init() {
  const footer = document.getElementById("footer-disclaimer");
  if (footer) {
    footer.textContent = `${STUDY_CONFIG.appName}｜${STUDY_CONFIG.disclaimer.contentNotice}`;
  }

  window.addEventListener("hashchange", renderCurrentRoute);
  renderCurrentRoute();
}

init();
