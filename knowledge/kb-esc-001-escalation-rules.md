---
title: Support escalation rules for NovaEdge
category: escalation
source_id: KB-ESC-001
last_updated: 2026-07-22
tags: [escalation, severity, sla, human, ticket]
---

## Problem
Agents and customers need clear rules for when an issue must be escalated to a human specialist.

## Symptoms
- Repeated failed self-serve steps from the knowledge base
- Safety, data-loss, or multi-site outage risk
- Customer explicitly requests a human

## Cause
Not applicable — this article defines policy, not a device fault.

## Resolution
Escalate immediately when any of the following is true:
1. Confidence in KB guidance is low or no article matches.
2. Same critical error persists after the documented resolution.
3. Outage affects **3+ hubs** at one site or any hospital/clinical deployment flag.
4. Suspected hardware failure (smoke, heat, physical damage) — advise power-off first.
5. Billing disputes requiring refund execution with a charge ID.
6. Customer asks to escalate / speak to a human.

When escalating, create a ticket with: site ID, hub serial(s), error codes, steps already tried, and urgency (SEV-1 to SEV-3).

## When to escalate
This document *is* the escalation policy. If policy questions remain ambiguous (custom enterprise SLA), escalate to Account Support with the customer’s contract tier.
