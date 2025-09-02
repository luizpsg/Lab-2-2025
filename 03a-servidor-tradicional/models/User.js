const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/database");

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.username = data.username;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role || "user";
    this.createdAt = data.createdAt;
  }

  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 12);
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  generateToken() {
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        username: this.username,
        role: this.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration }
    );
  }

  // Verificar se o usuário tem uma determinada role
  hasRole(role) {
    if (this.role === 'admin') return true; // Admin tem acesso a tudo
    return this.role === role;
  }

  // Verificar se o usuário tem pelo menos uma das roles especificadas
  hasAnyRole(roles) {
    if (this.role === 'admin') return true;
    return Array.isArray(roles) ? roles.includes(this.role) : roles === this.role;
  }

  // Verificar se o usuário é premium
  isPremium() {
    return this.role === 'premium' || this.role === 'admin';
  }

  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}

module.exports = User;
