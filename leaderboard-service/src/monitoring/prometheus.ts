// src/monitoring/prometheus.ts
import { Counter, Histogram, register } from "prom-client";

const SERVICE_NAME = "leaderboard-service";

/**
 * Expose all metrics for Prometheus scraping
 */
export async function getMetrics() {
  return {
    metrics: await register.metrics(),
    contentType: register.contentType,
  };
}

/**
 * HTTP request counter
 */
const requestCount = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "endpoint", "status", "service"],
});

export type PromProps = {
  method: string;
  endpoint: string;
};

export function incRequestCount(
  status: number,
  { method, endpoint }: PromProps,
) {
  requestCount.inc({
    method,
    endpoint,
    status,
    service: SERVICE_NAME,
  });
}

/**
 * HTTP request duration histogram
 */
const requestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request latency in seconds",
  labelNames: ["method", "endpoint", "service"],
});

export function createRequestDuration({ method, endpoint }: PromProps) {
  const start = Date.now();

  return {
    end: () => {
      const time = (Date.now() - start) / 1000;
      requestDuration.observe(
        {
          method,
          endpoint,
          service: SERVICE_NAME,
        },
        time,
      );
    },
  };
}
