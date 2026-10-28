# Grupo Toccante — Atendimento

Página oficial de atendimento, estática e responsiva, com abertura em vídeo e
links diretos para WhatsApp. Não utiliza backend, login, cookies de rastreamento
ou serviços pagos. Os cinco contatos já estão no HTML e funcionam mesmo com
JavaScript desativado.

## Publicação

Repositório: [grupotoccanteoficial/Link.toccante](https://github.com/grupotoccanteoficial/Link.toccante).

Endereço previsto do GitHub Pages:
`https://grupotoccanteoficial.github.io/Link.toccante/`.
Esse endereço só fica disponível depois de habilitar Pages e concluir o deploy.

Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
O workflow `.github/workflows/pages.yml` gera a página, executa os testes e publica
automaticamente cada push na `main`. O job precisa concluir com sucesso antes
de considerar o endereço publicado.

Como alternativa, o HTML gerado também é compatível com **Deploy from a branch**,
selecionando `main` e `/(root)`. O arquivo `.nojekyll` já está incluído. Não há
domínio próprio configurado.

## Alterar números, responsáveis e mensagens

Edite somente [`js/contacts.js`](js/contacts.js):

- `specialists`: nome, número internacional (somente dígitos) e estado ativo.
- `sectors`: serviço, descrição, `specialistId` e mensagem.
- `generalContact`: responsável pelo atendimento geral e mensagem.

Para trocar o responsável de um setor, altere `specialistId`. O marcador `{name}`
na mensagem acompanha essa troca. Para ocultar um setor ou especialista, use
`active: false`. A função `getContact()` valida o telefone e codifica a mensagem
com `encodeURIComponent()`.

Mapeamento inicial fornecido no briefing, editável e sem atribuição de cargo:

| Atendimento | Contato | Telefone |
| --- | --- | --- |
| Cerimonial | Raiane | (31) 99918-8761 |
| Musical | Paulo | (31) 99830-8910 |
| Buffet | Renato | (31) 98237-9454 |
| Decoração | Marcela | (31) 98445-9856 |
| Geral | Israel | (31) 98303-1736 |

Depois de editar, execute `node scripts/build.mjs` para atualizar o HTML e
`node --test tests/contacts.test.mjs` para conferir a configuração. O workflow
também faz isso automaticamente durante a publicação. Números duplicados no
HTML são saída gerada; não devem ser alterados manualmente.

## Desenvolvimento

Requer Node.js 20 ou superior. Não é necessário instalar dependências.

```bash
node scripts/build.mjs
node --test tests/contacts.test.mjs
node scripts/serve.mjs
```

Abra `http://127.0.0.1:4175/Link.toccante/`. A prévia usa o mesmo subdiretório do
GitHub Pages para testar os caminhos relativos. Use Ctrl+C para encerrar.

## Identidade e arquivos originais

As cores seguem a solicitação específica desta página:

- Musical: branco com letras e detalhes dourados.
- Cerimonial: marsala com letras e detalhes dourados.
- Buffet: preto com letras e detalhes dourados.
- Decoração: dourado com letras e detalhes brancos.

Fundo institucional creme, títulos em EB Garamond e textos em Lato. As fontes
são servidas pelo próprio site; licenças SIL OFL incluídas em `assets/fonts/`.

O brasão, as quatro tags e o vídeo foram fornecidos pelo solicitante. Os PNGs
originais são preservados, com transparência e cores intactas. As tags Musical,
Cerimonial e Decoração estão na mesma imagem; janelas SVG apenas exibem a região
de cada tag, sem redesenhar nem recolorir o arquivo.

O vídeo original, em 1920×1080 e com 7,4 segundos, abre automaticamente uma vez
por sessão, sem som. Há opções de pular, ativar som e rever. Falhas de reprodução
ou carregamento liberam o atendimento. A preferência de redução de movimento
desativa a abertura automática. Sem JavaScript, os contatos continuam visíveis.

## Estrutura

```text
index.html                 # HTML estático gerado e pronto para Pages
css/styles.css             # Identidade, estados de foco e responsividade
js/contacts.js             # Configuração central dos contatos
js/app.js                  # Abertura em vídeo
assets/logo/               # Brasão original
assets/tags/               # PNGs originais das tags
assets/video/              # Motion original
assets/fonts/              # Fontes e licenças
scripts/build.mjs          # Gera HTML a partir da configuração
scripts/serve.mjs          # Prévia local
tests/contacts.test.mjs     # Destinos, mensagens, inativos e assets
.github/workflows/pages.yml
.nojekyll
```

## Verificações

Os testes conferem os cinco números, as mensagens decodificadas, a troca de
responsável, os estados inativos, os links pré-renderizados e a existência dos
assets. Os testes não enviam mensagens aos contatos.

Prévia validada em desktop e viewport mobile de 390 px, sem transbordamento
horizontal. Vídeo carregado em 1920×1080, encerramento automático conferido.
A disponibilidade pública depende do resultado do GitHub Pages e deve ser
confirmada após cada publicação.
