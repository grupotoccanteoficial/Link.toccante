import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sectors, generalContact, getContact } from "../js/contacts.js";

const root = new URL("../", import.meta.url);
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const whatsapp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.4-4.8A8.5 8.5 0 1 1 20.5 11.6Z"/><path d="M8.3 7.6c.4-.3.8-.2 1 .3l.7 1.5c.2.4-.3.9-.6 1.2.7 1.5 1.8 2.6 3.4 3.3.4-.4.8-1 1.2-.8l1.6.8c.5.2.5.7.2 1.1-.6.9-1.6 1.2-2.6.8-2.8-.9-5.4-3.4-6.2-6.1-.3-.9.3-1.7 1.3-2.1Z"/></svg>`;
const arrow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>`;

const cards = sectors.flatMap((sector, index) => {
  const contact = getContact(sector);
  if (!contact) return [];
  const tag = sector.tag;
  return [`<a class="service service--${escape(sector.id)}" href="${escape(contact.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(sector.title)}: conversar com ${escape(contact.name)} pelo WhatsApp (abre em nova aba)">
    <span class="service-number" aria-hidden="true">0${index + 1}</span>
    <span class="service-body">
      <svg class="service-tag" viewBox="${tag.viewBox}" role="img" aria-label="Toccante ${escape(sector.title)}" focusable="false"><image href="./assets/tags/${tag.file}" width="${tag.width}" height="${tag.height}"/></svg>
      <span class="service-description">${escape(sector.description)}</span>
      <span class="service-contact">Conversar com ${escape(contact.name)} <span aria-hidden="true">↗</span></span>
    </span>
    <span class="service-action" aria-hidden="true">${whatsapp}${arrow}</span>
  </a>`];
}).join("\n");

const general = getContact(generalContact);
const generalMarkup = general ? `<section class="general" aria-labelledby="general-title"><span class="small-rule" aria-hidden="true"></span><h2 id="general-title">Precisa de ajuda para escolher um serviço?</h2><p>Converse com nossa equipe.</p><a class="general-button" href="${escape(general.url)}" target="_blank" rel="noopener noreferrer" aria-label="Falar com ${escape(general.name)} pelo WhatsApp (abre em nova aba)">${whatsapp}<span>Falar com ${escape(general.name)}</span>${arrow}</a></section>` : "";

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f7f1e6">
  <title>Grupo Toccante | Cerimonial, Musical, Buffet e Decoração</title>
  <meta name="description" content="Conheça os serviços do Grupo Toccante e fale diretamente com nossos especialistas em Cerimonial, Musical, Buffet e Decoração.">
  <meta property="og:title" content="Grupo Toccante | Atendimento">
  <meta property="og:description" content="Transformando momentos em experiências únicas. Escolha seu serviço e converse com nossa equipe pelo WhatsApp.">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="https://grupotoccanteoficial.github.io/Link.toccante/">
  <meta property="og:image" content="https://grupotoccanteoficial.github.io/Link.toccante/assets/logo/grupo-toccante.jpg">
  <meta property="og:image:alt" content="Brasão dourado original do Grupo Toccante">
  <meta name="twitter:card" content="summary">
  <link rel="canonical" href="https://grupotoccanteoficial.github.io/Link.toccante/">
  <link rel="icon" type="image/jpeg" href="./assets/logo/grupo-toccante.jpg">
  <link rel="stylesheet" href="./css/styles.css">
  <script src="./js/app.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#atendimento">Ir para os contatos</a>
  <div class="page-frame" aria-hidden="true"></div>
  <main class="page">
    <header class="brand-header">
      <p class="eyebrow"><span aria-hidden="true"></span> SEJA BEM-VINDO <span aria-hidden="true"></span></p>
      <img class="brand-logo" src="./assets/logo/grupo-toccante.jpg" alt="Brasão original do Grupo Toccante" width="108" height="108" fetchpriority="high">
      <h1>GRUPO TOCCANTE</h1>
      <p class="brand-signature">Transformando momentos em<br class="mobile-break"> experiências únicas.</p>
      <button class="replay" id="replay" type="button" hidden><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="m8 6 6 4-6 4Z"/></svg>Conheça a nossa essência</button>
    </header>
    <section class="services" id="atendimento" aria-labelledby="services-title">
      <div class="section-heading"><p class="eyebrow">QUATRO VERTENTES. UM SÓ CUIDADO.</p><h2 id="services-title">Como podemos fazer parte<br>do seu momento?</h2><p>Selecione o setor com o qual deseja conversar</p></div>
      <div class="service-list">${cards}</div>
      <p class="contact-note">${whatsapp}<span>Atendimento direto pelo WhatsApp</span></p>
    </section>
    ${generalMarkup}
    <footer class="footer"><p>Seu momento. Nossa dedicação.</p><span>© ${new Date().getFullYear()} Grupo Toccante</span></footer>
  </main>
  <dialog class="intro" id="intro" aria-label="Vídeo de abertura do Grupo Toccante">
    <video id="opening-video" muted playsinline preload="none" aria-label="Apresentação do Grupo Toccante"><source src="./assets/video/toccante-abertura-1920x1080.mp4" type="video/mp4"></video>
    <div class="intro-top"><span>GRUPO TOCCANTE</span><button id="skip-intro" type="button">Ir para atendimento <span aria-hidden="true">↗</span></button></div>
    <div class="intro-bottom"><button id="toggle-sound" type="button" aria-pressed="false">Ativar som</button><span>Momentos que ficam.</span></div>
  </dialog>
</body>
</html>
`;
await mkdir(new URL("css/", root), { recursive: true });
await writeFile(new URL("index.html", root), html);
await writeFile(new URL(".nojekyll", root), "");
console.log(`Página gerada: ${fileURLToPath(new URL("index.html", root))}. ${sectors.filter(s => getContact(s)).length} setores e ${general ? 1 : 0} atendimento geral.`);
