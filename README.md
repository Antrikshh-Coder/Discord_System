# Discord at Scale — Sharding Simulation Lab 🏏

> **Assignment:** Engineering distributed systems under extreme load.  
> **Scenario:** A cricket final. 50,000 users. One channel. Thousands of messages per second.

---

## 📁 Project Structure

```
Discord/
│
├── index.html                  ← Interactive simulation dashboard (open in browser)
├── styles.css                  ← Dark-mode design system
├── simulation.js               ← Full simulation engine (all strategies)
│
├── day1_2_analysis.py          ← Written analysis: where does the system break?
├── day3_4_naive_server.py      ← Single-server implementation + load simulation
├── day5_shards.py              ← Base Shard + ShardManager classes
├── day6_user_sharding.py       ← User-based sharding + influencer spike
├── day7_channel_sharding.py    ← Channel-based sharding + viral event
├── day8_hash_sharding.py       ← Hash-based sharding + resharding demo
├── day9_stress_simulation.py   ← Full stress test: 3 scenarios × 4 strategies
└── day10_final_analysis.py     ← Final answers to all 4 mandatory questions
```

---

## 🚀 Running the Dashboard

Simply open `index.html` in any browser:

```bash
open index.html
```

The dashboard has 8 interactive tabs covering every day of the assignment.

---

## 🐍 Running the Python Simulations

Each file is standalone and runs directly:

```bash
# Day 1–2: System analysis
python3 day1_2_analysis.py

# Day 3–4: Naive server load simulation
python3 day3_4_naive_server.py

# Day 6: Influencer spike (user-based sharding)
python3 day6_user_sharding.py

# Day 7: Viral channel (channel-based sharding)
python3 day7_channel_sharding.py

# Day 8: Hash sharding + resharding problem
python3 day8_hash_sharding.py

# Day 9: Full stress test (all scenarios × all strategies)
python3 day9_stress_simulation.py

# Day 10: Final analysis — all 4 questions answered
python3 day10_final_analysis.py
```

---

## 📅 Day-by-Day Summary

| Day | Focus | Key Insight |
|-----|-------|-------------|
| 1–2 | System Thinking | Memory → CPU → Network → Hotspot (in that order) |
| 3–4 | Naive Server | Works for 10 users, collapses at 10,000 |
| 5 | Shard Intro | Without routing logic, shards are useless |
| 6 | User Sharding ❌ | One influencer → one shard → overloaded |
| 7 | Channel Sharding ❌ | One viral event → one shard → overloaded |
| 8 | Hash Sharding ⚠️ | Better distribution, but resharding breaks everything |
| 9 | Stress Test | Normal looks fine, viral event reveals true failure |
| 10 | Final Analysis | All 4 questions, resharding math, shard failure impact |

---

## 🧠 Core Findings

### Q1 — Which shard fails first?
- **User sharding:** Shard 0 — influencer (user_id=0) always routes there
- **Channel sharding:** Shard 1 — #cricket-live (channel_id=1 → 1%3=1)

### Q2 — Which strategy looks good but fails under spike?
`Hash(channel_id)` — perfectly balanced on a normal day.  
During a cricket final: **85% of traffic → one hash → one shard → 💥**

### Q3 — What happens when shards go from 3 → 10?
**85% of all keys remap to different shards.** For 1 billion messages,  
that's 850M records needing migration. Fix: **consistent hashing**.

### Q4 — What breaks when one shard goes offline?
33% of data is permanently lost (no replica). Remaining 2 shards  
absorb 150% load → cascade failure risk. Fix: **replication factor ≥ 3**.

---

## 🔍 Cross-Shard Query Implementation

```python
def fetch_channel_messages(manager, channel_id, limit=10):
    results = []
    for shard in manager.shards:
        if not shard.is_alive:
            continue  # Skip offline shards — results may be incomplete
        channel_msgs = shard.get_by_channel(channel_id)
        results.extend(channel_msgs)
    results.sort(key=lambda m: m.timestamp)
    return results[-limit:]   # Last N messages
```

**Cost:** O(num_shards × messages_per_shard) — scales with shard count.  
With `hash(channel_id)` → query 1 shard. With `hash(message_id)` → query all shards.

---

## 🌡 Hotspot Detection

```python
def hotspot_check(self):
    total = sum(len(s.messages) for s in self.shards)
    for shard in self.shards:
        pct = len(shard.messages) / total * 100
        if pct > 50:
            print(f"⚠️ [HOTSPOT] Shard {shard.id}: {pct:.1f}% — rebalancing needed!")
```

---

## 🏆 Real-World Answer (Discord)

Discord uses **Cassandra** for message storage, partitioned by:
```
partition_key = (channel_id, bucket)
bucket = floor(message_timestamp / EPOCH_DURATION)
```
- Hot channels get a new bucket **every hour**, distributing writes naturally
- Read replicas serve popular channels during events
- "Super Sharding" for guilds > 250,000 members

---

*Built as part of a distributed systems assignment — simulating real failure modes, not idealized solutions.*
