# Security Checklist

> Verify security measures before deploying.

---

## Authentication

```
[ ] Passwords hashed with bcrypt (cost 12+)
[ ] JWT secrets are strong (32+ chars)
[ ] Tokens have appropriate expiration
[ ] Refresh token rotation (if used)
[ ] Session invalidation works
[ ] Password reset flow secure
[ ] Account lockout after failed attempts
[ ] No credentials in logs
```

---

## Authorization

```
[ ] All endpoints have auth checks
[ ] Resource ownership verified
[ ] Role-based access enforced
[ ] No horizontal privilege escalation
[ ] No vertical privilege escalation
[ ] Admin endpoints protected
[ ] API keys secured
```

---

## Input Validation

```
[ ] All input validated with Zod
[ ] No SQL injection possible
[ ] No command injection possible
[ ] File uploads validated
[ ] URL parameters sanitized
[ ] Request body size limited
[ ] Content-Type enforced
```

---

## Data Protection

```
[ ] HTTPS enforced everywhere
[ ] Sensitive data encrypted at rest
[ ] PII properly handled
[ ] Credit card data not stored
[ ] Logs don't contain sensitive data
[ ] Database connections encrypted
[ ] Environment variables secured
```

---

## API Security

```
[ ] Rate limiting implemented
[ ] CORS configured properly
[ ] Security headers set
    [ ] X-Content-Type-Options
    [ ] X-Frame-Options
    [ ] X-XSS-Protection
    [ ] Content-Security-Policy
[ ] GraphQL depth limiting
[ ] GraphQL complexity limiting
[ ] No introspection in production
```

---

## Frontend Security

```
[ ] No sensitive data in localStorage
[ ] XSS prevention (sanitize output)
[ ] CSRF protection
[ ] Subresource integrity (SRI)
[ ] No eval() or innerHTML
[ ] Content Security Policy
[ ] Secure cookie flags
```

---

## Dependencies

```
[ ] npm audit shows no critical issues
[ ] Dependencies up to date
[ ] No known vulnerable packages
[ ] License compliance verified
[ ] Dependency lock file committed
```

---

## Infrastructure

```
[ ] Firewall rules configured
[ ] SSH key-only access
[ ] Regular backups configured
[ ] Backup encryption enabled
[ ] Logs retained appropriately
[ ] Intrusion detection (if applicable)
```

---

## Incident Response

```
[ ] Security contact documented
[ ] Incident response plan exists
[ ] Key rotation procedure documented
[ ] Data breach notification plan
[ ] Security monitoring active
```

---

*Last updated: 2026-01-15*
