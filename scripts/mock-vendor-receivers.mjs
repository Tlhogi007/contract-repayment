#!/usr/bin/env node
/**
 * Local stand-ins for optional vendors:
 * - OTLP HTTP on :4318  (/v1/metrics, /v1/traces)
 * - Sentry-like ingest on :9464 (/api/:projectId/envelope/)
 */
import http from 'node:http';

function log(kind, req, body) {
  const at = new Date().toISOString();
  console.log(`[${at}] ${kind} ${req.method} ${req.url} bytes=${body.length}`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const otlp = http.createServer(async (req, res) => {
  const body = await readBody(req);
  if (req.url?.startsWith('/v1/metrics')) log('OTLP-METRICS', req, body);
  else if (req.url?.startsWith('/v1/traces')) log('OTLP-TRACES', req, body);
  else log('OTLP-OTHER', req, body);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{}');
});

const sentry = http.createServer(async (req, res) => {
  const body = await readBody(req);
  log('SENTRY', req, body);
  // Acknowledge like Sentry ingest
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end('{}');
});

otlp.listen(4318, '127.0.0.1', () => {
  console.log('OTLP mock listening on http://127.0.0.1:4318');
});
sentry.listen(9464, '127.0.0.1', () => {
  console.log('Sentry mock listening on http://127.0.0.1:9464');
  console.log('Use SENTRY_DSN=http://localpublickey@127.0.0.1:9464/1');
});
