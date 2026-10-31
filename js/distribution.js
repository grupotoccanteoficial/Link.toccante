import { API_BASE } from "./distribution-config.js";
import { createRequestStore, requestDestination } from "./distribution-client.js";

let storage;
try { storage = window.sessionStorage; } catch { /* navegação privada */ }
const store = createRequestStore(storage);
const cards = [...document.querySelectorAll(".service[data-sector]")];
const status = document.querySelector("#routing-status span");
let pending = false;

for (const card of cards) {
  card.addEventListener("click", async (event) => {
    event.preventDefault();
    if (pending) return;
    pending = true;
    const label = card.querySelector(".service-contact");
    const original = label.innerHTML;
    label.textContent = "Abrindo WhatsApp…";
    card.setAttribute("aria-busy", "true");
    for (const item of cards) item.setAttribute("aria-disabled", "true");
    status.textContent = "Conectando você à nossa equipe…";
    try {
      const request = store.forSector(card.dataset.sector);
      const url = await requestDestination(API_BASE, request);
      // Mesma aba: compatível com navegadores móveis, sem depender de pop-ups.
      window.location.assign(url);
    } catch (error) {
      status.textContent = error.message === "rate_limit"
        ? "Aguarde um minuto e tente novamente."
        : "Não foi possível iniciar o atendimento. Toque no cartão para tentar novamente.";
    } finally {
      pending = false;
      label.innerHTML = original;
      card.removeAttribute("aria-busy");
      for (const item of cards) item.removeAttribute("aria-disabled");
    }
  });
}
