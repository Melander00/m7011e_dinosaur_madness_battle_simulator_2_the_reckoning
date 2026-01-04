import * as amqp from 'amqplib';

let connection: any = null;
let channel: any = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
}

export async function publishMatchFound(player1Id: string, player2Id: string): Promise<void> {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  const exchange = 'game-events';
  const routingKey = 'match.found';
  
  await channel.assertExchange(exchange, 'topic', { durable: true });
  
  const message = {
    type: 'MATCH_FOUND',
    timestamp: new Date().toISOString(),
    match: {
      player1: player1Id,
      player2: player2Id
    }
  };

  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );

  console.log('Published match found:', message);
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error);
  }
}
