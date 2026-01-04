# Game Placeholder

This service acts as the placeholder for the game server the system will provide.

## Game Server
The server files are defined under `src/`.

It is a simple express app with socket.io to allow users to connect via websockets. There is a RabbitMQ client as well which allows the server to publish whenever the match is completed. Game Master and Leaderboard can create queues for the message to delete the server as well as update rankings.

## Game Client
Client code exist under `game/`.

The game client is a simple website served by nginx and acts as its own service in the cluster. This way its easy to modify without having to alter the real frontend code.