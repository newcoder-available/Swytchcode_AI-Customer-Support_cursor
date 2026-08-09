---
title: Error code E-NET-14 intermittent disconnects
category: error-codes
source_id: KB-ERR-114
last_updated: 2026-06-03
tags: [error, E-NET-14, disconnect, dhcp, network]
---

## Problem
Hub logs and dashboard alerts show error code **E-NET-14**, and the device drops offline for short periods.

## Symptoms
- Alert: `E-NET-14 DHCP lease renewal failed`
- Brief offline gaps of 30–120 seconds
- LED flickers amber then returns to green

## Cause
The hub could not renew its DHCP lease before expiry—often due to an overloaded router, AP client isolation, or a DHCP pool that is too small for the site.

## Resolution
1. On the LAN router, confirm DHCP pool size ≥ number of clients + 10.
2. Reserve a static DHCP lease for the hub MAC (printed on the label).
3. Disable AP/client isolation for the SSID used by hubs.
4. Restart the hub using the soft restart procedure after the reservation is saved.
5. Monitor **Device → Network** for 24 hours; E-NET-14 should stop.

## When to escalate
Escalate if E-NET-14 continues after a DHCP reservation, or if multiple hubs on the same SSID fail together (likely upstream network). Attach router model and a 1-hour event export.
