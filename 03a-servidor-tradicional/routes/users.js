const express = require("express");
const database = require("../database/database");
const { authMiddleware } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar usuários
router.get("/", async (req, res) => {
  try {
    const users = await database.all("SELECT * FROM users");
    res.json({
      success: true,
      data: users.map((user) => new User(user).toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar usuários",
    });
  }
});

// Buscar usuário por ID
router.get("/:id", async (req, res) => {
  try {
    const user = await database.get("SELECT * FROM users WHERE id = ?", [
      req.params.id,
    ]);
    res.json({
      success: true,
      data: user ? new User(user).toJSON() : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erro ao buscar usuário",
    });
  }
});

// Trocar senha do usuário atual
router.put("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validação dos campos obrigatórios
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Senha atual e nova senha são obrigatórias",
      });
    }

    // Validação do tamanho da nova senha
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "A nova senha deve ter pelo menos 6 caracteres",
      });
    }

    // Buscar usuário atual com senha
    const userData = await database.get("SELECT * FROM users WHERE id = ?", [
      req.user.id,
    ]);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Verificar se a senha atual está correta
    const user = new User(userData);
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Senha atual incorreta",
      });
    }

    // Atualizar a senha
    user.password = newPassword;
    await user.hashPassword();

    await database.run("UPDATE users SET password = ? WHERE id = ?", [
      user.password,
      req.user.id,
    ]);

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

//apagar usuario por id
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // Validação do ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID do usuário é obrigatório",
      });
    }

    // Verificar se o usuário existe
    const existingUser = await database.get(
      "SELECT * FROM users WHERE id = ?",
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    // Verificar se o usuário está tentando deletar a si mesmo
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: "Não é possível deletar sua própria conta",
      });
    }

    // Verificar se o usuário atual é admin (opcional - você pode implementar role-based access)
    // Por enquanto, permitimos que qualquer usuário autenticado delete outros usuários

    // Deletar todas as tarefas do usuário primeiro (foreign key constraint)
    await database.run("DELETE FROM tasks WHERE userId = ?", [userId]);

    // Deletar o usuário
    const result = await database.run("DELETE FROM users WHERE id = ?", [
      userId,
    ]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
    }

    res.json({
      success: true,
      message: "Usuário deletado com sucesso",
      data: {
        deletedUserId: userId,
        deletedTasks: result.changes,
      },
    });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
    });
  }
});

module.exports = router;
