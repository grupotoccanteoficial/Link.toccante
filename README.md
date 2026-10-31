# Grupo Toccante — Atendimento

Página oficial no GitHub Pages, com abertura em vídeo e quatro cartões de serviço.
A distribuição de atendimentos é feita por um Cloudflare Worker e um D1 dedicados
exclusivamente a este projeto. O navegador não escolhe especialistas nem controla
a fila.

## Endereço e publicação

Frontend: https://grupotoccanteoficial.github.io/Link.toccante/

O workflow `.github/workflows/pages.yml` gera a página, executa os testes e publica
a `main` no GitHub Pages. A URL do backend é configurada em
`js/distribution-config.js`. O build de produção recusa uma URL ausente ou inválida.

O backend deve ser publicado e verificado antes de publicar mudanças no frontend.
As instruções de implantação e operação estão em [backend/README.md](backend/README.md).

## Rodízio global

A ordem é Israel → Raiane → Marcela → Paulo → Renato → início. Renato é elegível
somente para Buffet. Fora de Buffet, a fila o ignora, sem reservar sua posição,
e continua a partir do próximo especialista elegível.

Uma sessão mantém sua atribuição por 30 minutos. Trocar de vertente reaproveita a
pessoa atribuída se ela for elegível; caso contrário, faz uma nova distribuição.
Recarregar a página não reinicia a fila. Implantar uma versão do Worker também
não reinicia o ponteiro persistido no D1.

O frontend envia apenas `sector`, `sessionId` e `requestId`. O servidor valida
a chave idempotente, a sessão e a vertente. A atribuição, o avanço do ponteiro e a
atualização da sessão são executados em uma transação D1, com trigger SQL.
A janela de 30 minutos é controlada pelo servidor.

## Manutenção

- **Telefones, ordem e elegibilidade:** `backend/config.js`.
- **Mensagens de WhatsApp:** `messages` no mesmo arquivo do backend.
- **Descrições e tags dos cartões:** `js/contacts.js` (somente conteúdo visual).
- **Origem HTTPS do Worker:** `js/distribution-config.js`.
- **Cores e layout aprovados:** `css/styles.css`, preservado nesta atualização.

Não remova nem reordene posições de especialistas já implantadas sem uma migração
planejada. Para suspender uma pessoa, prefira `active: false`. Ao trocar um número
ou uma regra no backend, publique novamente o Worker.

## Desenvolvimento e testes

Requer Node.js 22.13 ou superior. A página e os testes unitários não precisam
de instalação de dependências.

```bash
node scripts/build.mjs
node --test tests/*.test.mjs
node scripts/serve.mjs
```

A prévia fica em `http://127.0.0.1:4175/Link.toccante/`. Antes de configurar o
backend, uma geração local pode usar `node scripts/build.mjs --allow-unconfigured-backend`.
Essa opção não é usada no workflow de produção.

Os testes cobrem ordem, salto de inelegíveis, concorrência, persistência,
idempotência, expiração, rollback, validação, CORS, limites e dados mínimos do
navegador. O SQL é executado em SQLite, não em uma simulação do algoritmo.

O teste adicional `scripts/check-router.mjs` exercita o runtime Worker/D1 real.
Ele cria atribuições técnicas e não abre nem envia mensagens de WhatsApp:

```bash
node scripts/check-router.mjs http://127.0.0.1:8787
```

Para apontá-lo a um backend publicado, é necessário acrescentar explicitamente
`--allow-live-assignment`. Esses testes consomem posições da fila e não devem
ser executados rotineiramente na produção.

## Interface preservada

Logo, tags originais, fontes EB Garamond e Lato, cores, bordas, espaçamentos,
responsividade e abertura em vídeo foram mantidos. Os quatro cartões exibem
“Conversar pelo WhatsApp”, sem nomes. A seção antiga de atendimento geral foi
removida por solicitação do usuário.

O vídeo continua abrindo uma vez por sessão, com opções de pular, ativar som e
rever. A preferência de redução de movimento desativa a abertura automática.

O rodízio requer JavaScript e conexão com o backend. Se o serviço falhar, a página
informa o erro e permite tentar novamente com a mesma chave. Não há fallback
para número fixo ou escolha aleatória. A navegação ao WhatsApp usa a mesma aba,
evitando bloqueadores de pop-up em celulares.

## Proteções e dados

O Worker aceita apenas a origem do frontend, valida a vertente e os UUIDs,
limita corpos a 1 KB e aplica limites por sessão e IP (HMAC, sem armazenar IP bruto).
CORS e limites básicos reduzem abuso; não constituem uma prova de identidade
humana. Os identificadores técnicos da sessão ficam no sessionStorage, sem
armazenar especialista ou ponteiro no navegador.

Os limites são 30 pedidos por sessão/minuto e 120 por IP/minuto. Respostas de
erro não devolvem números alternativos. O banco tem limpeza periódica em lotes,
preservando sempre o ponteiro global.

## Arquivos principais

```text
index.html                         # HTML gerado
css/styles.css                     # Visual aprovado, preservado
js/app.js                          # Abertura em vídeo, preservada
js/contacts.js                     # Metadados visuais das vertentes
js/distribution-config.js          # URL pública do Worker
js/distribution-client.js          # Identificadores e chamada à API
js/distribution.js                 # Cliques, estado acessível e navegação
backend/config.js                  # Contatos, mensagens e elegibilidade
backend/distributor.js             # Transação de distribuição
backend/worker.js                  # API HTTPS, validação e limites
backend/migrations/                # Histórico SQL imutável
backend/wrangler.jsonc             # Worker e banco exclusivo
assets/                            # Materiais originais preservados
scripts/                           # Build, prévia e teste de integração
tests/                             # Testes automatizados
```

As licenças das fontes SIL OFL permanecem em `assets/fonts/`.
