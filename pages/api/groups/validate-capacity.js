import { verifyTokenAndLicense } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenAndLicense(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { desired_members } = req.body;

    if (!desired_members || desired_members < 1) {
      return res.status(400).json({
        success: false,
        error: 'Valid desired_members required'
      });
    }

    const maxCapacity = auth.license.max_group_size;
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
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
