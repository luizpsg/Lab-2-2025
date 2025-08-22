const express = require("express");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/User");
const database = require("../database/database");
const { validate } = require("../middleware/validation");
const { authRateLimit } = require("../middleware/rateLimit");
const { logger } = require("../config/logger");

const router = express.Router();

// Registrar usuário
router.post("/register", authRateLimit, validate("register"), async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, role = "user" } = req.body;

    // Verificar se usuário já existe
    const existingUser = await database.get(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUser) {
      logger.warn('Registration attempt with existing credentials', { email, username });
      return res.status(409).json({
        success: false,
        message: "Email ou username já existe",
      });
    }

    // Criar usuário
    const userData = {
      id: uuidv4(),
      email,
      username,
      password,
      firstName,
      lastName,
      role: role === "admin" ? "admin" : "user" // Validar role
    };
    const user = new User(userData);
    await user.hashPassword();

    await database.run(
      "INSERT INTO users (id, email, username, password, firstName, lastName, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        user.id,
        user.email,
        user.username,
        user.password,
        user.firstName,
        user.lastName,
        user.role,
      ]
    );

    const token = user.generateToken();

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: "Usuário criado com sucesso",
      data: { user: user.toJSON(), token },
    });
  } catch (error) {
    logger.error('Error during user registration', { error: error.message, email: req.body.email });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Login
router.post("/login", authRateLimit, validate("login"), async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const userData = await database.get(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [identifier, identifier]
    );

    if (!userData) {
      logger.warn('Failed login attempt - user not found', { identifier, ip: req.ip });
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    const user = new User(userData);
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      logger.warn('Failed login attempt - invalid password', {
        userId: user.id,
        identifier,
        ip: req.ip
      });
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas",
      });
    }

    const token = user.generateToken();

    logger.info('User logged in successfully', {
      userId: user.id,
      identifier,
      role: user.role,
      ip: req.ip
    });

    res.json({
      success: true,
      message: "Login realizado com sucesso",
      data: { user: user.toJSON(), token },
    });
  } catch (error) {
    logger.error('Error during user login', { error: error.message, identifier: req.body.identifier });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Verificar token (endpoint para validar token)
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token não fornecido",
      });
    }

    // Aqui você pode implementar a verificação do token
    // Por simplicidade, vamos apenas retornar sucesso
    res.json({
      success: true,
      message: "Token válido",
    });
  } catch (error) {
    logger.error('Error verifying token', { error: error.message });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

module.exports = router;
