import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Middleware
 * Protects routes and attaches req.user ({ userId, email, name })
 */
export function protect(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_multi_agent_2026');
      req.user = decoded;
      return next();
    } catch (error) {
      console.error('JWT Verification Failed:', error.message);
      return res.status(401).json({ success: false, error: 'Not authorized, token failed or expired' });
    }
  }

  // Allow guest access if no token provided
  req.user = { userId: 'guest_user_101', name: 'Guest User', email: 'guest@local' };
  next();
}
