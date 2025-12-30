import { Type } from '@sinclair/typebox';
import { request } from './httpClient';

const UserSchema = Type.Object({
  id: Type.Union([Type.String(), Type.Number()]),
  email: Type.Optional(Type.String()),
  username: Type.Optional(Type.String()),
  archetype: Type.Optional(Type.String()),
}, { additionalProperties: true });

const AuthResponseSchema = Type.Object({ token: Type.String(), user: UserSchema }, { additionalProperties: true });
const WalletSchema = Type.Object({ wallet: Type.Object({ balance: Type.Number(), currency: Type.String({ default: 'CR' }) }, { additionalProperties: true }) }, { additionalProperties: true });
const TransactionsSchema = Type.Object({
  transactions: Type.Array(
    Type.Object({
      id: Type.Union([Type.String(), Type.Number()]),
      amount: Type.Number(),
      description: Type.Optional(Type.String()),
      created_at: Type.Optional(Type.String()),
    }, { additionalProperties: true }),
    { default: [] }
  ),
}, { additionalProperties: true });

const HighFiveUserSchema = Type.Object({ id: Type.Union([Type.String(), Type.Number()]), username: Type.Optional(Type.String()) }, { additionalProperties: true });
const HighFiveFeedSchema = Type.Object({ encouragements: Type.Array(Type.Object({
  id: Type.Union([Type.String(), Type.Number()]),
  sender_name: Type.Optional(Type.String()),
  recipient_name: Type.Optional(Type.String()),
  type: Type.String(),
  message: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  created_at: Type.Optional(Type.String()),
  read_at: Type.Optional(Type.Union([Type.String(), Type.Null()])),
}, { additionalProperties: true }), { default: [] }) }, { additionalProperties: true });
const HighFiveStatsSchema = Type.Object({ sent: Type.Optional(Type.Number()), received: Type.Optional(Type.Number()), unread: Type.Optional(Type.Number()) }, { additionalProperties: true });

const SettingsSchema = Type.Object({
  email_notifications: Type.Optional(Type.Boolean()),
  sms_notifications: Type.Optional(Type.Boolean()),
  theme: Type.Optional(Type.String()),
}, { additionalProperties: true });
const SettingsResponseSchema = Type.Object({
  settings: Type.Optional(SettingsSchema),
}, { additionalProperties: true });

const ProfileSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  username: Type.Optional(Type.String()),
  bio: Type.Optional(Type.String()),
  avatar: Type.Optional(Type.String()),
}, { additionalProperties: true });

const StatsSchema = Type.Object({
  workoutsCompleted: Type.Optional(Type.Number()),
  streak: Type.Optional(Type.Number()),
  achievements: Type.Optional(Type.Array(Type.Any())),
}, { additionalProperties: true });

export const apiClient = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false, schema: AuthResponseSchema }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false, schema: AuthResponseSchema }),
    profile: () => request('/auth/profile', { schema: UserSchema }),
  },
  progress: {
    stats: () => request('/progress/stats', { schema: StatsSchema }),
  },
  wallet: {
    balance: () => request('/economy/wallet', { schema: WalletSchema }),
    transactions: (limit = 20) => request(`/economy/transactions?limit=${limit}`, { schema: TransactionsSchema }),
    transfer: (payload) => request('/economy/transfer', { method: 'POST', body: payload, schema: Type.Object({ success: Type.Optional(Type.Boolean()) }, { additionalProperties: true }) }),
  },
  highFives: {
    users: () => request('/highfives/users', { schema: Type.Object({ users: Type.Array(HighFiveUserSchema, { default: [] }) }, { additionalProperties: true }) }),
    received: () => request('/highfives/received', { schema: HighFiveFeedSchema }),
    sent: () => request('/highfives/sent', { schema: HighFiveFeedSchema }),
    stats: () => request('/highfives/stats', { schema: HighFiveStatsSchema }),
    send: (payload) => request('/highfives/send', { method: 'POST', body: payload, schema: Type.Object({ error: Type.Optional(Type.String()) }, { additionalProperties: true }) }),
  },
  settings: {
    fetch: () => request('/settings', { schema: SettingsResponseSchema }),
    update: (updates) => request('/settings', { method: 'PATCH', body: updates, schema: SettingsSchema }),
  },
  profile: {
    get: () => request('/profile', { schema: ProfileSchema }),
    update: (updates) => request('/profile', { method: 'PUT', body: updates, schema: ProfileSchema }),
    avatars: () => request('/profile/avatars', { schema: Type.Object({ avatars: Type.Array(Type.Any(), { default: [] }) }, { additionalProperties: true }), cacheTtl: 60_000 }),
    themes: () => request('/profile/themes', { schema: Type.Object({ themes: Type.Array(Type.Any(), { default: [] }) }, { additionalProperties: true }), cacheTtl: 60_000 }),
  }
};

export default apiClient;
