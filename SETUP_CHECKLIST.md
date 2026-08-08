# Glow Backend Setup Checklist

Follow these steps to get your backend running.

## Step 1: Supabase Setup

- [ ] Go to https://supabase.com and create account
- [ ] Create new project (choose region closest to you)
- [ ] Wait for project to initialize (~2 mins)
- [ ] Go to Settings → API Keys
  - [ ] Copy `Project URL` → paste to `.env` as `SUPABASE_URL`
  - [ ] Copy `anon public` key → paste to `.env` as `SUPABASE_KEY`
  - [ ] Copy `service_role` key → paste to `.env` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Go to SQL Editor
  - [ ] Click "New Query"
  - [ ] Copy all SQL from `migrations/001_initial_schema.sql`
  - [ ] Paste into SQL editor
  - [ ] Click "Run"
  - [ ] Check tables are created: Products → Tables (you should see 6 tables)

## Step 2: Stripe Setup

- [ ] Go to https://stripe.com and create account
- [ ] Go to Developers → API Keys
  - [ ] Copy `Secret Key` (starts with `sk_test_`) → paste to `.env` as `STRIPE_SECRET_KEY`
  - [ ] Copy `Publishable Key` (starts with `pk_test_`) → paste to `.env` as `STRIPE_PUBLISHABLE_KEY`
- [ ] Go to Products → Create new product
  - [ ] Name: "Glow Premium Annual"
  - [ ] Pricing type: Standard pricing
  - [ ] Price: $9.99 / year
  - [ ] Copy price ID (starts with `price_`) → paste to `.env` as `STRIPE_PRICE_ANNUAL`
- [ ] Create another product
  - [ ] Name: "Glow Premium Monthly"
  - [ ] Pricing type: Standard pricing
  - [ ] Price: $2.99 / month
  - [ ] Copy price ID → paste to `.env` as `STRIPE_PRICE_MONTHLY`
- [ ] Go to Developers → Webhooks → Add Endpoint
  - [ ] URL: `http://localhost:3000/api/subscriptions/webhook` (for testing)
  - [ ] Events: Select `customer.subscription.updated`
  - [ ] Click "Add Endpoint"
  - [ ] Click the endpoint to see details
  - [ ] Copy `Signing secret` → paste to `.env` as `STRIPE_WEBHOOK_SECRET`

## Step 3: Local Setup

- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all variables from Supabase and Stripe (steps 1-2)
- [ ] Add JWT_SECRET: `JWT_SECRET=your-super-secret-key-12345` (change this!)
- [ ] Keep other values as default

## Step 4: Run Backend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

You should see:
```
Glow backend running on port 3000
Environment: development
```

## Step 5: Test It Works

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### Test 2: Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```
Should return user with `access_token`

### Test 3: Get Current License
```bash
# Replace TOKEN with the access_token from Test 2
curl -X GET http://localhost:3000/api/licenses/current \
  -H "Authorization: Bearer TOKEN"
```
Should return license with `max_group_size: 15`

## Step 6: Deploy (Later)

When ready to deploy:
- [ ] Push to GitHub
- [ ] Create account on Railway.app or Render.com
- [ ] Connect GitHub repo
- [ ] Add environment variables
- [ ] Deploy

## Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "Supabase connection failed"
- Check `SUPABASE_URL` and `SUPABASE_KEY` are correct
- Make sure project is initialized on Supabase dashboard

### "Stripe auth failed"
- Check `STRIPE_SECRET_KEY` starts with `sk_test_`
- Make sure you're using Secret Key, not Publishable Key

### "Port 3000 already in use"
```bash
# Use different port
PORT=3001 npm run dev
```

### Webhook not working
- Make sure URL is `http://localhost:3000/api/subscriptions/webhook`
- Stripe test webhooks: Go to Stripe Developers → Webhooks → Send test event

## What's Next?

1. **Build Mobile App** (React Native or Flutter)
   - Call these API endpoints from your app
   - Use location services to get latitude/longitude
   - Send location to backend on `/api/groups/:group_id/location`

2. **Add Real-time Updates** (Optional)
   - Use WebSocket or Supabase Realtime
   - Users see location updates instantly instead of polling

3. **Add Notifications** (Optional)
   - Use Firebase Cloud Messaging or OneSignal
   - Send 30-min warning before group expires

4. **Monitor & Scale**
   - Track API performance
   - Add logging/monitoring
   - Migrate to AWS when traffic grows

## Files Created

```
glow-backend/
├── server.js                    # Main Express app
├── package.json                 # Dependencies
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore file
├── README.md                    # Full documentation
├── SETUP_CHECKLIST.md          # This file
├── middleware/
│   └── auth.js                 # JWT & license middleware
├── routes/
│   ├── auth.js                 # Signup/login/profile
│   ├── licenses.js             # License checking
│   ├── subscriptions.js        # Stripe payments
│   └── groups.js               # Location groups
└── migrations/
    └── 001_initial_schema.sql  # Database schema
```

## Questions?

Check:
1. README.md for full API documentation
2. Server console for error messages
3. Supabase dashboard for database logs
4. Stripe dashboard for payment logs
