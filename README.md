# Glow Backend

Location sharing app backend built with Next.js, Vercel, and Vercel Postgres.

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Vercel account (free tier works)
- Stripe account
- GitHub repo

### 2. Local Development

```bash
npm install
npm run dev
```

Server runs on http://localhost:3000

Add `.env.local` with:
```
POSTGRES_URLPGSQL=your_vercel_postgres_url
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ANNUAL=price_...
STRIPE_PRICE_MONTHLY=price_...
JWT_SECRET=your-super-secret-key
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

See `SETUP_VERCEL.md` for Vercel Postgres setup.

## Architecture

- **Next.js** - API routes in `/pages/api/`
- **Vercel Postgres** - Managed PostgreSQL database
- **Stripe** - Payment processing
- **JWT** - Authentication

## API Endpoints

Base URL: `https://your-domain.vercel.app/api`

### Authentication
- `POST /auth/signup` - Create account
- `POST /auth/login` - Login with credentials
- `GET /auth/me` - Get current user profile

### Licenses
- `GET /licenses/current` - Get active license
- `POST /licenses/check` - Verify feature access
- `GET /licenses/user/:user_id` - List all user licenses

### Subscriptions
- `POST /subscriptions/create` - Create Stripe checkout session
- `GET /subscriptions/user` - Get active subscription
- `POST /subscriptions/cancel` - Cancel subscription
- `POST /subscriptions/webhook` - Stripe webhook handler

### Groups
- `POST /groups/validate-capacity` - Check if group size allowed
- `POST /groups/create` - Create new location share group
- `GET /groups/:group_id` - Get group details with members
- `POST /groups/:group_id/join` - Join group with color
- `POST /groups/:group_id/leave` - Leave group
- `POST /groups/:group_id/location` - Update member location
- `POST /groups/:group_id/extend` - Extend group expiry time

## Example Requests

### Sign Up
```bash
curl -X POST https://your-domain.vercel.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "user123",
    "password": "secure_password"
  }'
```

Response:
```json
{
  "success": true,
  "user": { "user_id": "...", "email": "...", "username": "..." },
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Create Group
```bash
curl -X POST https://your-domain.vercel.app/api/groups/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "group_name": "Nashville Night",
    "share_duration_hours": 8
  }'
```

### Join Group
```bash
curl -X POST https://your-domain.vercel.app/api/groups/GROUP_ID/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "color": "#FF5733"
  }'
```

### Update Location
```bash
curl -X POST https://your-domain.vercel.app/api/groups/GROUP_ID/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 36.1627,
    "longitude": -86.7816
  }'
```

## Database Schema

**users** - User accounts and credentials
**licenses** - License tiers (free/premium) with expiry
**subscriptions** - Active Stripe subscriptions
**groups** - Location share groups with time limits
**group_members** - Group membership with colors and locations

See `migrations/001_initial_schema.sql` for full schema.

## Features

- Freemium model: Free tier (15 people/group) → Premium (unlimited, $9.99/year)
- Time-limited location sharing (4, 8, 12, 24 hours or custom up to 7 days)
- Color customization for map display
- Auto-expiry with extension support
- JWT authentication
- Stripe payment processing
- Vercel serverless scaling

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables (see SETUP_VERCEL.md)
4. Vercel auto-deploys on push

Production builds:
```bash
npm run build
npm start
```

## Security

- JWT tokens expire in 30 days
- Password hashing with bcryptjs
- Stripe webhook signature verification
- Environment variables for all secrets
- CORS handled by Vercel

Never commit `.env.local` or `.env` files.

## Next Steps

1. Build iOS app (React Native or Flutter) that consumes these endpoints
2. Integrate location services
3. Add push notifications
4. Monitor Vercel logs for performance

## Support

- Check Vercel logs: Dashboard → Deployments → Logs
- Stripe dashboard for payment issues
- Database queries in Vercel Storage dashboard

## License

MIT
