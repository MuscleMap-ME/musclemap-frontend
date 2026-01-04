# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in MuscleMap, please report it responsibly.

### Do NOT

- Open a public GitHub issue
- Discuss the vulnerability publicly
- Exploit the vulnerability

### Do

1. Email security@musclemap.me with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

2. Wait for acknowledgment (within 48 hours)

3. Work with us to understand and fix the issue

4. Allow reasonable time for a fix before disclosure

## Scope

### In Scope

- musclemap.me and subdomains
- MuscleMap API
- MuscleMap web and mobile apps
- Plugin system security
- Authentication/authorization
- Credit system integrity

### Out of Scope

- Third-party integrations (Stripe, etc.)
- Self-hosted instances (unless default config issue)
- Social engineering attacks
- Denial of service attacks

## Security Measures

### Authentication

- JWT with secure secrets (32+ characters required)
- No hardcoded secrets in production
- Token expiration enforced
- Refresh token rotation (planned)

### Authorization

- Role-based access control
- Permission checks on all protected routes
- Plugin sandboxing

### Data Protection

- Passwords hashed with PBKDF2 (100k iterations)
- Sensitive data encrypted at rest (planned)
- HTTPS enforced in production
- CORS configured per environment

### Rate Limiting

- Global rate limits on API
- Stricter limits on auth endpoints
- Per-user limits on expensive operations

### Input Validation

- All inputs validated with Zod
- SQL parameterized queries only
- No raw string interpolation in queries

### Dependencies

- Regular dependency updates
- npm audit in CI pipeline
- Minimal dependency surface

## Security Checklist for Contributors

- [ ] No secrets in code or commits
- [ ] All user input validated
- [ ] SQL queries parameterized
- [ ] Authentication checked on protected routes
- [ ] Authorization checked for actions
- [ ] Errors don't leak sensitive info
- [ ] Logs don't contain passwords/tokens

## Security Headers

Production deployments include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: [configured per app]
```

## Incident Response

In case of a security incident:

1. Containment - Isolate affected systems
2. Assessment - Determine scope and impact
3. Remediation - Fix the vulnerability
4. Recovery - Restore normal operations
5. Post-mortem - Document and improve

## Updates

This policy is reviewed quarterly. Last updated: December 2024.
