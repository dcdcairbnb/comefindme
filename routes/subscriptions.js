const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

module.exports = (app) => {
  const router = express.Router();
  const supabase = app.locals.supabase;
  const stripe = app.locals.stripe;

  // Create subscription checkout
  router.post('/create', verifyToken, async (req, res) => {
    try {
      const { plan_type } = req.body; // 'annual' or 'monthly'
      const userId = req.user.user_id;

      if (!plan_type || !['annual', 'monthly'].includes(plan_type)) {
        return res.status(400).json({
          success: false,
          error: 'Valid plan_type required (annual or monthly)'
        });
      }

      // Pricing
      const pricing = {
        annual: { price: 9.99, stripePriceId: process.env.STRIPE_PRICE_ANNUAL },
        monthly: { price: 2.99, stripePriceId: process.env.STRIPE_PRICE_MONTHLY }
      };

      const planData = pricing[plan_type];

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        customer_email: req.user.email,
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
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get user's subscription
  router.get('/user', verifyToken, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', req.user.user_id)
        .eq('status', 'active')
        .single();

      if (error) {
        return res.json({
          success: true,
          subscription: null
        });
      }

      res.json({
        success: true,
        subscription: data
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Cancel subscription
  router.post('/cancel', verifyToken, async (req, res) => {
    try {
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', req.user.user_id)
        .eq('status', 'active')
        .single();

      if (subError) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Cancel in Stripe
      const stripeSubId = subscription.metadata?.stripe_subscription_id;
      if (stripeSubId) {
        await stripe.subscriptions.cancel(stripeSubId);
      }

      // Update in database
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('subscription_id', subscription.subscription_id);

      if (updateError) {
        return res.status(400).json({
          success: false,
          error: updateError.message
        });
      }

      res.json({
        success: true,
        message: 'Subscription cancelled'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Stripe webhook handler (call this from your webhook endpoint)
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        const userId = subscription.metadata?.user_id;

        // Update subscription in database
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('metadata', `{"stripe_subscription_id": "${subscription.id}"}`)
          .single();

        if (subData) {
          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status === 'active' ? 'active' : 'cancelled',
              metadata: { ...subData.metadata, stripe_subscription_id: subscription.id }
            })
            .eq('subscription_id', subData.subscription_id);

          // Update license
          if (subscription.status === 'active') {
            const renewalDate = new Date(subscription.current_period_end * 1000);
            await supabase
              .from('licenses')
              .update({
                license_type: 'premium',
                expires_at: renewalDate,
                max_group_size: 999999 // unlimited
              })
              .eq('user_id', userId);
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message
      });
    }
  });

  return router;
};
