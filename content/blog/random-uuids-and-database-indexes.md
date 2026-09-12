---
title: "Random UUIDs and database indexes"
date: "2026-09-13"
excerpt: "UUIDv4 is random. An InnoDB index is ordered. Putting the first into the second turns inserts into random I/O — and the penalty only shows up once the table outgrows the buffer pool."
tags: [mysql, innodb, uuid, performance, indexes]
published: true
---

![Random UUIDs scatter InnoDB indexes; ordered keys append.](/blog/random-uuids-cover.png)

A UUID looks like a string. An InnoDB index treats it like a number. If that number is random, every insert is a random write into a structure that has to stay sorted.

That is the whole problem. UUIDv4 — the default in Java, Python, and Node — generates 128-bit values that land nowhere near each other. InnoDB does not care that they are "unique." It cares that they are unordered. Unordered keys cause page splits, scattered I/O, and a buffer pool that never holds the page you need next.

Shopify ran into this on a high-throughput MySQL payments table and cut INSERT duration by **50 percent** by switching to a time-ordered ID. The rest of this article is the mechanism that makes that number unsurprising: how InnoDB stores keys, what happens at the leaf pages, why a random primary key poisons every secondary index, and when a time-ordered ID still will not help.

## Start with UUIDv4

A UUID is 128 bits. Libraries print it as `550e8400-e29b-41d4-a716-446655440000`. InnoDB stores bytes. Bytes compare as numbers. Strings do too: ASCII and UTF-8 are byte sequences, and a byte is a number.

Inserting a UUID is therefore the same as inserting a random integer. The type is a distraction. **Randomness** is the problem.

UUIDv4 is the random variant. Two IDs generated a microsecond apart — on one machine or on a thousand — have no numerical relationship. This article is not about UUIDv1 (time-based, timestamp stored in a scrambled order, historically leaked a MAC address), and it is not about UUIDv7 or ULID, which put time in the high bits so values sort. Those show up later, as the fix.

v4 is what most application code generates. It is also the one that fights the index. MySQL's own `UUID()` function is a different trap: it generates **v1**, not v4. Application libraries are the usual source of random keys.

You only pay this cost on a column InnoDB actually indexes. An unindexed UUID is just another column on the row. The moment it is a primary key, a unique constraint, or any secondary index, there is a B+ tree that must stay ordered.

## Indexes are ordered

InnoDB indexes are B+ trees. Internal nodes say "keys in this range live down that pointer." Leaf pages hold the entries, packed in sorted order, and linked to their neighbors so a range scan can walk them without going back to the root.

That ordering is the product. Point lookups compare keys. Range scans follow the leaf linked list. If the keys on a page are out of sequence, the index is useless.

Pages are 16 KB. When a new key belongs on a page that is already full, InnoDB **splits** the page: allocate a new one, move some keys, update the parent, relink the neighbors.

The primary key is not a pointer sitting next to the table. **The primary key is the table.** InnoDB is an index-organized storage engine. Leaf pages of the clustered index hold the full row — every column, not just the key. Secondary indexes do not store a file offset. They store the primary key value, then look it up again in the clustered index.

A random primary key therefore does two things at once. It scatters index entries, and it scatters the rows themselves.

## What a random insert actually does

Ignore the internal nodes. The cost that dominates is at the leaves. Pretend a leaf holds two keys, and the "UUIDs" are small integers so the order is visible.

Insert `10, 90, 80, 40, 5, 70, 60`.

**10** — empty index. Create a page. Write `10`.

**90** — same page has room. `90 > 10`, so the page is `[10, 90]`. Cheap. This is what sequential inserts look like.

**80** — belongs between 10 and 90. The page is full. Split it.

```
before:  [10 | 90]
after:   [10 | 80]  ↔  [90]
```

**40** — belongs before 80. Left page is full. Split again.

```
[10 | 40]  ↔  [80]  ↔  [90]
```

**5** — belongs before 10. Another split, plus pointer updates on both sides of the new page.

```
[5 | 10]  ↔  [40]  ↔  [80]  ↔  [90]
```

**70** and **60** land between existing keys. More sliding, more splits.

Seven keys, and most of them forced a structural change. Each split copies keys, allocates a page, updates the parent, and rewires the leaf linked list. Because the clustered leaf holds the full row, a split moves kilobytes of row data, not 16 bytes of key. InnoDB treats a split as a **pessimistic** update: it takes a stronger latch on the tree, not just on one page.

