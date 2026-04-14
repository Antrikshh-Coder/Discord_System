"""
Day 5: Introducing Shards — No Strategy Yet
===========================================
3 independent machines exist. The routing logic is
intentionally missing — that is the problem to solve.
Each shard is completely independent (no global storage).
"""

import random
import time


# ─────────────────────────────────────────────────────────────
# BASE CLASSES (used by all subsequent days)
# ─────────────────────────────────────────────────────────────

class Message:
    def __init__(self, user_id: int, channel_id: int, content: str):
        self.user_id    = user_id
        self.channel_id = channel_id
        self.content    = content
        self.timestamp  = time.time()
        self.message_id = id(self)  # unique identity


class Shard:
    """
    One independent machine / storage node.
    No knowledge of other shards.
    No global state.
    """

    def __init__(self, shard_id: int):
        self.id       = shard_id
        self.messages: list[Message] = []  # Independent storage ✓
        self.is_alive = True

    def store(self, message: Message) -> bool:
        """Store a message. Returns False if shard is down."""
        if not self.is_alive:
            print(f"  ❌ Shard {self.id} is DOWN — message dropped!")
            return False
        self.messages.append(message)
        return True

    def get_by_channel(self, channel_id: int) -> list[Message]:
        """Return all messages for a channel stored on THIS shard."""
        return [m for m in self.messages if m.channel_id == channel_id]

    def kill(self):
        """Simulate this shard going offline."""
        self.is_alive = False
        print(f"  💀 Shard {self.id} is now OFFLINE")

    def revive(self):
        self.is_alive = True

    def stats(self) -> dict:
        return {
            "shard_id":  self.id,
            "messages":  len(self.messages),
            "alive":     self.is_alive,
        }


class ShardManager:
    """
    Base shard manager.
    send_message() is INTENTIONALLY NOT IMPLEMENTED here.
    Subclasses must define routing strategy.
    """

    def __init__(self, num_shards: int):
        self.shards = [Shard(i) for i in range(num_shards)]

    def send_message(self, message: Message) -> None:
        # Intentionally incomplete — strategy defined by subclasses
        raise NotImplementedError(
            "ShardManager has no routing strategy. "
            "Use UserShardManager, ChannelShardManager, or HashShardManager."
        )

    def print_distribution(self, label: str = "") -> None:
        """Print message count per shard."""
        total = sum(s.stats()["messages"] for s in self.shards)
        if label:
            print(f"\n  📊 Distribution — {label}")
        print(f"  {'─' * 44}")
        for shard in self.shards:
            count  = shard.stats()["messages"]
            pct    = (count / total * 100) if total > 0 else 0
            bar    = "█" * int(pct / 2)
            status = "OFFLINE" if not shard.is_alive else ("🔥HOT" if pct > 50 else "✅OK")
            print(f"  Shard {shard.id}: {count:>7,} msgs  {pct:5.1f}%  {bar:<30}  {status}")
        print(f"  {'─' * 44}")
        print(f"  Total: {total:,} messages across {len(self.shards)} shards\n")

    def hotspot_check(self) -> None:
        """Print a warning if any shard holds >50% of total messages."""
        total = sum(len(s.messages) for s in self.shards)
        if total == 0:
            return
        for shard in self.shards:
            pct = len(shard.messages) / total * 100
            if pct > 50:
                print(f"  ⚠️  [HOTSPOT] Shard {shard.id} holds {pct:.1f}% of messages → rebalancing needed!")


if __name__ == "__main__":
    print("\n🔀 SHARD MANAGER — Day 5 Demo\n")
    mgr = ShardManager(num_shards=3)

    print("  ShardManager created with 3 independent shards.")
    print("  Attempting to send a message...\n")

    try:
        msg = Message(user_id=1, channel_id=1, content="hello")
        mgr.send_message(msg)
    except NotImplementedError as e:
        print(f"  ❌ Error: {e}")
        print("\n  → This is intentional. Without a routing strategy,")
        print("     we don't know where the message should go.")
        print("     See Day 6, 7, and 8 for routing strategies.\n")
