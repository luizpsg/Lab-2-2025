class Task {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description || "";
    this.completed = data.completed || false;
    this.priority = data.priority || "medium";
    this.userId = data.userId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // Novos campos
    this.category = data.category || "geral";
    this.tags = data.tags || [];
    this.dueDate = data.dueDate || null;
    this.estimatedTime = data.estimatedTime || null; // em minutos
    this.actualTime = data.actualTime || null; // em minutos
    this.notes = data.notes || "";
  }

  validate() {
    const errors = [];

    if (!this.title?.trim()) {
      errors.push("Título é obrigatório");
    }

    if (this.title && this.title.length > 100) {
      errors.push("Título deve ter no máximo 100 caracteres");
    }

    if (!this.userId) {
      errors.push("Usuário é obrigatório");
    }

    if (this.priority && !["low", "medium", "high", "urgent"].includes(this.priority)) {
      errors.push("Prioridade deve ser: low, medium, high ou urgent");
    }

    if (this.category && this.category.length > 50) {
      errors.push("Categoria deve ter no máximo 50 caracteres");
    }

    if (this.tags && !Array.isArray(this.tags)) {
      errors.push("Tags devem ser um array");
    }

    if (this.tags && this.tags.length > 10) {
      errors.push("Máximo de 10 tags permitidas");
    }

    if (this.tags && this.tags.some(tag => tag.length > 20)) {
      errors.push("Cada tag deve ter no máximo 20 caracteres");
    }

    if (this.dueDate && isNaN(new Date(this.dueDate).getTime())) {
      errors.push("Data de vencimento inválida");
    }

    if (this.estimatedTime && (this.estimatedTime < 0 || this.estimatedTime > 1440)) {
      errors.push("Tempo estimado deve estar entre 0 e 1440 minutos (24h)");
    }

    if (this.actualTime && (this.actualTime < 0 || this.actualTime > 1440)) {
      errors.push("Tempo real deve estar entre 0 e 1440 minutos (24h)");
    }

    return { isValid: errors.length === 0, errors };
  }

  toJSON() {
    return { ...this };
  }

  // Método para verificar se a tarefa está atrasada
  isOverdue() {
    if (!this.dueDate || this.completed) return false;
    return new Date(this.dueDate) < new Date();
  }

  // Método para calcular o tempo restante
  getTimeRemaining() {
    if (!this.dueDate) return null;
    const now = new Date();
    const due = new Date(this.dueDate);
    return Math.max(0, due - now);
  }

  // Método para obter o status baseado na data de vencimento
  getStatus() {
    if (this.completed) return "completed";
    if (this.isOverdue()) return "overdue";
    if (this.dueDate) return "pending";
    return "no-due-date";
  }
}

module.exports = Task;