Now the sequential version: `10, 20, 30, 50, 70, 80`.

```
[10 | 20]
[10 | 20]  ↔  [30]          ← page full; allocate to the right
[10 | 20]  ↔  [30 | 50]
[10 | 20]  ↔  [30 | 50]  ↔  [70 | 80]
```

Splits still happen. They happen at the **right edge**, on the page you just had in cache. InnoDB is built for this. Sequential inserts fill a page to about **94%** before opening a new one. Random inserts split pages in the middle and leave them around **50% full**. Same rows, roughly twice the pages, twice the cache pressure.

A service inserting a million UUIDv4 rows a day is doing the first walkthrough continuously, across the whole keyspace.

## The cost shows up as I/O

A page split in memory is CPU. The disaster starts when the page you need is not in the **buffer pool**.

The buffer pool is InnoDB's shared page cache. It is an LRU. Dirty pages eventually flush to disk. If the pool is full and you need a new page, something else is evicted.

A random UUIDv4 insert:

1. Walk the B+ tree to the leaf that should hold this key.
2. That leaf is probably not the one you touched a millisecond ago.
3. If the index is larger than the buffer pool, that leaf is probably on disk.
4. Read it into the pool. Insert. Maybe split, which reads and writes a second page.
5. Write the change to the redo log.
6. The page sits dirty in the pool, will almost never receive the *next* insert, and gets flushed so the next random page can come in.

That loop is I/O thrashing. The next UUID is as likely to need the page you just flushed as any other page. You paid to read it, paid to dirty it, paid to write it back, and will pay to read it again.

While the table fits in the buffer pool, random-key inserts are mostly CPU: splits and a fatter, half-empty clustered index. The moment the table no longer fits, they become I/O bound. Ordered keys keep the hot edge of the tree cached. A terabyte-scale table can keep sequential inserts fast with a handful of megabytes of buffer pool, because you only need the rightmost leaves.

Give it a few million inserts — Shopify does that in an hour — and the pool fills with pages that received one write. To insert the next row you must flush a dirty page, then read a different random page, then flush again. Inserts always read before they write. Random keys make that read a disk I/O almost every time.

The published numbers look inconsistent until you line them up against one variable — table size versus buffer pool:

| When | What random keys cost |
| --- | --- |
| Table fits in the buffer pool | Page-split CPU and a half-empty clustered index. Tens of percent. |
| Table around pool size | Many inserts miss cache. About **2×** insert time. |
| Table much larger than the pool | Random disk reads plus dirty-page flushing. **3×** and worsening as the table grows. |

A 200k-row table will not notice. A table adding millions of rows a month is walking toward the cliff whether or not it has arrived.

## Randomness poisons every index

Because InnoDB clusters on the primary key, a random UUID PK does not stay in one column. Secondary indexes store the primary key as the row locator:

```
secondary index:  (email) → primary_key
clustered leaf:   (primary_key) → every column
```

A 16-byte UUID primary key makes every secondary index 8 bytes fatter than `BIGINT`. Stored as `CHAR(36)`, it is worse: 36 bytes of key, copied into every index, on top of the 50% fill-factor tax.

Look up a row by email and InnoDB still has to find that random primary key in the clustered index — a second random I/O if the page is not cached. Index a created-at column and the leaf entries still carry the UUID. Child tables that store the key as a foreign key pay again.

The randomness is not confined to one column. It is in the clustered index, in every secondary index, and in every referencing table. That is why a random InnoDB primary key is a schema-wide decision, not a column-level one.

## Why teams still use UUIDs

Sequential integers are the workload InnoDB wants. `AUTO_INCREMENT` has two operational problems.

You have to ask MySQL. The client cannot assign an ID before the insert returns. In a distributed system you either serialize on one generator or build a service whose only job is handing out numbers.

They leak. Sequential IDs leak volume and insertion order. `/orders/1001`, `/orders/1002` is a scraper with a loop.

UUIDv4 solves both. The client generates the ID. Collision probability at 122 bits of randomness is not a practical concern. No central bottleneck. No enumerable sequence.

InnoDB then pays for that convenience on every write to an indexed column.

