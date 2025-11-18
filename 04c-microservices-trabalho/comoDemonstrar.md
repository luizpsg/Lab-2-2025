### Como demonstrar (sugestão)

1. Inicie RabbitMQ local (p. ex. docker run -p 5672:5672 -p 15672:15672 rabbitmq:3-management).
2. npm run start:all para os serviços HTTP.
3. npm run workers:start para os dois consumers.
4. npm run demo para disparar o roteiro; ao executar o checkout, confira o Management UI e os terminais dos workers para a evidência solicitada.

5. Garanta RabbitMQ + serviços + workers rodando.
6. Execute npm run demo:queues (ajuste QUEUE_DEMO_RUNS=10 npm run demo:queues se quiser mais mensagens).
7. Observe o painel do RabbitMQ e os terminals dos consumers para ver o volume processado.
