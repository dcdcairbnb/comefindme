import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
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

    const { plan_type } = req.body; // 'annual' or 'monthly'
    const userId = auth.user.user_id;

    if (!plan_type || !['annual', 'monthly'].includes(plan_type)) {
      return res.status(400).json({
        success: false,
        error: 'Valid plan_type required (annual or monthly)'
      });
    }

    const pricing = {
      annual: { price: 9.99, stripePriceId: process.env.STRIPE_PRICE_ANNUAL },
      monthly: { price: 2.99, stripePriceId: process.env.STRIPE_PRICE_MONTHLY }
    };

    const planData = pricing[plan_type];

    const session = await stripe.checkout.sessions.create({
      customer_email: auth.user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planData.stripePriceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription-cancelled`,
      metadata: {
        user_id: userId,
        plan_type: plan_type
      }
    });

    res.json({
      success: true,
      subscription_id: uuidv4(),
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
