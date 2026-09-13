import axios from 'axios';
import type { OfferModel, ChannelModel } from '../../../../database/models/index.js';
import { getDecryptedCredentials } from '../../../../database/credentials.js';

/**
 * Envia uma oferta para um canal via Telegram Bot API.
 */
export async function dispatchToTelegram(
  channel: InstanceType<typeof ChannelModel>,
  offer: InstanceType<typeof OfferModel>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Decriptar as credenciais para obter o botToken e chatId
    const creds = getDecryptedCredentials(channel.credentials);
    const botToken = creds.get('botToken');
    const chatId = creds.get('chatId');

    if (!botToken || !chatId) {
      throw new Error('botToken ou chatId do Telegram não configurados nas credenciais deste canal.');
    }

    // 2. Extrair a copy correta
    const copyFormat = channel.copyFormatKey; // deve ser 'messaging'
    const messageText = offer.aiCopy?.[copyFormat as keyof typeof offer.aiCopy] || offer.aiCopy?.messaging || '';
    
    // Anexa link explicitamente caso a IA não tenha formatado
    const fullText = messageText && messageText.includes(offer.affiliateUrl) 
      ? messageText 
      : `${messageText}\n\n👉 Compre aqui: ${offer.affiliateUrl}`;

    const textToUse = fullText.trim() || offer.affiliateUrl;

    // 3. Preparar a requisição HTTP
    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    let url = '';
    let payload: any = {};

    if (offer.imageUrl) {
      url = `${baseUrl}/sendPhoto`;
      payload = {
        chat_id: chatId,
        photo: offer.imageUrl,
        caption: textToUse,
      };
    } else {
      url = `${baseUrl}/sendMessage`;
      payload = {
        chat_id: chatId,
        text: textToUse,
        disable_web_page_preview: false,
      };
    }

    // 4. Enviar
    const response = await axios.post(url, payload);

    if (response.data && response.data.ok) {
      return { success: true };
    } else {
      return { success: false, error: response.data?.description || 'Erro desconhecido na API do Telegram.' };
    }
  } catch (err: any) {
    console.error(`[Telegram Driver] Erro ao enviar oferta ${offer._id}:`, err.response?.data || err.message);
    const errorMessage = err.response?.data?.description || err.message;
    return { success: false, error: errorMessage };
  }
}
