# Módulo de Processamento Inteligente (IA)

Única etapa do pipeline em que a variação criativa é desejável. Recebe um payload **já estruturado e validado** (título, preços, desconto, especificações, loja) somado ao `aiPromptTemplate` da fonte, e devolve exclusivamente texto.

## Regra de fronteira (não-negociável)

O LLM **nunca** recebe HTML bruto para extrair e **nunca** é instruído a navegar. Violar essa fronteira torna o pipeline caro, lento e não determinístico (`DOSSIE.md`, Interação 1, Ponto 2).

## Escopo previsto (Sprint 1)

- Cliente de integração com o provedor de LLM.
- Geração das 3 variantes de copy numa única chamada: `messaging`, `social` e `article`.
- Filtro determinístico pré-IA: descarte de ofertas irrelevantes **antes** de gastar tokens, por desconto mínimo, faixa de preço e categoria, configurável por fonte.
- Regeneração de copy sob demanda do operador.

## Decisão em aberto

Provedor e modelo de LLM, com o custo por oferta processada — insumo direto do modelo de custos (`MONETIZACAO.md`).
