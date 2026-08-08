const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Middleware to check license
const checkLicense = async (req, res, next) => {
  try {
    const supabase = req.app.locals.supabase;
    const userId = req.user.user_id;

    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error) {
      return res.status(403).json({
        success: false,
        error: 'License not found'
      });
    }

    // Check if license expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(403).json({
        success: false,
        error: 'License expired'
      });
    }

    req.license = data;
    next();
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = {
  verifyToken,
  checkLicense
};
