# Modelo de Receita e Custos - Projeto Auto Affiliate Publisher

Este documento descreve a origem da receita do projeto, a estrutura de rateio para operadores colaboradores, o mecanismo de cruzamento de dados que viabiliza o comissionamento e os custos operacionais recorrentes.

---

## 1. Origem da Receita

A receita do projeto é **100% comissão de programas de afiliados**. O sistema não cobra do usuário final, não vende assinatura e não veicula publicidade própria.

```
[Oferta capturada] → [Link de afiliado gerado] → [Publicado em canal]
                                                        │
                                                        ▼
                                            [Audiência clica e compra]
                                                        │
                                                        ▼
                                     [Plataforma credita comissão ao afiliado]
```

O valor por venda é definido inteiramente pelo programa de afiliados de origem (percentual sobre o valor do pedido, variando por categoria de produto e por plataforma). O projeto não influencia esse percentual — ele **maximiza o volume e a qualidade das publicações** que geram o clique.

---

## 2. Alavancas de Receita do Sistema

O que o Auto Affiliate Publisher efetivamente aumenta:

| Alavanca | Como o sistema atua |
| :--- | :--- |
| **Volume de ofertas publicadas** | A preparação (busca, link, imagem, copy) fica 100% pronta. O custo humano cai para 5–10 segundos por item. |
| **Qualidade da curadoria** | O operador vê desconto percentual calculado e histórico de preços, publicando apenas o que converte de fato. |
| **Cobertura de canais** | A mesma oferta alcança WhatsApp, Telegram, Instagram, TikTok e site próprio a partir de um clique. |
| **Escala por colaboradores** | Múltiplos operadores trabalham sobre a mesma fila global sem risco de publicação duplicada. |
| **Preservação da audiência** | A fila anti-spam evita queimar os canais, protegendo a base que gera receita no longo prazo. |

---

## 3. Rateio de Comissão para Operadores (Projeto Futuro)

O usuário declarou explicitamente a intenção de, no futuro, adicionar mais pessoas para publicar e **pagar comissões a elas**. O pagamento em si é **projeto futuro** — mas a estrutura de dados que o viabiliza **nasce implementada desde a primeira versão**.

### 3.1. O Que Já Fica Registrado

Toda ação resolutiva (publicar ou copiar) grava um `DispatchLog` contendo:

| Campo | Papel no comissionamento |
| :--- | :--- |
| `operatorId` / `operatorName` | **Quem** publicou. |
| `productSku` | **Chave de cruzamento** com o relatório da plataforma de afiliados. |
| `affiliateUrl` | Link exato que foi ao ar. |
| `priceAtDispatch` | Preço congelado no instante do disparo. |
| `channels` | Onde foi publicado. |
| `dispatchedAt` | Quando. |

### 3.2. O Cruzamento de Dados

```
[Relatório de vendas exportado da plataforma de afiliados]
        │  (SKU vendido, valor do pedido, comissão creditada)
        │
        ├──────────► JOIN por productSku ◄──────────┐
        │                                            │
        ▼                                            │
[Comissão apurada por produto]        [dispatch_logs: quem publicou aquele SKU]
        │                                            │
        └────────────────────┬───────────────────────┘
                             ▼
             [Comissão devida por operador no período]
```

### 3.3. Limitações Conhecidas do Modelo

Registradas com honestidade, para não gerar expectativa incorreta na implementação futura:

1. **Atribuição não é rastreamento real.** O cruzamento por SKU indica *quem publicou aquele produto*, não *que a venda veio daquela publicação específica*. Se dois operadores publicaram o mesmo SKU em janelas próximas, ou se o mesmo SKU foi publicado em canais distintos, a atribuição fica ambígua.
2. **Mitigação disponível:** parâmetros de sub-ID / sub-tag suportados por várias plataformas de afiliados permitem embutir o identificador do operador no próprio link rastreado, transformando a atribuição de inferida em **medida**. Fica registrado como **caminho recomendado** para quando o comissionamento sair do papel.
3. **A ação "Copiar" não confirma publicação.** Como registrado em `FLUXO_OPERACIONAL.md`, o clique no botão de copiar é tratado como publicação, mas o sistema não tem como verificar se a colagem ocorreu. Um operador pode acumular créditos de "publicação" sem ter publicado.

### 3.4. Parâmetros em Aberto

| Parâmetro | Status |
| :--- | :--- |
| Percentual de rateio ao operador | A definir. |
| Periodicidade de apuração | A definir. |
| Uso de sub-ID por operador nos links | Recomendado, a decidir. |
| Tratamento de atribuição ambígua | A definir. |

---

## 4. Custos Operacionais Recorrentes

| Custo | Natureza | Observação |
| :--- | :--- | :--- |
| **Tokens de LLM** | Variável, por oferta processada | Principal custo variável. Escala com o volume de ofertas **capturadas**, não com as publicadas — toda oferta ingerida gera uma chamada de refinamento, mesmo as que o operador vai descartar. |
| **Infraestrutura local** | Fixo baixo | A aplicação roda na máquina administrativa do usuário. MongoDB e Redis em Docker local, sem custo de nuvem. |
| **Proxies / IPs residenciais** | Variável, condicional | Necessário apenas se houver scraping intensivo de lojas sem API. Fontes com API oficial não geram esse custo. |
| **Hospedagem do site próprio** | Fixo baixo | Único canal que exige infraestrutura pública. |
| **Número/chip de WhatsApp** | Fixo baixo | Se e quando houver uso de instância não-oficial. No modo assistido, não há custo adicional. |
| **Energia e disponibilidade da máquina** | Fixo | A máquina administrativa precisa ficar ligada para as Cron rodarem 24/7. |

### 4.1. Otimização de Custo de IA — Ponto de Atenção

O custo de LLM é proporcional às ofertas **ingeridas**. Como boa parte delas será descartada pelo operador (descontos irrisórios, itens fora do nicho), há uma otimização estrutural disponível:

> **Aplicar um filtro determinístico antes da chamada à IA** — por exemplo, desconto percentual mínimo, faixa de preço ou categoria — descartando ofertas irrelevantes ainda na ingestão, antes de gastar tokens com elas.

Registrado como **oportunidade de otimização**, a avaliar na fase de execução. O filtro seria configurável por fonte, junto do `aiPromptTemplate`.

---

## 5. Ponto de Equilíbrio

O modelo é estruturalmente favorável: o custo fixo é próximo de zero (infraestrutura local) e o custo variável é dominado por tokens de LLM, que são baratos por unidade. O ponto de equilíbrio é atingido com um volume modesto de comissões, e a margem melhora com escala — o custo por oferta cai conforme o filtro pré-IA (Seção 4.1) é calibrado.

O risco financeiro real do projeto **não é custo** — é a **perda de audiência** por spam ou por publicação de ofertas ruins e links quebrados, que destrói a base sobre a qual toda a receita se apoia. Daí a centralidade da fila anti-spam, da reverificação pré-disparo e da curadoria humana.
