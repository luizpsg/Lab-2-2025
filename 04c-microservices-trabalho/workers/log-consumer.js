// workers/log-consumer.js
const messaging = require("../shared/rabbitmq");

async function startLogConsumer() {
  console.log("🚀 Log/Notification consumer iniciado...");

  await messaging.consume(
    process.env.RABBITMQ_LOG_QUEUE || "log_notification_queue",
    "list.checkout.#",
    async (message) => {
      console.log(
        `📧 Enviando comprovante da lista ${message.listId} para o usuário ${message.userEmail}`
      );
    }
  );
}

startLogConsumer().catch((error) => {
  console.error("Erro no log consumer:", error);
  process.exit(1);
});
