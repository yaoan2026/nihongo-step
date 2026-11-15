export function isSpeechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakJapanese(text, { rate = 0.95 } = {}) {
  if (!isSpeechSupported()) {
    return {
      ok: false,
      reason: "目前瀏覽器不支援語音朗讀功能（Web Speech API）。"
    };
  }

  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return {
      ok: false,
      reason: "沒有可朗讀的日文內容。"
    };
  }

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new window.SpeechSynthesisUtterance(trimmed);
    utterance.lang = "ja-JP";
    utterance.rate = rate;

    const voices = synth.getVoices ? synth.getVoices() : [];
    const jaVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("ja"));
    if (jaVoice) {
      utterance.voice = jaVoice;
    }

    synth.speak(utterance);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "無法啟動語音朗讀，請確認瀏覽器語音設定。"
    };
  }
}
