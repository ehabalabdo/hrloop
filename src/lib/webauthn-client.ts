// ============================================================
// WebAuthn Client-Side Utilities
// Handles biometric registration and authentication using the
// SimpleWebAuthn browser library.
// ============================================================

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

const API_BASE = "/api/webauthn";

/**
 * Register a new biometric credential for the current user.
 * This triggers the device's native biometric prompt (Face ID / Touch ID).
 */
export async function registerBiometric(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Get registration options from server
    const optionsRes = await fetch(`${API_BASE}/register/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!optionsRes.ok) {
      const err = await optionsRes.json();
      return { success: false, error: err.error || "Failed to get registration options" };
    }

    const options: PublicKeyCredentialCreationOptionsJSON = await optionsRes.json();

    // 2. Trigger biometric prompt on device
    const registration: RegistrationResponseJSON = await startRegistration({ optionsJSON: options });

    // 3. Send registration response to server for verification
    const verifyRes = await fetch(`${API_BASE}/register/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, registration }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      return { success: false, error: err.error || "Verification failed" };
    }

    const result = await verifyRes.json();
    return { success: result.verified };
  } catch (error: unknown) {
    if (error instanceof Error) {
      // User cancelled or device doesn't support biometrics
      if (error.name === "NotAllowedError") {
        return { success: false, error: "Biometric authentication was cancelled or denied." };
      }
      if (error.name === "NotSupportedError") {
        return { success: false, error: "Your device does not support biometric authentication." };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error during registration" };
  }
}

/**
 * Authenticate using a previously registered biometric credential.
 * This triggers the device's native biometric prompt.
 */
export async function authenticateBiometric(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // 1. Get authentication options from server
    const optionsRes = await fetch(`${API_BASE}/authenticate/options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    if (!optionsRes.ok) {
      const err = await optionsRes.json();
      return { success: false, error: err.error || "Failed to get authentication options" };
    }

    const options: PublicKeyCredentialRequestOptionsJSON = await optionsRes.json();

    // 2. Trigger biometric prompt on device
    const authentication: AuthenticationResponseJSON = await startAuthentication({ optionsJSON: options });

    // 3. Send authentication response to server for verification
    const verifyRes = await fetch(`${API_BASE}/authenticate/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, authentication }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      return { success: false, error: err.error || "Verification failed" };
    }

    const result = await verifyRes.json();
    return { success: result.verified };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "NotAllowedError") {
        return { success: false, error: "Biometric authentication was cancelled or denied." };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error during authentication" };
  }
}

/**
 * Check if WebAuthn is supported in the current browser.
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined" &&
    typeof navigator.credentials !== "undefined"
  );
}

/**
 * Check if the device supports platform authenticators (biometrics).
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
