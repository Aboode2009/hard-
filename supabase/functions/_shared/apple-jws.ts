// Verifies data signed by the App Store (StoreKit 2 transactions and App Store
// Server Notifications V2). Both are JWS (ES256) whose header carries the
// signing chain in `x5c`: leaf → Apple WWDR intermediate → Apple Root CA G3.
//
// Trust comes from the root: it must be byte-for-byte Apple Root CA G3, fetched
// from apple.com over TLS (cached per instance). Each certificate must be
// signed by the next and currently valid, the leaf and intermediate must carry
// Apple's marker extensions, and the leaf's key must have signed the payload.
// No App Store Connect API key is needed for any of this.

import * as x509 from "npm:@peculiar/x509@1.12.3";

x509.cryptoProvider.set(crypto);

export const BUNDLE_ID = "com.hardchallenge.app";

const APPLE_ROOT_URL = "https://www.apple.com/certificateauthority/AppleRootCA-G3.cer";
/** Apple's marker OIDs: the App Store receipt signer and the WWDR intermediate. */
const LEAF_OID = "1.2.840.113635.100.6.11.1";
const INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1";

let appleRoot: Promise<Uint8Array> | null = null;

function appleRootDer(): Promise<Uint8Array> {
  if (!appleRoot) {
    appleRoot = fetch(APPLE_ROOT_URL)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Apple root CA fetch failed: ${r.status}`);
        return new Uint8Array(await r.arrayBuffer());
      })
      .catch((err) => {
        appleRoot = null; // retry on the next request
        throw err;
      });
  }
  return appleRoot;
}

const b64urlToBytes = (s: string): Uint8Array => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export class AppleJwsError extends Error {}

/**
 * Returns the decoded payload of an Apple-signed JWS, or throws AppleJwsError.
 * `trustedRoot` is for tests only; production always uses Apple's root.
 */
export async function verifyAppleJws<T = Record<string, unknown>>(
  jws: string,
  trustedRoot?: Uint8Array,
): Promise<T> {
  const parts = typeof jws === "string" ? jws.split(".") : [];
  if (parts.length !== 3) throw new AppleJwsError("not a JWS");
  const [h, p, s] = parts;

  let header: { alg?: string; x5c?: string[] };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
  } catch {
    throw new AppleJwsError("bad header");
  }
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length < 3) {
    throw new AppleJwsError("unexpected header");
  }

  const [leaf, intermediate, root] = header.x5c.slice(0, 3).map((c) => new x509.X509Certificate(c));

  const expectedRoot = trustedRoot ?? (await appleRootDer());
  if (!sameBytes(new Uint8Array(root.rawData), expectedRoot)) {
    throw new AppleJwsError("chain does not end at Apple Root CA G3");
  }

  const now = new Date();
  if (!(await leaf.verify({ publicKey: intermediate.publicKey, date: now }))) {
    throw new AppleJwsError("leaf not signed by intermediate");
  }
  if (!(await intermediate.verify({ publicKey: root.publicKey, date: now }))) {
    throw new AppleJwsError("intermediate not signed by root");
  }
  if (!leaf.getExtension(LEAF_OID) || !intermediate.getExtension(INTERMEDIATE_OID)) {
    throw new AppleJwsError("missing Apple certificate markers");
  }

  const key = await leaf.publicKey.export({ name: "ECDSA", namedCurve: "P-256" }, ["verify"]);
  const ok = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    b64urlToBytes(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!ok) throw new AppleJwsError("bad signature");

  return JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as T;
}

/** The fields we use from a StoreKit 2 JWSTransactionDecodedPayload. */
export interface AppleTransaction {
  bundleId: string;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  expiresDate?: number; // ms since epoch, subscriptions only
  revocationDate?: number; // set when refunded / revoked
  environment: "Production" | "Sandbox" | "Xcode" | "LocalTesting";
  appAccountToken?: string;
  price?: number; // in milli-units of the currency
  currency?: string;
}

/** The arguments apple_apply_transaction takes, from a verified transaction. */
export function applyArgs(userId: string, t: AppleTransaction, forceRevoked = false) {
  return {
    p_user_id: userId,
    p_transaction_id: String(t.transactionId),
    p_original_transaction_id: String(t.originalTransactionId),
    p_product_id: t.productId,
    p_expires_at: t.expiresDate ? new Date(t.expiresDate).toISOString() : null,
    p_revoked: forceRevoked || !!t.revocationDate,
    p_environment: t.environment,
    p_price: t.price != null && t.currency ? `${t.price / 1000} ${t.currency}` : null,
  };
}
