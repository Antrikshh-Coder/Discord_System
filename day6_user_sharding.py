"""
Day 6: User-Based Sharding — The First Wrong Decision
======================================================
Strategy: user_id % num_shards
Problem: One influencer → one shard → overloaded.

Run this and observe the imbalance in the output.
"""

import random
from day5_shards import Message, Shard, ShardManager


# ─────────────────────────────────────────────────────────────
# USER SHARD MANAGER
# ─────────────────────────────────────────────────────────────

class UserShardManager(ShardManager):
    """
    Routes each message to the shard owned by that user.
    Formula: shard_id = user_id % num_shards

    PROBLEM: If one user sends thousands of messages,
    that shard is overwhelmed while others sit idle.
    """

    def get_shard(self, user_id: int) -> Shard:
        return self.shards[user_id % len(self.shards)]

    def send_message(self, message: Message) -> None:
        shard = self.get_shard(message.user_id)
        shard.store(message)


# ─────────────────────────────────────────────────────────────
# SIMULATION
# ─────────────────────────────────────────────────────────────

def simulate_influencer_spike(
    influencer_messages: int = 5000,
    normal_users: int = 30,
    normal_messages_each: int = 50,
) -> None:
    print("\n" + "=" * 55)
    print("  DAY 6 — USER-BASED SHARDING: INFLUENCER SPIKE")
    print("=" * 55)

    mgr = UserShardManager(num_shards=3)

    # ── Step 1: Influencer sends massive volume ──
    print(f"\n  @CricketKing (user_id=0) → Shard {0 % 3}")
    print(f"  Sending {influencer_messages:,} messages...\n")

    for i in range(influencer_messages):
        msg = Message(
            user_id=0,  # Always maps to shard 0!
            channel_id=1,
            content=f"Cricket update #{i}: BOUNDARY! 🔥",
        )
        mgr.send_message(msg)

    # ── Step 2: Normal users send modest volume ──
    print(f"  {normal_users} normal users sending {normal_messages_each} messages each...\n")
    for uid in range(1, normal_users + 1):
        for _ in range(normal_messages_each + random.randint(-10, 10)):
            msg = Message(
                user_id=uid,
                channel_id=random.randint(1, 50),
                content="hello",
            )
            mgr.send_message(msg)

    # ── Report ──
    mgr.print_distribution("User-Based Sharding — Influencer Effect")
    mgr.hotspot_check()

    # Explain imbalance
    total = sum(len(s.messages) for s in mgr.shards)
    shard0_pct = len(mgr.shards[0].messages) / total * 100
    print(f"  🧠 Insight: Shard 0 has {shard0_pct:.1f}% of all messages.")
    print(f"     @CricketKing's {influencer_messages:,} msgs are all on Shard 0.")
    print(f"     Shard 0 response time would be 5–10× slower than others.")
    print(f"     Adding more shards doesn't help — the user still maps to one.\n")


if __name__ == "__main__":
    simulate_influencer_spike(
        influencer_messages=5000,
        normal_users=30,
        normal_messages_each=50,
    )
