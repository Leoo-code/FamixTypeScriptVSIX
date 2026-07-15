// scripts/run-vsix-tests.js
//
// Runs the extension's Mocha test suite against the *packaged* .vsix rather
// than the raw source tree. VS Code's own CLI is used to unpack/install the
// .vsix into an isolated, throwaway profile - the extension folder it
// produces is then passed as `extensionDevelopmentPath`, so the "extension
// under test" is byte-identical to what a real user would get after
// installing the .vsix. `--disable-extensions` blocks every other extension,
// so nothing but the packaged code runs.
const path = require('path');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const {
    runTests,
    downloadAndUnzipVSCode,
    resolveCliArgsFromVSCodeExecutablePath,
} = require('@vscode/test-electron');

function findVsix(rootDir) {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const vsixPath = path.resolve(rootDir, `${pkg.name}-${pkg.version}.vsix`);

    if (!fs.existsSync(vsixPath)) {
        throw new Error(`Expected VSIX not found: ${vsixPath}\nRun "vsce package" first.`);
    }

    return vsixPath;
}

function installVsix(vscodeExecutablePath, vsixPath, userDataDir, extensionsDir) {
    const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    const args = [
        ...cliArgs,
        '--user-data-dir', userDataDir,
        '--extensions-dir', extensionsDir,
        '--install-extension', vsixPath,
        '--force',
    ];

    console.log(`[VSIX Test] Installing: ${vsixPath}`);
    console.log(`[VSIX Test] Into: ${extensionsDir}`);

    const result = cp.spawnSync(cliPath, args, {
        stdio: 'inherit',
        encoding: 'utf-8',
        shell: process.platform === 'win32',
    });

    if (result.error) {
        throw new Error(`VSIX install failed to start: ${result.error.message}\nCLI: ${cliPath}`);
    }

    if (result.signal) {
        throw new Error(`VSIX install terminated by signal ${result.signal}`);
    }

    if (result.status !== 0) {
        throw new Error(`VSIX install failed with exit code ${result.status}`);
    }
}

async function main() {
    const rootDir = path.resolve(__dirname, '..');
    const vsixPath = findVsix(rootDir);

    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'ts2famix-vsix-test-'));
    const userDataDir = path.join(tmpBase, 'user-data');
    const extensionsDir = path.join(tmpBase, 'extensions');
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.mkdirSync(extensionsDir, { recursive: true });

    console.log(`[VSIX Test] Isolated profile: ${tmpBase}`);

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable');

    installVsix(vscodeExecutablePath, vsixPath, userDataDir, extensionsDir);

    // The extension under test is the exact folder VS Code just extracted -
    // no manual unzip, no separate dummy extension. Installing writes
    // metadata files (extensions.json, .obsolete, etc.) alongside the
    // extension folder, so filter to directories only.
    const installedFolder = fs.readdirSync(extensionsDir, { withFileTypes: true })
        .find(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        ?.name;
    if (!installedFolder) {
        throw new Error(`No extension folder found in ${extensionsDir} after install`);
    }
    const extensionDevelopmentPath = path.join(extensionsDir, installedFolder);
    console.log(`[VSIX Test] Extension under test: ${extensionDevelopmentPath}`);

    const extensionTestsPath = path.resolve(rootDir, 'client/dist/test/suite');
    const workspacePath = path.resolve(rootDir, 'client/src/test/fixtures/project-with-tsconfig');

    console.log('[VSIX Test] Running suite against installed VSIX...');

    await runTests({
        vscodeExecutablePath,
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [
            workspacePath,
            '--disable-extensions',
            '--user-data-dir', userDataDir,
            '--extensions-dir', extensionsDir,
        ],
    });

    console.log('[VSIX Test] Passed - packaged .vsix works in an isolated profile.');
}

main().catch(err => {
    console.error(`[VSIX Test] Failed: ${err}`);
    process.exit(1);
});
