---
title: "Handling contention"
date: "2026-08-29"
excerpt: "How to coordinate writers on a shared row — from a guarded UPDATE to a lease that outlives a transaction."
tags: [system-design, databases, concurrency, redis, mysql]
published: true
---
## Introduction: why contention comes up so often

**Contention** is what happens when several processes try to change the same scarce resource at once — a wallet balance, the last unit in stock, a unique hostname, a checkout session. Without coordination you get races: two charges for one debit, one SKU oversold, duplicate invoices, two accounts claiming the same domain.

The pattern behind most of these bugs is smaller than the damage suggests. Something reads a value, decides the change is allowed, and writes later — two steps with a gap in between. Fix that gap at the **source of truth**, and the rest of the article is how.

## The race condition

Take a wallet debit. Two API requests arrive together for the same account. The straightforward code path:

1. Load the current balance.
2. If it covers the amount, subtract and record a ledger entry.

```sql
SELECT balance_cents
FROM wallets
WHERE id = 'acct_8842';

-- application: if balance_cents >= 5000, then:
UPDATE wallets
SET balance_cents = balance_cents - 5000
WHERE id = 'acct_8842';
```

One request: correct. Two requests against a balance of exactly ₹50: both load `5000`. Both call the payment gateway. Both subtract. The balance ends at `-5000` and you have two captures.

The permission check lived in the application. The mutation lived in a later statement. Another session filled the gap between them. The window can be microseconds on one machine or milliseconds across a network — enough for both to believe they succeeded.

At scale it stops being edge-case territory. Thousands of concurrent writers on one key turn a tiny race into constant collisions. Multiple app servers mean you are coordinating across processes, not just threads.

You need **synchronization**.

## The solution

That failure is a **lost update**: the classic **read-modify-write** bug. Two sessions load the same value, both derive a next state, both persist it, and one silently overwrites the other.

There are several ways to make that cycle safe. Underneath all of them is **compare-and-set**: load a value, then write only if it has not changed. Examples below use SQL; the same primitives exist in Redis, DynamoDB, Cassandra, and HTTP APIs. Reach for heavier coordination only when a simpler tool runs out. Start with a conditional write.

### Conditional writes

Many safety rules are a plain `if` on current data: debit only if funds remain; mark an order shipped only if it was not cancelled; claim a row only if it is unowned. When the rule is about the row you are writing, the engine can evaluate the guard and apply the change in **one** statement — no explicit lock, no version column.

Inventory is the shape: subtract one, but only while stock remains.

```sql
UPDATE inventory
SET quantity = quantity - 1
WHERE sku = 'addon-seat-pack'
  AND quantity > 0;
```

Under concurrency this is already safe. The engine serializes writers on that row. The first request takes `1 → 0`. The second waits, re-checks `quantity > 0` on the row the first left behind, finds it false, and matches **zero rows**. One unit, one sale. Check and decrement are a single atomic step.

How the loser behaves depends on **isolation level** (later). At common defaults the waiter re-checks and matches nothing. At stricter levels the loser aborts with a serialization error you retry. Either way: one unit, one sale. Only the failure shape changes.

A real checkout is more than a counter. You also insert an order line or ledger row. Those writes must commit or roll back together — that is what a **transaction** is for.

There is a trap when you combine them. An `UPDATE` that matches zero rows is **not** an error. The statement succeeded at doing nothing. The transaction does not roll back on its own. An unconditional `INSERT` after a failed decrement still creates an order for stock you never took.

Tie the insert to whether the update actually changed a row:

```sql
BEGIN;

WITH claimed AS (
  UPDATE inventory
  SET quantity = quantity - 1
  WHERE sku = 'addon-seat-pack'
    AND quantity > 0
  RETURNING sku
)
INSERT INTO order_lines (order_id, sku, qty)
SELECT 'ord_991', sku, 1
FROM claimed;

COMMIT;
```

`RETURNING` only yields rows the update touched. `INSERT … SELECT` reads that set. Empty set → empty insert. In application code: if affected rows is zero, roll back before any side effect.

That guard only defends **some** unit existing, not **this** unit. With fifty left, two checkouts can both pass `quantity > 0` and both insert the same serialised coupon code. The counter is accurate. Two customers still own `PROMO-7X4K`. The engine did nothing wrong — you never made `PROMO-7X4K` the contended cell.

