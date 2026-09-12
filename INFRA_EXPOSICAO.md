# Infraestrutura de Exposição do Dashboard Remoto

Este documento detalha o passo a passo de configuração do acesso externo seguro ao Dashboard Remoto, utilizando o **Cloudflare Tunnels** combinado com o **Cloudflare Zero Trust** (Access).

## 1. Por que Cloudflare Tunnels?

O sistema roda localmente na máquina administrativa e **não possui sistema de login e senha**. O Dashboard Remoto precisa estar acessível pela internet para que curadores/operadores possam operá-lo via celular ou computador externo.
A adoção do `cloudflared` resolve dois problemas simultaneamente:
1. **Rede:** Ele opera como um túnel reverso, conectando a máquina administrativa à rede da Cloudflare de dentro para fora. Portanto, **não é necessário abrir portas no roteador local**, o que resolve problemas de CGNAT ou restrições de provedor.
2. **Segurança:** Sem um túnel autenticado, qualquer pessoa com a URL teria acesso ao dashboard e aos websockets. Utilizando o Cloudflare Access, adicionamos uma camada obrigatória de autenticação (SSO, envio de código no e-mail, etc.) na frente do túnel. A requisição nem chega ao host local sem ser autenticada.

## 2. Pré-requisitos
- Um domínio configurado no painel da Cloudflare (usando os Nameservers da Cloudflare).
- Uma conta no Cloudflare Zero Trust (gratuito para até 50 usuários).
- O Docker Compose do Auto Affiliate Publisher.

## 3. Configuração do Túnel

A configuração no painel do Cloudflare é simples:
1. Acesse o dashboard do Cloudflare Zero Trust.
2. Vá em **Networks > Tunnels** e clique em **Create a tunnel**.
3. Selecione **Cloudflared**.
4. Dê um nome ao túnel (ex: `aap-remote`).
5. A Cloudflare exibirá o token de instalação do túnel. Anote este token (ele tem o formato `ey...`).
6. Na aba **Public Hostname**, mapeie as rotas do túnel para a máquina local onde o servidor está rodando. Assumindo que o Dashboard Remoto roda na porta local `5181` e o Backend na `3333`, configure as regras, por exemplo:
   - `remote.seudominio.com` -> `http://host.docker.internal:5181` (Para a UI Vite)
   - `api.seudominio.com` -> `http://host.docker.internal:3333` (Para as chamadas Fastify)

## 4. Configuração de Autenticação (Cloudflare Access)
No mesmo painel Zero Trust:
1. Navegue para **Access > Applications** e clique em **Add an application**.
2. Escolha **Self-hosted**.
3. Defina a aplicação cobrindo a URL que você definiu para o dashboard (ex: `remote.seudominio.com`).
4. Na seção de **Policies**, crie uma regra do tipo **Allow**. Você pode configurar para permitir autenticação via **E-mails específicos** (ex: o e-mail do operador), domínio (ex: `@suaempresa.com.br`) ou provedor de identidade (Google, GitHub, etc).
5. Salve. Agora, toda vez que alguém acessar a URL, o Cloudflare pedirá autenticação antes de passar o tráfego para a sua máquina administrativa.

## 5. Rodando o Cloudflared Localmente
O container do `cloudflared` já está mapeado no arquivo `docker-compose.yml` do repositório. Para ligar o túnel:
1. Crie ou adicione a seguinte variável no seu `.env` raiz:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=seu_token_obtido_no_passo_3
   ```
2. Ao rodar `docker compose up -d`, o túnel subirá junto com a persistência e a fila, e o Dashboard Remoto estará protegido na internet.
