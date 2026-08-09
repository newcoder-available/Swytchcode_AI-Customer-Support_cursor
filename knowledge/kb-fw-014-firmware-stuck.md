---
title: Firmware update stuck at 47%
category: firmware
source_id: KB-FW-014
last_updated: 2026-07-01
tags: [firmware, update, stuck, ota, download]
---

## Problem
An over-the-air (OTA) firmware update for NovaEdge Hub freezes partway through and never finishes.

## Symptoms
- Update progress bar remains at ~47% for more than 20 minutes
- Hub LED pulses white slowly
- App shows "Installing firmware…" indefinitely

## Cause
Interrupted download (unstable Wi-Fi) or insufficient free flash for the staging partition. Firmware builds 3.4.0–3.4.2 are especially sensitive to packet loss during the mid-stage write.

## Resolution
1. Keep the hub powered; do **not** unplug during a white-pulse LED.
2. Move the hub closer to the access point or switch to 2.4 GHz if dual-band is unstable.
3. In the app, open **Device → Firmware → Cancel and retry**.
4. If Cancel is unavailable, power-cycle once (unplug 10 seconds, reconnect).
5. Re-run the update when RSSI in **Device → Network** is better than −70 dBm.
6. After success, confirm version under **Device → About**.

## When to escalate
Escalate if the hub loops the same failed build three times, reports flash error `E-FLASH-22`, or becomes unresponsive after a power cycle. Attach hub serial, target firmware version, and RSSI screenshot.
