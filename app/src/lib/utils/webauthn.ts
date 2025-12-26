import type {
    WebAuthnRequestOptionsJSON,
    WebAuthnCreationOptionsJSON
} from '../types/auth';

/** Base64URL を ArrayBuffer に変換 */
export const base64UrlToBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

/** ArrayBuffer を Base64URL に変換 */
export const bufferToBase64Url = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

/** ログイン用オプションをブラウザ標準型にパース */
export const parseRequestOptions = (
    options: WebAuthnRequestOptionsJSON
): PublicKeyCredentialRequestOptions => ({
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    allowCredentials: options.allowCredentials?.map(c => ({
        type: c.type,
        id: base64UrlToBuffer(c.id),
        transports: c.transports
    }))
});

/** 登録用オプションをブラウザ標準型にパース */
export const parseCreationOptions = (
    options: WebAuthnCreationOptionsJSON
): PublicKeyCredentialCreationOptions => ({
    ...options,
    challenge: base64UrlToBuffer(options.challenge),
    user: {
        ...options.user,
        id: base64UrlToBuffer(options.user.id)
    },
    excludeCredentials: options.excludeCredentials?.map((c) => ({
        type: c.type,
        id: base64UrlToBuffer(c.id),
        transports: c.transports,
    })),
});