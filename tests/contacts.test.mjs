import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { specialists, sectors, generalContact, getContact } from "../js/contacts.js";

const expected = { cerimonial: ["raiane", "5531999188761"], musical: ["paulo", "5531998308910"], buffet: ["renato", "5531982379454"], decoracao: ["marcela", "5531984459856"], geral: ["israel", "5531983031736"] };
test("os cinco destinos e as mensagens correspondem aos contatos fornecidos", () => {
  for (const item of [...sectors, generalContact]) {
    const contact = getContact(item);
    const url = new URL(contact.url);
    assert.equal(item.specialistId, expected[item.id][0]);
    assert.equal(url.origin, "https://wa.me");
    assert.equal(url.pathname, `/${expected[item.id][1]}`);
    assert.equal(url.searchParams.get("text"), contact.message);
    assert.ok(contact.message.startsWith(`Olá, ${contact.name}!`));
    assert.ok(!contact.message.includes("{name}"));
  }
});
test("trocar um responsável atualiza destino e saudação; inativos não geram link", () => {
  const contact = getContact({ ...sectors[0], specialistId: "israel" });
  assert.equal(new URL(contact.url).pathname, "/5531983031736");
  assert.ok(contact.message.startsWith("Olá, Israel!"));
  assert.equal(getContact({ ...sectors[0], active: false }), null);
  assert.equal(getContact({ ...sectors[0], specialistId: "ausente" }), null);
  const original = specialists.raiane.active;
  specialists.raiane.active = false;
  assert.equal(getContact(sectors[0]), null);
  specialists.raiane.active = original;
});
test("o HTML publicado já contém os cinco links e todos os assets locais existem", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^\"]+)"/g)].map(m => m[1]);
  assert.equal(links.length, 5);
  assert.deepEqual(links, [...sectors, generalContact].map(item => getContact(item).url));
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 5);
  const files = new Set([...html.matchAll(/(?:href|src)="\.\/([^\"]+)"/g)].map(m => m[1]));
  for (const file of files) await access(new URL(`../${file}`, import.meta.url));
  const css = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  for (const [, font] of css.matchAll(/url\("\.\.\/([^\"]+)"\)/g)) await access(new URL(`../${font}`, import.meta.url));
});
