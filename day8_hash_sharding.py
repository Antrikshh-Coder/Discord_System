"""
Day 8: Hash-Based Sharding — Better But Not Perfect
====================================================
Strategy: MD5(key) % num_shards
Decision: WHAT to hash is the critical design choice.

Each option has different trade-offs:
  hash(user_id)    → same failure mode as user sharding
  hash(channel_id) → same failure mode as channel sharding
  hash(message_id) → best write distribution, worst reads

Also demonstrates the RESHARDING PROBLEM:
  Adding shards changes where EVERY key maps to.
"""

import hashlib
import random
from day5_shards import Message, Shard, ShardManager


# ─────────────────────────────────────────────────────────────
# HASH SHARD MANAGER
# ─────────────────────────────────────────────────────────────

class HashShardManager(ShardManager):
    """
    Distributes messages using MD5 hashing of a chosen key.

    The key_type parameter controls WHAT is hashed:
      'user_id'    — same user always goes to same shard
      'channel_id' — same channel always goes to same shard
      'message_id' — each message independently distributed
    """

    def __init__(self, num_shards: int, key_type: str = "channel_id"):
        super().__init__(num_shards)
        assert key_type in ("user_id", "channel_id", "message_id"), \
            f"key_type must be user_id, channel_id, or message_id"
        self.key_type = key_type

    def get_shard(self, key) -> Shard:
        """Hash the key and mod by shard count."""
        h = int(hashlib.md5(str(key).encode()).hexdigest(), 16)
        return self.shards[h % len(self.shards)]

    def send_message(self, message: Message) -> None:
        """Route message based on chosen hash key."""
        if self.key_type == "user_id":
            key = message.user_id
        elif self.key_type == "channel_id":
            key = message.channel_id
        else:  # message_id
            key = message.message_id

        shard = self.get_shard(key)
        shard.store(message)


# ─────────────────────────────────────────────────────────────
# RESHARDING DEMONSTRATION
# ─────────────────────────────────────────────────────────────

def demo_resharding_problem() -> None:
    """Show that adding shards breaks all existing key→shard mappings."""
    print("\n" + "=" * 55)
    print("  RESHARDING PROBLEM: 3 shards → 4 shards")
    print("=" * 55)

    sample_keys = [42, 43, 44, 100, 999, 1337, 2048]

    print(f"\n  {'Key':>6}  {'Shard (n=3)':>12}  {'Shard (n=4)':>12}  {'Changed?':>10}")
    print(f"  {'─' * 50}")

    moved = 0
    for key in sample_keys:
        h       = int(hashlib.md5(str(key).encode()).hexdigest(), 16)
        shard3  = h % 3
        shard4  = h % 4
        changed = "✅ same" if shard3 == shard4 else "❌ MOVED"
        if shard3 != shard4:
            moved += 1
        print(f"  {key:>6}  {shard3:>12}  {shard4:>12}  {changed:>10}")

    print(f"\n  Result: {moved}/{len(sample_keys)} keys moved to a different shard!")
    print(f"  In production: ALL existing data is on the wrong shard.")
    print(f"  Fix: Use CONSISTENT HASHING (hash ring) — only 1/N keys move.")


# ─────────────────────────────────────────────────────────────
# SIMULATION: Compare all three key choices
# ─────────────────────────────────────────────────────────────

def run_hash_comparison(total_messages: int = 5000) -> None:
    """Run the same load through all three hash strategies."""
    print("\n" + "=" * 55)
    print("  DAY 8 — HASH SHARDING: KEY CHOICE COMPARISON")
    print("=" * 55)

    for key_type in ("user_id", "channel_id", "message_id"):
        mgr = HashShardManager(num_shards=3, key_type=key_type)

        for i in range(total_messages):
            # 80% traffic on channel 1, 30% from influencer user 0
            channel_id  = 1 if random.random() < 0.8 else random.randint(2, 50)
            user_id     = 0 if random.random() < 0.3 else random.randint(1, 1000)
            message_id  = i + 1  # unique per message

            msg = Message(user_id=user_id, channel_id=channel_id, content="hello")
            msg.message_id = message_id
            mgr.send_message(msg)

        mgr.print_distribution(f"Hash(key={key_type})")

    print("  🧠 Analysis:")
    print("  hash(user_id)    → influencer still overloads one shard")
    print("  hash(channel_id) → viral channel still overloads one shard")
    print("  hash(message_id) → best write distribution, but reading")
    print("                     one channel requires scanning ALL shards.\n")

    print("  ✅ CHOSEN STRATEGY: hash(channel_id)")
    print("     Reason: Channels are the natural unit of access.")
    print("     Users query 'give me #cricket-live messages',")
    print("     not 'give me all messages from user 42'.")
    print("     hash(channel_id) keeps reads to 1 shard; the hot channel")
    print("     problem is handled by splitting that shard further.\n")


if __name__ == "__main__":
    demo_resharding_problem()
    run_hash_comparison(total_messages=5000)
