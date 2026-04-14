"""
Day 9: Stress Simulation + Failure Testing
==========================================
Three scenarios:
  1. Normal day      — 1,000 users, 5,000 messages
  2. Viral event     — 10,000 users, 50,000 messages
  3. Extreme spike   — 50,000 users, 500,000 messages

Additional:
  - Shard failure mid-simulation (data loss demonstration)
  - Cross-shard query for last 10 messages of a channel
  - Hotspot detection at >50% threshold
  - Performance tracking: how many shards checked per query
"""

import random
import hashlib
import time
from day5_shards import Message, Shard, ShardManager
from day6_user_sharding    import UserShardManager
from day7_channel_sharding import ChannelShardManager
from day8_hash_sharding    import HashShardManager


# ─────────────────────────────────────────────────────────────
# SCENARIO CONFIGS
# ─────────────────────────────────────────────────────────────

SCENARIOS = {
    "normal": {
        "label":            "Normal Day",
        "num_users":        1_000,
        "num_messages":     5_000,
        "hot_channel_id":   1,
        "hot_ratio":        0.20,   # 20% goes to "hot" channel
    },
    "viral": {
        "label":            "Viral Event",
        "num_users":        10_000,
        "num_messages":     50_000,
        "hot_channel_id":   1,
        "hot_ratio":        0.60,
    },
    "spike": {
        "label":            "Extreme Spike (Cricket Final)",
        "num_users":        50_000,
        "num_messages":     500_000,
        "hot_channel_id":   1,
        "hot_ratio":        0.85,
    },
}


# ─────────────────────────────────────────────────────────────
# CORE SIMULATION RUNNER
# ─────────────────────────────────────────────────────────────

def simulate(manager: ShardManager,
             num_users: int = 1_000,
             num_messages: int = 5_000,
             hot_channel_id: int = 1,
             hot_ratio: float = 0.2,
             label: str = "") -> None:
    """Run a message simulation and print per-shard stats."""
    for i in range(num_messages):
        user_id    = random.randint(1, num_users)
        channel_id = hot_channel_id if random.random() < hot_ratio \
                     else random.randint(2, 50)
        msg              = Message(user_id, channel_id, "hello")
        msg.message_id   = i + 1
        manager.send_message(msg)

    manager.print_distribution(label)
    manager.hotspot_check()


# ─────────────────────────────────────────────────────────────
# CROSS-SHARD QUERY
# ─────────────────────────────────────────────────────────────

def fetch_channel_messages(manager: ShardManager,
                           channel_id: int,
                           limit: int = 10) -> list[Message]:
    """
    Gather messages for a channel across ALL shards.
    Required because with hash(message_id), data is spread everywhere.

    Returns the last `limit` messages sorted by timestamp.
    Performance cost: O(num_shards × messages_per_shard).
    """
    results        = []
    shards_checked = 0
    shards_skipped = 0

    for shard in manager.shards:
        shards_checked += 1

        if not shard.is_alive:
            shards_skipped += 1
            print(f"  ⚠️  Shard {shard.id} is OFFLINE — skipping (data may be missing)")
            continue

        channel_msgs = shard.get_by_channel(channel_id)
        results.extend(channel_msgs)

    # Sort by timestamp and return the most recent N
    results.sort(key=lambda m: m.timestamp)
    found = results[-limit:]

    print(f"\n  🔍 Cross-Shard Query: channel_id={channel_id}, limit={limit}")
    print(f"     Shards checked  : {shards_checked}")
    print(f"     Shards skipped  : {shards_skipped} (offline)")
    print(f"     Messages found  : {len(results)} total → returning {len(found)}")
    if shards_skipped:
        print(f"     ⚠️  Results may be INCOMPLETE — {shards_skipped} shard(s) offline!")
    print()

    return found


# ─────────────────────────────────────────────────────────────
# FAILURE SIMULATION
# ─────────────────────────────────────────────────────────────

