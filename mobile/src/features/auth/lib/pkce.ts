import * as Crypto from 'expo-crypto'

// PKCE (RFC 7636) для входа через соцсеть из приложения: секрет (verifier)
// остаётся в приложении, серверу при старте уходит только его отпечаток
// (challenge). Обменять одноразовый код на сессию может только тот, у кого
// есть исходный секрет (см. MobileOAuthService на сервере).

// 64 символа алфавита base64url: байт & 63 даёт равномерный выбор без
// перекоса (256 делится на 64 нацело).
const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const VERIFIER_LENGTH = 64

export function createCodeVerifier(): string {
  const bytes = Crypto.getRandomBytes(VERIFIER_LENGTH)

  return Array.from(bytes, byte => VERIFIER_ALPHABET[byte & 63]).join('')
}

// base64url(SHA-256(verifier)) без «=», как требует метод S256.
export async function createCodeChallenge(verifier: string): Promise<string> {
  const base64 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64
  })

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