Point the conditional write at the thing people actually fight over:

```sql
UPDATE coupon_codes
SET status = 'redeemed',
    redeemed_by = 'acct_8842'
WHERE code = 'PROMO-7X4K'
  AND status = 'available';
```

Whoever flips `available → redeemed` first wins. The other matches zero rows. Remaining quantity is derived from code rows, or kept as a cache decremented in the same transaction.

**The guard must protect the contended object.** A counter answers “is any unit left?” Only the specific row answers “is this unit left?”

This covers a large share of real contention: decrementing a counter, flipping a status, claiming an unassigned row. If the store can evaluate the guard as part of the write, you are done. In SQL that is a `WHERE` on the `UPDATE`. Elsewhere: DynamoDB `ConditionExpression`, Redis `SET NX`, Cassandra lightweight transactions, HTTP `If-Match`. That is also the limit — the engine only enforces predicates it can read on the write. Many decisions cannot be expressed that way.

### Pessimistic locking

Sometimes the app must **read, decide in code, then write**. Picking which payment processor to use from a list of healthy ones, allocating a contiguous block of internal ids, or loading several SKU rows before claiming a bundle — the decision is not a single `WHERE` clause. Two workers can load the same snapshot, both choose processor `razorpay-primary`, and the second write stomps the first. Lost update again.

**Pessimistic locking** assumes clashes will happen and blocks them upfront with an explicit row lock.

```sql
BEGIN;

SELECT id, name
FROM payment_processors
WHERE region = 'IN'
  AND healthy = 1
FOR UPDATE;

-- application picks razorpay-primary, then:
UPDATE payment_processors
SET in_flight = in_flight + 1
WHERE id = 'razorpay-primary';

COMMIT;
```

`FOR UPDATE` locks every row the `SELECT` returns. While you decide, no other transaction can change those rows. A second checkout waits, then sees updated `in_flight` counts and may pick a different processor.

The cost: you locked **every healthy processor in the region** to pick one. Heavy traffic serializes here — part of why optimistic control exists.

A conditional `UPDATE` is the wrong tool when the decision runs in application code between read and write. Lock what you read, decide while those rows are frozen, write, then release. Same pattern for checking a balance against a daily transfer cap, or reading stock across several items before claiming a bundle. If the logic later collapses to one `WHERE`, drop the lock and go back to a guarded write. Do not pay for a lock you do not need.

A **lock** prevents other connections from mutating that data until it is released. PostgreSQL and MySQL handle thousands of connections; locks still mean only one connection mutates a given row at a time.

#### Common failure modes

**Locking too much, for too long.** Safety only covers the rows you locked and the time you hold them. Shrink both. A table lock lines every writer up. Holding for seconds instead of milliseconds piles requests into a queue. The worst case is slow I/O: a Razorpay or Stripe HTTP call **inside** the transaction makes every other checkout wait on a vendor. Do vendor calls before you take the lock or after you release it. Lock only the processors in the relevant region and release as soon as the choice is recorded.

**Deadlocks from inconsistent order.** Two wallet transfers at once illustrate this cleanly. Request A debits wallet `8842` and credits wallet `3301`. Request B debits `3301` and credits `8842`. A locks `8842`, then waits on `3301`. B locks `3301`, then waits on `8842`. Each holds one row and waits forever on the other — a **deadlock**.

The business flow does not imply a safe lock order. The engine will not infer one for you.

The fix is **ordered locking**: sort every resource id you need **before** taking any lock, and use the same global order on every code path. For wallets `8842` and `3301`, always lock `3301` first, even if `8842` initiated the transfer. Do not “lock the initiator first.” The exact ordering scheme does not matter as long as it is **global** across every transaction in the system.

Ordered locking prevents most cycles; it does not prove they are gone. Major databases run automatic deadlock detection: when they spot a cycle, they abort one transaction and let the other proceed. That is on by default. Your job is to catch the deadlock error and retry the loser with locks already taken in order.

A **lock-wait timeout** is a different backstop — for a session stuck behind a lock held too long, not for a true cycle. Prevent with ordered locking; clean up the ones that slip through with the detector.

The structural downside: **every** transaction pays lock cost, including sessions that would never have collided. When two writers rarely touch the same row, you are buying insurance against a rare event on every request.

