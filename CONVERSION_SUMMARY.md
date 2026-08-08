# Glow Backend - Conversion Summary

Your backend has been converted from Express/Supabase to **Next.js/Vercel Postgres**.

## What Changed

### Technology Stack
- **Before**: Express.js + Supabase PostgreSQL
- **After**: Next.js (API routes) + Vercel Postgres + Vercel hosting

### File Structure

New structure:
```
glow-backend/
├── pages/
│   └── api/
│       ├── health.js
│       ├── auth/
│       │   ├── signup.js
│       │   ├── login.js
│       │   └── me.js
│       ├── licenses/
│       │   ├── current.js
│       │   ├── check.js
│       │   └── user/[user_id].js
│       ├── groups/
│       │   ├── create.js
│       │   ├── validate-capacity.js
│       │   ├── [group_id].js
│       │   ├── [group_id]/
│       │   │   ├── join.js
│       │   │   ├── leave.js
│       │   │   ├── location.js
│       │   │   └── extend.js
│       └── subscriptions/
│           ├── create.js
│           ├── user.js
│           ├── cancel.js
│           └── webhook.js
├── lib/
│   ├── db.js (Vercel Postgres utilities)
│   └── auth.js (JWT & license helpers)
├── migrations/
│   └── 001_initial_schema.sql (same as before)
├── package.json (updated for Next.js)
├── next.config.js
├── vercel.json (Vercel config)
├── .env.example (updated)
├── README.md (updated)
├── SETUP_VERCEL.md (new)
└── VERCEL_DEPLOYMENT_CHECKLIST.md (new)
```

### What's the Same

- All API endpoints work identically
- Database schema is unchanged
- Authentication logic unchanged
- Stripe integration unchanged
- All business logic unchanged

### Why This is Better

1. **Easier deployment**: One command `git push` to Vercel
2. **No server management**: Vercel handles scaling and uptime
3. **Integrated database**: Vercel Postgres in same dashboard
4. **Free tier**: Plenty for MVP
5. **Automatic SSL**: HTTPS out of the box
6. **Environment variables**: Built-in secret management
7. **Analytics**: Vercel provides request logs and performance metrics

## Migration Path

### Step 1: Local Testing (Optional)
```bash
cd glow-backend
npm install
# Create .env.local with POSTGRES_URLPGSQL pointing to Vercel Postgres
npm run dev
```

### Step 2: Deploy to Vercel
1. Push to GitHub: `git push origin main`
2. Follow `VERCEL_DEPLOYMENT_CHECKLIST.md`
3. Your API is live in ~2 minutes

## API Endpoints (No Changes)

All endpoints work the same:
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/groups/create`
- `GET /api/groups/:group_id`
- ...etc (see README.md)

Only difference: base URL is now `https://your-vercel-domain.vercel.app/api` instead of `http://localhost:3000/api`

## Database

Same schema, but now hosted on Vercel Postgres instead of Supabase:
- Same tables (users, licenses, subscriptions, groups, group_members)
- Same migrations
- Query interface in Vercel dashboard instead of Supabase

## Environment Variables

### Before (Supabase)
```
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### After (Vercel Postgres)
```
POSTGRES_URLPGSQL=...
```

All other variables stay the same.

## Old Files

These Express/Supabase files are still in the repo but not used:
- server.js
- middleware/auth.js
- routes/*
- .env (old, delete it)

You can delete them or keep for reference. Next.js ignores them.

## Next: iOS App

Your iOS app calls the exact same API endpoints. Just update the base URL from Supabase/localhost to your Vercel domain:

```swift
// Before
let baseURL = "http://localhost:3000"

// After
let baseURL = "https://your-app.vercel.app"
```

## Support

- Vercel logs: Dashboard → Deployments → Logs
- Database queries: Vercel Storage → Select DB → Query
- Stripe logs: Stripe Dashboard → Logs
- Production database: Vercel Storage → Query tab

## Questions?

See:
- `README.md` - API reference
- `SETUP_VERCEL.md` - Step-by-step setup
- `VERCEL_DEPLOYMENT_CHECKLIST.md` - Deployment checklist

Ready to deploy! 🚀
