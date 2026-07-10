import { defineConfig } from '@vscode/test-cli';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
    version: '1.124.2',
    files: 'dist/test/suite/**/*.test.js',
    extensionDevelopmentPath: path.resolve(__dirname, '..'),
    workspaceFolder: './src/test/fixtures/project-with-tsconfig',
    launchArgs: ['--user-data-dir=/tmp/vscode-test'],
    mocha: {
        ui: 'tdd',
        timeout: 60000
    }
});