// shared/rabbitmq.js
const amqp = require("amqplib");

class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = process.env.RABBITMQ_EXCHANGE || "shopping_events";
    this.url = process.env.RABBITMQ_URL || "amqp://localhost";
  }

  async getChannel() {
    if (this.channel) {
      return this.channel;
    }

    if (!this.connection) {
      this.connection = await amqp.connect(this.url);
      this.connection.on("error", (err) => {
        console.error("RabbitMQ connection error:", err.message);
        this.connection = null;
        this.channel = null;
      });

      this.connection.on("close", () => {
        console.warn("RabbitMQ connection closed.");
        this.connection = null;
        this.channel = null;
      });
    }

    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange(this.exchange, "topic", {
      durable: true,
    });
    return this.channel;
  }

  async publish(routingKey, payload) {
    const channel = await this.getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(payload));

    channel.publish(this.exchange, routingKey, messageBuffer, {
      contentType: "application/json",
      persistent: true,
    });

    console.log(
      `📤 Evento publicado (${routingKey}) ->`,
      JSON.stringify(payload)
    );
  }

  async consume(queue, bindingKey, handler) {
    const channel = await this.getChannel();

    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, this.exchange, bindingKey);

    console.log(`📥 Consumindo fila "${queue}" (binding: ${bindingKey})`);

    channel.consume(
      queue,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content, msg.fields.routingKey);
          channel.ack(msg);
        } catch (error) {
          console.error("Erro ao processar mensagem:", error);
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
  }
}

module.exports = new RabbitMQClient();
