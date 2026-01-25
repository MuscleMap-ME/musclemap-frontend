# Privacy & Security

> **Your body. Your data. Your control.** MuscleMap is built on a foundation of privacy-first design.

---

## Our Privacy Promise

Your fitness data is **deeply personal**. It reveals your habits, your body, your struggles, your progress. We believe this data should belong to **you and only you**.

**We will never:**
- Sell your data to anyone, ever
- Share your data with advertisers
- Use your data to manipulate you
- Store more than we need
- Make privacy a premium feature

**We will always:**
- Be transparent about what we collect
- Give you control over your data
- Encrypt everything sensitive
- Let you export or delete anytime
- Keep our code open for audit

---

## Security Features

### End-to-End Encrypted Messaging

All direct messages on MuscleMap use **end-to-end encryption (E2EE)**:

```
Your Message
    ↓
Encrypted on YOUR device (with your private key)
    ↓
Travels across the internet (unreadable to anyone, including us)
    ↓
Decrypted on recipient's device (with their private key)
```

**What this means:**
- We cannot read your messages, even if we wanted to
- Government requests get nothing — we don't have the keys
- A server breach reveals nothing — messages are encrypted
- Only you and your recipient can read the conversation

**Technical details:**
- Signal Protocol implementation
- Forward secrecy (compromised keys don't expose past messages)
- Private keys never leave your device
- No message content stored on servers

### Local-First Data

Your workout data lives on **YOUR device first**:

- Workouts are saved locally before syncing
- App works fully offline
- Cloud sync is optional, not required
- You own the primary copy of your data

If you choose to sync:
- Data is encrypted before leaving your device
- Stored encrypted on our servers
- We cannot read your workout details
- You can delete at any time

### Zero-Knowledge Architecture

We don't need to know who you are:

- **No real name required** — Use any display name
- **No email required** — Sign up with username/password only
- **No phone required** — We don't need it
- **No location tracking** — Hangouts use approximate location, opt-in only
- **No social graph mining** — We don't analyze your connections

### Open Source Transparency

Don't trust us? **Verify us.**

Our entire codebase is public:
- https://github.com/jeanpaulniko/musclemap

Security researchers can:
- Audit our encryption implementation
- Verify our privacy claims
- Report vulnerabilities responsibly
- Suggest improvements

---

## Data You Control

| Your Data | What We Store | Your Control |
|-----------|---------------|--------------|
| **Workout history** | Encrypted if synced | Export anytime, delete anytime |
| **Body measurements** | Optional, encrypted | Never shared, you control visibility |
| **Progress photos** | Stored locally by default | E2EE if synced, you choose |
| **Messages** | E2EE, no content on servers | Auto-delete options available |
| **Location (Hangouts)** | Approximate only, opt-in | Disable anytime |
| **Identity** | Pseudonymous by default | Real name never required |

### Export Your Data

Download everything we have:
1. Go to Settings → Privacy
2. Click "Export My Data"
3. Receive a complete archive (JSON format)
4. Use it however you want

### Delete Your Data

Erase everything permanently:
1. Go to Settings → Privacy
2. Click "Delete My Account"
3. Confirm you want to delete
4. Everything is gone — immediately and permanently

No "30-day waiting period." No "we'll keep backups." **Gone.**

---

## Community Safety

A safe community is a thriving community.

### Block & Report

One-click tools for unwanted interactions:
- Block users instantly
- Report harassment or abuse
- Mute conversations
- Hide from specific users

### Content Moderation

We moderate with humans, not just algorithms:
- Community moderators review reports
- Clear guidelines, consistent enforcement
- Appeals process for mistakes
- Transparency about actions taken

### No Toxic Metrics

We deliberately avoid features that create anxiety:
- **No follower counts** on profiles
- **No like buttons** on workouts
- **No public comparison** rankings (leaderboards are opt-in)
- **No engagement manipulation** algorithms

### Safe Spaces

Everyone belongs here:
- **Women-only crews** — Safe training spaces
- **LGBTQ+ friendly hangouts** — Inclusive communities
- **Beginner zones** — Judgment-free learning
- **Age-appropriate options** — Protection for younger users

### Anti-Harassment Policy

We have zero tolerance for:
- Harassment or bullying
- Hate speech or discrimination
- Unsolicited sexual content
- Doxxing or privacy violations
- Spam or commercial exploitation

Violations result in:
1. Warning (for minor first offenses)
2. Temporary suspension
3. Permanent ban
4. Report to authorities (if illegal)

---

## Technical Security

### Infrastructure

- **TLS 1.3** — All connections encrypted in transit
- **AES-256** — Data encrypted at rest
- **Secure enclaves** — Sensitive operations isolated
- **Regular audits** — Third-party security reviews
- **Bug bounty** — We pay for vulnerability reports

### Authentication

- **Bcrypt password hashing** — Industry-standard protection
- **Rate limiting** — Brute force prevention
- **Session management** — Secure token handling
- **2FA available** — Optional additional security

### Compliance

- **GDPR compliant** — European privacy standards
- **CCPA compliant** — California privacy rights
- **HIPAA considerations** — Health data best practices
- **SOC 2 principles** — Security controls framework

---

## Privacy FAQ

**Q: Do you sell my data?**
A: No. Never. We don't even have a mechanism to do this.

**Q: Can you read my messages?**
A: No. End-to-end encryption means only you and your recipient can read them.

**Q: What if law enforcement requests my data?**
A: We comply with valid legal requests, but we can only provide what we have — which isn't much. We can't decrypt your messages or provide data we don't store.

**Q: What happens to my data if MuscleMap shuts down?**
A: We'll give you ample notice to export your data. And since we're open source, the community could keep it running.

**Q: How do I know you're actually doing what you say?**
A: Our code is open source. Security researchers regularly audit it. We publish transparency reports. Trust, but verify.

**Q: Can I use MuscleMap completely anonymously?**
A: Yes. Use a pseudonym, don't enable location, use E2EE messaging. We don't require real identity.

---

## Contact

Privacy questions? Security concerns?

- **Email:** privacy@musclemap.me
- **Security issues:** security@musclemap.me (PGP key available)
- **Slack:** #privacy-security channel

---

*Your data is yours. That's not a feature — it's a principle.*
