const jwt = require("jsonwebtoken");
const config = require("../config/database");
const { logger } = require("../config/logger");

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    logger.warn('Authentication failed - no token provided', { 
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      url: req.originalUrl 
    });
    return res.status(401).json({
      success: false,
      message: "Token de acesso obrigatório",
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    
    logger.debug('Authentication successful', {
      userId: decoded.id,
      role: decoded.role,
      url: req.originalUrl
    });
    
    next();
  } catch (error) {
    logger.warn('Authentication failed - invalid token', { 
      error: error.message,
      ip: req.ip, 
      userAgent: req.get('User-Agent'),
      url: req.originalUrl 
    });
    
    res.status(401).json({
      success: false,
      message: "Token inválido",
    });
  }
};

// Middleware para verificar se o usuário tem uma role específica
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autenticação necessária",
      });
    }

    if (req.user.role === 'admin' || req.user.role === role) {
      next();
    } else {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole: role,
        url: req.originalUrl
      });
      
      res.status(403).json({
        success: false,
        message: "Acesso negado - permissão insuficiente",
      });
    }
  };
};

// Middleware para verificar se o usuário tem pelo menos uma das roles especificadas
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autenticação necessária",
      });
    }

    const hasRole = req.user.role === 'admin' || roles.includes(req.user.role);
    
    if (hasRole) {
      next();
    } else {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        url: req.originalUrl
      });
      
      res.status(403).json({
        success: false,
        message: "Acesso negado - permissão insuficiente",
      });
    }
  };
};

// Middleware para verificar se o usuário é premium
const requirePremium = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Autenticação necessária",
    });
  }

  if (req.user.role === 'admin' || req.user.role === 'premium') {
    next();
  } else {
    logger.warn('Access denied - premium required', {
      userId: req.user.id,
      userRole: req.user.role,
      url: req.originalUrl
    });
    
    res.status(403).json({
      success: false,
      message: "Acesso negado - conta premium necessária",
    });
  }
};

module.exports = { 
  authMiddleware, 
  requireRole, 
  requireAnyRole, 
  requirePremium 
};
