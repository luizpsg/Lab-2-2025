module.exports = {
  // Configurações do servidor
  port: process.env.PORT || 3000,

  // JWT
  jwtSecret: process.env.JWT_SECRET || "seu-secret-aqui",
  jwtExpiration: "24h",
};