def simulate_with_failure(scenario_key: str = "viral",
                          strategy: str = "hash-message",
                          shard_to_kill: int = 1) -> None:
    """
    Run a scenario, then kill one shard mid-way.
    Demonstrates data loss and cascading effects.
    """
    scenario = SCENARIOS[scenario_key]
    label    = scenario["label"]

    print("\n" + "=" * 60)
    print(f"  FAILURE SIMULATION: {label}")
    print(f"  Strategy: {strategy} | Killing Shard {shard_to_kill} at 50%")
    print("=" * 60)

    if strategy == "hash-message":
        mgr = HashShardManager(num_shards=3, key_type="message_id")
    elif strategy == "hash-channel":
        mgr = HashShardManager(num_shards=3, key_type="channel_id")
    elif strategy == "user":
        mgr = UserShardManager(num_shards=3)
    else:
        mgr = ChannelShardManager(num_shards=3)

    total  = scenario["num_messages"]
    half   = total // 2

    # Phase 1: Normal operation
    print(f"\n  Phase 1 — Sending first {half:,} messages (all shards alive)...")
    simulate(mgr,
             num_users=scenario["num_users"],
             num_messages=half,
             hot_channel_id=scenario["hot_channel_id"],
             hot_ratio=scenario["hot_ratio"],
             label="Before failure")

    # Kill shard
    print(f"\n  ⚡ EVENT: Shard {shard_to_kill} goes DOWN (hardware failure)")
    mgr.shards[shard_to_kill].kill()
    msgs_lost = len(mgr.shards[shard_to_kill].messages)
    print(f"  Data on dead shard: {msgs_lost:,} messages — PERMANENTLY LOST")

    # Phase 2: Degraded operation
    print(f"\n  Phase 2 — Sending remaining {total - half:,} messages (degraded mode)...")
    dropped = 0
    for i in range(half, total):
        user_id    = random.randint(1, scenario["num_users"])
        channel_id = scenario["hot_channel_id"] if random.random() < scenario["hot_ratio"] \
                     else random.randint(2, 50)
        msg            = Message(user_id, channel_id, "hello")
        msg.message_id = i + 1
        # Try to store — will fail silently for dead shard
        if strategy == "hash-message":
            h    = int(hashlib.md5(str(msg.message_id).encode()).hexdigest(), 16)
            sidx = h % 3
        else:
            sidx = 0
        if sidx == shard_to_kill:
            dropped += 1  # Message lost
        else:
            mgr.shards[sidx].store(msg)

    mgr.print_distribution("After failure")

    print(f"  📋 Failure Impact Summary:")
    print(f"     Messages lost (pre-failure data) : {msgs_lost:,}")
    print(f"     Messages dropped (post-failure)  : {dropped:,}")
    print(f"     Total unrecoverable data         : {msgs_lost + dropped:,}")
    print(f"     Remaining alive shards           : 2/3")
    print(f"     System availability              : ~66%")
    print(f"\n  Fix: Replicate each shard (primary + 1 replica).")
    print(f"       Cassandra/Kafka/Redis Cluster do this automatically.\n")

    # Cross-shard query on degraded system
    print("  Running cross-shard query on degraded system...")
    fetch_channel_messages(mgr, channel_id=1, limit=10)


# ─────────────────────────────────────────────────────────────
# FULL COMPARISON: All 3 scenarios × All 3 strategies
# ─────────────────────────────────────────────────────────────

def run_full_comparison() -> None:
    print("\n" + "=" * 60)
    print("  DAY 9 — FULL STRESS + STRATEGY COMPARISON")
    print("=" * 60)

    strategies = {
        "User-Based":         lambda: UserShardManager(num_shards=3),
        "Channel-Based":      lambda: ChannelShardManager(num_shards=3),
        "Hash(channel_id)":   lambda: HashShardManager(num_shards=3, key_type="channel_id"),
        "Hash(message_id)":   lambda: HashShardManager(num_shards=3, key_type="message_id"),
    }

    for scenario_key, scenario in SCENARIOS.items():
        print(f"\n\n  ━━━ SCENARIO: {scenario['label']} ━━━")
        print(f"  Users: {scenario['num_users']:,} | Messages: {scenario['num_messages']:,}")
        print(f"  Hot channel ratio: {scenario['hot_ratio']*100:.0f}%\n")

        for strategy_name, factory in strategies.items():
            mgr = factory()
            simulate(
                mgr,
                num_users=scenario["num_users"],
                num_messages=scenario["num_messages"],
                hot_channel_id=scenario["hot_channel_id"],
                hot_ratio=scenario["hot_ratio"],
                label=f"{strategy_name}",
            )


if __name__ == "__main__":
    # Run all scenarios × all strategies
    run_full_comparison()

    # Demonstrate failure
    simulate_with_failure(
        scenario_key="viral",
        strategy="hash-message",
        shard_to_kill=1,
    )
