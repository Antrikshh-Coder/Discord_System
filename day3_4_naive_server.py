"""
Day 3–4: Naive Single Server
============================
A basic Discord-like chat system that works for 10 users
but collapses under 10,000. Demonstrates memory growth,
latency degradation, and the illusion of completeness.
"""

import time
import random


# ─────────────────────────────────────────────────────────────
# CORE CLASSES (Starter Code Extended)
# ─────────────────────────────────────────────────────────────

class Message:
    """Represents a single chat message."""

    def __init__(self, user_id: int, channel_id: int, content: str):
        self.user_id    = user_id
        self.channel_id = channel_id
        self.content    = content
        self.timestamp  = time.time()

    def __repr__(self):
        return (f"Message(user={self.user_id}, "
                f"channel={self.channel_id}, "
                f"content='{self.content[:30]}...')")


class ChatServer:
    """
    Naive single-server implementation.

    HIDDEN ISSUES:
    - self.messages grows forever (no eviction, no limit)
    - No separation of channels — all messages in one list
    - O(n) scan needed to read any channel's history
    - No write-back pressure: always succeeds until OOM
    """

    def __init__(self):
        self.messages: list[Message] = []  # ⚠️ Grows forever

    def send_message(self, message: Message) -> None:
        """Store a message. O(1) write — but memory is unbounded."""
        self.messages.append(message)

    def get_channel_messages(self, channel_id: int, limit: int = 10) -> list[Message]:
        """
        O(n) scan over ALL messages to find a channel's history.
        At 15 million messages this takes seconds.
        """
        result = [m for m in self.messages if m.channel_id == channel_id]
        return result[-limit:]

    def stats(self) -> None:
        """Print basic server stats."""
        mem_bytes  = len(self.messages) * 150  # rough estimate per message
        mem_mb     = mem_bytes / (1024 ** 2)
        unique_ch  = len({m.channel_id for m in self.messages})
        unique_usr = len({m.user_id for m in self.messages})

        print("=" * 50)
        print(f"  ChatServer Statistics")
        print("=" * 50)
        print(f"  Total messages   : {len(self.messages):,}")
        print(f"  Estimated memory : {mem_mb:.1f} MB")
        print(f"  Unique channels  : {unique_ch}")
        print(f"  Unique users     : {unique_usr}")
        print("=" * 50)


# ─────────────────────────────────────────────────────────────
# SIMULATION: 10 users vs 10,000 users
# ─────────────────────────────────────────────────────────────

def simulate_load(num_users: int, num_messages: int, label: str) -> None:
    """Run a load simulation and measure time + memory growth."""
    print(f"\n{'─' * 50}")
    print(f"  Scenario: {label}")
    print(f"  Users: {num_users:,} | Messages: {num_messages:,}")
    print(f"{'─' * 50}")

    server = ChatServer()
    start  = time.monotonic()

    for i in range(num_messages):
        uid  = random.randint(1, num_users)
        chid = random.randint(1, 50)
        msg  = Message(uid, chid, f"Hello from user {uid}! #{i}")
        server.send_message(msg)

        # Simulate degradation: every 10,000 messages is slower
        if num_messages > 5000 and i % 10_000 == 0 and i > 0:
            # Simulate O(n) read bottleneck
            _ = server.get_channel_messages(1, limit=10)

    elapsed = time.monotonic() - start
    server.stats()

    # Simulate latency at this load
    base_latency = 2  # ms
    load_factor  = len(server.messages) / 10_000
    simulated_latency_ms = base_latency * (1 + load_factor ** 1.5)
    print(f"  Elapsed time     : {elapsed:.2f}s")
    print(f"  Simulated latency: {simulated_latency_ms:.1f} ms")

    if len(server.messages) > 100_000:
        print(f"\n  ⚠️  WARNING: Memory growing dangerously!")
        print(f"  ⚠️  In production, this server would have OOM-crashed.\n")
    else:
        print(f"\n  ✅  System stable at this scale.\n")


# ─────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🖥  DISCORD (NAIVE) — Single Server Simulation\n")

    # Small load — works fine
    simulate_load(num_users=10, num_messages=100, label="10 users, 100 messages")

    # Medium load — starts slowing
    simulate_load(num_users=1_000, num_messages=10_000, label="1,000 users, 10,000 messages")

    # Large load — meaningful degradation
    simulate_load(num_users=10_000, num_messages=100_000, label="10,000 users, 100,000 messages")

    print("\n📋 OBSERVATION:")
    print("  The system appears 'complete' but has no scaling path.")
    print("  Memory grows linearly with no bound.")
    print("  Channel reads become O(n) scans as message volume grows.")
    print("  A real event (50k users) would trigger OOM within minutes.\n")
