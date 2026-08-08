import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { verifyTokenOnly } from '../../../lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenOnly(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const result = await sql`
      SELECT * FROM subscriptions
      WHERE user_id = ${auth.user.user_id} AND status = 'active'
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    const subscription = result.rows[0];
    const stripeSubId = subscription.metadata?.stripe_subscription_id;

    if (stripeSubId) {
      await stripe.subscriptions.cancel(stripeSubId);
    }

    await sql`
      UPDATE subscriptions SET status = 'cancelled'
      WHERE subscription_id = ${subscription.subscription_id}
    `;

    res.json({
      success: true,
      message: 'Subscription cancelled'
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
