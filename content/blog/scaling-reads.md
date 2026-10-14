---
title: "Scale the read path in this order"
date: "2026-10-13"
excerpt: "Indexes, replicas, and a cache each fix a different bottleneck. Adding them backwards is how read-heavy systems get complicated and still slow."
tags: [system-design, caching, databases, performance]
published: true
---

![Scale the read path — indexes, replicas, cache in that order.](/blog/scaling-reads-cover.png)

Most products that survive growth become read-heavy long before they become write-heavy. A catalog row changes when someone edits the price. It is fetched on every search hit, share, and refresh. This article is about that path: how to keep high read volume from pinning your primary database, and in what order to apply the usual levers.


*Figure 1 — Climb this ladder in order. Skip a rung only when you can name why it does not apply.*

## The Problem

Picture a product detail page. One request may need the SKU row, the seller’s display name, an average rating, and a rough stock signal. That is several lookups — or a fat join — on every view. Edits to that page are rare. Views are not.


*Figure 2 — One write path, many read paths. The database feels the fan-in.*

The same shape shows up everywhere public content lives: a mapping created once and resolved constantly, a video uploaded once and described on every homepage card, a post written once and rendered in thousands of timelines. Reads often outnumber writes by 10×, and for viral or catalog traffic the gap is much wider.

Under that load the database eventually runs into physics: finite cores, finite RAM, finite I/O, finite connections. Clever service code cannot invent more disk bandwidth. You either make each read cheaper, spread identical reads across machines, or stop hitting the database for answers you already computed.

## The Solution

Treat read scaling as a ladder, not a shopping list:

1. Get more out of a single database
2. Grow the database tier horizontally
3. Put caches in front for repeated answers

Move up only when the current rung is the real constraint.

### Optimize Within Your Database

Infrastructure is expensive. Query shape is usually not. Exhaust the single-node options first.

#### Indexing

Without an index on the columns you filter and join, the engine walks the table. With one, it follows a short path in a B-tree (or a hash / specialized index when the access pattern fits). The difference at millions of rows is the difference between “page loads” and “CPU pegged on seq scans.”


*Figure 3 — Scan every row, or walk the index to the match.*

```sql
CREATE INDEX idx_products_sku ON products (sku);

SELECT id, title, price_cents, currency
FROM products
WHERE sku = 'SKU-1842';
```

Index the real access path of the hot page — equality lookups, join keys, common sort columns. For multi-column filters, column order in a compound index matters: `(status, created_at)` helps `status` and `status + created_at`; it will not help a lone `created_at` predicate.

Indexes add work on writes. For read-dominated surfaces, under-indexing is still the more common failure. Add what your `EXPLAIN` plans say you need; skip speculative indexes on columns nobody queries.

#### Hardware Upgrades

A faster disk, more memory for a warm buffer pool, extra cores for concurrent queries — all of that can buy weeks or months. It is a valid short-term move. It does not fix a missing index or a join that rebuilds the page from scratch on every request. Use vertical scale as time, not as the architecture.


*Figure 4 — Vertical scale: same shape, bigger box.*

#### Denormalization Strategies

Normalized schemas avoid storing the same fact twice. They also force the read path to reassemble the page. When the product page always needs seller name and average rating beside the SKU, paying for those joins on every view is often the wrong optimization target.


*Figure 5 — Joins on every view versus one page-shaped row.*

A denormalized read model stores the page-shaped fields together. Seller renames and rating refreshes update more than one place. Storage grows; the hot `SELECT` shrinks to one row.

```sql
SELECT title, seller_name, price_cents, avg_rating, in_stock_hint
FROM product_page
WHERE sku = 'SKU-1842';
```

Precomputed aggregates belong here too. Average rating can be maintained when a review is written, or by a periodic job, instead of scanning reviews on every storefront hit. The rule is the ratio: if reads dominate, duplicate for speed; if writes are chatty across many copies, keep the model normalized and fix something else.

### Scale Your Database Horizontally

When the primary is healthy on query shape but still maxed on CPU, I/O, or connections, add machines. How many reads a tuned primary can take varies wildly with row size and working set; as a rough mental model, teams often start looking past a single node once simple indexed reads are in the high tens of thousands per second on solid hardware. Use that only as a conversation starter — measure yours.

#### Read Replicas

Copy the data to followers. Send writes to the leader; send most reads to replicas. Throughput scales with healthy replicas that can run the same cheap query. You also get a promotion candidate if the primary fails.


*Figure 6 — Leader takes writes; followers absorb read fan-out.*

Async replication is the usual default: fast writes, possible lag. Someone saves a new price, refreshes, and briefly sees the old one from a lagging replica. If that breaks the product, pin post-write reads to the primary for a short window, or wait for a replica that has caught up. Sync replication reduces lag and slows every write. Pick from the consistency the page actually needs.

Replicas do not help if each follower still scans a huge working set, or if the write primary is the thing on fire. More read copies will not fix a write bottleneck or a still-expensive query.

#### Database Sharding

Replicas hold the same dataset. Shards split it. Each node owns less data, indexes stay smaller, and traffic spreads by key, domain, or region. Functional splits (accounts vs catalog) and geo splits (data near the user) are common.


*Figure 7 — Functional sharding: each domain owns its own dataset.*