### Optimistic concurrency control

**Optimistic concurrency control (OCC)** bets the opposite way: conflicts are rare, so detect them at write time instead of blocking upfront. Same gap between read and write; nothing is held still. Under low contention you skip lock overhead entirely.

You need a field that changes on every write. Load it. On write, apply the change only if that field is still what you loaded. If someone wrote first, your `WHERE` matches nothing — zero rows, retry. HTTP **ETags** with `If-Match` (server returns **412** if the resource moved) are the same idea. etcd uses a revision number. DynamoDB uses a version attribute.

```sql
-- both workers loaded generation = 17

-- worker A first:
BEGIN;
UPDATE account_limits
SET daily_transfer_cap_cents = 500000,
    generation = generation + 1
WHERE account_id = 'acct_8842'
  AND generation = 17;
COMMIT;
-- generation = 18

-- worker B still uses 17:
BEGIN;
UPDATE account_limits
SET daily_transfer_cap_cents = 750000,
    generation = generation + 1
WHERE account_id = 'acct_8842'
  AND generation = 17;
-- 0 rows → ROLLBACK, reload, or return conflict to the caller
ROLLBACK;
```

Same trap as the conditional write: a stale generation is not an exception — it is zero rows. Check the count before follow-up writes.

A **timestamp** or **business field** can stand in for a generation if every writer touches it and two quick updates cannot share the same tick. A field that only moves one way — an auction high bid — can work. Business fields that bounce have the **ABA problem**.

**ABA** means the value goes A → B → A between your read and write. Equality thinks nothing changed; meaningful transitions happened underneath. Suppose you reuse `remaining_credits` as the generation on a subscription row. You load `100`. A purchase drops it to `99`. A refund brings it back to `100`. Your write checks “still 100?”, gets yes, and overwrites the update that happened in between. The round trip is invisible to a simple equality check.

The safest fix is a dedicated `generation` **column** that increments on **every** write, even when business columns did not change:

```sql
UPDATE subscription_entitlements
SET remaining_credits = :new_credits,
    generation = generation + 1
WHERE account_id = 'acct_8842'
  AND generation = 17;
```

If you cannot add a column, put **every field you read** in the `WHERE` so the write applies only if the whole row still matches. Heavier, but it catches any change, including a round trip a lone business field would hide. Some engines expose a built-in row version (PostgreSQL `xmin`) you can use instead of maintaining your own.

How often do writers collide? If often, lock first — retries cost more than the lock. If rarely (most admin edits, most storefront traffic), go optimistic and accept the occasional retry.

Conditional writes, locks, and generations protect decisions **about a row** both transactions touch. They share a blind spot when the transactions never touch the same row.

### Isolation levels

Sometimes two transactions each read an overlapping set, each decision is valid alone, and **together** they break a rule. No single row collides, so a guarded `UPDATE`, row lock, and generation check all succeed. That is **write skew**.

An organisation must keep at least one **owner**. Two owners exist. Both try to demote themselves at once. Each transaction loads the member list, sees the other still an owner, and removes their own role. Both commit. The org has zero owners. Neither transaction was wrong by itself.

Earlier tools cannot help. They write **different** rows. There is no shared cell to lock, version, or guard. The clash is in what they **read** to decide.

**Isolation levels** control how much of another transaction’s in-flight work you may see. Typical engines offer four levels — options, not a ladder:


| Level              | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `READ UNCOMMITTED` | Can see uncommitted work from others (rarely used)                   |
| `READ COMMITTED`   | Only committed work (PostgreSQL default)                             |
| `REPEATABLE READ`  | Repeating a read inside the transaction stays stable (MySQL default) |
| `SERIALIZABLE`     | Outcome as if transactions ran one after another                     |


None of the weaker levels catch write skew — **including** `REPEATABLE READ`. `SERIALIZABLE` does. The double-demote matches no serial order, so both cannot commit. One aborts; the app retries. On retry the engineer sees they would be last out and stays.

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT count(*)
FROM org_members
WHERE org_id = 'org_42'
  AND role = 'owner';

-- application saw 2, decides it is safe to demote:
UPDATE org_members
SET role = 'member'
WHERE org_id = 'org_42'
  AND user_id = 'user_alice';

