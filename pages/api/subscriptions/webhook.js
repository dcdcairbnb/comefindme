
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
