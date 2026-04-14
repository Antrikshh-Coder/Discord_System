"""
Day 7: Channel-Based Sharding — The Second Wrong Decision
=========================================================
Strategy: channel_id % num_shards
Problem: One viral channel → one shard → overloaded.
Others sit idle. Worse: two popular channels can
accidentally share the same shard.

Run this and compare with Day 6 output.
"""

import random
from day5_shards import Message, Shard, ShardManager


# ─────────────────────────────────────────────────────────────
# CHANNEL SHARD MANAGER
# ─────────────────────────────────────────────────────────────

class ChannelShardManager(ShardManager):
    """
    Routes each message to the shard owned by that channel.
    Formula: shard_id = channel_id % num_shards

    PROBLEM: A viral channel overloads exactly one shard.
    Worse: channel_id=1 (cricket-live) AND channel_id=4
    (general) both map to Shard 1 (1%3=1, 4%3=1).
    """

    def get_shard(self, channel_id: int) -> Shard:
        return self.shards[channel_id % len(self.shards)]

    def send_message(self, message: Message) -> None:
        shard = self.get_shard(message.channel_id)
        shard.store(message)


# ─────────────────────────────────────────────────────────────
# SIMULATION
# ─────────────────────────────────────────────────────────────

# Channel catalogue with realistic traffic ratios
CHANNELS = [
    {"id": 1,  "name": "cricket-live", "traffic_ratio": 0.80},
    {"id": 4,  "name": "general",      "traffic_ratio": 0.10},
    {"id": 2,  "name": "gaming",       "traffic_ratio": 0.07},
    {"id": 0,  "name": "music",        "traffic_ratio": 0.03},
]


def simulate_viral_event(total_messages: int = 10_000) -> None:
    print("\n" + "=" * 55)
    print("  DAY 7 — CHANNEL-BASED SHARDING: VIRAL EVENT")
    print("=" * 55)

    mgr = ChannelShardManager(num_shards=3)

    print(f"\n  Sending {total_messages:,} messages across channels:\n")

    for ch in CHANNELS:
        count = int(total_messages * ch["traffic_ratio"])
        shard_idx = ch["id"] % 3
        print(f"  #{ch['name']:15s} (id={ch['id']}) → Shard {shard_idx}  [{count:,} msgs, {ch['traffic_ratio']*100:.0f}% traffic]")

        for _ in range(count):
            msg = Message(
                user_id=random.randint(1, 10_000),
                channel_id=ch["id"],
                content="hello",
            )
            mgr.send_message(msg)

    # Report
    mgr.print_distribution("Channel-Based Sharding — Viral #cricket-live")
    mgr.hotspot_check()

    total = sum(len(s.messages) for s in mgr.shards)

    print("  🧠 Key Observations:")
    print("     1. Shard 1 holds BOTH #cricket-live AND #general")
    print("        (channel_id=1 → 1%3=1, channel_id=4 → 4%3=1)")
    print("        This co-location makes the imbalance WORSE than expected.")
    print()
    print("     2. Shard 0 only holds #music (3% traffic) — nearly idle.")
    print()
    print("     3. Even if you scale up Shard 1's hardware,")
    print("        the bottleneck is the channel, not the machine.")
    print()
    print("  📊 Comparison vs User-Based Sharding:")
    print("     User sharding: 1 power user overloads 1 shard")
    print("     Channel sharding: 1 viral event overloads 1 shard")
    print("     Both fail the same way — just different triggers.\n")


if __name__ == "__main__":
    simulate_viral_event(total_messages=10_000)
