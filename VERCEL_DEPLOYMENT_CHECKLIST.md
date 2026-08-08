# Glow Backend - Vercel Deployment Checklist

## Before Deployment

- [ ] Push code to GitHub
- [ ] Have Stripe account with API keys ready
- [ ] Create price IDs in Stripe for annual ($9.99) and monthly ($2.99) plans
- [ ] Have a JWT_SECRET ready (any random string, e.g., `your-super-secret-key-12345`)

## Create Vercel Project

- [ ] Go to https://vercel.com/dashboard
- [ ] Click "Add New Project"
- [ ] Select GitHub repo with glow-backend
- [ ] Click "Import"
- [ ] Framework: Next.js (auto-detected)
- [ ] Click "Deploy"

## Create Vercel Postgres Database

- [ ] In Vercel dashboard, go to Storage
- [ ] Click "Create Database" → Postgres
- [ ] Name: `glow-db`
- [ ] Region: closest to your users
- [ ] Wait for initialization
- [ ] Go to .env.local tab
- [ ] Copy `POSTGRES_URLPGSQL` value

## Create Database Tables

- [ ] In Vercel Storage, select your Postgres database
- [ ] Go to "Query"
- [ ] Open `migrations/001_initial_schema.sql`
- [ ] Copy ALL SQL
- [ ] Paste into Vercel query editor
- [ ] Click "Execute"
- [ ] Verify 6 tables created: users, licenses, subscriptions, groups, group_members, subscriptions_audit

## Configure Environment Variables

In Vercel project settings → Environment Variables, add each:

```
POSTGRES_URLPGSQL = [from Step 2, .env.local tab]
STRIPE_SECRET_KEY = sk_test_... (from Stripe dashboard)
STRIPE_PUBLISHABLE_KEY = pk_test_... (from Stripe dashboard)
STRIPE_WEBHOOK_SECRET = whsec_... (you'll get this after webhook setup)
STRIPE_PRICE_ANNUAL = price_... (from Stripe Products)
STRIPE_PRICE_MONTHLY = price_... (from Stripe Products)
JWT_SECRET = your-super-secret-key-12345 (make up something random)
FRONTEND_URL = https://your-vercel-domain.vercel.app (or your custom domain)
```

- [ ] Click "Save"

## Deploy

- [ ] Go to Deployments tab
- [ ] Click "Deploy" button (or push to GitHub and it auto-deploys)
- [ ] Wait for build to complete (usually 1-2 mins)
- [ ] Click "Visit" to see deployment

## Test API

- [ ] Test health check:
  ```bash
  curl https://your-domain.vercel.app/api/health
  ```
  Should return: `{"status":"ok","timestamp":"...","environment":"production"}`

- [ ] Test signup:
  ```bash
  curl -X POST https://your-domain.vercel.app/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "username": "testuser",
      "password": "password123"
    }'
  ```
  Should return user with `access_token`

## Stripe Webhook Setup

- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Click "Add Endpoint"
- [ ] URL: `https://your-domain.vercel.app/api/subscriptions/webhook`
- [ ] Select Events: `customer.subscription.updated`
- [ ] Click "Add Endpoint"
- [ ] Click the endpoint to view details
- [ ] Copy "Signing secret" (starts with `whsec_`)
- [ ] Go to Vercel → Environment Variables
- [ ] Add `STRIPE_WEBHOOK_SECRET = whsec_...`
- [ ] Redeploy (push to GitHub or click Redeploy button)

## Final Verification

- [ ] API health check returns 200
- [ ] Signup creates user in database
- [ ] Test group creation with auth token
- [ ] Verify in Vercel logs: Dashboard → Deployments → Logs
- [ ] Check database: Vercel Storage → Query tab → `SELECT * FROM users;`

## Post-Deployment

- [ ] Monitor Vercel logs daily (Dashboard → Logs)
- [ ] Test Stripe webhook in Stripe dashboard (Send test event)
- [ ] Keep `JWT_SECRET` and `STRIPE_SECRET_KEY` safe
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up Vercel Error Tracking (optional)

## Rollback

If something breaks:

1. Go to Vercel → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Fix the issue locally
5. Push to GitHub to redeploy

## Performance Tips

- Vercel cold starts are ~200ms (fine for API)
- Database queries from Vercel Postgres are very fast
- Monitor Vercel Analytics for slowdowns
- Scale database if needed in Vercel Storage settings

## Common Issues

**Deployment fails**: Check build logs in Vercel dashboard
**Database connection error**: Verify `POSTGRES_URLPGSQL` is correct
**Stripe webhook fails**: Check `STRIPE_WEBHOOK_SECRET` is set
**Auth returns 401**: Make sure `JWT_SECRET` matches between sign-up and auth

Done! Your Glow backend is live.