The modern move is to keep client-side generation and **put time in the high bits**, so the values still sort. ULID does that with a 48-bit millisecond timestamp followed by 80 bits of randomness — 128 bits total, lexicographically sortable. UUIDv7 (RFC 9562) does the same job in 16 bytes: 48 bits of Unix time in front, random bits after. Indexes compare left to right. New keys land at the right edge of the clustered index.

Store either as `BINARY(16)`, not `CHAR(36)`. If you are stuck with MySQL-generated v1 values, `UUID_TO_BIN(uuid, 1)` swaps the time bytes so they sort. Application-generated v7 is cleaner if you control the client.

## Example: Shopify

Shopify published this as one paragraph inside a [post about resilient payments](https://shopify.engineering/building-resilient-payment-systems). The database claim is easy to skip: in one high-throughput system, switching idempotency keys from UUIDv4 to ULID cut INSERT duration by **50 percent**.

They needed client-generated uniqueness. A payment POST is not naturally idempotent — send it twice and you charge twice. At their scale, a one-in-a-million network timeout is a daily event. Every attempt carries a key. A retry with the same key must not fire a second charge. The key only has to be unique for the retry window, typically **24 hours or less**.

That last constraint is the access pattern. They were not indexing forever-random lookups. They were indexing keys that are created now, retried within seconds, and forgotten within a day.

Purchases are a timing problem. A thousand people checking out in the same minute produce a thousand keys with timestamps in the same minute. With UUIDv4 those keys scatter across the clustered index. With ULID they land on the same few leaf pages — the tail of the B+ tree.

Writes become sequential. The first insert in a window may fetch a page into the buffer pool. The next thousand hit that page until it fills and splits **right**. Historical pages stay on disk. You cannot insert "into the past" unless a client generated a ULID, went offline, and submitted it an hour later. That happens. It is an anomaly, not the workload.

Reads got cheaper for the same reason. A retry happens within seconds of the original request. The leaf is still dirty in the buffer pool. The lookup is a memory read, not a disk read.

Shopify hit both sides because the **workload** had locality in time, and the identifier finally matched it. The 50% was not a ULID miracle. It was InnoDB receiving keys in the order the clustered index already required.

## Ordered IDs do not fix every read

A URL shortener is the counterexample.

Writes: users create short links all day. ULIDs or UUIDv7 make those inserts sequential. The write path looks like Shopify's.

Reads: someone visits a link created three years ago, then one created today, then one created last month. Popularity is not correlated with recency. There is no hot tail of the working set. InnoDB still has to fetch whichever clustered leaf holds that key. Time-ordering does not help you predict which leaf that is.

| Workload | Writes | Reads |
| --- | --- | --- |
| Idempotency keys, sessions, orders, payments — access is recent | Much better | Better: you read what you just wrote |
| URL redirects, public resource IDs, unbounded lookups | Better | Same as v4 — access is random |

Switch identifier formats because the access pattern has locality in time, not because ordered IDs are fashionable.

Sequential inserts have a well-known downside: every writer converges on the **rightmost leaf**. InnoDB protects that page with a latch, so extreme concurrency can serialize on the tail. This is the same hotspot `AUTO_INCREMENT` has had for decades, and InnoDB is optimized for it. Spreading latch traffic with UUIDv4 buys you page splits everywhere, 50% fill factor, and random I/O. That is almost never the better trade. If you actually measure last-page contention, smaller pages or partitioning give each writer its own tail. Most systems never get there.

## Takeaway

Random UUIDv4 as an InnoDB primary key is random integer insertion into the table itself. The clustered index must stay ordered, so InnoDB splits pages in the middle, fills them halfway, and pulls random leaves through the buffer pool. Every secondary index carries that key. Writes take the direct hit. Reads take it too when the working set is larger than the buffer pool — or they don't, when you mostly look up what you just wrote.

If you need a client-generated unique ID, use UUIDv7 or ULID stored as `BINARY(16)`. Do not store `CHAR(36)`. Do not use v4 as a primary key.

If IDs can be internal and generated by MySQL, `BIGINT AUTO_INCREMENT` is still the smallest and fastest clustered key.

If the table still fits in the buffer pool and inserts are fine, leave an existing v4 key alone. Migrating a primary key is a project. The penalty below the cache cliff is real but modest. The cliff is the moment insert latency climbs as the table grows, buffer-pool hit rate slides, and checkpoint I/O spikes.

The identifier is a statement about how rows will be ordered on disk, which pages will be hot, and whether the next million inserts append or scatter.
