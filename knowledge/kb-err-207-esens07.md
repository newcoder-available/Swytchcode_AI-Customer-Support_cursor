---
title: Error code E-SENS-07 no data from probe
category: error-codes
source_id: KB-ERR-207
last_updated: 2026-05-09
tags: [error, E-SENS-07, sensor, probe, cable]
---

## Problem
NovaEdge Hub reports **E-SENS-07** and stops publishing readings from an attached probe.

## Symptoms
- Dashboard tile shows `E-SENS-07 Probe not detected`
- Last reading older than expected poll interval
- Hub itself remains Online (green LED)

## Cause
Loose probe connector, damaged cable, or probe paired to the wrong port (Port A vs Port B on Hub Pro).

## Resolution
1. Power down the hub (unplug 10 seconds).
2. Reseat the probe connector until you feel/hear a click.
3. Confirm the probe is in the port matching the app profile (Port A default).
4. Power on and wait two poll cycles (about 2 minutes).
5. If still failing, swap with a known-good probe to isolate cable vs hub port.

## When to escalate
Escalate if a known-good probe fails on both ports, or if E-SENS-07 appears immediately after a firmware update. Include probe SKU and hub model (Hub / Hub Pro).
