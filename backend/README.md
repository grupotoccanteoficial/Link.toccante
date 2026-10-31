# Backend exclusivo do rodízio Toccante

Cloudflare Worker `toccante-atendimento-router`, com um D1 novo e exclusivo
`toccante-atendimento-rodizio`. Não vincule banco de outro projeto.

Conta selecionada pelo solicitante: `35dd3011d50b6df5ead02fc66152e587`.
Antes de implantar, confira a conta e as permissões com `wrangler whoami`.
Nenhum plano pago, domínio próprio ou API paga de WhatsApp é necessário.

## Implantação inicial

Os exemplos usam Wrangler 4.92.0. Pode-se usar uma instalação já disponível ou
`npx wrangler@4.92.0` no lugar de `wrangler`.

1. Faça o login oficial e autorize Workers e D1 na conta selecionada.
2. Crie **uma única vez** o D1 exclusivo:
   `wrangler d1 create toccante-atendimento-rodizio`.
3. Copie o `database_id` real retornado para o binding `DB` em
   `backend/wrangler.jsonc`. Não reutilize nem invente um ID.
4. Aplique a migração no banco exclusivo:
   `wrangler d1 migrations apply DB --remote --config backend/wrangler.jsonc`.
5. Configure `RATE_LIMIT_SECRET` com pelo menos 32 caracteres aleatórios usando
   `wrangler secret put RATE_LIMIT_SECRET --config backend/wrangler.jsonc`.
   Informe o segredo somente pela entrada padrão. Não o salve no repositório,
   em argumentos de comandos ou logs.
6. Publique:
   `wrangler deploy --config backend/wrangler.jsonc`.
7. Use a URL HTTPS real devolvida pela Cloudflare em `js/distribution-config.js`.
8. Verifique `/health`, CORS e uma atribuição controlada; depois gere, teste e
   publique o frontend no GitHub Pages.

Se um recurso já tiver sido criado em uma execução anterior, consulte-o e reuse
seu ID. Não crie bancos extras como tentativa de corrigir uma falha de login.

Em novas versões, aplique somente migrações pendentes. Não edite migrações já
aplicadas, não recrie as tabelas e não zere `queue_state`.

## Teste com D1 local

```bash
wrangler d1 migrations apply DB --local --config backend/wrangler.jsonc
wrangler dev --local --config backend/wrangler.jsonc --port 8787 --var RATE_LIMIT_SECRET:local-test-only-secret-not-for-production-0001 --var ALLOW_LOCALHOST:true
```

Em outro terminal, execute `node scripts/check-router.mjs http://127.0.0.1:8787`.
Os dados locais ficam em `backend/.wrangler/`, ignorado no Git. São separados do
D1 remoto. Nunca publique `ALLOW_LOCALHOST=true` nem o segredo de teste.

## API

- `GET /health`: verifica acesso ao banco, sem alterar a fila.
- `OPTIONS /assign`: preflight CORS.
- `POST /assign`: JSON com `sector`, `sessionId` e `requestId` (UUIDs v4).

Resposta: `url`, `expiresAt` e `requestId`. A mensagem não contém nome pessoal.
Não há endpoint público para consultar registros ou modificar o ponteiro.

Somente `https://grupotoccanteoficial.github.io` é permitido em produção. Pedidos
inválidos retornam 400; origem não autorizada, 403; conflito de idempotência, 409;
limite excedido, 429; indisponibilidade, 503. Erros não retornam contato fixo.

## Transação e concorrência

`assign()` utiliza um único `DB.batch()` para:

1. Inserir a atribuição apenas quando não existe pedido idempotente ou sessão
   ativa e elegível.
2. Escolher a posição circular com SQL, a partir do ponteiro no D1.
3. Avançar o ponteiro e atualizar a sessão pelo trigger de inserção.
4. Associar a chave idempotente à sessão e à vertente.
5. Retornar a atribuição registrada.

O D1 executa o batch como uma transação. Falhas revertem todas as alterações.
A sessão e a chave do pedido são verificadas novamente dentro da transação,
sem depender de uma consulta prévia do navegador.

`queue_state` é o único ponteiro global, compartilhado entre as quatro vertentes.
Não há fila por setor, por processo do Worker ou por navegador.

## Retenção e limites

Sessões e pedidos são reutilizáveis por 30 minutos, com prazo verificado no
servidor. Um agendamento horário elimina registros vencidos em lotes; atribuições
vencidas há mais de 24 horas também são removidas quando não há referências.
O estado global da fila nunca participa dessa limpeza.

As chaves de limite por IP usam HMAC com `RATE_LIMIT_SECRET`. O IP bruto não é
gravado. Os limites básicos não impedem todo abuso distribuído; acompanhe os
limites gratuitos de Workers/D1 no painel antes de ampliar o volume.

## Evidência local

Os testes automatizados incluem 100 sessões concorrentes, repetição concorrente
de pedidos, expiração e rollback. O teste com runtime Worker/D1 local confirmou
20 repetições sem duplicar posição, 30 atribuições simultâneas distribuídas em
seis para cada especialista, e a exclusão do Renato fora de Buffet.
