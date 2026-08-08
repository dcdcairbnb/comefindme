const express = require('express');
const { verifyToken, checkLicense } = require('../middleware/auth');

module.exports = (app) => {
  const router = express.Router();
  const supabase = app.locals.supabase;

  // Get current license
  router.get('/current', verifyToken, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', req.user.user_id)
        .eq('is_active', true)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }

      res.json({
        success: true,
        license: data
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Check feature access
  router.post('/check', verifyToken, async (req, res) => {
    try {
      const { feature } = req.body;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature required'
        });
      }

      const { data: license, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', req.user.user_id)
        .eq('is_active', true)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          error: 'License not found'
        });
      }

      // Check if expired
      if (license.expires_at && new Date(license.expires_at) < new Date()) {
        return res.json({
          success: true,
          has_access: false,
          reason: 'expired'
        });
      }

      // Check if feature is enabled
      const hasAccess = license.features_enabled.includes(feature);

      res.json({
        success: true,
        has_access: hasAccess,
        reason: hasAccess ? 'valid' : 'feature_not_enabled'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get user's licenses
  router.get('/user/:user_id', verifyToken, async (req, res) => {
    try {
      // Only allow users to view their own licenses
      if (req.user.user_id !== req.params.user_id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', req.params.user_id)
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        licenses: data
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  return router;
};
