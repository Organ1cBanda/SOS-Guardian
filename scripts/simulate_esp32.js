/**
 * ESP32 Mock Hardware Simulator (Node.js)
 * Allows developers to test the Android React Native app without needing physical hardware.
 * 
 * Usage:
 *   node scripts/simulate_esp32.js [port]
 *   (Default port: 80, or 8080 if running without admin permissions)
 * 
 * Terminal Controls:
 *   Press 's' + Enter -> Simulates physical button held for 3 seconds (Triggers SOS)
 *   Press 'r' + Enter -> Resets SOS state to IDLE
 *   Press 'q' + Enter -> Quit simulator
 */

const http = require('http');
const readline = require('readline');

const PORT = process.env.PORT || 80;

let sosTriggered = false;
let uptimeSeconds = 0;

setInterval(() => {
  uptimeSeconds++;
}, 1000);

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  if (url === '/ping' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      device: 'SIMULATED_SOS_DEVICE',
      uptime: uptimeSeconds,
    }));
    return;
  }

  if (url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: true,
      event: sosTriggered ? 'SOS' : 'IDLE',
      sos: sosTriggered,
      holdTimeMs: 3000,
    }));
    return;
  }

  if (url === '/ack' && req.method === 'POST') {
    sosTriggered = false;
    console.log('\n[SIMULATOR] Received ACK from Android Phone! SOS state reset to IDLE.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'acknowledged',
      sos: false,
      event: 'IDLE',
    }));
    return;
  }

  if (url === '/sos' && (req.method === 'POST' || req.method === 'GET')) {
    sosTriggered = true;
    console.log('\n[SIMULATOR] 🚨 SOS Triggered via HTTP request!');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      event: 'SOS',
      status: 'triggered',
      sos: true,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.on('error', (err) => {
  if (err.code === 'EACCES') {
    console.error(`\n[ERROR] Port ${PORT} requires administrator privileges on Windows.`);
    console.log(`Tip: Re-run as administrator or run on port 8080 and change IP in Settings to <Your_PC_IP>:8080`);
  } else {
    console.error('[ERROR]', err.message);
  }
});

server.listen(PORT, () => {
  console.log('====================================================');
  console.log('   ESP32 HARDWARE SIMULATOR RUNNING');
  console.log(`   Listening at: http://localhost:${PORT}`);
  console.log('====================================================');
  console.log('Endpoints ready:');
  console.log(`  GET  http://localhost:${PORT}/ping`);
  console.log(`  GET  http://localhost:${PORT}/status`);
  console.log(`  POST http://localhost:${PORT}/ack`);
  console.log(`  POST http://localhost:${PORT}/sos`);
  console.log('\nControls:');
  console.log("  Type 's' and press [Enter] -> Simulate 3-Second Button Hold (Trigger SOS)");
  console.log("  Type 'r' and press [Enter] -> Reset SOS State");
  console.log("  Type 'q' and press [Enter] -> Exit");
  console.log('----------------------------------------------------');
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', (line) => {
  const input = line.trim().toLowerCase();
  if (input === 's') {
    console.log('\n[SIMULATOR] Simulating physical button hold for 3 seconds...');
    setTimeout(() => {
      sosTriggered = true;
      console.log('🚨 [SIMULATOR] 3-SECOND HOLD COMPLETE! SOS TRIGGERED ON ESP32!');
      console.log('[SIMULATOR] Next poll from Android app will receive { event: "SOS" }');
    }, 1000);
  } else if (input === 'r') {
    sosTriggered = false;
    console.log('[SIMULATOR] Reset: SOS state returned to IDLE.');
  } else if (input === 'q') {
    console.log('Exiting simulator...');
    process.exit(0);
  }
});
