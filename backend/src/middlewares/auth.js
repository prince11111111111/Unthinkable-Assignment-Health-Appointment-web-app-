import jwt from 'jsonwebtoken';

export const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient role' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};
