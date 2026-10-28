// Único arquivo de manutenção dos contatos. Use somente dígitos: país + DDD + número.
export const specialists = {
  israel: { name: "Israel", whatsapp: "5531983031736", active: true },
  raiane: { name: "Raiane", whatsapp: "5531999188761", active: true },
  marcela: { name: "Marcela", whatsapp: "5531984459856", active: true },
  paulo: { name: "Paulo", whatsapp: "5531998308910", active: true },
  renato: { name: "Renato", whatsapp: "5531982379454", active: true },
};

// Para mudar um responsável, altere apenas specialistId. {name} acompanha a troca.
export const sectors = [
  {
    id: "cerimonial", title: "Cerimonial", specialistId: "raiane", active: true,
    description: "Casamentos e organização de eventos.",
    message: "Olá, {name}! Vim pelo site do Grupo Toccante e gostaria de conhecer melhor os serviços de Cerimonial.",
    tag: { file: "tags-originais.png", viewBox: "663 232 765 232", width: 2172, height: 724 },
  },
  {
    id: "musical", title: "Musical", specialistId: "paulo", active: true,
    description: "Música para cerimônias e recepções.",
    message: "Olá, {name}! Vim pelo site do Grupo Toccante e gostaria de solicitar um orçamento para os serviços musicais.",
    tag: { file: "tags-originais.png", viewBox: "8 232 655 232", width: 2172, height: 724 },
  },
  {
    id: "buffet", title: "Buffet", specialistId: "renato", active: true,
    description: "Gastronomia e experiências.",
    message: "Olá, {name}! Vim pelo site do Grupo Toccante e gostaria de conhecer os serviços de Buffet.",
    tag: { file: "buffet-original.png", viewBox: "150 135 1750 425", width: 2048, height: 682 },
  },
  {
    id: "decoracao", title: "Decoração", specialistId: "marcela", active: true,
    description: "Projetos e ambientação de eventos.",
    message: "Olá, {name}! Vim pelo site do Grupo Toccante e gostaria de solicitar informações sobre os serviços de Decoração.",
    tag: { file: "tags-originais.png", viewBox: "1428 232 730 232", width: 2172, height: 724 },
  },
];

export const generalContact = {
  id: "geral", specialistId: "israel", active: true,
  message: "Olá, {name}! Vim pelo site do Grupo Toccante e gostaria de receber atendimento sobre os serviços da empresa.",
};

export function getContact(service) {
  const person = specialists[service.specialistId];
  if (!service.active || !person?.active) return null;
  if (!/^55\d{11}$/.test(person.whatsapp)) {
    throw new Error(`Número de WhatsApp inválido para ${service.specialistId}`);
  }
  const message = service.message.replaceAll("{name}", person.name);
  return { ...person, message, url: `https://wa.me/${person.whatsapp}?text=${encodeURIComponent(message)}` };
}
