const express = require('express');
const { verifyToken, checkLicense } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

module.exports = (app) => {
  const router = express.Router();
  const supabase = app.locals.supabase;

  // Validate group capacity
  router.post('/validate-capacity', verifyToken, checkLicense, async (req, res) => {
    try {
      const { desired_members } = req.body;

      if (!desired_members || desired_members < 1) {
        return res.status(400).json({
          success: false,
          error: 'Valid desired_members required'
        });
      }

      const maxCapacity = req.license.max_group_size;
      const allowed = desired_members <= maxCapacity;

      res.json({
        success: true,
        allowed,
        max: maxCapacity,
        requested: desired_members,
        message: allowed
          ? `Group of ${desired_members} allowed`
          : `Upgrade to premium for unlimited groups`
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Create group
  router.post('/create', verifyToken, checkLicense, async (req, res) => {
    try {
      const { group_name, share_duration_hours } = req.body;
      const userId = req.user.user_id;

      if (!share_duration_hours || share_duration_hours < 1) {
        return res.status(400).json({
          success: false,
          error: 'Valid share_duration_hours required'
        });
      }

      // Max 7 days (168 hours)
      if (share_duration_hours > 168) {
        return res.status(400).json({
          success: false,
          error: 'Maximum share duration is 7 days (168 hours)'
        });
      }

      const groupId = uuidv4();
      const expiresAt = new Date(Date.now() + share_duration_hours * 60 * 60 * 1000);

      // Create group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert([
          {
            group_id: groupId,
            creator_user_id: userId,
            group_name: group_name || `Group ${new Date().toLocaleString()}`,
            member_count: 1,
            max_capacity: req.license.max_group_size,
            created_at: new Date(),
            expires_at: expiresAt,
            is_active: true
          }
        ])
        .select()
        .single();

      if (groupError) {
        return res.status(400).json({
          success: false,
          error: groupError.message
        });
      }

      // Add creator as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_member_id: uuidv4(),
            group_id: groupId,
            user_id: userId,
            color: '#FF5733',
            is_active: true
          }
        ]);

      if (memberError) {
        return res.status(400).json({
          success: false,
          error: memberError.message
        });
      }

      res.json({
        success: true,
        group: groupData
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Get group details
  router.get('/:group_id', verifyToken, async (req, res) => {
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('group_id', req.params.group_id)
        .eq('is_active', true)
        .single();

      if (groupError) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      // Get members
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, color, latitude, longitude, last_location_update, is_active')
        .eq('group_id', req.params.group_id)
        .eq('is_active', true);

      if (membersError) {
        return res.status(400).json({
          success: false,
          error: membersError.message
        });
      }

      res.json({
        success: true,
        group: {
          ...group,
          members
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Join group
  router.post('/:group_id/join', verifyToken, async (req, res) => {
    try {
      const { color } = req.body;
      const groupId = req.params.group_id;
      const userId = req.user.user_id;

      if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
        return res.status(400).json({
          success: false,
          error: 'Valid hex color required (e.g. #FF5733)'
        });
      }

      // Check group exists and is active
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_active', true)
        .single();

      if (groupError || !group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found or expired'
        });
      }

      // Check capacity
      if (group.member_count >= group.max_capacity) {
        return res.status(400).json({
          success: false,
          error: 'Group is at max capacity'
        });
      }

      // Add member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert([
          {
            group_member_id: uuidv4(),
            group_id: groupId,
            user_id: userId,
            color,
            is_active: true
          }
        ]);

      if (memberError) {
        return res.status(400).json({
          success: false,
          error: memberError.message
        });
      }

      // Update member count
      await supabase
        .from('groups')
        .update({ member_count: group.member_count + 1 })
        .eq('group_id', groupId);

      res.json({
        success: true,
        message: 'Joined group'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Leave group
  router.post('/:group_id/leave', verifyToken, async (req, res) => {
    try {
      const groupId = req.params.group_id;
      const userId = req.user.user_id;

      // Remove member
      const { error } = await supabase
        .from('group_members')
        .update({ is_active: false })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      // Update member count
      const { data: group } = await supabase
        .from('groups')
        .select('member_count')
        .eq('group_id', groupId)
        .single();

      await supabase
        .from('groups')
        .update({ member_count: Math.max(0, (group?.member_count || 1) - 1) })
        .eq('group_id', groupId);

      res.json({
        success: true,
        message: 'Left group'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Update location
  router.post('/:group_id/location', verifyToken, async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      const groupId = req.params.group_id;
      const userId = req.user.user_id;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude required'
        });
      }

      // Update location
      const { error } = await supabase
        .from('group_members')
        .update({
          latitude,
          longitude,
          last_location_update: new Date()
        })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      res.json({
        success: true,
        message: 'Location updated'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // Extend group time
  router.post('/:group_id/extend', verifyToken, async (req, res) => {
    try {
      const { hours } = req.body;
      const groupId = req.params.group_id;

      if (!hours || hours < 1 || hours > 168) {
        return res.status(400).json({
          success: false,
          error: 'Hours must be between 1 and 168'
        });
      }

      const { data: group } = await supabase
        .from('groups')
        .select('expires_at, created_at')
        .eq('group_id', groupId)
        .single();

      // Check max 7 days total
      const maxExpiry = new Date(new Date(group.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
      const newExpiry = new Date(Date.now() + hours * 60 * 60 * 1000);

      if (newExpiry > maxExpiry) {
        return res.status(400).json({
          success: false,
          error: 'Cannot extend beyond 7 days from group creation'
        });
      }

      // Notify all members
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          expires_at: newExpiry
        })
        .eq('group_id', groupId);

      if (updateError) {
        return res.status(400).json({
          success: false,
          error: updateError.message
        });
      }

      res.json({
        success: true,
        message: `Group extended for ${hours} hours`,
        new_expiry: newExpiry
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
