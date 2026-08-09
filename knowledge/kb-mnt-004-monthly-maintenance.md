---
title: Monthly hub maintenance checklist
category: maintenance
source_id: KB-MNT-004
last_updated: 2026-04-30
tags: [maintenance, checklist, cleaning, firmware, health]
---

## Problem
Sites need a repeatable monthly maintenance routine to reduce disconnects and sensor drift.

## Symptoms
- Gradual increase in flaky readings
- Dust buildup around vents
- Firmware several versions behind current stable

## Cause
Environmental dust, skipped firmware, and stale Wi-Fi calibrations accumulate over time.

## Resolution
1. Inspect vents; gently vacuum exterior vents (no liquids inside the chassis).
2. Verify LED is solid green and dashboard health is Good.
3. Check **Device → Firmware** and apply current stable if two or more versions behind.
4. Review **Device → Network** RSSI; relocate hub if weaker than −70 dBm.
5. Confirm probe cables are seated; wipe probe tips per facility SOP.
6. Export a monthly health report from **Site → Reports → Device health**.

## When to escalate
Escalate if monthly checks reveal recurring E-NET or E-SENS errors across many devices, or if firmware cannot be applied site-wide. Attach the health report CSV.
