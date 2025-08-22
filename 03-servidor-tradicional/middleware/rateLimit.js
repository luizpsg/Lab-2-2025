const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

// Rate limiter global para endpoints de autenticação
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: {
    success: false,
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for auth', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    });
  }
});

// Rate limiter por usuário para operações de tarefas
const userRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: (req) => {
    // Usuários premium podem ter mais requisições
    if (req.user?.role === 'premium') {
      return 100;
    }
    // Usuários normais: 30 requisições por minuto
    return 30;
  },
  keyGenerator: (req) => {
    // Chave baseada no ID do usuário, com fallback para IP usando helper
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    // Usar helper para IP quando não há usuário autenticado
    return `ip:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Muitas requisições. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('User rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em 1 minuto.'
    });
  }
});

// Rate limiter específico para criação de tarefas
const taskCreationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: (req) => {
    if (req.user?.role === 'premium') {
      return 20; // Usuários premium podem criar mais tarefas
    }
    return 5; // Usuários normais: 5 tarefas por minuto
  },
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Muitas criações de tarefas. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Task creation rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      message: 'Muitas criações de tarefas. Tente novamente em 1 minuto.'
    });
  }
});

// Rate limiter para operações de leitura (mais permissivo)
const readRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: (req) => {
    if (req.user?.role === 'premium') {
      return 200; // Usuários premium podem ler mais
    }
    return 100; // Usuários normais: 100 leituras por minuto
  },
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }
    return `ip:${req.ip}`;
  },
  message: {
    success: false,
    message: 'Muitas requisições de leitura. Tente novamente em 1 minuto.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Read rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    res.status(429).json({
      success: false,
      message: 'Muitas requisições de leitura. Tente novamente em 1 minuto.'
    });
  }
});

module.exports = {
  authRateLimit,
  userRateLimit,
  taskCreationRateLimit,
  readRateLimit
};
