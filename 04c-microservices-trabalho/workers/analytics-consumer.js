// workers/analytics-consumer.js
const messaging = require("../shared/rabbitmq");

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

async function startAnalyticsConsumer() {
  console.log("📊 Analytics consumer iniciado...");

  await messaging.consume(
    process.env.RABBITMQ_ANALYTICS_QUEUE || "analytics_queue",
    "list.checkout.#",
    async (message) => {
      const total = message.summary?.estimatedTotal || 0;
      console.log(
        `📈 Atualizando dashboard -> Lista ${message.listId} (${
          message.items.length
        } itens) total: ${formatCurrency(total)}`
      );
    }
  );
}

startAnalyticsConsumer().catch((error) => {
  console.error("Erro no analytics consumer:", error);
  process.exit(1);
});
