---
title: Safe restart and power-cycle procedure
category: restart
source_id: KB-RST-003
last_updated: 2026-05-20
tags: [restart, reboot, power-cycle, freeze, unresponsive]
---

## Problem
NovaEdge Hub becomes slow, frozen, or stops reporting sensor data until restarted.

## Symptoms
- App interactions time out
- Sensor readings stop updating
- LED stuck on solid amber or off while powered

## Cause
Transient process hangs in the edge runtime or a saturated local buffer after a burst of sensor events. A controlled restart clears memory without wiping Wi-Fi credentials.

## Resolution
1. Prefer a soft restart first: app → **Device → Restart hub** → confirm.
2. Wait for LED sequence: amber → blue → green (about 60–90 seconds).
3. If soft restart fails, perform a power cycle: unplug power for **10 full seconds**, then reconnect.
4. Do not hold Pair during a power cycle unless you intend to enter setup mode.
5. After green LED, verify last telemetry timestamp is fresh in the dashboard.

## When to escalate
Escalate if the hub does not show a green LED within 3 minutes after power cycle, or if freezes recur more than twice in 24 hours. Note whether soft restart was attempted.
