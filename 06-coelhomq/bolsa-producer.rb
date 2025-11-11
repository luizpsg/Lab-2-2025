require 'bunny'
require 'json'
require 'time'

def conectar_rabbitmq(amqp_url)
  """Estabelece conexão com o RabbitMQ."""
  connection = Bunny.new(amqp_url)
  connection.start
  channel = connection.create_channel

  # Declarar exchange
  exchange = channel.topic('bolsa', durable: true)

  return connection, channel, exchange
end

def publicar_mensagem(exchange, routing_key, mensagem)
  """Publica uma mensagem no exchange com a routing key especificada."""
  exchange.publish(
    mensagem.to_json,
    routing_key: routing_key,
    persistent: true,
    content_type: 'application/json'
  )
  puts "Mensagem enviada: #{routing_key} - #{mensagem}"
end

def simular_bolsa
  """Simula um producer enviando dados da bolsa de valores."""
  # URL de conexão do CloudAMQP - substitua pela sua URL
  amqp_url = 'amqps://ohxybikr:eIz46e5Piqo6M94JsHRkaEKnBSkXvQ76@jackal.rmq.cloudamqp.com/ohxybikr'

  # Conectar ao RabbitMQ
  connection, channel, exchange = conectar_rabbitmq(amqp_url)

  acoes = ['PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3']

  begin
    # Simulação de envio contínuo de mensagens
    20.times do |i|
      # Simular cotação aleatória
      acao = acoes.sample
      valor = rand(10.0..100.0).round(2)
      variacao = rand(-5.0..5.0).round(2)

      # Mensagem de cotação
      mensagem_cotacao = {
        acao: acao,
        valor: valor,
        variacao: variacao,
        timestamp: Time.now.to_f
      }

      # Routing key para cotação
      routing_key = "bolsa.cotacoes.acoes.#{acao.downcase}"
      publicar_mensagem(exchange, routing_key, mensagem_cotacao)

      # Ocasionalmente simular uma negociação
      if rand > 0.7
        quantidade = rand(100..10000)
        tipo = ['compra', 'venda'].sample

        mensagem_negociacao = {
          acao: acao,
          quantidade: quantidade,
          valor_total: quantidade * valor,
          tipo: tipo,
          timestamp: Time.now.to_f
        }

        # Routing key para negociação
        routing_key = "bolsa.negociacoes.#{tipo}.#{acao.downcase}"
        publicar_mensagem(exchange, routing_key, mensagem_negociacao)
      end

      sleep 1  # Intervalo entre mensagens
    end
  ensure
    connection.close
    puts 'Conexão fechada'
  end
end

if __FILE__ == $0
  simular_bolsa
end

