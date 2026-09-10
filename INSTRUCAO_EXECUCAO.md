# Instruções Majoritárias de Desenvolvimento

As regras abaixo são de prioridade máxima. Siga-as estritamente em todas as interações.

## 1. Restrições e Regras Gerais
- **Controle de Versão:** **NÃO** crie branches, não faça commits, nem realize `pull` ou `push` sem o pedido explícito do solicitante.
- **Qualidade de Código:** **NÃO** crie gambiarras ou soluções que fujam da arquitetura atual. É **OBRIGATÓRIO** escrever códigos claros, alinhados com as padronizações do projeto e com nível de qualidade de mercado e em inglês.
- **Idioma:** É **OBRIGATÓRIO** o uso de comentários em Português do Brasil (pt-BR) em funções, métodos, classes e fluxos lógicos, schemas e objetos de schemas, explicando claramente o propósito de cada bloco.

## 2. Contexto e Preparação (Antes de Planejar)
Para garantir a compreensão do estado atual do projeto antes da proposição de soluções:
- **Leitura Obrigatória:** Leia e **ENTENDA** os arquivos `CHECKLIST.md` e `DEVLOG.md`. Eles são o histórico principal do que já foi feito e do que precisa ser feito.
- **Recomendação (Repositório):** Leia os últimos commits da branch `main` ou da branch atual para contextualização do histórico de versão.
- **Recomendação (Documentação):** Leia os demais arquivos `.md` presentes na raiz do diretório, além dos já citados.

## 3. Planejamento da Execução (Obrigatório)
Nenhuma alteração de arquivo ou código deve ser feita sem aprovação prévia.
1. **Apresentação:** Crie um **PLANO de Execução** detalhado e apresente-o ao solicitante.
2. **Registro no Histórico:** Após a aprovação, registre o plano no arquivo `HISTORICO.md`. 
3. **Padrão de Registro:** Cada entrada no `HISTORICO.md` deve conter obrigatoriamente:
   - Data
   - Hora
   - Título do plano
   - Contexto do plano
4. **Atualizações:** Se o plano sofrer alterações durante a sessão, o arquivo `HISTORICO.md` deve ser atualizado imediatamente.
5. **Skills:** Use sempre que necessário o Skill `gauntlet-loop` (.claude/skills/gauntlet-loop/SKILL.md) para garantir a qualidade do código.

## 4. Padrões de Arquitetura e Stack
- **Banco de Dados:** O sistema utiliza **MongoDB**. Presuma sempre uma arquitetura de dados dinâmica; não gere estruturas para conteúdo estático (HTML/CSS fixo).
- **Backend/Frontend:** Mantenha a separação clara de responsabilidades. Utilize *Service Providers* para injeção de dependências e evite lógica de negócios solta nos controllers. No frontend, priorize abordagens modernas e reativas.

## 5. Formato de Saída de Código
- **Trechos Específicos:** Ao alterar um arquivo existente, **NÃO** reescreva o arquivo inteiro na resposta. Mostre apenas o bloco modificado e algumas linhas de contexto (antes e depois) para facilitar a localização.
- **Nomes de Arquivos:** Sempre adicione o caminho completo do arquivo como comentário na primeira linha de qualquer bloco de código gerado (ex: `// caminho/do/arquivo.php` ou `// caminho/do/arquivo.js`).

## 6. Tratamento de Erros
- Se a execução do código gerar um erro, **NÃO** crie soluções especulativas ou gambiarras.
- Peça os logs de erro ou inspecione o terminal antes de sugerir qualquer alteração no plano original.

## 7. Fechamento (Após a Execução)
Após a implementação e validação do código, as seguintes etapas são obrigatórias:
- **Atualizar `DEVLOG.md`:** Registre detalhadamente o que foi atualizado ou criado na sessão.
- **Atualizar `CHECKLIST.md`:** Marque a task referenciada como concluída e mova-a para a seção *"Implementados no Código"*, respeitando sua devida categoria/segmento.

## 8. Regras
Essas regras devem ser seguidas de forma majoritária, inegociável e questionável:
- **Não executar certos comandos git sem autorização:** Os comandos **git add** e **git commit** NÃO devem ser executados sem permissão. Comandos para leitura de commits pode ser executado. Os comandos **git log** e **git status**, podem ser executados.