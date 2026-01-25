/**
 * E2EE Module Index
 *
 * End-to-End Encrypted Messaging System
 *
 * Features:
 * - Signal Protocol compatible encryption (X3DH + Double Ratchet)
 * - Zero-storage file attachments (R2/IPFS)
 * - NSFW content moderation with user consent
 * - Age verification and minor protection
 * - Granular privacy controls
 * - Trust scoring and anti-abuse
 */

// Crypto utilities
export * from './crypto';

// Services
export { keyManagementService } from './key-management.service';
export { encryptedMessagingService } from './encrypted-messaging.service';
export { fileStorageService } from './file-storage.service';
export { contentPreferencesService } from './content-preferences.service';

// Types
export type {
  KeyBundle,
  OneTimePreKey,
  EncryptedPayload,
} from './crypto';

export type {
  RegisterKeysInput,
  KeyBundleWithPreKeys,
  DeviceInfo,
} from './key-management.service';

export type {
  SendEncryptedMessageInput,
  EncryptedMessage,
  EncryptedMessageWithReceipts,
} from './encrypted-messaging.service';

export type {
  FileUploadRequest,
  FileUploadToken,
  FileMetadata,
} from './file-storage.service';

export type {
  ContentPreferences,
  MessagingPrivacy,
  TrustScore,
  AgeVerificationResult,
} from './content-preferences.service';
