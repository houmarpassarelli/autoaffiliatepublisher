# Módulo de Publicação Multicanal (Drivers)

Cada canal tem um driver isolado, executado **exclusivamente na máquina administrativa**. Nenhum token de rede social trafega para o Dashboard Remoto (`ARQUITETURA.md`, Seção 6 — Thin Client).

## Drivers previstos (Sprint 2)

| Canal | Modo | Observação |
| :--- | :--- | :--- |
| Telegram | Automação total | Bot API aberta e gratuita. Disparo imediato. |
| Site próprio | Automação total | API interna do CMS ou escrita direta em banco. |
| Instagram (Feed/Carrossel) | Automação oficial | Meta Graph API. Sem link clicável em legenda. |
| Instagram (Stories) | Assistido | Preparação de criativo + legenda para postagem manual. |
| TikTok | Assistido | Preparação de criativo + legenda. |
| WhatsApp (Canais) | Assistido | Sem API oficial de postagem. Mensagem pronta para colar. |

## Decisão em aberto

Estratégia de WhatsApp: modo exclusivamente assistido ou adoção de biblioteca não-oficial com o risco de banimento aceito (`TOOLS.md`, Seção 4.1).
