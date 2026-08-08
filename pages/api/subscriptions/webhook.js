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
    const body = req.body instanceof Buffer ? req.body.toString('utf-8') : req.body;

    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;

      const subResult = await sql`
        SELECT * FROM subscriptions
        WHERE metadata->>'stripe_subscription_id' = ${subscription.id}
      `;

      if (subResult.rows.length > 0) {
        const subData = subResult.rows[0];

        await sql`
          UPDATE subscriptions
          SET status = ${subscription.status === 'active' ? 'active' : 'cancelled'},
              metadata = jsonb_set(metadata, '{stripe_subscription_id}', ${'\"' + subscription.id + '\"'})
          WHERE subscription_id = ${subData.subscription_id}
        `;

        if (subscription.status === 'active') {
          const renewalDate = new Date(subscription.current_period_end * 1000);
          await sql`
            UPDATE licenses
            SET license_type = 'premium', expires_at = ${renewalDate.toISOString()}, max_group_size = 999999
            WHERE user_id = ${userId}
          `;
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
}
