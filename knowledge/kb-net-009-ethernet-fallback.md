---
title: Ethernet fallback when Wi-Fi is unstable
category: network
source_id: KB-NET-009
last_updated: 2026-06-21
tags: [network, ethernet, poe, failover, connectivity]
---

## Problem
Hubs in RF-noisy environments drop Wi-Fi frequently and need a wired fallback.

## Symptoms
- Frequent short disconnects despite strong reported RSSI
- Works better at night when airtime contention drops
- Hub Pro with Ethernet port available but unused

## Cause
2.4 GHz congestion or DFS radar events on 5 GHz. Wired Ethernet (or PoE on Hub Pro) bypasses the unstable radio path.

## Resolution
1. Use Hub Pro or a Hub with Ethernet adapter kit NE-ETH-2.
2. Connect Cat5e/Cat6 to a DHCP-enabled LAN port.
3. In app → **Device → Network → Prefer Ethernet**.
4. Reboot the hub once; LED should go green without Wi-Fi dependence.
5. Optionally disable Wi-Fi radio under **Network → Advanced** after Ethernet is proven stable.

## When to escalate
Escalate if Ethernet link lights are dark, Prefer Ethernet is missing in the app (wrong SKU), or the hub stays offline on a known-good cable/switch port.
