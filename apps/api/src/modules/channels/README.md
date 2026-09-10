# Módulo de Canais de Destino

CRUD dos destinos de publicação e a leitura que alimenta o seletor multicanal do card.

## Rotas e seus dois públicos

| Rota | Dashboard | Devolve |
| :--- | :--- | :--- |
| `GET /api/channels/active` | Remoto | Só os ativos, sem qualquer traço de credencial |
| `GET/POST/PUT/DELETE /api/channels` | Administrativo | Cadastro inteiro, com os **nomes** das credenciais e os canais desativados |

O caminho `/api/channels` pertence ao CRUD administrativo, como manda a tabela de rotas do `ESPECS_TECNICAS.md`, Seção 9. A leitura do dashboard remoto ganhou o sufixo `/active`, que diz para quem ela é — em vez de dois públicos disputarem o mesmo caminho com DTOs diferentes.

## É o único CRUD do painel com efeito imediato no dashboard remoto

Os checkboxes do seletor multicanal **são** a lista mantida aqui (`FLUXO_OPERACIONAL.md`, Seção 6). Por isso toda escrita termina em `CHANNELS_UPDATED`: sem o broadcast, o operador continuaria vendo canais que não existem mais, ou deixaria de ver um canal recém-criado até recarregar a página.

Duas decisões dentro do broadcast:

- **Vai o DTO comum, não o administrativo.** O evento é consumido pelo dashboard remoto, que é Thin Client e não deve saber sequer quais credenciais existem.
- **Vai a lista completa, não um delta.** É o que permite ao cliente substituir o estado inteiro sem reconciliação — foi assim que `useChannels` já estava escrito, e ele filtra os inativos do seu lado.

## Regras não-negociáveis

- **Credencial não trafega ao cliente remoto.** O `ChannelDto` sequer declara o campo; o `AdminChannelDto` acrescenta apenas `credentialKeys`. Os dois mapeadores não são duplicação: são dois públicos com direitos diferentes.
- **A `key` é imutável após a criação.** Ela já está gravada nos `selectedChannels` das ofertas agendadas e nas linhas de `dispatch_logs`. Renomeá-la romperia o vínculo com a auditoria, que é insumo do comissionamento — por isso ela não aparece no schema de edição.
- **Excluir é diferente de desativar.** A exclusão é recusada com 409 enquanto a chave aparecer numa oferta ou num log. O vínculo é pela chave desnormalizada: a linha de auditoria sobreviveria, mas a aba Agendadas perderia o rótulo e passaria a exibir a chave crua, que é identificador de payload e não o nome pelo qual o operador conhece o destino.
- **`copyFormatKey` é enum fechado.** Aponta para a variante de `aiCopy` que o driver daquele canal vai consumir; texto livre ali produziria canal sem copy no momento do disparo.

## Pendências que atravessam este módulo

- **Criptografia em repouso** das credenciais de envio — decisão em aberto (`CHECKLIST.md`, Categoria 8), a ser aplicada em `database/credentials.ts`.
- **Os drivers não existem.** `mode: AUTOMATED` declara a intenção de publicar por API; quem publica de fato é a Categoria 6, ainda pendente.
