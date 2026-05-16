# Cloudflare Proxy Configuration

This document covers recommended Cloudflare settings for the mcbanners-api-next self-hosted Docker deployment sitting behind Cloudflare as a reverse proxy or CDN layer.

## Route Caching Strategy

### Cache GET /banner/_ and /mc/_ Routes

Banner image and Minecraft status routes are read-only and produce deterministic output for a given set of query parameters. These are safe to cache at the CDN edge.

Recommended Cloudflare Page Rule or Cache Rule:

| Route pattern         | Cache level      | Edge TTL   | Browser TTL |
| --------------------- | ---------------- | ---------- | ----------- |
| `*/banner/server/*`   | Cache Everything | 60 seconds | 30 seconds  |
| `*/banner/resource/*` | Cache Everything | 60 seconds | 30 seconds  |
| `*/banner/author/*`   | Cache Everything | 60 seconds | 30 seconds  |
| `*/banner/member/*`   | Cache Everything | 60 seconds | 30 seconds  |
| `*/banner/team/*`     | Cache Everything | 60 seconds | 30 seconds  |
| `*/mc/server*`        | Cache Everything | 30 seconds | 15 seconds  |
| `*/mc/icon*`          | Cache Everything | 30 seconds | 15 seconds  |

These TTLs align with the in-process memory cache TTLs (30 s for status/data, 60 s for rendered images). Setting Cloudflare edge TTL equal to or shorter than the in-process TTL avoids serving stale content after the API cache has refreshed.

### No-Cache / Bypass for POST /banner/saved

`POST /banner/saved` creates a new saved banner record and must never be served from cache. Cloudflare bypasses cache for non-GET/HEAD requests by default, but to be explicit:

- Set a Cache Rule matching `*/banner/saved` with method `POST` → **Bypass Cache**.
- `GET /banner/saved/:mnemonic.png|jpg` is a recall route. It can be cached at the edge if desired; recommended edge TTL is 60 seconds or longer since saved banners do not change after creation.

### Cache Key

Cloudflare's default cache key includes the full URL including query string. This is correct for this API since query parameters (e.g., `?host=`, `?port=`) distinguish different responses. Do not strip query parameters from the cache key.

## Cache-Control Headers

The API does not currently emit explicit `Cache-Control` response headers. Cloudflare will fall back to its default caching behavior (typically does not cache responses without `Cache-Control: public` or explicit Page Rules).

To enable edge caching without modifying the API, use Cloudflare **Cache Rules** (formerly Page Rules) with **Cache Everything** and an explicit edge TTL. This overrides the missing `Cache-Control` header at the CDN layer without requiring API changes.

If `Cache-Control` headers are added to the API in a future milestone, ensure they are consistent with the Cloudflare Page Rule / Cache Rule settings.

## WAF and Rate Limiting

### In-Process Rate Limiting (Optional)

The API includes optional in-process rate limiting, disabled by default:

```
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000    # 1-minute window (default)
RATE_LIMIT_MAX_REQUESTS=300   # 300 requests per window per IP (default)
```

When enabled, the API returns `429 Too Many Requests` with a `Retry-After` header. The in-process limiter uses the `CF-Connecting-IP` header (set by Cloudflare) or `X-Forwarded-For` as the client IP key.

**Important**: The in-process rate limiter is a per-process, in-memory store. It does not share state across multiple API replicas. For multi-replica deployments, rely on Cloudflare WAF rate limiting instead.

### Recommended: Cloudflare WAF Rate Limiting

For DDoS protection and coordinated abuse prevention, use Cloudflare WAF rate limiting rules in addition to (or instead of) in-process limiting:

- **Banner routes**: Limit per IP to ~100–300 requests per minute on `*/banner/*`.
- **Minecraft status routes**: Limit per IP to ~60–120 requests per minute on `*/mc/*`.
- **Saved banner POST**: Limit per IP to ~10–30 requests per minute on `POST */banner/saved`.

Cloudflare WAF rules apply before traffic reaches the origin, protecting the server from volumetric attacks that would bypass in-process limiting.

### Bot Fight Mode

Enable Cloudflare Bot Fight Mode or Super Bot Fight Mode to block known bad bots. Banner endpoints are public and do not require authentication, making them a target for scraper abuse.

## Request ID Propagation

The API emits an `X-Request-ID` header on every response. If a request already contains an `X-Request-ID` header (e.g., set by Cloudflare or an upstream service), the API echoes it back unchanged. This allows end-to-end request tracing through Cloudflare logs and API logs.

To enable in Cloudflare:

- Use a **Transform Rule** to add `X-Request-ID: ${cf.ray_id}` to outgoing requests, then the API will echo the Cloudflare Ray ID back in the response.

## Metrics Endpoint

The `/metrics` endpoint is disabled by default (`METRICS_ENABLED=false`). If enabled, it returns internal cache statistics and uptime. Do **not** expose this endpoint publicly via Cloudflare.

To block `/metrics` at the CDN edge:

- Add a Cloudflare **Firewall Rule** or **WAF Custom Rule**: `http.request.uri.path eq "/metrics"` → **Block**.

## Rollback Behavior at CDN Level

1. **DNS rollback**: If the Bun API needs to be replaced by the legacy Java service, update the Cloudflare DNS A/CNAME record to point to the legacy origin. Cloudflare DNS TTLs are typically 1–5 minutes when proxied.
2. **Cache purge**: After a rollback, purge the Cloudflare cache for banner routes to avoid serving stale responses rendered by the previous origin:
   ```
   Cloudflare Dashboard → Caching → Configuration → Purge Everything
   ```
   Or selectively purge by URL prefix via the Cloudflare API.
3. **Page Rule rollback**: If the legacy Java origin uses different paths or caching behavior, update Page Rules/Cache Rules accordingly before or immediately after DNS rollback.
4. **Origin health**: Cloudflare health checks (if configured) should point to `/health`. A healthy Bun API returns `200 {"service":"mcbanners-api-next","status":"ok"}`. A healthy legacy API returns its own health response.

## Health and Readiness Probes

- `GET /health` — returns `200` when the process is alive. Safe to use as Cloudflare health check origin.
- `GET /ready` — returns `200` when renderer assets and optional DB are available. Use as the primary readiness signal before traffic is cut over to a new deployment. Do not use `/ready` as a per-request Cloudflare health check (it performs I/O on each call).
