import type { OfferModel, ChannelModel } from '../../../../database/models/index.js';
import { getDecryptedCredentials } from '../../../../database/credentials.js';
import { getWhatsAppSocket } from './whatsappClient.js';
import type { AnyMessageContent } from '@whiskeysockets/baileys';

/**
 * Envia uma oferta para um canal via WhatsApp (Baileys).
 */
export async function dispatchToWhatsApp(
  channel: InstanceType<typeof ChannelModel>,
  offer: InstanceType<typeof OfferModel>
): Promise<{ success: boolean; error?: string }> {
  try {
    const sock = getWhatsAppSocket();

    // 1. Decriptar as credenciais para obter o JID
    const creds = getDecryptedCredentials(channel.credentials);
    const jid = creds.get('jid');

    if (!jid) {
      throw new Error('JID do WhatsApp não configurado nas credenciais deste canal.');
    }

    // 2. Extrair a copy correta
    const copyFormat = channel.copyFormatKey; // deve ser 'messaging'
    const messageText = offer.aiCopy?.[copyFormat as keyof typeof offer.aiCopy] || offer.aiCopy?.messaging || '';
    
    // Anexa link explicitamente caso a IA não tenha formatado
    const fullText = messageText && messageText.includes(offer.affiliateUrl) 
      ? messageText 
      : `${messageText}\n\n👉 Compre aqui: ${offer.affiliateUrl}`;

    // 3. Preparar a mensagem
    let messageContent: AnyMessageContent;

    if (offer.imageUrl) {
      messageContent = {
        image: { url: offer.imageUrl },
        caption: fullText.trim(),
      };
    } else {
      messageContent = {
        text: fullText.trim() || offer.affiliateUrl,
      };
    }

    // 4. Enviar
    // A presença de '@g.us' ou '@s.whatsapp.net' no JID indica grupo/newsletter
    await sock.sendMessage(jid, messageContent);

    return { success: true };
  } catch (err: any) {
    console.error(`[WhatsApp Driver] Erro ao enviar oferta ${offer._id}:`, err);
    return { success: false, error: err.message };
  }
}
