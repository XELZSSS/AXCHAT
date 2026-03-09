/* global __dirname, process */
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
    env: buildElectronEnv(env),
    stdio: 'inherit',
    windowsHide: true,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });

  return child;
};

if (require.main === module) {
  spawnElectron({ args: process.argv.slice(2) });
}

module.exports = {
  buildElectronEnv,
  spawnElectron,
};
