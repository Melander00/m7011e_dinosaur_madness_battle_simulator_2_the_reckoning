require("dotenv").config();
const { randomUUID } = require("node:crypto");
const http = require("http");

// Configuration
const BATCHES = parseInt(process.env.BATCHES) || 10;
const REQUESTS_PER_BATCH = parseInt(process.env.REQUESTS_PER_BATCH) || 100;
const DELAY_BETWEEN_BATCHES_MS = parseInt(process.env.DELAY_BETWEEN_BATCHES) || 5000;
const DELAY_BETWEEN_REQUESTS_MS = parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 20;
const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const AUTH_TOKEN = process.env.AUTH_TOKEN || "";

// Keep-alive agent for better performance
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 50,
});

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  byEndpoint: {},
  byStatus: {},
};

function uuid() {
  return randomUUID();
}

function getRandomInviteId() {
  return `invite-${randomUUID()}`;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: method,
      agent: keepAliveAgent,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 30000,
    };

    if (AUTH_TOKEN) {
      options.headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        stats.totalRequests++;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }

        const endpoint = `${method} ${path.replace(/[a-f0-9-]{36}/gi, ":id")}`;
        stats.byEndpoint[endpoint] = (stats.byEndpoint[endpoint] || 0) + 1;
        stats.byStatus[res.statusCode] = (stats.byStatus[res.statusCode] || 0) + 1;

        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on("error", () => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.byStatus[0] = (stats.byStatus[0] || 0) + 1;
      resolve({ statusCode: 0, data: null });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Weighted random selection of endpoints based on realistic traffic patterns
 * 
 * Traffic distribution:
 * - GET /friendships: ~30% (most common)
 * - GET /friendships/invite: ~30% (equally common)
 * - POST /friendships/invite: ~10% (1/3 of GET)
 * - Other friendships routes: ~3% each
 * - GET /requests/incoming: ~5%
 * - GET /requests/outgoing: ~5%
 * - PUT /requests/:id/accept: ~2% (90% of request actions)
 * - PUT /requests/:id/reject: ~0.2% (10% of request actions)
 * - Other request routes: ~1% each
 */
function selectEndpoint() {
  const rand = Math.random() * 100;

  // GET /friendships - 30%
  if (rand < 30) {
    return { method: "GET", path: "/friendships", requiresAuth: true };
  }
  // GET /friendships/invite - 30%
  else if (rand < 60) {
    return { method: "GET", path: "/friendships/invite", requiresAuth: true };
  }
  // POST /friendships/invite - 10%
  else if (rand < 70) {
    return {
      method: "POST",
      path: "/friendships/invite",
      body: { toUserId: uuid() },
      requiresAuth: true,
    };
  }
  // GET /friendships/:userId - 3% (public)
  else if (rand < 73) {
    return { method: "GET", path: `/friendships/${uuid()}`, requiresAuth: false };
  }
  // GET /friendships/count - 3%
  else if (rand < 76) {
    return { method: "GET", path: "/friendships/count", requiresAuth: true };
  }
  // POST /friendships - 3%
  else if (rand < 79) {
    return {
      method: "POST",
      path: "/friendships",
      body: { userId: uuid() },
      requiresAuth: true,
    };
  }
  // DELETE /friendships/:userId - 3%
  else if (rand < 82) {
    return { method: "DELETE", path: `/friendships/${uuid()}`, requiresAuth: true };
  }
  // DELETE /friendships/invite/:inviteId - 3%
  else if (rand < 85) {
    return { method: "DELETE", path: `/friendships/invite/${getRandomInviteId()}`, requiresAuth: true };
  }
  // GET /requests/incoming - 5%
  else if (rand < 90) {
    return { method: "GET", path: "/requests/incoming", requiresAuth: true };
  }
  // GET /requests/outgoing - 5%
  else if (rand < 95) {
    return { method: "GET", path: "/requests/outgoing", requiresAuth: true };
  }
  // PUT /requests/:fromUserId/accept - 2%
  else if (rand < 97) {
    return { method: "PUT", path: `/requests/${uuid()}/accept`, requiresAuth: true };
  }
  // PUT /requests/:fromUserId/reject - 1%
  else if (rand < 98) {
    return { method: "PUT", path: `/requests/${uuid()}/reject`, requiresAuth: true };
  }
  // POST /requests - 1%
  else if (rand < 99) {
    return {
      method: "POST",
      path: "/requests",
      body: { toUserId: uuid() },
      requiresAuth: true,
    };
  }
  // DELETE /requests/:toUserId - 1%
  else {
    return { method: "DELETE", path: `/requests/${uuid()}`, requiresAuth: true };
  }
}

async function sendRequest() {
  const endpoint = selectEndpoint();

  // Skip auth-required endpoints if no token
  if (endpoint.requiresAuth && !AUTH_TOKEN) {
    return makeRequest("GET", `/friendships/${uuid()}`);
  }

  return makeRequest(endpoint.method, endpoint.path, endpoint.body);
}

let loops = 0;

async function batch() {
  loops++;
  console.log("Batch %o / %o", loops, BATCHES);

  for (let i = 0; i < REQUESTS_PER_BATCH; i++) {
    sendRequest();
    await delay(DELAY_BETWEEN_REQUESTS_MS);
  }

  if (loops < BATCHES) {
    setTimeout(batch, DELAY_BETWEEN_BATCHES_MS);
  } else {
    // Wait for pending requests to complete
    await delay(2000);
    printResults();
    process.exit();
  }
}

function printResults() {
  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                    📊 LOAD TEST RESULTS                           ");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Batches:              ${BATCHES}`);
  console.log(`  Requests per batch:   ${REQUESTS_PER_BATCH}`);
  console.log(`  Total Requests:       ${stats.totalRequests}`);
  console.log(`  Successful:           ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Failed:               ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                    📈 BY ENDPOINT                                 ");
  console.log("═══════════════════════════════════════════════════════════════════");

  const sortedEndpoints = Object.entries(stats.byEndpoint).sort((a, b) => b[1] - a[1]);
  for (const [endpoint, count] of sortedEndpoints) {
    console.log(`  ${endpoint.padEnd(40)} ${count}`);
  }

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("                    📊 BY STATUS CODE                              ");
  console.log("═══════════════════════════════════════════════════════════════════");

  for (const [status, count] of Object.entries(stats.byStatus).sort()) {
    const pct = ((count / stats.totalRequests) * 100).toFixed(1);
    console.log(`  ${status}: ${count} (${pct}%)`);
  }

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("\n💡 Check Prometheus metrics: curl http://localhost:3001/metrics\n");
}

async function begin() {
  console.log("🚀 Starting friend-service load test...\n");
  console.log(`   Target:                ${BASE_URL}`);
  console.log(`   Batches:               ${BATCHES}`);
  console.log(`   Requests per batch:    ${REQUESTS_PER_BATCH}`);
  console.log(`   Delay between batches: ${DELAY_BETWEEN_BATCHES_MS}ms`);
  console.log(`   Delay between reqs:    ${DELAY_BETWEEN_REQUESTS_MS}ms`);
  console.log(`   Auth token:            ${AUTH_TOKEN ? "provided" : "not provided (only public endpoints)"}`);
  console.log("\n");

  batch();
}

begin();

process.on("SIGINT", () => {
  printResults();
  process.exit();
});

process.on("SIGTERM", () => {
  printResults();
  process.exit();
});
