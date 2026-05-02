# AWS vs Railway — Hosting Comparison for Election Scraper

> For your $10–15/month budget, running a Playwright-based ECI scraper + FastAPI backend.

---

## Quick Verdict

| Factor | Railway | AWS |
|--------|---------|-----|
| **Your budget** | ✅ Perfect fit | ⚠️ Possible but complex |
| **Ease of setup** | ✅ Deploy in 5 min | ❌ Steep learning curve |
| **Playwright support** | ✅ Works out of box | ⚠️ Needs custom setup |
| **Scaling on election day** | ⚠️ Manual upgrade | ✅ Auto-scale |
| **Uptime guarantees** | ⚠️ No SLA on hobby | ✅ 99.9% SLA |
| **Cold starts** | ✅ None | ⚠️ Lambda has cold starts |

**Recommendation: Stay on Railway for now. Move to AWS only if you need auto-scaling or multi-region deployment for TN election day.**

---

## Detailed Comparison

### 1. Railway (Current Setup)

**What you're getting for ~$10–15/mo:**
- 2 GB RAM, 1 vCPU
- Persistent disk (for logs/cache if needed)
- Automatic HTTPS + custom domain
- Git-based deploys (`git push` → live)
- Built-in environment variable management

**Pros:**
1. **Zero DevOps** — Push code, it runs. No load balancers, no IAM roles, no VPC config.
2. **Playwright just works** — The Dockerfile with `mcr.microsoft.com/playwright/python` deploys without issues.
3. **No cold starts** — Container runs 24/7. Your 30s frontend polls get instant responses.
4. **Easy env var management** — Web UI for `ADMIN_SECRET`, `CORS_ORIGIN`, etc.
5. **Automatic deploys** — Connect GitHub repo, every push auto-deploys.

**Cons:**
1. **Manual scaling** — If traffic spikes on election day, you manually upgrade to Pro ($20+/mo) or suffer slowdowns.
2. **No multi-region** — Single region. If that region goes down, you're down.
3. **No SLA on hobby plan** — Railway can restart your container anytime for maintenance.
4. **RAM ceiling** — Max 8 GB on highest plan. For 243 constituencies with Playwright, this is fine. For 234 TN constituencies, also fine.

**When Railway breaks:**
- >500 concurrent users hitting detail endpoints → RAM exhausted
- ECI blocks your IP → You need a proxy rotation system (harder on Railway)
- Container crash loop → No automatic fallback

---

### 2. AWS

AWS has multiple ways to run this workload. Here are the realistic options:

#### Option A: ECS Fargate (Container Service)

**Architecture:**
```
ECS Fargate Task (2 vCPU, 4 GB RAM)
├── FastAPI container
├── Playwright + xvfb
└── CloudWatch Logs
```

**Cost estimate:**
| Component | Monthly Cost |
|-----------|-------------|
| Fargate (2 vCPU, 4 GB) × 24/7 | ~$45–55 |
| Application Load Balancer | ~$18 |
| CloudWatch Logs | ~$5 |
| **Total** | **~$70–80/mo** |

**Verdict: Over budget.** You'd need to downsize to 1 vCPU / 2 GB to hit $25–30/mo, but then Playwright struggles.

#### Option B: Lambda + EventBridge (Serverless)

**Architecture:**
```
EventBridge (every 5 min) → Lambda (scraper)
API Gateway → Lambda (API endpoints)
DynamoDB / ElastiCache (cache)
```

**Problem: Lambda + Playwright = Pain**

Lambda has a 15-minute timeout and ~10 GB max storage. Playwright needs:
- Chromium binary (~150 MB)
- xvfb
- /tmp space for browser profile

You'd need a Lambda layer with Playwright pre-installed. Every cold start downloads/unpacks Chromium. **Cold starts = 10–20 seconds.** Your frontend users would wait 20s for the first API call.

**Cost estimate (if it worked):**
| Component | Monthly Cost |
|-----------|-------------|
| Lambda (scraper: 5 min × 288/day × 30 days) | ~$10–15 |
| API Gateway | ~$5–10 |
| DynamoDB | ~$2–5 |
| **Total** | **~$20–35/mo** |

**Verdict: Technically possible but painful.** Cold starts ruin UX. Playwright in Lambda is a documented nightmare.

#### Option C: EC2 t3.small + ALB (Old School)

**Architecture:**
```
EC2 t3.small (2 vCPU, 2 GB RAM)
├── Docker (Playwright + FastAPI)
└── systemd service
```

