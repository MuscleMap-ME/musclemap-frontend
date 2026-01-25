# End-to-End Encrypted Messaging with Secure File Attachments

## Executive Summary

This plan outlines a comprehensive, bulletproof implementation for:
1. **End-to-End Encrypted (E2EE) Messaging** - Messages encrypted client-side, unreadable by server
2. **Zero-Storage File Attachments** - Files never stored on our servers, use client-side encryption with external storage
3. **NSFW Content Moderation** - AI-powered detection with user consent controls
4. **Age Verification & Minor Protection** - Robust age gating with legal compliance
5. **Privacy Controls** - Granular user control over content visibility and who can contact them

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [End-to-End Encryption System](#2-end-to-end-encryption-system)
3. [Zero-Storage File Attachment System](#3-zero-storage-file-attachment-system)
4. [NSFW Content Moderation](#4-nsfw-content-moderation)
5. [Age Verification & Minor Protection](#5-age-verification--minor-protection)
6. [Privacy Controls & Permissions](#6-privacy-controls--permissions)
7. [Database Schema Changes](#7-database-schema-changes)
8. [API Changes](#8-api-changes)
9. [Frontend Implementation](#9-frontend-implementation)
10. [Security Considerations](#10-security-considerations)
11. [Legal Compliance](#11-legal-compliance)
12. [Performance & Bandwidth](#12-performance--bandwidth)
13. [Migration Strategy](#13-migration-strategy)
14. [Implementation Phases](#14-implementation-phases)

---

## 1. Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT A (SENDER)                                  │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐                   │
│  │ Message Text │→ │ Encrypt (AES) │→ │ Encrypted Blob  │──────────────────┐│
│  └──────────────┘  └───────────────┘  └─────────────────┘                  ││
│                           ↑                                                 ││
│  ┌──────────────┐  ┌──────┴──────┐                                         ││
│  │ Session Key  │← │ X25519 DH   │← Key Exchange with Recipient            ││
│  └──────────────┘  └─────────────┘                                         ││
│                                                                             ││
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  ┌─────────────┐ ││
│  │ File Upload  │→ │ Encrypt (AES) │→ │ Upload to IPFS/ │→ │ Share CID + ││ ││
│  │ (if any)     │  │ + Random Key  │  │ Arweave/R2     │  │ Decrypt Key ││ ││
│  └──────────────┘  └───────────────┘  └─────────────────┘  └──────┬──────┘ ││
│                                                                    │        ││
│  ┌──────────────┐                                                  │        ││
│  │ NSFW Check   │→ Local AI detection BEFORE upload (optional)     │        ││
│  │ (Client-side)│  User can override with age verification         │        ││
│  └──────────────┘                                                  │        ││
└────────────────────────────────────────────────────────────────────┼────────┘│
                                                                     │         │
┌────────────────────────────────────────────────────────────────────▼─────────┘
│                        MUSCLEMAP SERVER (Zero Knowledge)                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ What Server STORES:                                                  │    │
│  │ • Encrypted message blobs (cannot read content)                      │    │
│  │ • User public keys (for key exchange)                                │    │
│  │ • File metadata (CID, encrypted key, size, type) - NOT file content  │    │
│  │ • Conversation metadata (participants, timestamps)                   │    │
│  │ • User content preferences (allow_adult, age_verified)               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ What Server CANNOT DO:                                               │    │
│  │ • Read message content (encrypted with keys server doesn't have)     │    │
│  │ • View file contents (encrypted + stored externally)                 │    │
│  │ • Decrypt anything without user's private key                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT B (RECIPIENT)                               │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────┐                   │
│  │ Encrypted Blob  │→ │ Decrypt (AES) │→ │ Message Text │                   │
│  └─────────────────┘  └───────────────┘  └──────────────┘                   │
│           ↑                   ↑                                              │
│  ┌────────┴────────┐  ┌──────┴──────┐                                       │
│  │ Fetch from      │  │ Derive Key  │← Using sender's public key            │
│  │ Server          │  │ from DH     │                                       │
│  └─────────────────┘  └─────────────┘                                       │
│                                                                              │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────────────────┐       │
│  │ File CID        │→ │ Fetch from    │→ │ Decrypt with shared key  │       │
│  │ + Decrypt Key   │  │ IPFS/External │  │ Check NSFW if enabled   │       │
│  └─────────────────┘  └───────────────┘  └──────────────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ NSFW GATING:                                                         │    │
│  │ • If recipient has adult content DISABLED: blur/block NSFW files     │    │
│  │ • If recipient has adult content ENABLED + age verified: show all    │    │
│  │ • Client-side NSFW detection on decrypted content for safety         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Zero Server Knowledge** - Server stores only encrypted blobs, cannot read content
2. **Zero File Storage** - Files stored on external decentralized storage (IPFS/Arweave/R2)
3. **Client-Side Encryption** - All encryption/decryption happens in browser/app
4. **User Consent for Adult Content** - Explicit opt-in with age verification
5. **Minor Protection** - Users under 18 cannot access adult content, cannot be targeted
6. **Anti-Trafficking** - Cannot search for users by age, no public age display

---

## 2. End-to-End Encryption System

### 2.1 Encryption Protocol: Signal Protocol (Simplified)

We'll implement a simplified version of the Signal Protocol using:
- **X25519** for key exchange (Curve25519 Diffie-Hellman)
- **XChaCha20-Poly1305** for authenticated encryption (faster than AES-GCM, no nonce reuse issues)
- **Ed25519** for signing (verify message authenticity)

#### Why This Stack:
- **X25519**: Industry standard, used by Signal, WhatsApp, Wire
- **XChaCha20-Poly1305**: Simpler than AES-GCM, 24-byte nonce eliminates reuse concerns
- **Ed25519**: Fast, secure signatures

### 2.2 Key Management

```typescript
interface UserKeyBundle {
  // Long-term identity keys (one per user)
  identityPublicKey: Uint8Array;     // Ed25519 public key (32 bytes)
  identityPrivateKey: Uint8Array;    // Ed25519 private key (stored in IndexedDB, never sent to server)

  // Signed prekey (rotates monthly)
  signedPreKeyPublic: Uint8Array;    // X25519 public key
  signedPreKeyPrivate: Uint8Array;   // X25519 private key (stored locally)
  signedPreKeySignature: Uint8Array; // Ed25519 signature of signedPreKeyPublic
  signedPreKeyId: number;

  // One-time prekeys (100 keys, replenished when low)
  oneTimePreKeys: Array<{
    id: number;
    publicKey: Uint8Array;
    privateKey: Uint8Array;  // Stored locally, deleted after use
  }>;
}

interface ConversationKeyState {
  conversationId: string;

  // Root key (derived from initial key exchange, evolves with ratchet)
  rootKey: Uint8Array;

  // Chain keys for sending/receiving
  sendChainKey: Uint8Array;
  receiveChainKey: Uint8Array;

  // Message counters (prevent replay attacks)
  sendMessageNumber: number;
  receiveMessageNumber: number;

  // Ratchet state
  myRatchetKey: Uint8Array;          // Current DH key for ratchet
  theirRatchetKey: Uint8Array;       // Other party's current DH key
}
```

### 2.3 Key Exchange Flow (Initial Message)

```
Alice (Sender)                          Server                          Bob (Recipient)
     │                                    │                                    │
     │  1. Fetch Bob's key bundle         │                                    │
     │────────────────────────────────────>│                                    │
     │                                    │                                    │
     │  2. Return Bob's:                  │                                    │
     │     - Identity Key (IKb)           │                                    │
     │     - Signed PreKey (SPKb)         │                                    │
     │     - One-Time PreKey (OPKb)       │                                    │
     │<────────────────────────────────────│                                    │
     │                                    │                                    │
     │  3. Alice generates ephemeral key  │                                    │
     │     EKa = X25519.generateKeyPair() │                                    │
     │                                    │                                    │
     │  4. Alice performs X3DH:           │                                    │
     │     DH1 = DH(IKa, SPKb)            │                                    │
     │     DH2 = DH(EKa, IKb)             │                                    │
     │     DH3 = DH(EKa, SPKb)            │                                    │
     │     DH4 = DH(EKa, OPKb)  [if OPK]  │                                    │
     │     SK = KDF(DH1 || DH2 || DH3 || DH4)                                  │
     │                                    │                                    │
     │  5. Encrypt message with SK        │                                    │
     │     ciphertext = XChaCha20(SK, plaintext)                               │
     │                                    │                                    │
     │  6. Send encrypted message + EKa.pub + used OPK ID                      │
     │────────────────────────────────────>│                                    │
     │                                    │  7. Store encrypted msg            │
     │                                    │────────────────────────────────────>│
     │                                    │                                    │
     │                                    │  8. Bob receives notification      │
     │                                    │     Fetches encrypted message      │
     │                                    │<────────────────────────────────────│
     │                                    │                                    │
     │                                    │  9. Bob performs same X3DH         │
     │                                    │     using his private keys         │
     │                                    │     Derives same SK                │
     │                                    │                                    │
     │                                    │ 10. Bob decrypts message           │
     │                                    │     plaintext = XChaCha20.decrypt(SK, ciphertext)
     │                                    │                                    │
```

### 2.4 Double Ratchet (Subsequent Messages)

After the initial X3DH exchange, the Double Ratchet provides:
- **Forward Secrecy**: Compromised keys can't decrypt past messages
- **Break-in Recovery**: Compromised session recovers security

```typescript
async function ratchetEncrypt(
  state: ConversationKeyState,
  plaintext: Uint8Array
): Promise<{ ciphertext: Uint8Array; header: MessageHeader }> {
  // Derive message key from chain key
  const messageKey = await kdf(state.sendChainKey, 'message');

  // Advance chain key
  state.sendChainKey = await kdf(state.sendChainKey, 'chain');
  state.sendMessageNumber++;

  // Encrypt with message key
  const nonce = randomBytes(24);
  const ciphertext = await xchacha20poly1305.encrypt(messageKey, nonce, plaintext);

  return {
    ciphertext,
    header: {
      ratchetPublicKey: state.myRatchetKey,
      messageNumber: state.sendMessageNumber,
      previousChainLength: state.previousChainLength,
      nonce,
    },
  };
}
```

### 2.5 Client-Side Key Storage

Keys are stored in IndexedDB with additional encryption:

```typescript
// Keys are encrypted with a key derived from user's password
// This means even if IndexedDB is compromised, keys are protected

interface EncryptedKeyStore {
  // The actual encryption key is derived from user password
  // using Argon2id (memory-hard, resistant to GPU attacks)

  encryptedIdentityKey: Uint8Array;
  encryptedSignedPreKey: Uint8Array;
  encryptedOneTimePreKeys: Uint8Array;

  // Salt for Argon2id
  passwordSalt: Uint8Array;

  // Verification hash (to check if password is correct)
  verificationHash: Uint8Array;
}

// On login, user password derives the key that unlocks all other keys
async function unlockKeyStore(password: string, store: EncryptedKeyStore): Promise<UserKeyBundle> {
  const masterKey = await argon2id(password, store.passwordSalt, {
    memory: 65536,  // 64 MB
    iterations: 3,
    parallelism: 4,
  });

  // Verify password is correct
  const computedHash = await sha256(masterKey);
  if (!constantTimeEqual(computedHash, store.verificationHash)) {
    throw new Error('Invalid password');
  }

  // Decrypt keys
  return {
    identityPrivateKey: await decrypt(store.encryptedIdentityKey, masterKey),
    signedPreKeyPrivate: await decrypt(store.encryptedSignedPreKey, masterKey),
    oneTimePreKeys: await decrypt(store.encryptedOneTimePreKeys, masterKey),
    // ... public keys derived from private keys
  };
}
```

### 2.6 Message Format

```typescript
interface EncryptedMessage {
  // Protocol version (for future upgrades)
  version: 1;

  // Sender's identity (public key fingerprint, not ID)
  senderFingerprint: string;  // SHA-256 of sender's identity key

  // Key exchange data (only for initial messages)
  keyExchange?: {
    ephemeralKey: Uint8Array;      // EKa.pub
    usedOneTimePreKeyId?: number;  // Which OPK was consumed
  };

  // Ratchet header
  header: {
    ratchetPublicKey: Uint8Array;
    messageNumber: number;
    previousChainLength: number;
  };

  // Encrypted payload
  nonce: Uint8Array;              // 24 bytes for XChaCha20
  ciphertext: Uint8Array;         // Encrypted message content

  // Authentication tag (part of ciphertext in AEAD)
  // Already included in ciphertext for XChaCha20-Poly1305

  // Timestamp (unencrypted, for sorting/display)
  // Note: This leaks when messages were sent, but is necessary for UX
  timestamp: number;
}

// The decrypted payload structure
interface MessagePayload {
  type: 'text' | 'file' | 'reaction' | 'edit' | 'delete';

  // For text messages
  text?: string;

  // For file attachments (metadata only, file is external)
  file?: {
    name: string;
    mimeType: string;
    size: number;

    // External storage reference
    storageProvider: 'ipfs' | 'arweave' | 'r2';
    cid: string;  // Content ID (IPFS) or transaction ID (Arweave)

    // File encryption key (encrypted again with message key)
    encryptedFileKey: Uint8Array;
    fileNonce: Uint8Array;

    // NSFW metadata
    nsfw: {
      clientDetected: boolean;       // Client's NSFW detection result
      score: number;                 // 0-1 confidence
      category?: 'nudity' | 'sexual' | 'suggestive';
      userMarkedAdult: boolean;      // Sender explicitly marked as adult
    };

    // Optional thumbnail (encrypted, inline if small)
    thumbnail?: {
      data: Uint8Array;              // Encrypted thumbnail
      width: number;
      height: number;
    };
  };

  // For reactions
  reaction?: {
    emoji: string;
    targetMessageId: string;
  };

  // For edits
  edit?: {
    targetMessageId: string;
    newText: string;
  };

  // For deletes
  delete?: {
    targetMessageId: string;
  };
}
```

---

## 3. Zero-Storage File Attachment System

### 3.1 Storage Provider Options

We'll support multiple decentralized storage providers:

| Provider | Pros | Cons | Cost | Retention |
|----------|------|------|------|-----------|
| **IPFS + Pinata** | Fast, widely adopted | Needs pinning service | $0.15/GB/month | While pinned |
| **Arweave** | Permanent, one-time payment | Slower, higher upfront cost | ~$5/GB one-time | Forever |
| **Cloudflare R2** | Fast, familiar S3 API, no egress fees | Centralized | $0.015/GB/month | While paid |
| **IPFS + Filecoin** | Truly decentralized | Complex, slower | Variable | Contract period |

**Recommended: Cloudflare R2 as primary, IPFS as secondary**
- R2 for performance (low latency)
- IPFS CID for content addressing (even if R2 goes away, content can be found)

### 3.2 File Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SENDER CLIENT                                   │
│                                                                              │
│  1. User selects file                                                        │
│     ↓                                                                        │
│  2. Generate random file encryption key (256 bits)                           │
│     fileKey = randomBytes(32)                                                │
│     ↓                                                                        │
│  3. Encrypt file client-side                                                 │
│     encryptedFile = XChaCha20-Poly1305(fileKey, file)                       │
│     ↓                                                                        │
│  4. Calculate content hash (CID)                                             │
│     cid = sha256(encryptedFile)                                             │
│     ↓                                                                        │
│  5. Run client-side NSFW detection (BEFORE upload)                          │
│     nsfwResult = NSFWJS.classify(file)                                      │
│     ↓                                                                        │
│  6. If NSFW detected AND user hasn't opted into adult content:               │
│     - Show warning: "This appears to contain adult content"                  │
│     - Require user to confirm: "Mark as adult content"                       │
│     - User can cancel upload                                                 │
│     ↓                                                                        │
│  7. Request presigned upload URL from our server                            │
│     POST /api/messaging/attachment/request-upload                            │
│     Body: { cid, size, mimeType, nsfw: { score, userMarked } }              │
│     ↓                                                                        │
│  8. Server validates:                                                        │
│     - User is authenticated                                                  │
│     - File size within limits (50MB max)                                    │
│     - File type allowed                                                      │
│     - User not rate-limited                                                  │
│     - If NSFW: sender is 18+ verified                                       │
│     ↓                                                                        │
│  9. Server returns presigned URL for R2/IPFS                                │
│     { uploadUrl, expiresAt, storageProvider }                               │
│     ↓                                                                        │
│ 10. Client uploads encrypted file directly to R2/IPFS                       │
│     PUT uploadUrl                                                            │
│     Body: encryptedFile                                                      │
│     ↓                                                                        │
│ 11. On success, include file metadata in encrypted message                  │
│     (fileKey is encrypted with the message, so only recipient can decrypt)  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 File Download Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RECIPIENT CLIENT                                  │
│                                                                              │
│  1. Decrypt message, extract file metadata                                  │
│     - cid, storageProvider, encryptedFileKey, nsfwMetadata                  │
│     ↓                                                                        │
│  2. Check recipient's content preferences                                    │
│     - If nsfw.score > 0.7 AND recipient.allowAdultContent == false:         │
│       Show blurred placeholder: "This may contain adult content"            │
│       User can tap to reveal IF they enable adult content                   │
│     ↓                                                                        │
│  3. If user wants to view file:                                             │
│     - Fetch encrypted file from R2/IPFS using cid                          │
│     - Decrypt fileKey using message key                                     │
│     - Decrypt file using fileKey                                            │
│     ↓                                                                        │
│  4. Optional: Run client-side NSFW detection on decrypted file             │
│     - Second verification layer for safety                                  │
│     - If NSFW detected but metadata said safe: log discrepancy              │
│     ↓                                                                        │
│  5. Display file to user                                                    │
│     - Images: Show in lightbox                                              │
│     - Videos: Stream with controls                                          │
│     - Documents: Download or in-app preview                                 │
│     ↓                                                                        │
│  6. Cache decrypted file locally (optional, user preference)                │
│     - Encrypted in IndexedDB with user's key                                │
│     - Auto-expire based on storage limits                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 File Expiration & Cleanup

Since we use external storage, we control costs via expiration:

```typescript
interface FileMetadata {
  cid: string;
  uploadedBy: string;
  uploadedAt: Date;

  // Expiration policy
  expiresAt: Date;              // Default: 30 days after last access
  lastAccessedAt: Date;         // Extended on each download
  maxRetentionDays: number;     // Hard limit: 90 days

  // Access control
  conversationId: string;       // Which conversation owns this file
  participantFingerprints: string[];  // Who can access (verified via signed request)

  // Storage info
  storageProvider: 'r2' | 'ipfs';
  sizeBytes: number;

  // Moderation
  nsfwScore: number;
  userMarkedAdult: boolean;

  // We DON'T store: file contents, decryption keys, plaintext metadata
}
```

### 3.5 Bandwidth Optimization

To minimize bandwidth:

1. **Progressive Loading**: Images load as low-res first, then high-res
2. **Thumbnail Caching**: Encrypted thumbnails stored inline in message
3. **Chunked Uploads**: Large files uploaded in 5MB chunks with resume support
4. **Compression**: Images compressed client-side before encryption
5. **Deduplication**: Same CID = same file, no re-upload needed

```typescript
// Compression before encryption
async function prepareFileForUpload(file: File): Promise<{
  processedFile: Uint8Array;
  thumbnail?: Uint8Array;
}> {
  if (file.type.startsWith('image/')) {
    // Compress image
    const compressed = await compressImage(file, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 0.85,
    });

    // Generate thumbnail (for preview)
    const thumbnail = await compressImage(file, {
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.6,
    });

    return { processedFile: compressed, thumbnail };
  }

  if (file.type.startsWith('video/')) {
    // Extract thumbnail from first frame
    const thumbnail = await extractVideoThumbnail(file);
    // Don't compress video (user expects original quality)
    return { processedFile: await file.arrayBuffer(), thumbnail };
  }

  // Other files: no processing
  return { processedFile: await file.arrayBuffer() };
}
```

---

## 4. NSFW Content Moderation

### 4.1 Multi-Layer Detection Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NSFW DETECTION LAYERS                                 │
│                                                                              │
│  LAYER 1: CLIENT-SIDE DETECTION (SENDER)                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • NSFWJS running in browser (no server round-trip)                    │  │
│  │ • Runs BEFORE upload (privacy-preserving)                             │  │
│  │ • Cannot be bypassed by modifying requests                            │  │
│  │ • Fast: ~100ms per image on modern devices                            │  │
│  │ • Categories: Porn, Hentai, Sexy, Neutral, Drawing                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      ↓                                       │
│  LAYER 2: USER DECLARATION                                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Sender explicitly marks content as "Adult/NSFW"                     │  │
│  │ • Required if Layer 1 detects NSFW but sender wants to send anyway   │  │
│  │ • Creates paper trail for moderation purposes                         │  │
│  │ • Allows artistic/fitness content that triggers false positives       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      ↓                                       │
│  LAYER 3: CLIENT-SIDE DETECTION (RECIPIENT)                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Second NSFWJS check on decrypted content                            │  │
│  │ • Catches cases where sender bypassed/lied                            │  │
│  │ • Controls display based on recipient preferences                     │  │
│  │ • Can blur/block content even if sender marked it safe                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      ↓                                       │
│  LAYER 4: USER REPORTS                                                       │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Recipient can report content as inappropriate                       │  │
│  │ • Report includes: content hash (not content), context, reason        │  │
│  │ • Triggers review queue for serious violations                        │  │
│  │ • Multiple reports = auto-restriction on sender                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      ↓                                       │
│  LAYER 5: METADATA-ONLY SERVER MODERATION                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Server sees: NSFW score, user declaration, report count             │  │
│  │ • Server CANNOT see: actual content (encrypted)                       │  │
│  │ • Can restrict users based on patterns (many reports, always NSFW)    │  │
│  │ • Can require additional verification for flagged accounts            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 NSFWJS Integration (Client-Side)

```typescript
// Load NSFWJS model once, reuse for all classifications
let nsfwModel: nsfwjs.Model | null = null;

async function loadNSFWModel(): Promise<nsfwjs.Model> {
  if (nsfwModel) return nsfwModel;

  // Use a quantized model for smaller bundle size (~2.6MB)
  nsfwModel = await nsfwjs.load('/models/nsfwjs-quant/', { type: 'graph' });
  return nsfwModel;
}

interface NSFWResult {
  isNSFW: boolean;
  confidence: number;
  category: 'porn' | 'hentai' | 'sexy' | 'neutral' | 'drawing';
  scores: {
    porn: number;
    hentai: number;
    sexy: number;
    neutral: number;
    drawing: number;
  };
}

async function classifyContent(file: File): Promise<NSFWResult> {
  const model = await loadNSFWModel();

  // Create image element for classification
  const img = await createImageFromFile(file);
  const predictions = await model.classify(img);

  // Convert to our format
  const scores = {
    porn: 0,
    hentai: 0,
    sexy: 0,
    neutral: 0,
    drawing: 0,
  };

  for (const pred of predictions) {
    const key = pred.className.toLowerCase() as keyof typeof scores;
    scores[key] = pred.probability;
  }

  // Determine NSFW status
  const isNSFW = scores.porn > 0.3 || scores.hentai > 0.3 || scores.sexy > 0.5;
  const topCategory = predictions.reduce((a, b) =>
    a.probability > b.probability ? a : b
  ).className.toLowerCase();

  return {
    isNSFW,
    confidence: Math.max(scores.porn, scores.hentai, scores.sexy),
    category: topCategory as NSFWResult['category'],
    scores,
  };
}
```

### 4.3 User Consent Flow for Adult Content

```typescript
interface ContentPreferences {
  // Age verification status
  ageVerified: boolean;
  ageVerifiedAt?: Date;
  dateOfBirth?: Date;  // Optional, only stored if user provides for verification

  // Content preferences
  allowAdultContent: boolean;           // Default: false
  showAdultContentWarning: boolean;     // Default: true (even if allowed)

  // Sending preferences
  canSendAdultContent: boolean;         // Derived: ageVerified && allowAdultContent

  // Privacy
  hideAgeFromOthers: boolean;           // Default: true
  hideAdultPreferenceFromOthers: boolean; // Default: true
}

// Consent flow states
type ConsentFlowState =
  | 'initial'           // User hasn't interacted
  | 'age_prompt'        // Asking for age verification
  | 'age_pending'       // Age verification in progress
  | 'age_verified'      // Age confirmed 18+
  | 'age_denied'        // User is under 18
  | 'consent_prompt'    // Asking for adult content consent
  | 'consent_granted'   // User opted into adult content
  | 'consent_denied';   // User declined adult content

async function handleAdultContentConsent(user: User): Promise<boolean> {
  // Step 1: Check if already verified and consented
  if (user.preferences.ageVerified && user.preferences.allowAdultContent) {
    return true;
  }

  // Step 2: Age verification required
  if (!user.preferences.ageVerified) {
    const verified = await showAgeVerificationModal();
    if (!verified) return false;
  }

  // Step 3: Explicit consent for adult content
  const consented = await showAdultContentConsentModal({
    title: 'Enable Adult Content',
    message: `
      You're about to enable adult content in messages. This means:

      • You may see NSFW images and videos from other users
      • You can send adult content to others who have also enabled it
      • You confirm you are 18 years or older
      • You understand this content may be explicit

      You can change this setting at any time in Privacy Settings.
    `,
    confirmLabel: 'Enable Adult Content',
    cancelLabel: 'Keep Safe Mode',
  });

  if (consented) {
    await updateUserPreferences({
      allowAdultContent: true,
      canSendAdultContent: true,
    });
  }

  return consented;
}
```

### 4.4 Recipient-Side Content Gating

```typescript
function shouldShowContent(
  content: DecryptedFileMetadata,
  recipientPrefs: ContentPreferences
): 'show' | 'blur' | 'block' {
  // Case 1: Content is not NSFW
  if (!content.nsfw.isNSFW && !content.nsfw.userMarkedAdult) {
    return 'show';
  }

  // Case 2: Recipient has adult content enabled
  if (recipientPrefs.allowAdultContent && recipientPrefs.ageVerified) {
    // Still show warning if preference is set
    if (recipientPrefs.showAdultContentWarning) {
      return 'blur';  // Blur with "tap to reveal"
    }
    return 'show';
  }

  // Case 3: Recipient hasn't enabled adult content
  // Block completely, show placeholder
  return 'block';
}

function renderFileAttachment(
  file: DecryptedFileMetadata,
  recipientPrefs: ContentPreferences
): JSX.Element {
  const visibility = shouldShowContent(file, recipientPrefs);

  switch (visibility) {
    case 'show':
      return <FileViewer file={file} />;

    case 'blur':
      return (
        <BlurredContent
          thumbnail={file.thumbnail}
          onReveal={async () => {
            const confirmed = await showRevealConfirmation();
            if (confirmed) {
              setRevealed(true);
            }
          }}
        />
      );

    case 'block':
      return (
        <BlockedContent
          message="This content is not available based on your settings"
          onLearnMore={() => showContentPreferencesModal()}
        />
      );
  }
}
```

---

## 5. Age Verification & Minor Protection

### 5.1 Age Verification Methods

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGE VERIFICATION OPTIONS                                │
│                                                                              │
│  TIER 1: SELF-DECLARATION (Default)                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • User enters date of birth                                           │  │
│  │ • System calculates age                                               │  │
│  │ • Stores only: ageVerified: boolean, verificationMethod: 'self'       │  │
│  │ • NOT stored: actual DOB (privacy)                                    │  │
│  │ • Limitations: Can be lied about                                      │  │
│  │ • Use case: Basic gating, not high-stakes                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  TIER 2: CREDIT CARD VERIFICATION (Optional)                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • User adds payment method (doesn't have to purchase)                 │  │
│  │ • Card holder must be 18+ to have credit card                         │  │
│  │ • We verify card is valid, don't charge                               │  │
│  │ • Stores: ageVerified: boolean, verificationMethod: 'payment'         │  │
│  │ • More trustworthy than self-declaration                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  TIER 3: ID VERIFICATION (High-Trust, Optional)                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ • Third-party service (e.g., Stripe Identity, Jumio, Onfido)         │  │
│  │ • User uploads ID, service verifies age                               │  │
│  │ • We receive: verified: boolean, over18: boolean                      │  │
│  │ • We DON'T receive: ID image, name, DOB, address                     │  │
│  │ • Most trustworthy, but friction                                      │  │
│  │ • Use case: High-risk users, appeals, premium features                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Minor Protection Rules

```typescript
// CRITICAL: These rules are enforced at multiple levels

const MINOR_PROTECTION_RULES = {
  // Rule 1: Minors CANNOT access adult content
  minorsCannotAccessAdultContent: true,

  // Rule 2: Minors CANNOT be searched by age
  canSearchByAge: false,  // DISABLED for everyone, not just minors

  // Rule 3: Age is NEVER displayed publicly
  ageVisibleOnProfile: false,

  // Rule 4: Minors CANNOT receive messages from unknown adults
  // (Adults must be friends/mutuals first)
  minorRestrictedMessaging: true,

  // Rule 5: Adult content senders CANNOT message minors
  adultSendersCannotMessageMinors: true,

  // Rule 6: Reports involving minors are escalated immediately
  minorReportsEscalated: true,

  // Rule 7: Minors CANNOT upload adult content (obvious, but explicit)
  minorsCannotUploadAdultContent: true,

  // Rule 8: No age field in user search or discovery
  ageInDiscovery: false,
};

// Enforcement at API level
async function canUserSendMessageTo(
  senderId: string,
  recipientId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const sender = await getUser(senderId);
  const recipient = await getUser(recipientId);

  // Rule: If sender has adult content enabled and recipient is a minor
  if (sender.preferences.canSendAdultContent && recipient.isMinor) {
    return {
      allowed: false,
      reason: 'Cannot send messages to this user',
      // Note: Don't reveal WHY (don't reveal minor status)
    };
  }

  // Rule: If recipient is a minor and sender is not a mutual/friend
  if (recipient.isMinor && !await areMutualFollowers(senderId, recipientId)) {
    return {
      allowed: false,
      reason: 'This user only accepts messages from friends',
    };
  }

  // ... other checks (blocks, privacy settings, etc.)

  return { allowed: true };
}
```

### 5.3 No Age-Based Discovery (Anti-Targeting)

```typescript
// CRITICAL: Users CANNOT search or filter by age

// What IS allowed:
const allowedSearchFilters = [
  'username',
  'displayName',
  'location',  // City-level only, not precise
  'archetype',
  'crew',
  'activity',  // Active in last X days
];

// What is NOT allowed:
const blockedSearchFilters = [
  'age',
  'dateOfBirth',
  'ageRange',
  'ageMin',
  'ageMax',
  'isMinor',
  'isAdult',
];

// API will reject any attempt to filter by age
function validateSearchParams(params: SearchParams): void {
  for (const blocked of blockedSearchFilters) {
    if (params[blocked] !== undefined) {
      throw new ValidationError(`Filtering by ${blocked} is not allowed`);
    }
  }
}

// Even admins cannot see age in bulk user lists
// Age is only visible to:
// 1. The user themselves
// 2. System for enforcement (isMinor boolean only)
// 3. Law enforcement with valid legal request
```

### 5.4 Age Storage Strategy

```typescript
// We use a privacy-preserving approach to age

interface UserAgeData {
  // Stored in database
  isMinor: boolean;                   // Derived from DOB, binary only
  ageVerified: boolean;               // Has user verified their age?
  ageVerificationMethod: 'self' | 'payment' | 'id' | null;
  ageVerifiedAt: Date | null;

  // NOT stored in database (privacy):
  // - Exact date of birth (only used transiently during verification)
  // - Exact age (only isMinor boolean)

  // For users who want age on profile (explicit opt-in):
  displayAge: boolean;                // Default: false
  displayAgeValue: number | null;     // Only if displayAge is true
}

// When user verifies age:
async function verifyAge(userId: string, dateOfBirth: Date): Promise<void> {
  const age = calculateAge(dateOfBirth);

  await updateUser(userId, {
    isMinor: age < 18,
    ageVerified: true,
    ageVerificationMethod: 'self',
    ageVerifiedAt: new Date(),
    // DOB is NOT stored
  });

  // If user is minor, enforce restrictions immediately
  if (age < 18) {
    await enforceMinorRestrictions(userId);
  }
}

function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}
```

---

## 6. Privacy Controls & Permissions

### 6.1 Messaging Permission Levels

```typescript
interface MessagingPrivacySettings {
  // Who can send you messages?
  whoCanMessage:
    | 'everyone'            // Anyone on the platform
    | 'mutuals'             // Only mutual followers
    | 'friends'             // Only accepted friends
    | 'nobody';             // DMs disabled

  // Who can send you files?
  whoCanSendFiles:
    | 'everyone'            // Anyone who can message you
    | 'mutuals'             // Only mutual followers
    | 'friends'             // Only accepted friends
    | 'nobody';             // File attachments disabled

  // Who can see your online status?
  whoCanSeeOnlineStatus:
    | 'everyone'
    | 'mutuals'
    | 'friends'
    | 'nobody';

  // Who can see your read receipts?
  whoCanSeeReadReceipts:
    | 'everyone'
    | 'mutuals'
    | 'friends'
    | 'nobody';

  // Who can see your typing status?
  whoCanSeeTyping:
    | 'everyone'
    | 'mutuals'
    | 'friends'
    | 'nobody';

  // Content settings
  allowAdultContent: boolean;
  showAdultContentWarning: boolean;

  // Spam protection
  requireMessageRequest: boolean;     // New conversations need approval
  autoDeleteMessages: boolean;        // Disappearing messages by default
  autoDeleteAfterHours: number;       // 24, 48, 168 (week), etc.
}

// Default settings (privacy-focused)
const DEFAULT_MESSAGING_PRIVACY: MessagingPrivacySettings = {
  whoCanMessage: 'everyone',
  whoCanSendFiles: 'mutuals',         // Restrict file sending by default
  whoCanSeeOnlineStatus: 'mutuals',
  whoCanSeeReadReceipts: 'friends',
  whoCanSeeTyping: 'friends',
  allowAdultContent: false,
  showAdultContentWarning: true,
  requireMessageRequest: false,
  autoDeleteMessages: false,
  autoDeleteAfterHours: 168,          // 1 week
};

// More restrictive defaults for minors
const MINOR_MESSAGING_PRIVACY: MessagingPrivacySettings = {
  whoCanMessage: 'friends',           // Only friends can message
  whoCanSendFiles: 'friends',         // Only friends can send files
  whoCanSeeOnlineStatus: 'friends',
  whoCanSeeReadReceipts: 'friends',
  whoCanSeeTyping: 'friends',
  allowAdultContent: false,           // LOCKED: cannot be changed
  showAdultContentWarning: true,
  requireMessageRequest: true,        // All new convos need approval
  autoDeleteMessages: false,
  autoDeleteAfterHours: 168,
};
```

### 6.2 File Sharing Controls

```typescript
interface FileShareSettings {
  // What types of files can you receive?
  allowedFileTypes: {
    images: boolean;      // JPEG, PNG, WebP, HEIC
    videos: boolean;      // MP4, WebM, MOV
    audio: boolean;       // MP3, M4A, OGG
    documents: boolean;   // PDF, DOC, etc.
  };

  // Size limits (user-configurable within platform limits)
  maxFileSizeMB: number;  // Max: 50MB, default: 25MB

  // Auto-download
  autoDownloadOnWifi: boolean;
  autoDownloadOnMobile: boolean;

  // Storage
  cacheFilesLocally: boolean;
  maxLocalCacheMB: number;
}

// Validate file before allowing send
async function validateFileForRecipient(
  file: FileMetadata,
  recipientSettings: FileShareSettings
): Promise<{ allowed: boolean; reason?: string }> {
  // Check file type
  const fileCategory = getFileCategory(file.mimeType);
  if (!recipientSettings.allowedFileTypes[fileCategory]) {
    return { allowed: false, reason: 'Recipient does not accept this file type' };
  }

  // Check file size
  if (file.size > recipientSettings.maxFileSizeMB * 1024 * 1024) {
    return { allowed: false, reason: 'File exceeds recipient size limit' };
  }

  return { allowed: true };
}
```

### 6.3 Block & Report System

```typescript
interface BlockSettings {
  // When you block someone:
  hideYourProfileFromThem: boolean;     // They can't see your profile
  hideTheirProfileFromYou: boolean;     // You can't see their profile
  preventAllCommunication: boolean;     // No messages, reactions, mentions
  removeFromConversations: boolean;     // Remove from shared group chats

  // Reporting
  reportToModerators: boolean;          // Also report when blocking
  reportReason?: string;
}

// Block enforcement
async function enforceBlock(
  blockerId: string,
  blockedId: string,
  settings: BlockSettings
): Promise<void> {
  // Create block record
  await createBlock({ blockerId, blockedId, settings });

  // Remove from conversations if requested
  if (settings.removeFromConversations) {
    const sharedConvos = await getSharedConversations(blockerId, blockedId);
    for (const convo of sharedConvos) {
      // For 1:1, archive the conversation
      if (convo.type === 'direct') {
        await archiveConversation(convo.id, blockerId);
      }
      // For groups, mute notifications from blocked user
      else {
        await muteUserInConversation(convo.id, blockerId, blockedId);
      }
    }
  }

  // Report if requested
  if (settings.reportToModerators && settings.reportReason) {
    await createReport({
      reporterId: blockerId,
      reportedId: blockedId,
      reason: settings.reportReason,
      context: 'block_with_report',
    });
  }
}
```

---

## 7. Database Schema Changes

### 7.1 New Tables

```sql
-- Migration: XXX_e2ee_secure_messaging.ts

-- User encryption keys (for E2EE)
-- Note: Private keys are NEVER stored on server
-- Only public keys for key exchange
CREATE TABLE user_encryption_keys_v2 (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,

  -- Identity key (long-term, Ed25519)
  identity_key_public TEXT NOT NULL,        -- Base64 encoded
  identity_key_fingerprint TEXT NOT NULL,   -- SHA-256 hash for display

  -- Signed prekey (rotates monthly, X25519)
  signed_prekey_public TEXT NOT NULL,
  signed_prekey_signature TEXT NOT NULL,    -- Ed25519 signature
  signed_prekey_id INTEGER NOT NULL,
  signed_prekey_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One-time prekeys (consumed on first message)
  -- Stored separately for efficient retrieval

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_encryption_keys_user ON user_encryption_keys_v2(user_id);
CREATE INDEX idx_encryption_keys_fingerprint ON user_encryption_keys_v2(identity_key_fingerprint);

-- One-time prekeys (pool of keys for new conversations)
CREATE TABLE user_onetime_prekeys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  prekey_id INTEGER NOT NULL,
  prekey_public TEXT NOT NULL,              -- Base64 encoded X25519
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  used_by TEXT,                             -- User who consumed this key
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, device_id, prekey_id)
);

CREATE INDEX idx_onetime_prekeys_available ON user_onetime_prekeys(user_id, device_id)
  WHERE used = FALSE;
CREATE INDEX idx_onetime_prekeys_cleanup ON user_onetime_prekeys(used, used_at)
  WHERE used = TRUE;

-- Encrypted messages (server cannot read content)
CREATE TABLE encrypted_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Encryption version (for future upgrades)
  protocol_version INTEGER NOT NULL DEFAULT 1,

  -- Sender identification (public key fingerprint, not user ID)
  sender_fingerprint TEXT NOT NULL,

  -- Key exchange data (for initial messages only)
  key_exchange_ephemeral TEXT,              -- Ephemeral public key
  key_exchange_onetime_id INTEGER,          -- Which OPK was used

  -- Ratchet header
  ratchet_public_key TEXT NOT NULL,
  message_number INTEGER NOT NULL,
  previous_chain_length INTEGER NOT NULL DEFAULT 0,

  -- Encrypted content (XChaCha20-Poly1305)
  nonce TEXT NOT NULL,                      -- 24 bytes, base64
  ciphertext TEXT NOT NULL,                 -- Encrypted payload, base64

  -- Metadata (unencrypted, for server operations)
  has_file_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  content_type TEXT NOT NULL DEFAULT 'text', -- text, file, reaction, etc.

  -- NSFW metadata (for gating, server cannot see actual content)
  nsfw_score REAL DEFAULT 0,                -- Client-reported NSFW score
  user_marked_adult BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                   -- For disappearing messages

  -- Delivery tracking (separate from receipts for efficiency)
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_enc_messages_conversation ON encrypted_messages(conversation_id, created_at DESC);
CREATE INDEX idx_enc_messages_keyset ON encrypted_messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX idx_enc_messages_sender ON encrypted_messages(sender_id);
CREATE INDEX idx_enc_messages_expires ON encrypted_messages(expires_at) WHERE expires_at IS NOT NULL;

-- File attachment metadata (no actual files stored)
CREATE TABLE encrypted_file_metadata (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  message_id TEXT NOT NULL REFERENCES encrypted_messages(id) ON DELETE CASCADE,

  -- External storage reference
  storage_provider TEXT NOT NULL,           -- 'r2', 'ipfs', 'arweave'
  content_id TEXT NOT NULL,                 -- CID (IPFS) or key (R2)

  -- File info (encrypted in message, duplicated here for server operations)
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  -- File encryption (key is in the encrypted message, not here)
  file_nonce TEXT NOT NULL,                 -- Nonce used for file encryption

  -- NSFW metadata
  nsfw_score REAL DEFAULT 0,
  nsfw_category TEXT,                       -- 'porn', 'hentai', 'sexy', 'neutral'
  user_marked_adult BOOLEAN NOT NULL DEFAULT FALSE,

  -- Thumbnail (encrypted, stored inline if small)
  thumbnail_data TEXT,                      -- Base64, encrypted
  thumbnail_width INTEGER,
  thumbnail_height INTEGER,

  -- Access tracking
  download_count INTEGER NOT NULL DEFAULT 0,
  last_downloaded_at TIMESTAMPTZ,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_meta_message ON encrypted_file_metadata(message_id);
CREATE INDEX idx_file_meta_cid ON encrypted_file_metadata(storage_provider, content_id);
CREATE INDEX idx_file_meta_expires ON encrypted_file_metadata(expires_at);

-- User content preferences
CREATE TABLE user_content_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Age verification
  is_minor BOOLEAN NOT NULL DEFAULT TRUE,    -- Default to minor until verified
  age_verified BOOLEAN NOT NULL DEFAULT FALSE,
  age_verification_method TEXT,              -- 'self', 'payment', 'id'
  age_verified_at TIMESTAMPTZ,

  -- Adult content (LOCKED to false for minors)
  allow_adult_content BOOLEAN NOT NULL DEFAULT FALSE,
  show_adult_content_warning BOOLEAN NOT NULL DEFAULT TRUE,
  can_send_adult_content BOOLEAN NOT NULL DEFAULT FALSE,  -- Derived

  -- Display preferences
  display_age BOOLEAN NOT NULL DEFAULT FALSE,
  display_age_value INTEGER,                 -- Only if display_age is true

  -- Content filtering thresholds
  nsfw_block_threshold REAL NOT NULL DEFAULT 0.7,   -- Auto-block above this
  nsfw_blur_threshold REAL NOT NULL DEFAULT 0.3,    -- Blur between blur and block

  -- Auto-moderation
  auto_block_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
  auto_report_illegal BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messaging privacy settings
CREATE TABLE user_messaging_privacy (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Who can message?
  who_can_message TEXT NOT NULL DEFAULT 'everyone',
  who_can_send_files TEXT NOT NULL DEFAULT 'mutuals',
  who_can_see_online TEXT NOT NULL DEFAULT 'mutuals',
  who_can_see_read_receipts TEXT NOT NULL DEFAULT 'friends',
  who_can_see_typing TEXT NOT NULL DEFAULT 'friends',

  -- Message requests
  require_message_request BOOLEAN NOT NULL DEFAULT FALSE,

  -- Disappearing messages
  auto_delete_messages BOOLEAN NOT NULL DEFAULT FALSE,
  auto_delete_hours INTEGER NOT NULL DEFAULT 168,  -- 1 week

  -- File settings
  allowed_file_types JSONB NOT NULL DEFAULT '{"images":true,"videos":true,"audio":true,"documents":true}',
  max_file_size_mb INTEGER NOT NULL DEFAULT 25,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content reports (enhanced for encrypted messages)
CREATE TABLE encrypted_content_reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Reference to content (we can't see content, but can identify it)
  message_id TEXT REFERENCES encrypted_messages(id),
  file_content_id TEXT,                     -- CID for file reports

  -- Report details
  reason TEXT NOT NULL,                     -- 'nsfw_mislabeled', 'illegal', 'harassment', etc.
  description TEXT,

  -- Evidence (reporter provides decrypted content hash for verification)
  content_hash TEXT,                        -- SHA-256 of decrypted content

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  resolution TEXT,
  action_taken TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_reports_status ON encrypted_content_reports(status) WHERE status = 'pending';
CREATE INDEX idx_content_reports_reported ON encrypted_content_reports(reported_user_id);

-- Trust scores (for anti-abuse)
CREATE TABLE user_trust_scores (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Overall trust score (0-100)
  trust_score INTEGER NOT NULL DEFAULT 50,

  -- Component scores
  account_age_score INTEGER NOT NULL DEFAULT 0,       -- Older = higher
  verification_score INTEGER NOT NULL DEFAULT 0,     -- ID verified = +20
  activity_score INTEGER NOT NULL DEFAULT 0,         -- Active = higher
  report_score INTEGER NOT NULL DEFAULT 50,          -- Reports against = lower

  -- Flags
  is_trusted_sender BOOLEAN NOT NULL DEFAULT FALSE,  -- Can send to anyone
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,      -- Limited messaging
  is_shadowbanned BOOLEAN NOT NULL DEFAULT FALSE,    -- Messages hidden

  -- Restrictions
  max_new_conversations_per_day INTEGER NOT NULL DEFAULT 20,
  max_messages_per_minute INTEGER NOT NULL DEFAULT 60,
  max_files_per_day INTEGER NOT NULL DEFAULT 50,

  -- History
  total_reports_received INTEGER NOT NULL DEFAULT 0,
  total_reports_upheld INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.2 Modifications to Existing Tables

```sql
-- Add E2EE flag to conversations
ALTER TABLE conversations ADD COLUMN is_e2ee BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversations ADD COLUMN e2ee_version INTEGER;

-- Add encryption status to users
ALTER TABLE users ADD COLUMN e2ee_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN e2ee_setup_at TIMESTAMPTZ;

-- Add minor status to users (computed from content preferences)
ALTER TABLE users ADD COLUMN is_minor BOOLEAN NOT NULL DEFAULT TRUE;

-- Add trust score reference
ALTER TABLE users ADD COLUMN trust_score INTEGER NOT NULL DEFAULT 50;
```

---

## 8. API Changes

### 8.1 GraphQL Schema Additions

```graphql
# E2EE Key Management
type UserKeyBundle {
  userId: ID!
  deviceId: String!
  identityKeyPublic: String!
  identityKeyFingerprint: String!
  signedPreKeyPublic: String!
  signedPreKeySignature: String!
  signedPreKeyId: Int!
  oneTimePreKeys: [OneTimePreKey!]!
}

type OneTimePreKey {
  id: Int!
  publicKey: String!
}

# Encrypted Message
type EncryptedMessage {
  id: ID!
  conversationId: ID!
  senderId: ID!
  senderFingerprint: String!
  protocolVersion: Int!

  # Key exchange (null for subsequent messages)
  keyExchangeEphemeral: String
  keyExchangeOnetimeId: Int

  # Ratchet data
  ratchetPublicKey: String!
  messageNumber: Int!
  previousChainLength: Int!

  # Encrypted payload
  nonce: String!
  ciphertext: String!

  # Metadata
  hasFileAttachment: Boolean!
  contentType: String!
  nsfwScore: Float
  userMarkedAdult: Boolean!

  # Timestamps
  createdAt: DateTime!
  editedAt: DateTime
  expiresAt: DateTime
}

# File Attachment Metadata
type FileAttachmentMeta {
  id: ID!
  storageProvider: String!
  contentId: String!
  fileSizeBytes: Int!
  mimeType: String!
  fileNonce: String!
  nsfwScore: Float
  nsfwCategory: String
  userMarkedAdult: Boolean!
  thumbnailData: String
  thumbnailWidth: Int
  thumbnailHeight: Int
  expiresAt: DateTime!
}

# Content Preferences
type ContentPreferences {
  isMinor: Boolean!
  ageVerified: Boolean!
  ageVerificationMethod: String
  allowAdultContent: Boolean!
  showAdultContentWarning: Boolean!
  canSendAdultContent: Boolean!
  displayAge: Boolean!
  displayAgeValue: Int
  nsfwBlockThreshold: Float!
  nsfwBlurThreshold: Float!
}

input ContentPreferencesInput {
  allowAdultContent: Boolean
  showAdultContentWarning: Boolean
  displayAge: Boolean
  displayAgeValue: Int
  nsfwBlockThreshold: Float
  nsfwBlurThreshold: Float
}

# Messaging Privacy
type MessagingPrivacy {
  whoCanMessage: String!
  whoCanSendFiles: String!
  whoCanSeeOnline: String!
  whoCanSeeReadReceipts: String!
  whoCanSeeTyping: String!
  requireMessageRequest: Boolean!
  autoDeleteMessages: Boolean!
  autoDeleteHours: Int!
  allowedFileTypes: JSONObject!
  maxFileSizeMb: Int!
}

input MessagingPrivacyInput {
  whoCanMessage: String
  whoCanSendFiles: String
  whoCanSeeOnline: String
  whoCanSeeReadReceipts: String
  whoCanSeeTyping: String
  requireMessageRequest: Boolean
  autoDeleteMessages: Boolean
  autoDeleteHours: Int
  allowedFileTypes: JSONObject
  maxFileSizeMb: Int
}

# File Upload Request
type FileUploadRequest {
  uploadUrl: String!
  contentId: String!
  storageProvider: String!
  expiresAt: DateTime!
}

# Queries
extend type Query {
  # Get user's key bundle for key exchange
  getUserKeyBundle(userId: ID!): UserKeyBundle

  # Get available one-time prekeys
  getAvailablePreKeys(userId: ID!, count: Int = 10): [OneTimePreKey!]!

  # Get encrypted messages in conversation
  getEncryptedMessages(
    conversationId: ID!
    cursor: String
    limit: Int = 50
  ): EncryptedMessageConnection!

  # Get file metadata
  getFileMetadata(messageId: ID!): FileAttachmentMeta

  # Get my content preferences
  myContentPreferences: ContentPreferences!

  # Get my messaging privacy settings
  myMessagingPrivacy: MessagingPrivacy!

  # Check if I can message a user
  canMessageUser(userId: ID!): MessageabilityCheck!
}

type MessageabilityCheck {
  canMessage: Boolean!
  reason: String
  requiresRequest: Boolean!
}

# Mutations
extend type Mutation {
  # Register/update encryption keys
  registerEncryptionKeys(input: RegisterKeysInput!): UserKeyBundle!

  # Upload new one-time prekeys
  uploadPreKeys(keys: [PreKeyInput!]!): Int!  # Returns count uploaded

  # Send encrypted message
  sendEncryptedMessage(input: SendEncryptedMessageInput!): EncryptedMessage!

  # Request file upload URL
  requestFileUpload(input: FileUploadRequestInput!): FileUploadRequest!

  # Confirm file upload complete
  confirmFileUpload(contentId: String!, messageId: ID!): FileAttachmentMeta!

  # Verify age
  verifyAge(dateOfBirth: DateTime!): AgeVerificationResult!

  # Update content preferences
  updateContentPreferences(input: ContentPreferencesInput!): ContentPreferences!

  # Update messaging privacy
  updateMessagingPrivacy(input: MessagingPrivacyInput!): MessagingPrivacy!

  # Report encrypted content
  reportEncryptedContent(input: ReportContentInput!): ContentReport!
}

# Input Types
input RegisterKeysInput {
  deviceId: String!
  identityKeyPublic: String!
  signedPreKeyPublic: String!
  signedPreKeySignature: String!
  signedPreKeyId: Int!
}

input PreKeyInput {
  id: Int!
  publicKey: String!
}

input SendEncryptedMessageInput {
  conversationId: ID!
  senderFingerprint: String!

  # Key exchange (required for first message)
  keyExchangeEphemeral: String
  keyExchangeOnetimeId: Int

  # Ratchet data
  ratchetPublicKey: String!
  messageNumber: Int!
  previousChainLength: Int!

  # Encrypted payload
  nonce: String!
  ciphertext: String!

  # Metadata
  hasFileAttachment: Boolean!
  contentType: String!
  nsfwScore: Float
  userMarkedAdult: Boolean

  # Disappearing message
  disappearingTtl: Int
}

input FileUploadRequestInput {
  contentId: String!  # Client-computed CID
  fileSizeBytes: Int!
  mimeType: String!
  nsfwScore: Float
  userMarkedAdult: Boolean
}

input ReportContentInput {
  messageId: ID
  fileContentId: String
  reason: String!
  description: String
  contentHash: String  # SHA-256 of decrypted content
}

type AgeVerificationResult {
  verified: Boolean!
  isMinor: Boolean!
  method: String!
}

type ContentReport {
  id: ID!
  status: String!
  createdAt: DateTime!
}
```

### 8.2 REST Endpoints (Infrastructure Only)

```typescript
// File upload endpoint (presigned URL flow)
// POST /api/messaging/attachment/request-upload
interface RequestUploadBody {
  contentId: string;      // CID computed by client
  fileSizeBytes: number;
  mimeType: string;
  nsfwScore?: number;
  userMarkedAdult?: boolean;
}

interface RequestUploadResponse {
  uploadUrl: string;      // Presigned URL for R2/S3
  contentId: string;
  storageProvider: 'r2' | 'ipfs';
  expiresAt: string;      // ISO date
}

// Download proxy (for CORS and tracking)
// GET /api/messaging/attachment/:contentId
// Returns redirect to actual storage URL or streams file

// Health check for E2EE service
// GET /api/e2ee/health
```

---

## 9. Frontend Implementation

### 9.1 Key Management Components

```typescript
// src/lib/e2ee/KeyManager.ts
export class KeyManager {
  private db: IDBDatabase;
  private masterKey: Uint8Array | null = null;

  async initialize(password: string): Promise<void> {
    // Open IndexedDB
    this.db = await openKeyStore();

    // Derive master key from password
    const store = await this.getEncryptedStore();
    this.masterKey = await deriveKey(password, store.passwordSalt);

    // Verify password
    if (!await this.verifyMasterKey(store)) {
      throw new Error('Invalid password');
    }
  }

  async generateKeyBundle(): Promise<UserKeyBundle> {
    // Generate identity key (Ed25519)
    const identityKeyPair = await generateEd25519KeyPair();

    // Generate signed prekey (X25519)
    const signedPreKeyPair = await generateX25519KeyPair();
    const signedPreKeySignature = await sign(
      signedPreKeyPair.publicKey,
      identityKeyPair.privateKey
    );

    // Generate one-time prekeys
    const oneTimePreKeys = await this.generateOneTimePreKeys(100);

    const bundle: UserKeyBundle = {
      identityPublicKey: identityKeyPair.publicKey,
      identityPrivateKey: identityKeyPair.privateKey,
      signedPreKeyPublic: signedPreKeyPair.publicKey,
      signedPreKeyPrivate: signedPreKeyPair.privateKey,
      signedPreKeySignature,
      signedPreKeyId: 1,
      oneTimePreKeys,
    };

    // Store encrypted
    await this.storeBundle(bundle);

    // Register public keys with server
    await this.registerPublicKeys(bundle);

    return bundle;
  }

  async getBundle(): Promise<UserKeyBundle> {
    const encrypted = await this.getEncryptedStore();
    return this.decryptBundle(encrypted);
  }

  async consumeOneTimePreKey(keyId: number): Promise<void> {
    // Mark key as used locally
    await this.markKeyUsed(keyId);

    // If low on keys, generate more
    const remaining = await this.countAvailableKeys();
    if (remaining < 20) {
      await this.replenishOneTimePreKeys();
    }
  }
}
```

### 9.2 Message Encryption/Decryption

```typescript
// src/lib/e2ee/MessageCrypto.ts
export class MessageCrypto {
  private keyManager: KeyManager;
  private sessionCache: Map<string, ConversationKeyState>;

  async encryptMessage(
    conversationId: string,
    recipientKeyBundle: UserKeyBundle,
    plaintext: string,
    attachments?: FileAttachment[]
  ): Promise<EncryptedMessagePayload> {
    // Get or create session
    let session = this.sessionCache.get(conversationId);

    if (!session) {
      // First message: perform X3DH
      session = await this.initializeSession(recipientKeyBundle);
      this.sessionCache.set(conversationId, session);
    }

    // Build payload
    const payload: MessagePayload = {
      type: 'text',
      text: plaintext,
    };

    // Handle attachments
    if (attachments?.length) {
      payload.type = 'file';
      payload.file = await this.prepareAttachmentMeta(attachments[0], session);
    }

    // Serialize and encrypt
    const serialized = new TextEncoder().encode(JSON.stringify(payload));
    const { ciphertext, header } = await this.ratchetEncrypt(session, serialized);

    return {
      senderFingerprint: await this.getMyFingerprint(),
      keyExchange: session.isInitial ? {
        ephemeralKey: session.ephemeralKey,
        usedOneTimePreKeyId: session.usedOPKId,
      } : undefined,
      header,
      nonce: header.nonce,
      ciphertext: base64Encode(ciphertext),
    };
  }

  async decryptMessage(
    encryptedMessage: EncryptedMessage
  ): Promise<DecryptedMessage> {
    // Get session for this sender
    let session = this.sessionCache.get(encryptedMessage.conversationId);

    if (!session && encryptedMessage.keyExchangeEphemeral) {
      // First message from this sender: perform X3DH as recipient
      session = await this.initializeSessionAsRecipient(encryptedMessage);
      this.sessionCache.set(encryptedMessage.conversationId, session);
    }

    if (!session) {
      throw new Error('No session and no key exchange data');
    }

    // Decrypt
    const ciphertext = base64Decode(encryptedMessage.ciphertext);
    const plaintext = await this.ratchetDecrypt(session, ciphertext, encryptedMessage.header);

    // Parse payload
    const payload: MessagePayload = JSON.parse(new TextDecoder().decode(plaintext));

    return {
      id: encryptedMessage.id,
      conversationId: encryptedMessage.conversationId,
      senderId: encryptedMessage.senderId,
      payload,
      createdAt: encryptedMessage.createdAt,
    };
  }
}
```

### 9.3 File Handling Components

```typescript
// src/lib/e2ee/FileHandler.ts
export class FileHandler {
  private nsfwDetector: NSFWDetector;

  async prepareFileForUpload(
    file: File,
    userPreferences: ContentPreferences
  ): Promise<PreparedFile> {
    // Step 1: Run NSFW detection
    const nsfwResult = await this.nsfwDetector.classify(file);

    // Step 2: If NSFW detected, handle appropriately
    if (nsfwResult.isNSFW) {
      // Check if sender can send adult content
      if (!userPreferences.canSendAdultContent) {
        throw new NSFWBlockedError(
          'You cannot send adult content. Enable in settings if you are 18+.'
        );
      }

      // Require explicit marking
      if (!await this.confirmAdultContent()) {
        throw new UserCancelledError('Upload cancelled');
      }
    }

    // Step 3: Compress if needed
    const { processedFile, thumbnail } = await this.processFile(file);

    // Step 4: Generate encryption key
    const fileKey = await generateRandomKey(32);
    const nonce = await generateRandomBytes(24);

    // Step 5: Encrypt file
    const encryptedFile = await xchacha20poly1305.encrypt(
      fileKey,
      nonce,
      processedFile
    );

    // Step 6: Calculate CID
    const cid = await calculateCID(encryptedFile);

    // Step 7: Encrypt thumbnail
    const encryptedThumbnail = thumbnail
      ? await xchacha20poly1305.encrypt(fileKey, nonce, thumbnail)
      : undefined;

    return {
      encryptedFile,
      cid,
      fileKey,
      nonce,
      originalName: file.name,
      mimeType: file.type,
      size: processedFile.byteLength,
      nsfw: nsfwResult,
      userMarkedAdult: nsfwResult.isNSFW,
      thumbnail: encryptedThumbnail,
    };
  }

  async downloadAndDecrypt(
    metadata: FileAttachmentMeta,
    fileKey: Uint8Array
  ): Promise<Blob> {
    // Step 1: Fetch encrypted file
    const response = await fetch(this.getDownloadUrl(metadata));
    const encryptedFile = new Uint8Array(await response.arrayBuffer());

    // Step 2: Decrypt
    const decrypted = await xchacha20poly1305.decrypt(
      fileKey,
      base64Decode(metadata.fileNonce),
      encryptedFile
    );

    // Step 3: Run client-side NSFW check (verification layer)
    if (metadata.mimeType.startsWith('image/')) {
      const localNsfw = await this.nsfwDetector.classifyBuffer(decrypted);
      if (localNsfw.isNSFW && !metadata.userMarkedAdult) {
        // Sender lied about NSFW status - log and handle
        await this.reportNSFWDiscrepancy(metadata, localNsfw);
      }
    }

    return new Blob([decrypted], { type: metadata.mimeType });
  }
}
```

### 9.4 UI Components

```tsx
// src/components/messaging/ContentGate.tsx
export function ContentGate({
  content,
  recipientPrefs,
  children,
}: ContentGateProps) {
  const visibility = useContentVisibility(content, recipientPrefs);
  const [revealed, setRevealed] = useState(false);

  if (visibility === 'show' || revealed) {
    return <>{children}</>;
  }

  if (visibility === 'blur') {
    return (
      <BlurredOverlay
        thumbnail={content.thumbnail}
        onReveal={() => setRevealed(true)}
        warning="This may contain adult content"
      />
    );
  }

  // visibility === 'block'
  return (
    <BlockedPlaceholder
      onLearnMore={() => openContentSettings()}
      message="This content is not available based on your settings"
    />
  );
}

// src/components/messaging/AgeVerificationModal.tsx
export function AgeVerificationModal({ onComplete }: Props) {
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!dateOfBirth) return;

    const age = calculateAge(dateOfBirth);

    if (age < 13) {
      setError('You must be at least 13 years old to use MuscleMap.');
      return;
    }

    if (age < 18) {
      // Minor - can continue but with restrictions
      await verifyAge(dateOfBirth);
      onComplete({ isMinor: true });
      return;
    }

    // Adult - verify and enable adult content options
    await verifyAge(dateOfBirth);
    onComplete({ isMinor: false });
  };

  return (
    <Modal title="Verify Your Age">
      <Text>
        To access certain features, we need to verify your age.
        Your date of birth will not be stored or shared.
      </Text>

      <DatePicker
        value={dateOfBirth}
        onChange={setDateOfBirth}
        maxDate={new Date()}
        minDate={subYears(new Date(), 120)}
      />

      {error && <ErrorText>{error}</ErrorText>}

      <Button onClick={handleVerify}>Verify</Button>
    </Modal>
  );
}

// src/components/messaging/AdultContentConsentModal.tsx
export function AdultContentConsentModal({ onComplete }: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <Modal title="Enable Adult Content">
      <Text>
        You are about to enable adult content in messages. This means:
      </Text>

      <List>
        <ListItem>You may see NSFW images and videos from other users</ListItem>
        <ListItem>You can send adult content to others who have also enabled it</ListItem>
        <ListItem>You confirm you are 18 years or older</ListItem>
        <ListItem>You understand this content may be explicit</ListItem>
      </List>

      <Checkbox
        checked={agreed}
        onChange={setAgreed}
        label="I understand and agree to these terms"
      />

      <ButtonGroup>
        <Button variant="secondary" onClick={() => onComplete(false)}>
          Keep Safe Mode
        </Button>
        <Button
          variant="primary"
          disabled={!agreed}
          onClick={() => onComplete(true)}
        >
          Enable Adult Content
        </Button>
      </ButtonGroup>
    </Modal>
  );
}
```

---

## 10. Security Considerations

### 10.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Server breach** | E2EE means server data is useless without client keys |
| **Man-in-the-middle** | X3DH + Double Ratchet provides authentication |
| **Key compromise** | Forward secrecy limits damage to current session |
| **Replay attacks** | Message numbers prevent replay |
| **NSFW bypass** | Multiple detection layers (sender + recipient) |
| **Minor exploitation** | Age-gated features, no age-based discovery |
| **Metadata analysis** | Conversation participants visible, but content encrypted |
| **Device theft** | Keys encrypted with password, require PIN/biometric |
| **Malicious client** | Server validates message format, rate limits |
| **File storage attacks** | Files encrypted before upload, CID verification |

### 10.2 What We CAN See (Metadata)

- Who is talking to whom (conversation participants)
- When messages are sent (timestamps)
- Message sizes (roughly how much text/file)
- NSFW scores (client-reported, can be lied about)
- User-declared adult content flags
- File sizes and types (but not contents)

### 10.3 What We CANNOT See

- Message content (encrypted)
- File contents (encrypted + external storage)
- Actual NSFW content (only scores)
- User's encryption keys
- Session keys between users

### 10.4 Security Audit Checklist

- [ ] Independent cryptography review
- [ ] Penetration testing on API endpoints
- [ ] Client-side security review (XSS, etc.)
- [ ] Key storage security audit
- [ ] NSFW detection accuracy testing
- [ ] Age verification bypass testing
- [ ] Rate limiting effectiveness
- [ ] Error message information leakage

---

## 11. Legal Compliance

### 11.1 COPPA (Children's Online Privacy Protection Act)

- Users under 13 cannot use the platform
- Users 13-17 have restricted features (no adult content)
- Parental consent not collected (we don't target children)

### 11.2 GDPR / CCPA

- Right to deletion: Users can delete all their data including encrypted messages
- Data portability: Users can export their key bundles
- Privacy by design: E2EE is default, not opt-in
- Data minimization: We don't store what we don't need

### 11.3 Child Safety (CSAM)

- PhotoDNA or similar NOT possible due to E2EE
- We rely on: User reports, metadata patterns, trust scores
- Legal compliance: We cannot scan encrypted content
- Mitigation: Clear reporting, fast response, cooperation with law enforcement

### 11.4 Adult Content Laws (18 U.S.C. § 2257)

- We don't host pornographic content (external storage)
- Users self-certify age
- We're not a "secondary producer" under 2257

---

## 12. Performance & Bandwidth

### 12.1 Encryption Overhead

| Operation | Time (avg) | Notes |
|-----------|------------|-------|
| X3DH key exchange | ~5ms | Once per new conversation |
| Message encrypt (1KB) | ~1ms | XChaCha20 is fast |
| Message decrypt (1KB) | ~1ms | |
| File encrypt (10MB) | ~200ms | Parallel chunks possible |
| NSFWJS classification | ~100ms | First load ~3s (model download) |

### 12.2 Storage Overhead

| Component | Size | Notes |
|-----------|------|-------|
| User key bundle | ~10KB | 100 one-time prekeys |
| Encrypted message | +48 bytes | Nonce + auth tag |
| File encryption | +16 bytes | Auth tag only |
| NSFWJS model | 2.6MB | Loaded once, cached |

### 12.3 Bandwidth Optimization

- Progressive image loading (thumbnail → full)
- Chunked uploads with resume
- WebSocket for message delivery (no polling)
- Compression before encryption
- CDN for NSFWJS model

---

## 13. Migration Strategy

### 13.1 Phase 1: Infrastructure (No User Impact)

1. Deploy new database tables
2. Deploy E2EE API endpoints (not used yet)
3. Deploy file storage infrastructure (R2 bucket)
4. Add NSFWJS model to CDN

### 13.2 Phase 2: Opt-In Beta

1. Add "Enable E2EE" toggle in settings
2. Users who enable get new messaging system
3. Non-E2EE users see "User has secure messaging"
4. Existing messages remain in old system

### 13.3 Phase 3: Gradual Rollout

1. Auto-enable E2EE for new users
2. Prompt existing users to upgrade
3. Old messages remain readable
4. New messages are E2EE

### 13.4 Phase 4: Legacy Deprecation

1. Disable old messaging for new conversations
2. Old conversations read-only
3. Eventually archive/delete old messages

---

## 14. Implementation Phases

### Phase A: Foundation (Weeks 1-4)

| Week | Tasks |
|------|-------|
| 1 | Database schema, API stubs, key generation library |
| 2 | X3DH implementation, session management |
| 3 | Double Ratchet implementation, message encrypt/decrypt |
| 4 | Testing, security review, bug fixes |

### Phase B: File Handling (Weeks 5-8)

| Week | Tasks |
|------|-------|
| 5 | R2 integration, presigned URLs, upload flow |
| 6 | File encryption, CID verification, download flow |
| 7 | NSFWJS integration, client-side detection |
| 8 | Thumbnail generation, compression, bandwidth optimization |

### Phase C: Content Controls (Weeks 9-12)

| Week | Tasks |
|------|-------|
| 9 | Age verification flow, minor protection |
| 10 | Content preferences, adult content consent |
| 11 | Privacy settings, messaging permissions |
| 12 | Reporting system, trust scores |

### Phase D: Frontend & Polish (Weeks 13-16)

| Week | Tasks |
|------|-------|
| 13 | Message UI components, encryption indicators |
| 14 | File viewer, content gating UI |
| 15 | Settings UI, onboarding flow |
| 16 | Testing, performance optimization, documentation |

### Phase E: Launch (Weeks 17-20)

| Week | Tasks |
|------|-------|
| 17 | Beta release to opt-in users |
| 18 | Bug fixes, feedback collection |
| 19 | Gradual rollout to all users |
| 20 | Full launch, marketing ("End-to-End Encrypted") |

---

## Summary

This plan provides:

1. ✅ **End-to-End Encryption** - Signal-like protocol, messages unreadable by server
2. ✅ **Zero File Storage** - Files encrypted and stored externally (R2/IPFS)
3. ✅ **NSFW Moderation** - Multi-layer detection with user consent
4. ✅ **Age Verification** - Robust gating with legal compliance
5. ✅ **Minor Protection** - No age-based discovery, restricted messaging
6. ✅ **Privacy Controls** - Granular user permissions
7. ✅ **Low Bandwidth** - Compression, chunking, progressive loading
8. ✅ **High Performance** - Efficient crypto, caching, CDN
9. ✅ **Legal Compliance** - COPPA, GDPR, CCPA compliant
10. ✅ **No Server Compromise Risk** - Even if breached, content is encrypted

The system is designed to be **feature-rich, bulletproof, and privacy-preserving** while still allowing legitimate content sharing between consenting adults.
