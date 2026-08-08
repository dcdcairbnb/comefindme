import jwt from 'jsonwebtoken';
import { getLicense } from './db';

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

export function generateToken(userId, email) {
  return jwt.sign(
    { user_id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function checkLicenseMiddleware(userId) {
  const license = await getLicense(userId);
  if (!license) {
    return null;
  }
  return license;
}

export async function verifyTokenAndLicense(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid token', status: 401 };
  }

  const license = await checkLicenseMiddleware(decoded.user_id);
  if (!license) {
    return { error: 'No active license', status: 403 };
  }

  return { user: decoded, license, error: null };
}

export async function verifyTokenOnly(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid token', status: 401 };
  }

  return { user: decoded, error: null };
}
