# Glow Backend - Vercel Setup

Deploy this Next.js backend to Vercel with Vercel Postgres database.

## Prerequisites

- GitHub repo with this code pushed
- Vercel account (free tier works)
- Stripe account with API keys and price IDs
- Vercel Postgres database

## Step 1: Create Vercel Postgres Database

1. Go to https://vercel.com/dashboard
2. Select your project (or create one)
3. Go to Storage → Create Database → Postgres
4. Choose a name (e.g., "glow-db")
5. Wait for database to initialize
6. Go to the .env.local tab
7. Copy `POSTGRES_URLPGSQL` value

## Step 2: Create Tables

1. Go to Storage → Select your database
2. Click "Query"
3. Copy all SQL from `migrations/001_initial_schema.sql`
4. Paste into the query editor
5. Click "Execute"
6. Verify 6 tables created (users, licenses, subscriptions, groups, group_members)

## Step 3: Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
POSTGRES_URLPGSQL=postgres://... (from Step 1)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_PRICE_MONTHLY=price_...
JWT_SECRET=your-super-secret-key-12345
FRONTEND_URL=https://your-domain.com
```

## Step 4: Deploy

```bash
git push origin main
```

Vercel auto-deploys on push. Check deployment status in Vercel dashboard.

## Step 5: Test

```bash
# Health check
curl https://your-vercel-domain.vercel.app/api/health

# Sign up
curl -X POST https://your-vercel-domain.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Should return user with access_token
```

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add Endpoint"
3. URL: `https://your-vercel-domain.vercel.app/api/subscriptions/webhook`
4. Events: Select `customer.subscription.updated`
5. Click "Create endpoint"
6. Click endpoint to view details
7. Copy "Signing secret" and add as `STRIPE_WEBHOOK_SECRET` in Vercel

## API Endpoints

All endpoints are prefixed with `https://your-vercel-domain.vercel.app/api`

### Auth
- POST `/auth/signup` - Create account
- POST `/auth/login` - Login
- GET `/auth/me` - Get current user

### Licenses
- GET `/licenses/current` - Get active license
- POST `/licenses/check` - Check feature access
- GET `/licenses/user/:user_id` - Get all licenses

### Subscriptions
- POST `/subscriptions/create` - Create checkout session
- GET `/subscriptions/user` - Get active subscription
- POST `/subscriptions/cancel` - Cancel subscription

### Groups
- POST `/groups/validate-capacity` - Check group size allowed
- POST `/groups/create` - Create location group
- GET `/groups/:group_id` - Get group with members
- POST `/groups/:group_id/join` - Join group
- POST `/groups/:group_id/leave` - Leave group
- POST `/groups/:group_id/location` - Update location
- POST `/groups/:group_id/extend` - Extend group time

## Troubleshooting

### Database Connection Failed
- Check `POSTGRES_URLPGSQL` is correct
- Make sure database is in same Vercel project
- Restart deployment

### JWT_SECRET not set
- Add to Vercel environment variables
- Redeploy

### Stripe webhook not firing
- Check endpoint URL is correct
- Test event from Stripe dashboard
- Check Vercel logs for errors

## Next Steps

1. Build iOS app that calls these endpoints
2. Monitor Vercel logs for production issues
3. Scale database as needed

## Support

Check Vercel logs:
- Dashboard → Select project → Deployments → View Logs
- Look for errors in serverless function logs