Sharding costs operational complexity — resharding, cross-shard queries, uneven keys. It is often the right answer for dataset size or write distribution. For “too many identical reads of data that still fits on one node,” a cache or more replicas usually comes first.

### Add External Caching Layers

You have two levers left for volume: more database capacity, or memory that returns an answer you already fetched. Traffic is almost never uniform. A handful of SKUs own a sale. A handful of posts go viral. Caching pays when the same payload is requested over and over while the underlying row barely moves.

#### Application-Level Caching

An in-process or Redis-class cache sits beside the service. On a hit you skip the query. On a miss you load from the database and populate the key.


*Figure 8 — Read-through: check cache, fill on miss, return.*

Keeping cache and database aligned is the hard part. Practical tools:

- **TTL** — expire after a staleness budget you can defend (“title and list price may be five minutes old”)
- **Invalidate or overwrite on write** — tighter freshness; the write path must handle cache errors
- **Async invalidation** — cheaper writes; a short stale window
- **Tags** — drop related keys together when a dependency changes
- **Versioned keys** — bump a version so old entries are simply never read again

Most systems mix these: short TTLs as a backstop, active invalidation for money-adjacent or user-visible critical fields, TTL-only for soft scores. Derive the number from product requirements, not from habit.

#### CDN and Edge Caching

Edge networks store shared responses near users. A public product document served from a nearby POP avoids a long trip to your origin and removes that hit from your app tier entirely.


*Figure 9 — Shared public responses live near the reader; origin only sees misses.*

Use the edge for content many clients share. Carts, preference blobs, and other per-user secrets do not get a shared hit rate; caching them at the edge mostly adds invalidation pain. Keep those in the application cache or the database.

## When This Ladder Is the Wrong Tool

Skip a deep read-scaling stack when writes dominate (high-frequency location pings), when the stated load still fits a quiet indexed primary, when wrong-for-a-minute data loses money or inventory, or when collaborators must see every change immediately. In those cases a warm cache fights the product.

Also separate “reduce load” from “cut latency.” If the database is comfortable and you only need faster TTFB in distant regions, edge placement and network path matter more than another replica.

## Failure Modes Worth Designing For

These are the cases that show up after the happy path works.

### Queries that degrade as tables grow

A lookup that felt fine at 10k rows becomes a full scan at 10M. Login by email without an index reads the whole users table; joins without indexes multiply the damage. Fix the access path first — indexes on filter and join columns, correct compound order — before you blame “scale” in the abstract.

### One hot key saturates the cache

Everyone asks for the same viral SKU. The value is in RAM, but one cache node still has finite CPU and network. The site fails on reads while the database looks idle.


*Figure 10 — Hot key: one popular entry owns the machine.*

Coalesce in the application: if a miss for that key is already loading, wait on the in-flight result instead of starting a second identical fetch. That caps origin work at roughly one rebuild per process.

```python
async def get_product(sku: str) -> Product:
    if sku in inflight:
        return await inflight[sku]
    task = asyncio.create_task(load_product(sku))
    inflight[sku] = task
    try:
        return await task
    finally:
        inflight.pop(sku, None)
```

If one key still overwhelms a shard, fan it out: identical copies under `product:SKU-1842:0` … `:7`, pick randomly on read. You spend memory and complicate invalidation; you stop one key from owning a whole cache process.


*Figure 11 — Key fan-out: same payload, load spread across keys and nodes.*

### Stampede when a popular entry expires

TTL hits zero. For an instant every request misses and stampedes the primary with the same query. Expensive rebuilds make the spike worse.


*Figure 12 — Cache stampede: synchronized misses become a self-inflicted load spike.*

A global lock that lines everyone up behind one rebuild protects the database and can timeout the crowd if the rebuild is slow. Prefer serving briefly stale data while a few requests refresh in the background, refreshing before expiry with rising probability, or a scheduled refresh for keys you know will never go quiet. Spread rebuilds across time.

### Updates that must be visible immediately

Delete-then-refill races: you drop the key, a concurrent reader misses, loads the pre-update row, and writes stale data back. For entity pages that need crisp freshness, keep a version on the row, bump it in the same transaction as the update, and read `product:{id}:v{n}`. Old keys become unreachable and age out with TTL. Cost: a version lookup. Benefit: you are not depending on every cache layer hearing a delete.


*Figure 13 — Versioned keys: route around stale entries instead of racing deletes.*

Versioning fits single entities better than computed feeds. For feeds, a small set of recently removed IDs can filter bad items from an otherwise warm list while larger structures rebuild. At the CDN, truly critical changes may skip the edge or use short edge TTLs while the app cache keeps a longer window for softer fields.

Different fields on one page can disagree on policy. Title can lag. “Sold out” on the purchase button may need the primary or a tightly invalidated counter.

## Closing

Read load grows faster than write load on most content surfaces, and machines have ceilings. The durable order is: make the query cheap (indexes, denormalized read models, honest hardware), spread work with replicas when one primary is the limit (shards when the dataset itself will not fit), then cache answers that repeat — in the app first, at the edge when many users share the payload.

Add the next box only when you can name the constraint it removes. A tuned primary already carries more than most designs assume; a cache in front of a bad query only makes a fast mistake.