COMMIT;
-- if another owner demoted concurrently, one COMMIT fails with a serialization error
```

`SERIALIZABLE` is not free. The engine tracks reads and writes to find these conflicts. Every abort throws away work you redo. Pessimistic locking or OCC usually close the earlier gaps more cheaply — save `SERIALIZABLE` for conflicts that **span rows**. Most NoSQL stores do not offer true `SERIALIZABLE`; there, fold the invariant onto **one cell** you can guard on write.

Cheaper still when you can: **materialize** the conflict onto one row. An `owner_count` on the org row, or `FOR UPDATE` on that row before anyone demotes, turns a cross-row rule back into same-row contention. The store can only protect a conflict it can **see**. Make the contended thing a single addressable cell — a row, a key, or an item.

### Distributed locks

Every tool so far lives inside **one database transaction**. A database lock lasts only as long as that transaction. Fine for a quick read-decide-write. Not fine when exclusive access must span a wait, a vendor redirect, or several steps across stateless servers.

Checkout is the usual case. A user selects a plan; you need to hold that checkout session while they complete Razorpay or Stripe — often minutes. `FOR UPDATE` cannot do that. It would pin a connection for the full wait, stall anyone else who needs the row, and other app instances cannot see a transaction-scoped lock.

Hold exclusivity as **data**: who holds the session, when the hold expires. Any server can read it. It outlives one transaction.

That is a **distributed lock** — a **lease** with its own lifetime. Use it when exclusivity must cover several steps, an external call, or a wait.

**Redis with TTL.** `SET checkout:ord_991 worker-7 NX EX 120` atomically creates a lock Redis clears when the TTL fires. `NX` **is required**; without it a second process can overwrite a live lock. Fast; any server can check the same key. Catch: if the holder stalls past the TTL (GC pause, slow network), Redis hands the key to the next caller and two clients briefly both think they hold it. Fine for a soft checkout hold. Not fine when a double-grant would corrupt money. Redis is also a **single point of failure** to plan for.

**Database columns.** A lock is two columns on the row — holder and expiry — with the same conditional write:

```sql
UPDATE checkout_sessions
SET holder = 'worker-7',
    hold_expires_at = NOW() + INTERVAL '2 minutes'
WHERE id = 'ord_991'
  AND (hold_expires_at IS NULL OR hold_expires_at < NOW());
