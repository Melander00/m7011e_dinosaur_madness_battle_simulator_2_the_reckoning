# M7011E Report

## Motivation for the system being dynamic

There are two main reasons our system is dynamic.

1. The website changes based on which user is logged in. For example the friends list may be different for two different users.
2. There are real-time updates when a user is in a match. The server regularly sends the game state to the user via websocket.

## High level architecture diagrams

![Microservices](./img/Microservices.png)

All requests pass through Ingress which acts as an Api Gateway. Ingress terminates TLS which means the services doesn't have to bother with certificates. The services communicate via a message queue run by RabbitMQ. This way, even if a service crashes, the message isn't lost. It also allows for better scaling with multiple replicas.

All services are stateless in such a way that we won't lose any data (except for requests that are currently being handled) if a service is restarted. Any persistant data is stored in PostgreSQL and any in-memory variables are pushed to Redis. One exception is the Game Server which stores related match data inside itself. The reason for this approach is mostly simplicity, it is up to the Game Server itself to determine whether the data should be persisted.

Each Game Server has a unique ID associated with it. This allows Game Master to keep track which users should connect to which Game Server. Ingress forwards WebSocket requests to `game.ltu-m7011e.se/{ID}` to the respective Game Server. 

The flow is basically:

1. Match is started between User1 and User2
2. User1 checks endpoint game-master/match with JWT
3. Game Master looks in Redis to find a match associated with User1.
4. Game Master returns the ID (or rather the full url) that User1 connects to via websocket.
5. User1 sends a websocket request to the url.
6. Ingress forwards it to the correct Game Server

A trade-off we made was that if a Game Server crashes the match cannot be reinstated.

---

![CI/CD Pipeline](./img/CI_CD_pipeline.png)

Whenever a push on main (closed pull requests counts as well), the github workflow associated with that service runs. A new docker image is built and pushed. The new tag is committed to the kubernetes deployment files in the repository. ArgoCD notices the state in Git is not identical to the cluster and therefore pushes the new state into the cluster. 

---

![Security Model](./img/Security_Model.png)

Each service caches the public key from keycloak and refreshes it every 10 minutes.
A user logs in via the keycloak ui and can then requests its JWT. 
The user sends the JWT in every request which the service uses the public key to verify the JWT and authenticate the user.

---

![Monitoring](./img/Monitoring.png)

An example for how monitoring works when matchmaking completes and a match is started.

## Database Schema

![DB Schemas](./img/DB_Schema.png)
