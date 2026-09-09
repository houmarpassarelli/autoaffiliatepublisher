# Módulo de Ingestão e Raspagem

Responsável por toda a **descoberta determinística** de ofertas. Nenhuma etapa deste módulo envolve a IA — a fronteira arquitetural do projeto é que o LLM não navega, não raspa e não descobre ofertas (`ARQUITETURA.md`, Seção 2).

## Escopo previsto (Sprint 1)

- Scheduler por fonte com `node-cron`, lendo a `cronExpression` de cada documento de `sources`.
- Ingestor `API`: cliente genérico de APIs oficiais de afiliados — caminho preferencial.
- Ingestor `RSS`: leitor de feeds XML/RSS/CSV das redes de afiliados.
- Ingestor `SCRAPER`: raspagem dirigida com Cheerio/Axios (estático) e navegador headless (dinâmico).
- Serviço de conversão de link de afiliado a partir da `affiliateTag` da fonte.
- Deduplicação por `dedupeHash` (SHA-256 da URL canônica) e por SKU.
- Cálculo do desconto percentual e alimentação do `priceHistory`.
- Reverificação de preço e disponibilidade antes do disparo.

## Decisão em aberto

Escolha única entre **Playwright** e **Puppeteer** — o projeto não deve manter as duas dependências (`CHECKLIST.md`, Categoria 8).
