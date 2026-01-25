# MuscleMap Documentation Hub

> **The world's first Computational Exercise Physiology platform** — 100% free, open source, community-driven.

---

## Quick Links

| I want to... | Go to... |
|--------------|----------|
| **Start using MuscleMap** | [Getting Started](/docs/public/getting-started/README.md) |
| **Understand the technology** | [What is CEP?](/docs/public/what-is-cep.md) |
| **Explore features** | [Features Overview](/docs/public/features/README.md) |
| **Contribute code** | [Developer Guide](/docs/developers/README.md) |
| **Join the community** | [Open Source & Community](/docs/public/open-source/README.md) |
| **Understand privacy** | [Privacy & Security](/docs/public/privacy-security/README.md) |
| **NYC-specific info** | [MuscleMap NYC](/docs/public/nyc/README.md) |

---

## Documentation Structure

### For Users

📚 **[Public Documentation](/docs/public/)**
- [What is Computational Exercise Physiology?](/docs/public/what-is-cep.md)
- [Getting Started](/docs/public/getting-started/README.md)
- [Features](/docs/public/features/README.md)
- [Community Guide](/docs/public/community/README.md)
- [User Guides](/docs/public/guides/README.md)
- [FAQ](/docs/public/faq.md)

🔒 **[Privacy & Security](/docs/public/privacy-security/)**
- [Our Privacy Promise](/docs/public/privacy-security/README.md)
- [End-to-End Encryption](/docs/public/privacy-security/encryption.md)
- [Data Ownership](/docs/public/privacy-security/data-ownership.md)
- [Community Safety](/docs/public/privacy-security/community-safety.md)

🌐 **[Open Source](/docs/public/open-source/)**
- [Why We're Open Source](/docs/public/open-source/README.md)
- [Contributing Guide](/docs/public/open-source/contributing.md)
- [Join Slack](/docs/public/open-source/slack.md)
- [Governance](/docs/public/open-source/governance.md)

🗽 **[NYC Launch City](/docs/public/nyc/)**
- [Why NYC?](/docs/public/nyc/README.md)
- [NYC Hangouts](/docs/public/nyc/hangouts.md)
- [Outdoor Workouts](/docs/public/nyc/outdoor-workouts.md)

### For Developers

💻 **[Developer Documentation](/docs/developers/)**
- [Local Setup Guide](/docs/developers/local-setup.md)
- [API Reference (GraphQL)](/docs/API_REFERENCE.md)
- [Architecture Overview](/docs/ARCHITECTURE.md)
- [System Architecture](/docs/SYSTEM-ARCHITECTURE.md)
- [Contributing](/docs/CONTRIBUTING.md)
- [Coding Style Guide](/docs/CODING-STYLE-GUIDE.md)
- [Plugin SDK](/docs/developers/plugin-sdk.md)

### Technical Reference

🔧 **Architecture & Infrastructure**
- [System Architecture](/docs/SYSTEM-ARCHITECTURE.md)
- [Data Model](/docs/DATA_MODEL.md)
- [Data Flow](/docs/DATA_FLOW.md)
- [State Management](/docs/STATE-MANAGEMENT.md)
- [GraphQL Architecture](/docs/GRAPHQL-ARCHITECTURE-MASTERPLAN.md)

📊 **Features & Systems**
- [Credits Economy](/docs/CREDITS_ECONOMY.md)
- [Scaling Architecture](/docs/SCALING-ARCHITECTURE-PLAN.md)
- [Apple Watch Implementation](/docs/APPLE-WATCH-IMPLEMENTATION.md)
- [Biometrics](/docs/BIOMETRICS.md)

### Brand & Business

🎨 **[Brand Guidelines](/docs/brand/)**
- [Messaging Guidelines](/docs/brand/messaging.md)
- [Visual Identity](/docs/brand/visual-identity.md)
- [Voice & Tone](/docs/brand/voice-tone.md)

📈 **[Business Documentation](/docs/business/)**
- [Executive Summary](/docs/business/EXECUTIVE_SUMMARY.md)
- [Feature List](/docs/business/FEATURE_LIST.md)
- [Launch Checklist](/docs/business/LAUNCH_CHECKLIST.md)

---

## Core Principles

### 1. Computational Exercise Physiology
We're creating a new field — the intersection of biomechanics, data science, and fitness. [Learn more →](/docs/public/what-is-cep.md)

### 2. Free Forever
No premium tiers. No paywalls. Every feature, every visualization, every insight — completely free.

### 3. Open Source
Public GitHub repo. Transparent development. Community contributions welcome.
**https://github.com/jeanpaulniko/musclemap**

### 4. Community-Driven
Crowdsourced exercise data. Community-validated techniques. Users shape the roadmap. [Join Slack →](/slack)

### 5. Privacy-First
End-to-end encrypted messaging. Local-first data. Your body, your data, your control. [Learn more →](/docs/public/privacy-security/README.md)

---

## API Access

### Plain Text Documentation (for AI/Accessibility)

All documentation is available in plain text format:

```
GET https://musclemap.me/api/docs/plain           # All docs
GET https://musclemap.me/api/docs/plain/index.txt # Index
GET https://musclemap.me/api/docs/plain/{path}    # Specific doc
```

### GraphQL API

Full API documentation: [API Reference](/docs/API_REFERENCE.md)

```graphql
# Example query
query {
  exercises(limit: 10) {
    id
    name
    muscleGroups
    activationPercentages
  }
}
```

---

## Contributing

We welcome contributions! Here's how:

1. **Star the repo** — [github.com/jeanpaulniko/musclemap](https://github.com/jeanpaulniko/musclemap)
2. **Join Slack** — Real-time community discussion
3. **Report bugs** — GitHub Issues
4. **Submit PRs** — Code improvements
5. **Improve docs** — Fix typos, add examples

See [Contributing Guide](/docs/CONTRIBUTING.md) for details.

---

## Contact

- **Website:** [musclemap.me](https://musclemap.me)
- **GitHub:** [github.com/jeanpaulniko/musclemap](https://github.com/jeanpaulniko/musclemap)
- **Slack:** [Join Community](/slack)
- **Email:** hello@musclemap.me

---

*The physics of your body in motion. Free. Open source. Community-driven.*
