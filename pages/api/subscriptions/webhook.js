import Stripe from 'stripe';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: {
      raw: true,
    },
  },
};

export default async function handler(req, res) {
  const startTime = Date.now();

  if (req.method !== 'POST') {
    console.warn(`[WEBHOOK] Invalid method: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      console.warn('[WEBHOOK] Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const body = req.body instanceof Buffer ? req.body.toString('utf-8') : req.body;

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`[WEBHOOK] Event received: ${event.type} (ID: ${event.id})`);

    if (event.type === 'customer.subscription.created') {
      console.log(`[WEBHOOK] Processing subscription creation: ${event.data.object.id}`);
      await handleSubscriptionCreated(event.data.object);
    } else if (event.type === 'customer.subscription.deleted') {
      console.log(`[WEBHOOK] Processing subscription deletion: ${event.data.object.id}`);
      await handleSubscriptionDeleted(event.data.object);
    } else {
      console.log(`[WEBHOOK] Event type not handled: ${event.type}`);
    }

    const duration = Date.now() - startTime;
    console.log(`[WEBHOOK] Successfully processed in ${duration}ms`);
    res.status(200).json({ received: true });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[WEBHOOK] Error after ${duration}ms: ${err.message}`, err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.warn(`[SUBSCRIPTION_CREATED] No user_id in metadata for ${subscription.id}`);
    return;
  }

  try {
    const renewalDate = new Date(subscription.current_period_end * 1000);
    const planName = subscription.plan?.nickname || subscription.items?.data?.[0]?.plan?.nickname || 'premium';

    console.log(`[SUBSCRIPTION_CREATED] User: ${userId}, Plan: ${planName}, Renewal: ${renewalDate.toISOString()}`);

    await sql`
      INSERT INTO subscriptions (user_id, plan_type, status, metadata, created_at, updated_at)
      SELECT
        ${userId},
        ${planName},
        ${'active'},
        jsonb_build_object('stripe_subscription_id', ${subscription.id}),
        NOW(),
        NOW()
      WHERE EXISTS (SELECT 1 FROM users WHERE user_id = ${userId})
      ON CONFLICT DO NOTHING
    `;
    console.log(`[SUBSCRIPTION_CREATED] Inserted subscription record for ${userId}`);

    await sql`
      UPDATE licenses
      SET license_type = 'premium',
          expires_at = ${renewalDate.toISOString()},
          max_group_size = 999999,
          is_active = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    console.log(`[SUBSCRIPTION_CREATED] Updated license for ${userId} to premium tier`);
  } catch (err) {
    console.error(`[SUBSCRIPTION_CREATED] Error for user ${userId}:`, err.message, err);
    throw err;
  }
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.user_id;

  try {
    console.log(`[SUBSCRIPTION_DELETED] User: ${userId}, Subscription: ${subscription.id}`);

    await sql`
      UPDATE subscriptions
      SET status = 'cancelled',
          updated_at = NOW(),
          metadata = jsonb_set(metadata, '{stripe_subscription_id}', ${JSON.stringify(subscription.id)})
      WHERE metadata->>'stripe_subscription_id' = ${subscription.id}
    `;
    console.log(`[SUBSCRIPTION_DELETED] Marked subscription as cancelled for ${userId}`);

    await sql`
      UPDATE licenses
      SET license_type = 'free',
          expires_at = NOW(),
          max_group_size = 15,
          is_active = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    console.log(`[SUBSCRIPTION_DELETED] Downgraded license to free tier for ${userId}`);
  } catch (err) {
    console.error(`[SUBSCRIPTION_DELETED] Error for user ${userId}:`, err.message, err);
    throw err;
  }
}
