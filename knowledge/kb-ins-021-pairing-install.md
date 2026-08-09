---
title: Hub installation fails at pairing step
category: installation
source_id: KB-INS-021
last_updated: 2026-07-18
tags: [installation, pairing, setup, qr, serial]
---

## Problem
Initial NovaEdge Hub installation stops during Bluetooth/QR pairing and never joins the customer's account.

## Symptoms
- App stuck on "Searching for hub…"
- QR code scan returns "Hub not found"
- Pair LED never turns solid blue

## Cause
Hub not in setup mode, Bluetooth permissions denied on the phone, or serial already claimed by another workspace.

## Resolution
1. Factory-fresh hubs: hold **Pair** 5 seconds until solid blue.
2. On iOS/Android, allow Bluetooth and Local Network permissions for NovaEdge.
3. Stand within 2 meters of the hub during pairing.
4. Prefer serial entry if QR fails: type `NE-` serial from the bottom label.
5. If the app says the hub is already claimed, ask the previous workspace admin to **Unclaim** under **Devices → Remove**, then retry.
6. Complete Wi-Fi configuration immediately after pairing succeeds.

## When to escalate
Escalate when serial shows claimed by an unknown org, Pair button does not enter setup mode, or pairing fails on two different phones. Provide serial number and app version.
