import { OpenAI } from 'openai';
import { env } from '../../config/env.js';
import { aiCopyVariantsSchema, type AiCopyVariants } from '@aap/shared';
import { zodResponseFormat } from 'openai/helpers/zod';
export interface AiOfferPayload {
  title: string;
  priceOriginal: number;
  priceCurrent: number;
  discountPct: number;
  sourceName: string;
  affiliateUrl: string;
}

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export const aiService = {
  /**
   * Gera as 3 variantes de copy usando o LLM.
   * Restrição de arquitetura garantida: HTML bruto e comandos de web scraping nunca são passados ao prompt.
   *
   * @param offerPayload - Os dados limpos da oferta já extraídos.
   * @param promptTemplate - O template customizado (ex: da Fonte).
   * @returns Variantes (messaging, social, article) geradas e validadas de forma determinística.
   */
  async generateCopy(
    offerPayload: AiOfferPayload,
    promptTemplate: string,
  ): Promise<AiCopyVariants> {
    const systemPrompt = `Você é um copywriter especialista em e-commerce focado em conversão.
Sua missão é gerar as 3 variantes de copy para um produto, baseando-se nos dados fornecidos.
Siga rigorosamente este template:
${promptTemplate}

Restrições Gerais:
- Não crie links fictícios; use APENAS o Link de Afiliado fornecido.
- Destaque o desconto ou vantagem.
- Responda OBRIGATORIAMENTE em português do Brasil (pt-BR).`;

    const userPrompt = `DADOS DA OFERTA:
Título Original: ${offerPayload.title}
Preço Original (de): R$ ${offerPayload.priceOriginal.toFixed(2)}
Preço Atual (por): R$ ${offerPayload.priceCurrent.toFixed(2)}
Desconto: ${offerPayload.discountPct}%
Loja: ${offerPayload.sourceName}
Link de Afiliado: ${offerPayload.affiliateUrl}`;

    try {
      const response = await openai.chat.completions.parse({
        model: env.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: zodResponseFormat(aiCopyVariantsSchema, 'ai_copy_variants'),
      });

      const parsed = response.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new Error('Falha ao decodificar a resposta estruturada da OpenAI');
      }

      return parsed;
    } catch (error: any) {
      console.error('Falha na geração de copy IA:', error, 'Oferta:', offerPayload.title);
      throw new Error(`Erro na geração de IA: ${error.message}`);
    }
  },
};
