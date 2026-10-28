const intro = document.querySelector("#intro");
const video = document.querySelector("#opening-video");
const replay = document.querySelector("#replay");
const skip = document.querySelector("#skip-intro");
const sound = document.querySelector("#toggle-sound");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let safetyTimer;
let startedByUser = false;

function finishIntro() {
  clearTimeout(safetyTimer);
  video.pause();
  if (intro.open) intro.close();
  // A falha de armazenamento (navegador privado) não pode impedir o atendimento.
  try { sessionStorage.setItem("toccante-intro-seen", "1"); } catch { /* opcional */ }
  if (startedByUser) replay.focus();
}

async function playIntro(manual = false) {
  if (typeof intro.showModal !== "function") return;
  startedByUser = manual;
  video.muted = true;
  sound.textContent = "Ativar som";
  sound.setAttribute("aria-pressed", "false");
  video.currentTime = 0;
  intro.showModal();
  skip.focus();
  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(finishIntro, 20000);
  try { await video.play(); } catch { finishIntro(); }
}

skip.addEventListener("click", finishIntro);
video.addEventListener("ended", finishIntro);
video.addEventListener("error", finishIntro);
intro.addEventListener("cancel", (event) => { event.preventDefault(); finishIntro(); });
intro.addEventListener("close", () => { clearTimeout(safetyTimer); video.pause(); });
sound.addEventListener("click", () => {
  video.muted = !video.muted;
  sound.textContent = video.muted ? "Ativar som" : "Silenciar";
  sound.setAttribute("aria-pressed", String(!video.muted));
});
replay.addEventListener("click", () => playIntro(true));
replay.hidden = false;
let seen = false;
try { seen = sessionStorage.getItem("toccante-intro-seen") === "1"; } catch { /* opcional */ }
if (!reducedMotion.matches && !seen) playIntro();
reducedMotion.addEventListener("change", (event) => { if (event.matches) finishIntro(); });
