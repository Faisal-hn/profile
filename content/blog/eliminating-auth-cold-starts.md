---
title: "Eliminating auth service cold starts"
date: "2026-07-15"
excerpt: "How warming connection pools and removing synchronized cache loads cut post-deploy spikes from ~30s to near-zero."
tags: [java, spring, redis, kafka, performance]
published: true
---

After each deploy, our authentication service spent roughly five minutes recovering from cold starts. API latency spiked up to about **30 seconds**, and load on a 2-core instance climbed toward **80**. That is a bad window for anything that gates the rest of the platform.

## What was going wrong

Two patterns compounded:

1. **Lazy pool initialization** — database and Kafka connections were created on first request after a restart, so early traffic paid the full handshake cost.
2. **Synchronized per-request loading** — environment and cache hydration ran under locks on the request path, which serialized work and amplified load under concurrency.

## What we changed

We warmed DB and Kafka pools during startup so the process was ready before traffic arrived, and we moved env/cache loading off the synchronized request path.

The result: cold-start spikes largely disappeared, and steady-state load on the same 2-core instance dropped from roughly **80 to ~3**.

## Takeaway

Auth sits on every critical path. Paying connection and config cost once at boot is cheaper than amortizing it across the first minutes of production traffic.

```java
@PostConstruct
public void warmPools() {
  dataSource.getConnection().close();
  kafkaTemplate.partitionsFor(topic);
}
```

Warming is not glamorous, but it is measurable — and in auth systems, measurable reliability is the product.
