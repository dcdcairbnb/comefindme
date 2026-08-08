const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');

module.exports = (app) => {
  const router = express.Router();
  const supabase = app.locals.supabase;

  // Sign up
  router.post('/signup', async (req, res) => {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email, username, and password required'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);
      const user_id = uuidv4();

      // Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            user_id,
            email,
            username,
            password_hash
          }
        ])
        .select()
        .single();

      if (userError) {
        return res.status(400).json({
          success: false,
          error: userError.message
        });
      }

      // Create free license
      const license_id = uuidv4();
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .insert([
          {
            license_id,
            user_id,
            license_type: 'free',
            tier_name: 'Free',
            max_group_size: 15,
            expires_at: null,
            is_active: true
          }
        ])
        .select()
        .single();

      if (licenseError) {
        return res.status(400).json({
          success: false,
          error: licenseError.message
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { user_id, email, username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        user_id,
        email,
        username,
        license_id,
        access_token: token
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password required'
        });
      }

      // Get user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('deleted_at', null)
        .single();

      if (userError || !userData) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, userData.password_hash);

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }

      // Get license
      const { data: licenseData } = await supabase
        .from('licenses')
        .select('license_id, license_type, max_group_size, expires_at')
        .eq('user_id', userData.user_id)
        .eq('is_active', true)
        .single();

      // Generate JWT
      const token = jwt.sign(
        { user_id: userData.user_id, email: userData.email, username: userData.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        user_id: userData.user_id,
        email: userData.email,
        username: userData.username,
        license_id: licenseData?.license_id,
        access_token: token
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get current user
  router.get('/me', verifyToken, async (req, res) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('user_id, email, username, created_at')
        .eq('user_id', req.user.user_id)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        user: userData
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
