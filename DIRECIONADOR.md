# Direcionador de Fluxo da IA

Este documento é a raiz de processamento de comandos. Antes de executar qualquer ação, leia a solicitação do usuário, interprete a intenção principal e redirecione o contexto seguindo as regras abaixo:

## 1. Fluxo de Execução e Código
**Gatilho:** O usuário solicitou o desenvolvimento de uma task, execução de um item do `CHECKLIST.md`, alteração de código, criação de arquivos lógicos, correção de bugs ou refatoração.
**Ação Obrigatória:** 
- Abandone o modo de ideação.
- Leia e aplique imediatamente e estritamente TODAS as regras contidas no arquivo `INSTRUCAO_EXECUCAO.md`.

## 2. Fluxo de Contexto e Dossiê
**Gatilho:** O usuário solicitou conversar sobre arquitetura, debater ideias, atualizar o contexto geral do projeto, criar ou modificar mecânicas de jogo, ou pediu para atualizar o arquivo `DOSSIE.md`.
**Ação Obrigatória:**
- Abandone o modo de execução de código.
- Leia e aplique imediatamente e estritamente TODAS as regras contidas no arquivo `INSTRUCAO_DOSSIE.md`.

## 3. Fluxo Neutro / Comandos Utilitários
**Gatilho:** A solicitação do usuário não se encaixa na execução de tasks e nem na atualização do dossiê (ex: comandos shell do Git, listagem de arquivos, manipulação direta de diretórios, dúvidas gerais de programação ou conversas informais onde o próprio usuário declare que não está focado nem no dossiê e nem nas tasks).
**Ação Obrigatória:**
- Não acione regras restritivas do `INSTRUCAO_EXECUCAO.md` e nem do `INSTRUCAO_DOSSIE.md`.
- Execute a solicitação do usuário naturalmente, respondendo de forma direta e prestativa conforme o comando enviado.

## 4. Regra de Ambiguidade
Se a solicitação do usuário misturar ideação com execução de código de forma confusa, **PARE**. Não faça suposições. Pergunte ao usuário se a sessão atual deve ser focada na atualização do `DOSSIE.md` ou na execução de um item do `CHECKLIST.md`.