/* global __dirname, process, console */
const { spawn } = require('child_process');
const path = require('path');
const electronBinary = require('electron');

const buildElectronEnv = (extraEnv = {}) => {
  const env = {
    ...process.env,
    ...extraEnv,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  return env;
};

const spawnElectron = ({ args = [], env = {}, cwd = path.resolve(__dirname, '..') } = {}) => {
  const child = spawn(electronBinary, args, {
    cwd,
    env: buildElectronEnv({ AXCHAT_ALLOW_SECOND_INSTANCE: '1', ...env }),
    stdio: 'inherit',
    windowsHide: true,
  });

  console.log(`[electron] spawn pid=${child.pid}`);

  child.on('error', (error) => {
    console.error('[electron] spawn error:', error);
  });

  child.on('exit', (code) => {
    console.log(`[electron] exit code=${code ?? 'unknown'}`);
    process.exit(code ?? 1);
  });

  return child;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  spawnElectron({ args });
}

module.exports = {
  buildElectronEnv,
  spawnElectron,
};
