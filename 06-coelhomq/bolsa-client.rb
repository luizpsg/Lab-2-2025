# Instale a biblioteca bunny
# gem install bunny

require 'bunny'
require 'json'

def conectar_rabbitmq(amqp_url, queue_name, binding_key)
  """Estabelece conexão com o RabbitMQ e configura a fila."""
  connection = Bunny.new(amqp_url)
  connection.start
  channel = connection.create_channel

  # Declarar exchange
  exchange = channel.topic('bolsa', durable: true)

  # Declarar fila
  queue = channel.queue(queue_name, durable: true)

  # Vincular a fila ao exchange
  queue.bind(exchange, routing_key: binding_key)

  return connection, channel, queue
end

def processar_mensagem(delivery_info, properties, body)
  """Callback para processar mensagens recebidas."""
  begin
    # Converter a mensagem JSON para hash
    mensagem = JSON.parse(body, symbolize_names: true)

    # Extrair a routing key
    routing_key = delivery_info.routing_key

    puts "\nRecebida mensagem com routing key: #{routing_key}"
    puts "Conteúdo: #{mensagem}"

    # Simulação de processamento
    puts 'Processando mensagem...'
    sleep 0.5  # Simular processamento

    # Verificar tipo de mensagem pelo routing key
    if routing_key.include?('cotacoes')
      # Processar cotação
      acao = mensagem[:acao]
      valor = mensagem[:valor]
      variacao = mensagem[:variacao]
      puts "Cotação de #{acao}: R$ #{valor} (variação: #{variacao}%)"

      # Simular análise técnica
      if variacao > 2
        puts "ALERTA: #{acao} em alta expressiva!"
      elsif variacao < -2
        puts "ALERTA: #{acao} em queda expressiva!"
      end

    elsif routing_key.include?('negociacoes')
      # Processar negociação
      acao = mensagem[:acao]
      quantidade = mensagem[:quantidade]
      valor_total = mensagem[:valor_total]
      tipo = mensagem[:tipo]
      puts "Negociação de #{acao}: #{tipo} de #{quantidade} ações por R$ #{valor_total.round(2)}"
    end

    puts 'Mensagem processada com sucesso!'
    true  # Retorna true para acknowledge automático

  rescue => e
    puts "Erro ao processar mensagem: #{e.message}"
    false  # Retorna false para rejeitar a mensagem
  end
end

def iniciar_consumer(tipo_consumer)
  """Inicia o consumer com as configurações apropriadas."""
  # URL de conexão do CloudAMQP - substitua pela sua URL
  amqp_url = 'amqps://ohxybikr:eIz46e5Piqo6M94JsHRkaEKnBSkXvQ76@jackal.rmq.cloudamqp.com/ohxybikr'

  case tipo_consumer
  when 'cotacoes'
    queue_name = 'cotacoes'
    binding_key = 'bolsa.cotacoes.#'
    puts 'Iniciando consumer de COTAÇÕES...'
  when 'negociacoes'
    queue_name = 'negociacoes'
    binding_key = 'bolsa.negociacoes.#'
    puts 'Iniciando consumer de NEGOCIAÇÕES...'
  else
    raise "Tipo de consumer inválido: #{tipo_consumer}"
  end

  # Conectar ao RabbitMQ
  connection, channel, queue = conectar_rabbitmq(amqp_url, queue_name, binding_key)

  # Configurar prefetch (quantas mensagens processar de uma vez)
  channel.prefetch(1)

  puts "Consumer #{tipo_consumer} aguardando mensagens..."

  begin
    # Configurar o consumo de mensagens
    queue.subscribe(manual_ack: true, block: true) do |delivery_info, properties, body|
      if processar_mensagem(delivery_info, properties, body)
        # Acknowledge da mensagem (confirma o processamento)
        channel.ack(delivery_info.delivery_tag)
      else
        # Em caso de erro, rejeita a mensagem (não volta para a fila)
        channel.nack(delivery_info.delivery_tag, false, false)
      end
    end
  rescue Interrupt => _
    puts "\nConsumer interrompido pelo usuário"
  ensure
    puts 'Fechando conexão...'
    connection.close
  end
end

if __FILE__ == $0
  # Para escolher o tipo de consumer, descomente a linha desejada:
  # iniciar_consumer('cotacoes')
  iniciar_consumer('negociacoes')
end

