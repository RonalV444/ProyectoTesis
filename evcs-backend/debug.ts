#!/usr/bin/env node

console.log('[DEBUG-INIT] Debug script started at', new Date().toISOString());

setTimeout(() => {
  console.log('[DEBUG-TIMEOUT] Timeout callback executed');
  process.exit(0);
}, 2000);

console.log('[DEBUG] This is a test');
