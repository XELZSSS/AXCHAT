/* global console, process */
const { existsSync, readFileSync, unlinkSync, writeFileSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VSWHERE_PATH = path.join(
  process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
  'Microsoft Visual Studio',
  'Installer',
  'vswhere.exe'
);

const fail = (message, code = 1) => {
  console.error(`[axchat] ${message}`);
  process.exit(code);
};

const replaceInFile = (filePath, from, to) => {
  const source = readFileSync(filePath, 'utf8');
  if (source.includes(to)) {
    return;
  }
  if (!source.includes(from)) {
    fail(`Expected patch target was not found in "${filePath}".`);
  }
  writeFileSync(filePath, source.replace(from, to), 'utf8');
};

const patchBetterSqlite3ForElectron41 = () => {
  const moduleRoot = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
  if (!existsSync(moduleRoot)) {
    fail('better-sqlite3 is not installed in node_modules.');
  }

  replaceInFile(
    path.join(moduleRoot, 'src', 'objects', 'statement.cpp'),
    [
      'NODE_GETTER(Statement::JS_busy) {',
      '\tStatement* stmt = Unwrap<Statement>(info.This());',
      '\tinfo.GetReturnValue().Set(stmt->alive && stmt->locked);',
      '}',
    ].join('\n'),
    [
      'NODE_GETTER(Statement::JS_busy) {',
      '\tStatement* stmt = Unwrap<Statement>(info.HolderV2());',
      '\tinfo.GetReturnValue().Set(stmt->alive && stmt->locked);',
      '}',
    ].join('\n')
  );

  replaceInFile(
    path.join(moduleRoot, 'src', 'objects', 'database.cpp'),
    [
      'NODE_GETTER(Database::JS_open) {',
      '\tinfo.GetReturnValue().Set(Unwrap<Database>(info.This())->open);',
      '}',
      '',
      'NODE_GETTER(Database::JS_inTransaction) {',
      '\tDatabase* db = Unwrap<Database>(info.This());',
      '\tinfo.GetReturnValue().Set(db->open && !static_cast<bool>(sqlite3_get_autocommit(db->db_handle)));',
      '}',
    ].join('\n'),
    [
      'NODE_GETTER(Database::JS_open) {',
      '\tinfo.GetReturnValue().Set(Unwrap<Database>(info.HolderV2())->open);',
      '}',
      '',
      'NODE_GETTER(Database::JS_inTransaction) {',
      '\tDatabase* db = Unwrap<Database>(info.HolderV2());',
      '\tinfo.GetReturnValue().Set(db->open && !static_cast<bool>(sqlite3_get_autocommit(db->db_handle)));',
      '}',
    ].join('\n')
  );
};

const loadVisualStudioInstance = () => {
  if (!existsSync(VSWHERE_PATH)) {
    fail(`vswhere not found at "${VSWHERE_PATH}".`);
  }

  const query = spawnSync(
    VSWHERE_PATH,
    [
      '-products',
      '*',
      '-requires',
      'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
      'Microsoft.Component.MSBuild',
      '-format',
      'json',
    ],
    {
      encoding: 'utf8',
      shell: false,
    }
  );

  if (query.error) {
    fail(`Failed to execute vswhere: ${query.error.message}`);
  }

  if (query.status !== 0) {
    fail(query.stderr.trim() || `vswhere exited with code ${query.status}.`, query.status);
  }

  const instances = JSON.parse(query.stdout);
  if (!Array.isArray(instances) || instances.length === 0) {
    fail('No Visual Studio Build Tools installation with MSBuild and C++ workload was found.');
  }

  return instances[0];
};

const instance = loadVisualStudioInstance();
const installationPath = instance.installationPath;
const launchDevCmdPath = path.join(installationPath, 'Common7', 'Tools', 'LaunchDevCmd.bat');
const electronBuilderCmdPath = path.join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
);

if (!existsSync(launchDevCmdPath)) {
  fail(`LaunchDevCmd.bat not found at "${launchDevCmdPath}".`);
}

if (!existsSync(electronBuilderCmdPath)) {
  fail(`electron-builder executable not found at "${electronBuilderCmdPath}".`);
}

patchBetterSqlite3ForElectron41();

const tempScriptPath = path.join(os.tmpdir(), 'axchat-electron-rebuild.cmd');
writeFileSync(
  tempScriptPath,
  [
    '@echo off',
    `call "${launchDevCmdPath}" -arch=x64 -host_arch=x64`,
    'if errorlevel 1 exit /b %errorlevel%',
    `"${electronBuilderCmdPath}" install-app-deps`,
    'exit /b %errorlevel%',
    '',
  ].join('\r\n'),
  'ascii'
);

const result = spawnSync('cmd.exe', ['/d', '/c', tempScriptPath], {
  stdio: 'inherit',
  shell: false,
  env: process.env,
});

try {
  unlinkSync(tempScriptPath);
} catch {
  // Best effort cleanup for the temporary batch file.
}

if (result.error) {
  fail(`Failed to start Visual Studio developer shell: ${result.error.message}`);
}

process.exit(result.status ?? 1);
