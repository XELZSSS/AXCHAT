/* global process, setTimeout, clearTimeout, console */
const crypto = require('crypto');
const net = require('net');
const { spawn } = require('child_process');

const MAX_PROXY_PORT_SCAN_ATTEMPTS = 20;
const PROXY_START_TIMEOUT_MS = 8000;
const PROXY_READY_RETRY_DELAY_MS = 120;

let proxyProcess = null;
let stoppingProxyProcessPromise = null;

const ensureProxyToken = () => {
  const existing = process.env.AXCHAT_PROXY_TOKEN;
  if (existing && existing.trim()) return existing;
  const generated = crypto.randomBytes(24).toString('hex');
  process.env.AXCHAT_PROXY_TOKEN = generated;
  return generated;
};

const waitForServerClose = (server) => {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const reserveAvailableProxyPort = async ({ requestedPort, host }) => {
  const initialPort = Number.parseInt(requestedPort, 10);

  for (
    let attempt = 0, candidatePort = initialPort;
    attempt < MAX_PROXY_PORT_SCAN_ATTEMPTS && candidatePort <= 65535;
    attempt += 1, candidatePort += 1
  ) {
    const reservationServer = net.createServer();
    reservationServer.unref();

    try {
      await new Promise((resolve, reject) => {
        reservationServer.once('error', (error) => {
          if (error?.code === 'EADDRINUSE') {
            resolve(false);
            return;
          }
          reject(error);
        });
        reservationServer.listen({ port: candidatePort, host, exclusive: true }, () => {
          resolve(true);
        });
      }).then((listening) => {
        if (!listening) {
          throw new Error('PORT_IN_USE');
        }
      });

      return {
        port: String(candidatePort),
        release: async () => {
          await waitForServerClose(reservationServer);
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'PORT_IN_USE') {
        try {
          await waitForServerClose(reservationServer);
        } catch {
          // ignore cleanup failures for unavailable candidate ports
        }
        continue;
      }

      try {
        await waitForServerClose(reservationServer);
      } catch {
        // ignore cleanup failures after unexpected reservation errors
      }
      throw error;
    }
  }

  throw new Error(
    `Unable to find an available local proxy port starting from ${requestedPort} on host ${host}`
  );
};

const normalizeProbeHost = (host) => {
  const normalized = String(host ?? '').trim();
  if (!normalized || normalized === '0.0.0.0' || normalized === '::' || normalized === '[::]') {
    return '127.0.0.1';
  }
  return normalized;
};

const waitForProxyReady = ({ childProcess, host, port, timeoutMs = PROXY_START_TIMEOUT_MS }) => {
  const probeHost = normalizeProbeHost(host);
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout = null;
    let retryTimer = null;

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      childProcess.removeListener('exit', handleExit);
      childProcess.removeListener('error', handleError);
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const handleExit = (code, signal) => {
      finish(
        new Error(
          `Local proxy exited before it became ready (code: ${code ?? 'unknown'}, signal: ${
            signal ?? 'none'
          })`
        )
      );
    };

    const handleError = (error) => {
      finish(error instanceof Error ? error : new Error(String(error)));
    };

    const tryConnect = () => {
      if (settled) return;

      const socket = net.connect({ host: probeHost, port: Number(port) });
      socket.once('connect', () => {
        socket.destroy();
        finish();
      });
      socket.once('error', () => {
        socket.destroy();
        if (settled) return;
        retryTimer = setTimeout(tryConnect, PROXY_READY_RETRY_DELAY_MS);
      });
    };

    timeout = setTimeout(() => {
      finish(
        new Error(`Timed out waiting for the local proxy to listen on http://${probeHost}:${port}`)
      );
    }, timeoutMs);

    childProcess.once('exit', handleExit);
    childProcess.once('error', handleError);
    tryConnect();
  });
};

const startProxyProcess = async ({
  scriptPath,
  isDev,
  resolveProxyPort,
  resolveProxyHost,
  defaults,
  staticProxyHttp2Enabled = false,
}) => {
  if (proxyProcess) {
    return {
      host: process.env.MINIMAX_PROXY_HOST ?? defaults.DEFAULT_PROXY_HOST,
      port: process.env.MINIMAX_PROXY_PORT ?? defaults.DEFAULT_PROXY_PORT,
    };
  }

  const proxyToken = ensureProxyToken();
  const requestedProxyPort = resolveProxyPort(process.env.MINIMAX_PROXY_PORT);
  const proxyHost = resolveProxyHost(process.env.MINIMAX_PROXY_HOST);
  const portReservation = await reserveAvailableProxyPort({
    requestedPort: requestedProxyPort,
    host: proxyHost,
  });
  const proxyPort = portReservation.port;

  if (proxyPort !== requestedProxyPort) {
    console.warn(
      `Local proxy port ${requestedProxyPort} is already in use, falling back to ${proxyPort}`
    );
  }

  process.env.MINIMAX_PROXY_PORT = proxyPort;
  process.env.MINIMAX_PROXY_HOST = proxyHost;

  await portReservation.release();

  proxyProcess = spawn(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      MINIMAX_PROXY_PORT: proxyPort ?? defaults.DEFAULT_PROXY_PORT,
      MINIMAX_PROXY_HOST: proxyHost ?? defaults.DEFAULT_PROXY_HOST,
      AXCHAT_PROXY_TOKEN: proxyToken,
      AXCHAT_PROXY_STATIC_HTTP2: staticProxyHttp2Enabled ? '1' : '0',
    },
    stdio: isDev ? 'inherit' : 'ignore',
  });

  proxyProcess.on('exit', () => {
    proxyProcess = null;
  });

  try {
    await waitForProxyReady({
      childProcess: proxyProcess,
      host: proxyHost,
      port: proxyPort,
    });
  } catch (error) {
    try {
      proxyProcess.kill();
    } catch {
      // ignore cleanup failures during startup
    }
    proxyProcess = null;
    throw error;
  }

  return {
    host: proxyHost,
    port: proxyPort,
  };
};

const stopProxyProcess = () => {
  if (!proxyProcess) return Promise.resolve();
  if (stoppingProxyProcessPromise) return stoppingProxyProcessPromise;

  const targetProcess = proxyProcess;
  stoppingProxyProcessPromise = new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (proxyProcess === targetProcess) {
        proxyProcess = null;
      }
      stoppingProxyProcessPromise = null;
      resolve();
    };

    targetProcess.once('exit', finish);
    targetProcess.once('error', finish);
    setTimeout(finish, 2000);

    try {
      targetProcess.kill();
    } catch {
      finish();
    }
  });

  return stoppingProxyProcessPromise;
};

module.exports = {
  startProxyProcess,
  stopProxyProcess,
};
