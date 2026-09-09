# @aap/ui

Componentes, estilos e hooks de interface compartilhados pelo Dashboard Administrativo e pelo Dashboard Remoto.

## Por que existe

As duas interfaces são telas diferentes do mesmo produto e usam o mesmo kit. Sem um pacote comum, cada componente seria escrito duas vezes e o requisito de "sem animações" viraria duas regras que podem divergir com o tempo. É o mesmo raciocínio que justifica o `@aap/shared` para os contratos de domínio.

## Como o requisito "sem animações" é sustentado

O requisito é explícito no `TOOLS.md`, Seção 7: as interfaces não devem ter animações nem complexidade visual, apenas as reações corretas. Ele é garantido em três camadas:

1. **Arquitetura de componente** — o JavaScript do Bootstrap/Tabler **não é carregado**. Modal e abas são React puro sobre as classes CSS do kit. Além do conflito entre a manipulação direta do DOM e a árvore controlada pelo React, o JS do Bootstrap coordena a exibição por eventos `transitionend`, que se tornam imprevisíveis quando as transições são zeradas.
2. **Ausência das classes de transição** — nenhum componente recebe `fade`, `show` ou `collapsing`. Os elementos estão presentes ou ausentes, sem passo intermediário.
3. **Rede de segurança em CSS** — `animation` e `transition` zerados globalmente, cobrindo qualquer estilo de terceiro que escape das duas camadas acima.

## O que "apenas as reações corretas" significa na prática

Sem animação não é sem retorno. Três consequências concretas:

- **Carregamento sem spinner.** O spinner do kit é uma `animation`, que a regra global congela — e um spinner parado comunica o oposto do que deveria. O retorno vem de rótulo e desabilitação (`Button`) ou de texto explícito (`LoadingState`).
- **`:focus-visible` preservado.** O indicador de foco não é enfeite: é o que torna a interface operável por teclado.
- **Erro nunca é confundido com vazio.** O `DataTable` verifica erro antes de carregamento e ambos antes da lista vazia, porque "não consegui carregar" e "não há registros" exigem ações diferentes do operador.

## Componentes

| Grupo | Componentes |
| :--- | :--- |
| Layout | `AppShell`, `PageHeader` |
| Superfícies | `Card`, `Modal` |
| Ações | `Button`, `Badge` |
| Dados | `DataTable`, `LoadingState`, `EmptyState`, `ErrorState` |
| Formulário | `TextField`, `TextAreaField`, `SelectField`, `CheckboxField` |
| Navegação | `Tabs` |
| Feedback | `Alert` |
| Hooks | `useBackendHealth` |

## Uso

```tsx
import '@aap/ui/styles.css';
import { AppShell, PageHeader, Card } from '@aap/ui';
```

A folha de estilo é importada uma única vez, no ponto de entrada de cada aplicação. Ela já traz o Tabler, as camadas do Tailwind e as regras acima.
