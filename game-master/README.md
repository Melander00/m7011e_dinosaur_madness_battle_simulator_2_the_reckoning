# Game Master
The game master acts as the "owner" of all game servers. Its purpose is to start and stop server pods as well as route users to their respective server.

## Servers
By utilizing RabbitMQ we can listen when a service (Matchmaking for example) wants to create a match and, when free, handle it. We don't ACK the message until the pods are starting to make sure the server is actually running.

We store all information regarding the game servers in Redis. This includes the ID, the url (domain and path) that ingress routes to the server, users associated with the server and whether its ranked or not. This is to enable statelessness. Redis is used since we only need key-value store with JSON and expiration which works flawlessly in Redis.

Servers are started using K8S API and custom manifests. The image tag for the game server is injected via environment variables which means we don't have to rebuild Game Master if the game server code changes.

## Auth
Keycloak is used as a middleware for the `/match` endpoint which users use to find the endpoint they should connect to for their match.

## Monitoring
Monitoring is applied in multiple metrics. They are all scraped by prometheus on the `/metrics` endpoint.

| Metric Name | Type | Description |
| --- | --- | --- |
| `http_requests_total` | Counter | Total amount of HTTP requests |
| `http_request_duration_seconds` | Histogram | HTTP requests latency in seconds |
| `matches_created_total` | Counter | Total amount of created matches |
| `active_matches` | Gauge | Number of matches currently active. (Reflects the amount of servers in Redis) |
| `matches_created_duration_seconds` | Histogram | Time to start server pods. From start to when the pods are ready. |

## OpenAPI
There is a OpenApi v3 spec in the `/openapi` endpoint. It is served as `application/json`.