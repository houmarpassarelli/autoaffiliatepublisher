import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import path from 'path';

let sock: ReturnType<typeof makeWASocket> | null = null;
let isInitializing = false;

/**
 * Inicia o cliente do WhatsApp (Baileys) com persistência de sessão.
 */
export async function initWhatsAppClient() {
  if (sock) return sock;
  if (isInitializing) {
    // Wait slightly or just return null (or implement a Promise queue)
    // For simplicity, we just return the promise of initialization if we tracked it,
    // but here we just do a basic lock.
  }
  isInitializing = true;

  try {
    const authPath = path.resolve(process.cwd(), 'storage/whatsapp-auth');
    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We'll handle it manually to use qrcode-terminal
      logger: pino({ level: 'silent' }) as any, // Mute Baileys internal logs
      browser: ['AutoAffiliate', 'Chrome', '1.0.0'],
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('[WhatsApp Driver] Scan the QR Code below to authenticate:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        const shouldReconnect = ((lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log('[WhatsApp Driver] Connection closed. Reconnecting:', shouldReconnect);
        sock = null;
        if (shouldReconnect) {
          initWhatsAppClient();
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp Driver] Connection opened successfully.');
      }
    });

    sock = socket;
    return sock;
  } catch (error) {
    console.error('[WhatsApp Driver] Erro ao inicializar o cliente:', error);
    sock = null;
    throw error;
  } finally {
    isInitializing = false;
  }
}

export function getWhatsAppSocket() {
  if (!sock) {
    throw new Error('WhatsApp client is not initialized.');
  }
  return sock;
}
