---
title: Device offline after Wi-Fi password change
category: network
source_id: KB-NET-001
last_updated: 2026-06-12
tags: [network, wifi, offline, connectivity, ssid]
---

## Problem
NovaEdge Hub stays offline after the site Wi-Fi password or SSID is changed.

## Symptoms
- Hub LED blinks amber in a 2-second pattern
- Mobile app shows "Last seen" older than 15 minutes
- Cloud dashboard marks the device as Disconnected

## Cause
The hub stores Wi-Fi credentials in local NVRAM. After a router password rotation, the hub keeps retrying the old credentials and never rejoins the LAN.

## Resolution
1. Hold the hub **Pair** button for 5 seconds until the LED turns solid blue (setup mode).
2. Open the NovaEdge app → **Devices** → **Reconfigure network**.
3. Select the correct SSID and enter the new password.
4. Wait for a solid green LED (usually under 90 seconds).
5. Confirm the hub appears Online in the dashboard.

## When to escalate
Escalate if the hub cannot complete setup mode, or if it joins Wi-Fi but never reaches cloud (green LED, still Disconnected after 10 minutes). Include site ID and hub serial (`NE-XXXX`).
