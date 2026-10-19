const jwt = require('jsonwebtoken');

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!value || value.length < 32)) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  return value || 'souqna-local-demo-secret-change-before-deploy';
};

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, secret(), { expiresIn: '12h', issuer: 'souqna-api' });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'يلزم تسجيل الدخول أولاً.' });
  try {
    req.auth = jwt.verify(token, secret(), { issuer: 'souqna-api' });
    next();
  } catch {
    return res.status(401).json({ error: 'انتهت الجلسة أو أن رمز الدخول غير صالح.' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ error: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.' });
    next();
  };
}

module.exports = { signToken, authenticate, allowRoles };
