import "dotenv/config";
import app from "./app";
import { closeRabbitMQ, connectRabbitMQ } from "./messaging/rabbitmq";
import { matchmakingService } from "./services/matchmaking-service";

const PORT = process.env.PORT || 3004;

async function start() {
  await connectRabbitMQ();
  matchmakingService.startMatchmaking();

  app.listen(PORT, () => {
    console.log(`matchmaking-service listening on http://localhost:${PORT}`);
  });
}

process.on("SIGTERM", async () => {
  matchmakingService.stopMatchmaking();
  await closeRabbitMQ();
  process.exit(0);
});

process.on("SIGINT", async () => {
  matchmakingService.stopMatchmaking();
  await closeRabbitMQ();
  process.exit(0);
});

start();
