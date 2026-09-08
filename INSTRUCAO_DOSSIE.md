# Instruções de Atualização de Contexto e Planejamento

As regras abaixo ditam como a IA deve atuar durante sessões de planejamento, ideação e documentação. O objetivo principal é manter a "Bíblia do Projeto" (`DOSSIE.md`) atualizada e limpa.

## 1. Regras e Restrições Gerais
- **Foco em Documentação:** Como regra geral, **NÃO** gere ou altere código-fonte do jogo durante este fluxo. O objetivo aqui é extrair decisões arquiteturais, de design e de negócios.
- **Controle de Versão:** **NÃO** crie branches, não faça commits, nem realize `pull` ou `push`. O controle de versão será realizado exclusivamente pelo solicitante/usuário.
- **Autoridade do Dossiê:** O arquivo `DOSSIE.md` é o documento central de planejamento do projeto. Todo novo material discutido deve ser processado e consolidado nele.
- **Arquivos Protegidos:** É estritamente **PROIBIDO** alterar ou escrever nos arquivos `DEVLOG.md` (reservado para logs de execução) e `HISTORICO.md` (reservado para planos aprovados de execução) durante o fluxo de atualização do dossiê.
- 🛠️ **Exceção (Scripts Temporários de Tratamento):** É permitido criar e utilizar scripts auxiliares (ex: Node.js, Python, etc.) estritamente para automatizar o pré-processamento, limpeza, deduplicação ou extração do histórico de conversas brutas. **Obrigatório:** Esses scripts são de uso temporário e **DEVEM ser removidos/descartados** assim que a versão final do texto for consolidada no `DOSSIE.md`.

## 2. Metodologia de Processamento e Fluxo de Proposta
Para qualquer solicitação de atualização do `DOSSIE.md` ou arquivos anexados (exceto os protegidos), siga estritamente este fluxo:

1. **Apresentação do Plano:** Analise o histórico e as solicitações. Antes de alterar os arquivos definitivos, apresente uma proposta clara em formato de texto estruturado na resposta, detalhando o que será alterado, as seções/novas categorias do `DOSSIE.md` e a sincronização com os demais arquivos. Conclua perguntando ao usuário se ele aprova a execução.
2. **Interpretação da Autorização:** Aguarde a resposta do usuário e interprete contextualmente a aprovação (sem exigir palavras-chave rígidas).
3. **Execução:** Após a concordância do usuário, execute as alterações nos arquivos definitivos.
4. **Propagação (Atualização em Cascata):** 
   - **Limpeza:** Aplique a clarificação de texto e extração da essência (remover gírias, manter cronologia).
   - **Atualizar `CHECKLIST.md`:** Identifique tarefas executáveis derivadas da conversa e adicione-as.
   - **Atualizar Documentos de Apoio:** Sincronize eventuais novos tópicos ou categorias com as documentações periféricas autorizadas.

## 3. Estrutura do Dossiê e Flexibilidade
Ao atualizar o `DOSSIE.md`, utilize as categorias base já estabelecidas, mas sinta-se livre para criar novas se a complexidade do novo material exigir.

## 4. Formato de Resposta (Pós-Execução)
Após a conclusão da implementação, retorne:
1. Um resumo claro do que foi adicionado ou modificado no `DOSSIE.md` (incluindo menção a novas categorias criadas, se houver).
2. A confirmação da exclusão de eventuais scripts temporários utilizados no processo.
3. A confirmação de que o `CHECKLIST.md` e os documentos de apoio foram atualizados em cascata, respeitando a proteção dos arquivos `DEVLOG.md` e `HISTORICO.md`.