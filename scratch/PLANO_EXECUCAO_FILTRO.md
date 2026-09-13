# Plano de Execução: Filtro Determinístico Pré-IA

## 1. Contexto e Objetivo
Implementar o **Filtro Determinístico Pré-IA (Otimização de Custo)**, descrito na etapa 2 do `CHECKLIST.md` e detalhado no item 4.1 de `MONETIZACAO.md`. O objetivo é evitar o gasto de tokens de LLM com ofertas que não atendem aos critérios mínimos de publicação da fonte (ex: desconto muito baixo, preço fora da faixa, categorias indesejadas), descartando-as logo na fase de ingestão.

## 2. Escopo das Alterações

### A. Atualização de Contratos Compartilhados (`packages/shared/src/schemas/sourceSchemas.ts`)
Adicionar as configurações opcionais do filtro determinístico no Schema do Zod de fontes, permitindo sua gestão via Dashboard:
- `preFilterMinDiscount`: Desconto percentual mínimo (number).
- `preFilterMinPrice`: Preço mínimo aceitável (number).
- `preFilterMaxPrice`: Preço máximo aceitável (number).
- `preFilterAllowedCategories`: Array de strings de categorias permitidas.
- `preFilterBlockedCategories`: Array de strings de categorias bloqueadas.

### B. Atualização do Model do Banco de Dados (`apps/api/src/database/models/sourceModel.ts`)
Adicionar os mesmos campos do filtro na interface `SourceAttributes` e no `sourceSchema` do Mongoose.

### C. Atualização do Contrato de Oferta Bruta (`apps/api/src/modules/ingestion/contracts.ts`)
Adicionar o campo opcional `category?: string` na interface `RawOffer`, permitindo que os drivers de ingestão (quando implementados) informem a categoria extraída da loja para validação.

### D. Implementação da Lógica do Filtro (`apps/api/src/modules/ingestion/offerUtils.ts` ou um novo arquivo `filterService.ts`)
Criar uma função exportada `evaluateDeterministicFilter(rawOffer: RawOffer, source: SourceDocument): boolean`.
- A função calculará o desconto (via `calculateDiscountPct`) e validará contra `preFilterMinDiscount`.
- Validará o preço atual contra a faixa definida (`preFilterMinPrice` e `preFilterMaxPrice`).
- Validará a categoria da oferta (se presente) contra as listas de categorias permitidas e bloqueadas da fonte.
- Retornará `true` se a oferta for válida (deve continuar na pipeline) ou `false` se deve ser descartada.

## 3. Próximos Passos
Aguardo aprovação deste plano para:
1. Codificar e alterar os arquivos supracitados.
2. Registrar a alteração no `HISTORICO.md`.
3. Atualizar o `CHECKLIST.md` e o `DEVLOG.md`.