**Cost estimate:**
| Component | Monthly Cost |
|-----------|-------------|
| EC2 t3.small (on-demand) | ~$16 |
| ALB | ~$18 |
| Data transfer | ~$2–5 |
| **Total** | **~$36–40/mo** |

**Verdict: Cheaper than Fargate, still over budget.** Plus you manage the OS, security patches, disk space.

#### Option D: Lightsail ($10–20/mo plan)

AWS Lightsail is their "simple VPS" product:
- $10/mo: 2 GB RAM, 1 vCPU, 40 GB SSD
- $20/mo: 4 GB RAM, 2 vCPU, 60 GB SSD

**This is actually comparable to Railway.** Same resources, similar price.

**Verdict: AWS Lightsail ≈ Railway in cost and simplicity.** But you still manage the OS.

---

## Side-by-Side: Railway vs AWS for YOUR Use Case

| Decision Point | Railway Winner | AWS Winner |
|----------------|---------------|------------|
| Getting started in 1 hour | ✅ | ❌ |
| Playwright reliability | ✅ | ⚠️ |
| No cold starts | ✅ | ❌ |
| $10–15 budget | ✅ | ⚠️ (Lightsail only) |
| Auto-scale to 10,000 users | ❌ | ✅ (ECS + ALB) |
| Multi-region redundancy | ❌ | ✅ |
| Managed database | ❌ | ✅ (RDS, DynamoDB) |
| CDN for static assets | ❌ | ✅ (CloudFront) |
| IP rotation / proxy | ❌ | ✅ (with more work) |
| Uptime SLA | ❌ | ✅ |

---

## The Real Question: Do You Need AWS?

**You DON'T need AWS if:**
- Peak traffic is <1,000 concurrent users
- You're okay with manual scaling
- You don't need 99.99% uptime SLA
- Your budget is $10–20/mo

**You MIGHT need AWS if:**
- TN election day brings >5,000 concurrent users
- You need automatic failover (multi-AZ, multi-region)
- You want CloudFront CDN for faster static asset delivery
- You need managed Redis (ElastiCache) for distributed caching
- You want WAF (Web Application Firewall) for DDoS protection

---

## My Recommendation

### Phase 1: Now → 1 Week Before TN Election (Railway)

Stay on Railway Basic ($10–15/mo, 2 GB RAM).

**Actions:**
1. Monitor Railway metrics during Bihar testing
2. Verify 2 GB RAM is enough with the semaphore fixes
3. Set up Railway alerting (if available) or external ping

### Phase 2: TN Election Day (Upgrade Railway or Move to AWS)

**Option A: Upgrade Railway (Easiest)**
- Day before: Upgrade to Railway Pro ($20–30/mo, 4 GB RAM)
- Election day: If traffic spikes, manually scale to 8 GB
- After election: Downgrade back to Basic

**Option B: Hybrid AWS (Best of Both)**
- Keep scraper on Railway (or move to AWS ECS Fargate spot instances)
- Move frontend static assets to CloudFront CDN ($5–10/mo)
- Use AWS ElastiCache Redis ($15/mo) for distributed detail cache
- Total: ~$40–50/mo during election week

**Option C: Full AWS (If Budget Allows ~$50–80/mo)**
- ECS Fargate (2 vCPU, 4 GB) for API
- ElastiCache Redis for cache
- CloudFront for static assets
- CloudWatch for monitoring
- Total: ~$60–80/mo

---

## Migration Path (If You Decide to Move to AWS Later)

```
Week -2: Set up AWS ECS cluster, deploy container
Week -1: Load test with 1000 concurrent users
Day 0:  DNS cutover from Railway to AWS ALB
Day +1: Monitor CloudWatch, scale if needed
```

**The container is the same.** Your Dockerfile works on both Railway and ECS. The only changes:
- Railway uses `RAILWAY_*` env vars → AWS uses Secrets Manager or task env vars
- Railway provides HTTPS → AWS needs ACM certificate + ALB

---

## Bottom Line

| Question | Answer |
|----------|--------|
| Is AWS "better"? | Yes, for enterprise scale. No, for your current needs. |
| Will Railway handle TN election day? | Yes, if <2,000 concurrent users and you upgrade to 4 GB. |
| Should you move to AWS now? | No. Optimize Railway first. Move only if you outgrow it. |
| What's the AWS equivalent cost? | $35–80/mo for comparable reliability. |

**Stick with Railway. Spend the saved money on monitoring (UptimeRobot, Pingdom) and a CDN for your Vercel frontend instead.**
