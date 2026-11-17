export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 將 `{漢字|かんじ}` 標記安全轉換為 `<ruby>漢字<rt>かんじ</rt></ruby>`
 */
export function renderRubyText(str) {
  const escaped = escapeHtml(str);
  return escaped.replace(
    /\{([^|{}]+)\|([^{}]+)\}/g,
    "<ruby>$1<rt>$2</rt></ruby>"
  );
}

/**
 * 移除 `{漢字|かんじ}` 標記，還原為純日文文字（供語音朗讀使用）
 */
export function stripRubyMarkup(str) {
  return String(str ?? "").replace(/\{([^|{}]+)\|([^{}]+)\}/g, "$1");
}
