---
company: Tracxn
location: Bangalore, India
role: Software Engineer
start: November 2024
end: Present
summary: "Auth, payments, and high-availability databases — SSO onboarding ~25% smoother, payment errors down ~98%, checkout 15s → 2s."
tech: Java, Spring Boot, Spring Security, Spring Authorization Server, MySQL, Percona XtraDB Cluster, ProxySQL, Redis, Kafka, Zoho, OAuth2/OIDC, SAML
order: 1
---

- Built one OAuth2 authorization service that issues encrypted tokens for all microservices instead of each service handling auth alone.
- Wired SSO to 12+ identity providers (Google, Microsoft, Okta, and others) over OIDC and SAML — enterprise onboarding friction down ~25%.
- Shipped login options teams can configure: password, email OTP, 2FA, WebAuthn passkeys, and enterprise SSO, with rules at user and group level.
- Removed post-deploy cold starts (up to ~30s for ~5 minutes) and brought auth load on a 2-core instance from ~80 down to ~3.
- Built a Stripe + Razorpay payment layer with automated reconciliation — payment errors down ~98%.
- Made checkout feel fast: payment API latency 15s → 2s, database load down ~70%.
- Moved MySQL to a 3-node Percona cluster behind ProxySQL (~99.9% availability) and automated Zoho invoicing over Kafka without duplicate invoices.
