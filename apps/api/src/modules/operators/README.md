# Módulo de Operadores

Cadastro e presença ativa dos responsáveis pela curadoria.

## Escopo previsto (Sprints 1 e 3)

- CRUD de operadores no Dashboard Administrativo: nome obrigatório, e-mail opcional, sem senha ou token.
- Tela-portão de seleção no Dashboard Remoto, com nomes em uso desabilitados e marcados como "Em uso".
- Controle de presença ativa derivado do socket vivo.
- Reconciliação de presença órfã por expiração de heartbeat, para sockets caídos sem `close` limpo.

## Nota de segurança

Não há autenticação. A identificação existe para **atribuição de autoria** no comissionamento, não para controle de acesso. A proteção real do Dashboard Remoto é de rede — VPN, túnel reverso ou proxy autenticado (decisão em aberto).
