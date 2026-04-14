"""
Day 1–2: System Thinking Analysis
=================================
Where does a single-server Discord-like system fail
when 50,000 users join during a cricket final?

This file contains the written analysis as executable
docstrings + a simple model of what "breaks first."
"""

import time
import sys


# ─────────────────────────────────────────────────────────────
# ANALYSIS: Written answers to Day 1–2 questions
# ─────────────────────────────────────────────────────────────

ANALYSIS = """
=============================================================
  SYSTEM THINKING ANALYSIS — CRICKET FINAL SCENARIO
=============================================================

SITUATION
---------
- 50,000 users join in 5 minutes (~167 joins/sec)
- 1 channel (#cricket-live) receives 80% of all traffic
- Peak message rate: ~4,200 msg/sec on that channel alone

WHERE WILL BOTTLENECKS OCCUR?
-------------------------------

1. MEMORY — FAILS FIRST
   - All messages stored in a Python list: self.messages = []
   - Each message object: ~150 bytes (user_id, channel_id, content + overhead)
   - At 4,200 msg/sec × 3600 sec = 15.1 million messages/hour
   - Memory usage: 15.1M × 150 bytes = ~2.26 GB per hour
   - Python list grows without bound — no eviction, no pagination
   - Linux OOM killer will terminate the process when RAM is exhausted

2. CPU — COLLAPSES UNDER FAN-OUT
   - Sending one message to #cricket-live means broadcasting to
     ~40,000 active WebSocket subscribers (80% of 50,000)
   - In a single-threaded Python server (e.g., asyncio), each
     broadcast is serialised: 40,000 sends × ~5µs = 200ms blocked
   - During that 200ms, 840 MORE messages arrive and pile up
   - The event loop falls irretrievably behind — latency grows to seconds

3. NETWORK BANDWIDTH — SATURATED EARLY
   - Broadcasting 4,200 msg/sec to 40,000 clients:
     4,200 × 40,000 × 200 bytes = 33.6 GB/sec of outbound traffic
   - A standard 10 Gbps NIC can only carry 1.25 GB/sec
   - Even a 100 Gbps link would be saturated
   - Solution requires fan-out servers, CDN edge nodes, or pub-sub

4. CHANNEL HOTSPOT — THE ROOT CAUSE
   - Even if you had 10 servers, routing ALL of channel #cricket-live
     to a single node defeats distribution
   - You'd need to shard the CHANNEL itself, not just users
   - This is the fundamental insight: read/write hotspots exist at
     the data level, not just the infrastructure level

WHAT DATA GROWS FASTEST?
--------------------------
1. messages[]      — O(n) with every send, grows fastest
2. websocket_conns — 50,000 open connections, ~10 KB each = 500 MB
3. user_sessions   — one session token per user = manageable
4. channel_subscribers — 50,000 entries for #cricket-live alone

CONCLUSION
----------
The system fails in this order:
  Network bandwidth → CPU event loop → RAM → Disk (if swap enabled)
The bottleneck is NOT the code quality — it is the architecture.
A single server is physically incapable of serving this load.
=============================================================
"""


def print_analysis():
    print(ANALYSIS)


if __name__ == "__main__":
    print_analysis()
