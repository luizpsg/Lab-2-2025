const NodeCache = require('node-cache');
const { logger } = require('../config/logger');

// Cache em memória com TTL de 5 minutos por padrão
const cache = new NodeCache({
  stdTTL: 300, // 5 minutos
  checkperiod: 60, // Verificar expiração a cada minuto
  useClones: false // Para melhor performance
});

// Middleware de cache para GET requests
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Apenas para GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Criar chave única baseada na URL e parâmetros
    const cacheKey = `cache:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

    // Tentar obter do cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.info('Cache hit', { key: cacheKey, userId: req.user?.id });
      return res.json(cachedData);
    }

    // Interceptar a resposta para armazenar no cache
    const originalJson = res.json;
    res.json = function (data) {
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttl);
        logger.info('Cache miss - stored', { key: cacheKey, ttl, userId: req.user?.id });
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// Função para invalidar cache específico
const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));

  if (matchingKeys.length > 0) {
    cache.del(matchingKeys);
    logger.info('Cache invalidated', { pattern, keys: matchingKeys });
  }
};

// Função para limpar todo o cache
const clearCache = () => {
  cache.flushAll();
  logger.info('Cache cleared completely');
};

// Função para obter estatísticas do cache
const getCacheStats = () => {
  return cache.getStats();
};

module.exports = {
  cache,
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats
};
