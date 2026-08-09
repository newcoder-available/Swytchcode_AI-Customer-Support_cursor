---
title: Cannot access NovaEdge dashboard or app
category: access
source_id: KB-ACC-008
last_updated: 2026-06-28
tags: [access, login, password, locked, sso, dashboard]
---

## Problem
Users cannot sign in to the NovaEdge web dashboard or mobile app.

## Symptoms
- "Invalid email or password" despite correct credentials
- Account temporarily locked message
- SSO redirect loops for organization accounts

## Cause
Common causes: expired password (90-day org policy), too many failed attempts (15-minute lockout), or stale SSO session cookies after an IdP certificate rotation.

## Resolution
1. Use **Forgot password** on the sign-in page; reset links expire in 30 minutes.
2. If you see a lockout message, wait 15 minutes or ask an org admin to unlock under **Admin → Users**.
3. For SSO orgs: clear browser site data for `app.novaedge.example`, then sign in again via **Continue with company SSO**.
4. Confirm the user is assigned a seat under **Admin → Members**.
5. Mobile app: sign out, force-close the app, reopen, and sign in.

## When to escalate
Escalate if password reset email never arrives after checking spam, SSO fails for multiple users at once, or an admin cannot unlock accounts. Include organization slug and approximate failure time (UTC).
