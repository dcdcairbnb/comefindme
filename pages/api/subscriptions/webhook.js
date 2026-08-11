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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const body = req.body instanceof Buffer ? req.body.toString('utf-8') : req.body;

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`Webhook received: ${event.type}`);

    if (event.type === 'customer.subscription.created') {
      await handleSubscriptionCreated(event.data.object);
    } else if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(event.data.object);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}

async function handleSubscriptionCreated(subscription) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.warn('Subscription created without user_id metadata:', subscription.id);
    return;
  }

  try {
    const renewalDate = new Date(subscription.current_period_end * 1000);

    await sql`
      INSERT INTO subscriptions (user_id, plan_type, status, metadata, created_at, updated_at)
      SELECT
        ${userId},
        ${subscription.plan?.nickname || subscription.items?.data?.[0]?.plan?.nickname || 'premium'},
        ${'active'},
        jsonb_build_object('stripe_subscription_id', ${subscription.id}),
        NOW(),
        NOW()
      WHERE EXISTS (SELECT 1 FROM users WHERE user_id = ${userId})
      ON CONFLICT DO NOTHING
    `;

    await sql`
      UPDATE licenses
      SET license_type = 'premium',
          expires_at = ${renewalDate.toISOString()},
          max_group_size = 999999,
          is_active = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    console.log(`Subscription created for user ${userId}:`, subscription.id);
  } catch (err) {
    console.error('Error handling subscription.created:', err);
    throw err;
  }
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.user_id;

  try {
    await sql`
      UPDATE subscriptions
      SET status = 'cancelled',
          updated_at = NOW(),
          metadata = jsonb_set(metadata, '{stripe_subscription_id}', ${JSON.stringify(subscription.id)})
      WHERE metadata->>'stripe_subscription_id' = ${subscription.id}
    `;

    await sql`
      UPDATE licenses
      SET license_type = 'free',
          expires_at = NOW(),
          max_group_size = 15,
          is_active = true,
          updated_at = NOW()
      WHERE user_id = ${userId}
    `;

    console.log(`Subscription deleted for user ${userId}:`, subscription.id);
  } catch (err) {
    console.error('Error handling subscription.deleted:', err);
    throw err;
  }
}
