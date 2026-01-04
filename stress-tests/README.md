# Stress Testing
This module contains scripts for stress testing the different parts of the system.

## Prerequisites
It is necessary to port forward the needed services. For example, to stress test creation of new game servers we need to forward RabbitMQ port so that we can publish the creation message. 

## Running
Run a script inside the `script` folder using normal node execution
```bash
# inside /script/
node app.js
```