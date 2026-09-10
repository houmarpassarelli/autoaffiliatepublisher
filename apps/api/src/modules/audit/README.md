# Módulo de Auditoria

Leitura de `dispatch_logs` para o Painel de Auditoria de Disparos do Dashboard Administrativo.

## Só existe leitura aqui

`dispatch_logs` é auditoria imutável: gravada uma única vez pela ação resolutiva do operador, em `modules/offers/offerResolutionService.ts`, e nunca reescrita. Este módulo não expõe verbo de escrita algum, e o model declara `timestamps: false` pelo mesmo motivo. A base é insumo direto do comissionamento futuro (`MONETIZACAO.md`, Seção 3) — corrigir uma linha aqui seria corrigir o histórico.

## A listagem não faz join

O model desnormaliza `operatorName`, `offerTitle` e `sourceName` justamente para isto. As sete colunas da tela saem de um único documento, sem `populate` e sem consulta por linha. É também o que preserva a auditoria quando o cadastro de origem muda ou some.

## Os quatro filtros são de naturezas diferentes

| Filtro | Campo | Natureza | Lista de opções |
| :--- | :--- | :--- | :--- |
| Operador | `operatorId` | Identidade | Cadastro de operadores |
| Canal | `channels` | Chave estável, casada contra um elemento do array | Cadastro de canais, exibindo o **rótulo** |
| Loja de origem | `sourceName` | **Texto congelado no disparo** | Valores distintos da própria coleção |
| Data | `dispatchedAt` | Intervalo de dias do calendário | — |

**Por que a loja filtra por texto e não por identificador:** o log não guarda `sourceId`. Guarda o nome como estava no instante do disparo, porque é isso que uma trilha imutável significa. Decorre daí que renomear uma fonte divide o filtro em duas entradas — os logs antigos permanecem sob o nome antigo. É o comportamento correto, e acrescentar `sourceId` ao model não consertaria os logs já gravados.

**Por que as opções de loja vêm dos logs e não do cadastro de fontes:** só assim toda opção oferecida corresponde a algum resultado. Uma fonte cadastrada que nunca originou disparo não tem o que filtrar.

## Fuso do recorte de datas

`from` e `to` chegam como `YYYY-MM-DD` e viram início e fim do dia **local da máquina administrativa**, nunca UTC. Interpretar em UTC jogaria um disparo das 22h de um dia brasileiro para o dia seguinte no filtro. O administrador escolhe um dia do calendário dele, e é esse dia que o recorte respeita.

## Paginação

`dispatch_logs` é a única coleção do sistema que cresce para sempre e nunca é podada. As demais telas do painel carregam tudo porque fontes, canais e operadores são dezenas. Aqui a listagem pagina, e os totais são calculados sobre o recorte **inteiro**, não sobre a página.

`totalValue` é soma de **preço de produto congelado no disparo** — não é comissão. O cálculo de comissão depende do cruzamento com os relatórios das plataformas e é projeto futuro.

## Exportação CSV

Existe para um uso declarado: o rateio é um cruzamento entre esta base e a planilha de vendas exportada da plataforma de afiliados (`MONETIZACAO.md`, Seção 3.2). Três decisões seguem do destino ser uma planilha em português:

- **Separador `;` e marca de ordem de bytes** — o Excel em português despeja um CSV separado por vírgula numa única coluna, e sem a BOM interpreta o arquivo como Latin-1, corrompendo todo acento.
- **Vírgula decimal e data `dd/MM/aaaa`** — para que a planilha leia número como número e data como data.
- **Neutralização de injeção de fórmula** — o título do produto e o nome da loja vêm de dados coletados de terceiros; um valor começando com `=` seria executado como fórmula ao abrir o arquivo.

A exportação ignora a paginação e preserva todos os demais filtros: o que sai é o recorte que o administrador está vendo, inteiro.

## Índices que sustentam a tela

Todos compostos com `dispatchedAt: -1`, porque a listagem é sempre ordenada por ele — sem o segundo campo, o filtro usaria o índice e a ordenação cairia em varredura.

| Índice | Filtro que sustenta |
| :--- | :--- |
| `{ dispatchedAt: -1 }` | Listagem sem filtro |
| `{ operatorId: 1, dispatchedAt: -1 }` | Operador |
| `{ sourceName: 1, dispatchedAt: -1 }` | Loja de origem |
| `{ channels: 1, dispatchedAt: -1 }` | Canal de destino |
| `{ productSku: 1 }` | Cruzamento com os relatórios de venda |

## Delimitação de escopo

`deliveryStatus` chega vazio em toda linha, e a tela e o arquivo dizem "Aguardando disparo" em vez de sugerir entrega. O resultado por canal pertence ao worker de disparo, que é da Categoria 6 e ainda não existe.