```

One row updated: you have the hold. Zero: someone else does. Expired holds count as free; no cleanup job needed for correctness. Same consistency as the rest of the data. Slower than a cache; the row itself can become a hotspot.

**ZooKeeper / etcd.** Purpose-built coordination with strong consistency through partitions and leader failures. ZooKeeper **ephemeral nodes** vanish when the client session ends. Consensus: **Raft** (etcd), **ZAB** (ZooKeeper). Most robust; you operate another cluster.

A checkout hold is a **product** win as well as a correctness win. It shrinks the fight from the whole payment flow down to the moment of selection.

The same moves exist outside SQL:


| Technique              | In SQL                                    | Same move elsewhere                                                            |
| ---------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Conditional write      | `WHERE` predicate on the write            | DynamoDB `ConditionExpression`, Redis `SET NX`, Cassandra LWT, HTTP `If-Match` |
| Optimistic concurrency | generation column, `WHERE generation = …` | HTTP ETags / `If-Match`, etcd revision, DynamoDB version attribute             |
| Pessimistic locking    | `SELECT … FOR UPDATE`                     | a mutex, or a distributed lock held while you decide                           |
| Serializable isolation | `ISOLATION LEVEL SERIALIZABLE`            | mostly relational; elsewhere fold the invariant onto one cell                  |
| Distributed lock       | reservation row with a TTL                | Redis `SET NX EX`, ZooKeeper or etcd lease                                     |


Keep the contended resource in **one authoritative store**. Every technique above assumes that. Nine times out of ten the relevant data can live in a single database.

Two cases break the “one home” assumption, and both sit **outside** this pattern:

1. One operation must commit atomically across **several services or shards** (a transfer between two ledger shards). That is a **distributed transaction** — sagas, outbox, 2PC.
2. The same record is writable in **several places at once** (multi-leader replication). There is no single home to defend. That is **conflict resolution**: last-write-wins, vector clocks, CRDTs.

#### When every writer hits the same row

A lease row on `checkout_sessions` can become a **hotspot** — and the same pattern shows up at larger scale. This is a **hot partition**: one write key that every request targets, no matter how many servers you add.

Picture a public figure joining a social app and millions of users hit Follow in the same minute. Or a one-of-a-kind item goes live on an auction site and thousands of bids land on the same listing row. Or a surprise show announcement and every buyer tries to purchase against the same inventory row the instant sales open. Your design may be sound; the contention still lands on a single cell.

Normal scale-out stops helping. **Sharding** spreads load across rows, but here everyone wants **that** row — nothing to split. **Load balancing** spreads requests across app servers that then queue on the same primary key anyway. **Read replicas** take read traffic off the primary, but the fight is over **writes**, so they do not touch it.

Before you add infrastructure, ask whether you can **change the problem**. Run ten parallel auctions for identical lots instead of one. Let a follower count lag a few seconds if the product allows eventual consistency — users rarely notice.

If you still need strong consistency on that key, use **queue-based serialization**: route every mutation for that listing, account, or ticket pool through one dedicated queue consumed by a **single worker**. Contention disappears because work runs sequentially. The queue absorbs spikes while the worker processes at a sustainable rate.

The tradeoff is **throughput**, not only latency. One worker caps how fast that resource can ever move, and it is a single point of failure — run a standby. You turned a contention problem into a serial one. That is often better than the whole system stalling on one gap lock.

## Choosing the right approach

Tradeoffs depend on the shape of the write you are protecting. Walk the list and take the **first** that fits.

**The check is a predicate on the row you are writing.** Conditional `UPDATE`. Gate follow-up work on affected-row count. Simplest thing that works. Start here.

**You must read, decide in application code, then write.** The check is not a `WHERE` (processor selection, bundle allocation, value on another row). Pessimistic `FOR UPDATE` holds the rows you read across the gap. Predictable when contention is high.

**Same read-decide-write, but collisions are rare.** Optimistic concurrency with a generation, timestamp, or one-way business field. Retry when the write finds it already moved.

**The invariant spans rows that never collide.** Write skew. Use `SERIALIZABLE`, or materialize the invariant onto one row you can lock.

**The hold must outlive one transaction.** Distributed lock: exclusivity across a wait, a vendor call, or several steps.


| Approach                 | Use when                                                       | Avoid when                                                   | Typical latency                            | Complexity |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------ | ---------- |
| Conditional write        | Predicate on the row you write (counter, status, claim)        | Decision needs app logic or other rows                       | Low (one atomic statement)                 | Low        |
| Pessimistic locking      | Read-decide-write that is not a `WHERE`; high contention       | Low contention, or a conditional write already covers it     | Low per op, but others wait on the lock    | Low        |
| Optimistic concurrency   | Same read-decide-write, rare collisions; high read/write ratio | High contention where retries pile up                        | Low if no conflict; retry cost if conflict | Medium     |
| `SERIALIZABLE` isolation | Write skew / cross-row invariant with no row to lock           | Hot, high-contention paths (abort/retry cost)                | Medium (conflict tracking)                 | Medium     |
| Distributed locks        | Exclusivity spans a wait, vendor call, or several steps        | A single-row guard inside one transaction already handles it | Low (simple status writes)                 | Medium     |


When unsure: stay in one database and use the lightest tool that fits. A guarded `UPDATE` if the check is a predicate; pessimistic locking once you have real read-decide-write logic. Do not add Redis or etcd when a row lock or generation column in MySQL is enough — extra components add failure modes. You can tighten later.

## Conclusion

Every contended resource has a **single source of truth** — the place that owns the real value. Correctness is enforced **there**. Conditional writes, pessimistic locking, isolation levels, and optimistic concurrency are different ways to coordinate access at that home, escalating as the gap you must protect grows. When the gap outgrows one transaction — a wait, another system — a **distributed lock** holds exclusivity. Those tools guard the source of truth; they do not replace it.

Pessimistic locking is predictable under high contention. OCC is fast when clashes are rare. A modern relational engine can absorb more contention on one cell than people assume. Reach for external locks and reservations when traffic or UX demands it, not by default. First move: make sure the contended thing **exists** as a cell the store can guard.

The moment an operation must span **several** sources of truth, you have left contention and entered **distributed transactions**. The simplest solution that holds at the source of truth is almost always the right one.