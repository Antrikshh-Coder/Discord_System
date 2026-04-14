# Discord at Scale — Sharding Simulation Lab 🏏

> **Assignment:** Engineering Distributed Systems Under Extreme Load
> **Scenario:** A live cricket final with **50,000 users**, one active channel, and **thousands of messages per second**.

---

## 📁 Project Structure

```
Discord/
│
├── index.html                  ← Interactive Simulation Dashboard (Open in Browser)
├── styles.css                  ← Dark-mode Design System
├── simulation.js               ← Core Simulation Engine (All Strategies)
│
├── day1_2_analysis.py          ← System Breakdown Analysis
├── day3_4_naive_server.py      ← Single-Server Model + Load Simulation
├── day5_shards.py              ← Base Shard + ShardManager Architecture
├── day6_user_sharding.py       ← User-Based Sharding + Influencer Spike
├── day7_channel_sharding.py    ← Channel-Based Sharding + Viral Event
├── day8_hash_sharding.py       ← Hash-Based Sharding + Resharding Demo
├── day9_stress_simulation.py   ← Full Stress Test (3 Scenarios × 4 Strategies)
└── day10_final_analysis.py     ← Final Engineering Conclusions
```

---

## 🚀 Running the Dashboard

Open the simulation dashboard directly in your browser:

```bash
open index.html
```

The dashboard contains **8 interactive tabs**, each representing a phase of the distributed systems experiment.

---

## 🐍 Running the Python Simulations

Each module runs independently:

```bash
# Day 1–2: System analysis
python3 day1_2_analysis.py

# Day 3–4: Naive server load simulation
python3 day3_4_naive_server.py

# Day 6: Influencer spike (User-based sharding)
python3 day6_user_sharding.py

# Day 7: Viral channel simulation (Channel sharding)
python3 day7_channel_sharding.py

# Day 8: Hash sharding + resharding challenge
python3 day8_hash_sharding.py

# Day 9: Full stress testing
python3 day9_stress_simulation.py

# Day 10: Final engineering analysis
python3 day10_final_analysis.py
```

---

## 📅 Day-by-Day Summary

| Day | Focus              | Key Insight                                                     |
| --- | ------------------ | --------------------------------------------------------------- |
| 1–2 | System Thinking    | Failures appear in order: **Memory → CPU → Network → Hotspots** |
| 3–4 | Naive Server       | Works at small scale, collapses near 10K users                  |
| 5   | Shard Architecture | Shards without routing logic provide zero benefit               |
| 6   | User Sharding ❌    | Influencer traffic overloads a single shard                     |
| 7   | Channel Sharding ❌ | Viral events create shard hotspots                              |
| 8   | Hash Sharding ⚠️   | Balanced distribution but resharding becomes costly             |
| 9   | Stress Testing     | Normal traffic hides real failure modes                         |
| 10  | Final Analysis     | Shard failures, migration math, and resilience conclusions      |

---

## 🧠 Core Findings

### Q1 — Which shard fails first?

* **User Sharding:** `Shard 0` fails first
  → Influencer (`user_id = 0`) always routes here.

* **Channel Sharding:** `Shard 1` fails first
  → `#cricket-live` (`channel_id = 1 → 1 % 3 = 1`).

---

### Q2 — Which strategy looks good but fails during spikes?

`hash(channel_id)` appears perfectly balanced under normal traffic.

During a cricket final:
**≈ 85% of traffic hashes to one shard → overload → system failure 💥**

---

### Q3 — What happens when shards scale from 3 → 10?

Approximately **85% of keys remap**.

Example:

* 1 Billion stored messages
* **850 Million records require migration**

✅ Solution: **Consistent Hashing**

---

### Q4 — What breaks if one shard goes offline?

* **33% data loss** (no replication)
* Remaining shards absorb **150% additional load**
* High risk of cascading failure

✅ Solution: **Replication Factor ≥ 3**

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
    return results[-limit:]   # Return latest N messages
```

**Query Cost:**
`O(number_of_shards × messages_per_shard)`

* `hash(channel_id)` → query **1 shard**
* `hash(message_id)` → query **all shards**

---

## 🌡 Hotspot Detection Logic

```python
def hotspot_check(self):
    total = sum(len(s.messages) for s in self.shards)
    for shard in self.shards:
        pct = len(shard.messages) / total * 100
        if pct > 50:
            print(f"⚠️ [HOTSPOT] Shard {shard.id}: {pct:.1f}% — Rebalancing Needed!")
```

Purpose:

* Detect uneven load distribution
* Trigger automated rebalancing decisions

---

## 🏆 Real-World Reference — Discord Architecture

Discord stores messages using **Apache Cassandra**, partitioned by:

```
partition_key = (channel_id, bucket)
bucket = floor(message_timestamp / EPOCH_DURATION)
```

### Key Engineering Ideas

* Hot channels receive a **new bucket every hour**, distributing writes
* Read replicas handle viral traffic spikes
* **Super-Sharding** is applied for guilds exceeding 250,000 members

---

*Built as part of a Distributed Systems assignment — focused on real failure modes, scalability limits, and production-grade engineering thinking rather than idealized designs.*
