// Configuração exclusiva do servidor. A ordem deste array é a ordem global da fila.
// Posições existentes devem permanecer estáveis; desative em vez de remover.
export const specialists = [
  { id: "israel", name: "Israel", whatsapp: "5531983031736", sectors: ["cerimonial", "musical", "buffet", "decoracao"], active: true },
  { id: "raiane", name: "Raiane", whatsapp: "5531999188761", sectors: ["cerimonial", "musical", "buffet", "decoracao"], active: true },
  { id: "marcela", name: "Marcela", whatsapp: "5531984459856", sectors: ["cerimonial", "musical", "buffet", "decoracao"], active: true },
  { id: "paulo", name: "Paulo", whatsapp: "5531998308910", sectors: ["cerimonial", "musical", "buffet", "decoracao"], active: true },
  { id: "renato", name: "Renato", whatsapp: "5531982379454", sectors: ["buffet"], active: true },
];

export const messages = Object.freeze({
  cerimonial: "Olá! Vim pelo site do Grupo Toccante e gostaria de solicitar informações sobre os serviços de Cerimonial.",
  musical: "Olá! Vim pelo site do Grupo Toccante e gostaria de solicitar um orçamento para os serviços musicais.",
  buffet: "Olá! Vim pelo site do Grupo Toccante e gostaria de conhecer os serviços de Buffet.",
  decoracao: "Olá! Vim pelo site do Grupo Toccante e gostaria de solicitar informações sobre os serviços de Decoração.",
});
export const SESSION_TTL_MS = 30 * 60 * 1000;
export function eligiblePositions(sector) {
  return specialists.flatMap((person, position) => person.active && person.sectors.includes(sector) ? [position] : []);
}
export function whatsappUrl(position, sector) {
  const person = specialists[position];
  if (!person?.active || !person.sectors.includes(sector) || !messages[sector] || !/^55\d{11}$/.test(person.whatsapp)) {
    throw new Error("Destino indisponível para a vertente.");
  }
  return `https://wa.me/${person.whatsapp}?text=${encodeURIComponent(messages[sector])}`;
}
