import type { PlayLink } from '../screens/player/shaka';

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/**
 * Descifra la respuesta de /play (PlayPayloadCipher del backend):
 * AES-256-GCM, IV de 12 bytes, etiqueta de 16 bytes al final del texto cifrado.
 */
export async function decryptPlay(payloadB64: string, ivB64: string, sessionKeyB64: string): Promise<{ links: PlayLink[] }> {
  const key = await crypto.subtle.importKey('raw', b64(sessionKeyB64), { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(ivB64), tagLength: 128 }, key, b64(payloadB64));
  return JSON.parse(new TextDecoder().decode(plain));
}
