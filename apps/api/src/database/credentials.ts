// apps/api/src/database/credentials.ts
import type { CredentialsPatch } from '@aap/shared';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { env } from '../config/env.js';

/**
 * Manipulação do mapa de credenciais das fontes de coleta e dos canais de destino.
 *
 * As duas coleções têm o mesmo campo e o mesmo problema: o valor entra pelo
 * painel administrativo e nunca volta ao cliente. Concentrar as duas operações
 * aqui evita que cada CRUD invente a sua própria regra de escrita — divergir
 * nisso significaria vazar credencial em um dos dois caminhos.
 *
 * Nota de segurança: os valores são gravados encriptados usando AES-256-GCM
 * de forma transparente. Os DTOs recebem apenas as chaves, e integrações
 * desencriptam pontualmente com getDecryptedCredentials().
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV para GCM

let _encryptionKey: Buffer | null = null;
function getEncryptionKey(): Buffer {
  if (!_encryptionKey) {
    // Derivamos uma chave exata de 32 bytes (256 bits) requerida pelo AES-256
    _encryptionKey = createHash('sha256').update(env.CREDENTIALS_SECRET).digest();
  }
  return _encryptionKey;
}

function encryptValue(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

function decryptValue(ciphertext: string): string {
  if (!ciphertext.includes(':')) {
    // Fallback para suportar valores preexistentes não encriptados
    return ciphertext;
  }

  try {
    const [ivBase64, authTagBase64, encryptedBase64] = ciphertext.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Falha ao descriptografar credencial:', err);
    return ciphertext;
  }
}

/**
 * O Mongoose entrega o campo como `Map` no documento hidratado e como objeto
 * simples no `lean()`. As duas formas precisam ser aceitas para que o mapeador
 * de DTO funcione nos dois caminhos de leitura.
 */
export type StoredCredentials = Map<string, string> | Record<string, string> | undefined;

/**
 * Nomes das credenciais cadastradas, em ordem estável.
 *
 * É o único recorte de credencial que sai do servidor: o painel precisa mostrar
 * **quais** chaves existem para que o operador saiba o que já está configurado,
 * e nunca os valores.
 */
export function toCredentialKeys(credentials: StoredCredentials): string[] {
  if (!credentials) {
    return [];
  }

  const keys = credentials instanceof Map ? [...credentials.keys()] : Object.keys(credentials);

  return keys.sort((left, right) => left.localeCompare(right));
}

/**
 * Retorna as credenciais originais (em plaintext) para uso nas integrações.
 */
export function getDecryptedCredentials(credentials: StoredCredentials): Map<string, string> {
  const decrypted = new Map<string, string>();
  
  if (!credentials) {
    return decrypted;
  }

  const entries = credentials instanceof Map ? credentials.entries() : Object.entries(credentials);
  
  for (const [key, value] of entries) {
    decrypted.set(key, decryptValue(value));
  }

  return decrypted;
}

/**
 * Aplica o merge patch sobre o mapa persistido e devolve o mapa resultante encriptado.
 *
 * A escrita é parcial de propósito: como o cliente não recebe os valores, ele
 * não tem como reenviar o mapa completo numa edição. Só as chaves presentes no
 * patch são tocadas, e o valor `null` é o comando explícito de remoção — a
 * única forma de apagar uma credencial sem recriar o cadastro.
 */
export function applyCredentialsPatch(
  current: StoredCredentials,
  patch: CredentialsPatch | undefined,
): Map<string, string> {
  // 1. Carregamos o estado atual já descriptografado
  const merged = getDecryptedCredentials(current);

  // 2. Aplicamos o patch (que vem em texto claro do cliente)
  if (patch) {
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) {
        merged.delete(key);
        continue;
      }
      merged.set(key, value);
    }
  }

  // 3. Encriptamos o mapa inteiro antes de devolver ao model
  const encryptedMap = new Map<string, string>();
  for (const [key, value] of merged.entries()) {
    encryptedMap.set(key, encryptValue(value));
  }

  return encryptedMap;
}
