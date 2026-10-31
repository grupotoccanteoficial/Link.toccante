import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sectors } from "../js/contacts.js";
import { specialists, eligiblePositions, whatsappUrl, messages } from "../backend/config.js";

test("ordem, números e elegibilidade permanecem centralizados no backend", () => {
  assert.deepEqual(specialists.map(p => [p.id, p.whatsapp]), [
    ["israel", "5531983031736"], ["raiane", "5531999188761"], ["marcela", "5531984459856"],
    ["paulo", "5531998308910"], ["renato", "5531982379454"],
  ]);
  for (const sector of sectors) {
    assert.deepEqual(eligiblePositions(sector.id), sector.id === "buffet" ? [0, 1, 2, 3, 4] : [0, 1, 2, 3]);
    for (const position of eligiblePositions(sector.id)) {
      const url = new URL(whatsappUrl(position, sector.id));
      assert.equal(url.origin, "https://wa.me");
      assert.equal(url.searchParams.get("text"), messages[sector.id]);
      assert.doesNotMatch(url.searchParams.get("text"), /Israel|Raiane|Marcela|Paulo|Renato/);
    }
  }
  assert.throws(() => whatsappUrl(4, "musical"));
});
test("HTML mantém quatro cartões, sem nomes, telefones ou seção de atendimento fixo", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.deepEqual([...html.matchAll(/data-sector="([^\"]+)"/g)].map(m => m[1]), ["cerimonial", "musical", "buffet", "decoracao"]);
  assert.equal((html.match(/class="service-contact">Conversar pelo WhatsApp/g) || []).length, 4);
  assert.doesNotMatch(html, /Israel|Raiane|Marcela|Paulo|Renato|wa\.me\/|general-title/);
  const files = new Set([...html.matchAll(/(?:href|src)="\.\/([^\"]+)"/g)].map(m => m[1]));
  for (const file of files) await access(new URL(`../${file}`, import.meta.url));
  const css = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  for (const [, font] of css.matchAll(/url\("\.\.\/([^\"]+)"\)/g)) await access(new URL(`../${font}`, import.meta.url));
});

test("CSS do design aprovado permanece byte a byte intacto", async () => {
  const css = await readFile(new URL("../css/styles.css", import.meta.url));
  // O Git pode normalizar CRLF no checkout do Windows.
  const normalized = css.toString("utf8").replaceAll("\r\n", "\n");
  const original = "8a686cad161f906437a39eb013c82a5337b53d02c1acc48623a83cf6fda6044e";
  assert.equal(createHash("sha256").update(normalized).digest("hex"), original);
});
