/**
 * WebAuthn用 JSONインターフェース (BFFとの通信専用)
 */

export interface WebAuthnDescriptorJSON {
    type: "public-key";
    id: string; // Base64URL文字列
    transports?: AuthenticatorTransport[];
}

/** BFFから届くログイン用オプション */
export interface WebAuthnRequestOptionsJSON {
    challenge: string;
    timeout?: number;
    rpId?: string;
    allowCredentials?: WebAuthnDescriptorJSON[];
    userVerification?: UserVerificationRequirement;
}

/** BFFから届く登録用オプション */
export interface WebAuthnCreationOptionsJSON {
    challenge: string;
    rp: PublicKeyCredentialRpEntity;
    user: {
        id: string;
        name: string;
        displayName: string;
    };
    pubKeyCredParams: PublicKeyCredentialParameters[];
    timeout?: number;
    excludeCredentials?: WebAuthnDescriptorJSON[];
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    attestation?: AttestationConveyancePreference;
}

/** フロントからBFFに送る認証(Login)結果 */
export interface AuthenticationCredentialJSON {
    id: string;
    rawId: string;
    type: string;
    response: {
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
        userHandle: string | null;
    };
}

/** フロントからBFFに送る登録(Register)結果 */
export interface RegistrationCredentialJSON {
    id: string;
    rawId: string;
    type: string;
    response: {
        attestationObject: string;
        clientDataJSON: string;
        transports?: string[];
    };
    clientExtensionResults?: AuthenticationExtensionsClientOutputs;  // ★ 修正
    authenticatorAttachment?: string;
}