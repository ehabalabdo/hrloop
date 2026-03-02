// ============================================================
// WebAuthn Server-Side Utilities
// Handles credential generation and verification using SimpleWebAuthn.
// ============================================================

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

// RP = Relying Party (your app)
const RP_NAME = "HR Loop";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const RP_ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:3000";

// In-memory challenge store (use Redis/DB in production)
const challengeStore = new Map<string, string>();

export function storeChallenge(userId: string, challenge: string) {
  challengeStore.set(userId, challenge);
}

export function getChallenge(userId: string): string | undefined {
  const challenge = challengeStore.get(userId);
  challengeStore.delete(userId); // One-time use
  return challenge;
}

/**
 * Generate registration options for a new biometric credential.
 */
export async function getRegistrationOptions(
  userId: string,
  userName: string,
  userDisplayName: string,
  existingCredentialId?: string
) {
  const excludeCredentials = existingCredentialId
    ? [{ id: existingCredentialId, type: "public-key" as const }]
    : [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName,
    userDisplayName,
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      authenticatorAttachment: "platform", // Force platform authenticator (Face ID / Touch ID)
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60000,
  });

  // Store the challenge for verification
  storeChallenge(userId, options.challenge);

  return options;
}

/**
 * Verify a registration response from the client.
 */
export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON
) {
  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    throw new Error("Challenge not found or expired. Please try again.");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  return verification;
}

/**
 * Generate authentication options for biometric verification.
 */
export async function getAuthenticationOptions(
  userId: string,
  credentialId: string
) {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: [
      {
        id: credentialId,
      },
    ],
    userVerification: "required",
    timeout: 60000,
  });

  storeChallenge(userId, options.challenge);

  return options;
}

/**
 * Verify an authentication response from the client.
 */
export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
  credentialId: string,
  publicKey: string,
  signCount: number
) {
  const expectedChallenge = getChallenge(userId);
  if (!expectedChallenge) {
    throw new Error("Challenge not found or expired. Please try again.");
  }

  // Convert base64url public key back to Uint8Array
  const publicKeyBytes = Buffer.from(publicKey, "base64");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: RP_ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
    credential: {
      id: credentialId,
      publicKey: new Uint8Array(publicKeyBytes),
      counter: signCount,
    },
  });

  return verification;
}
