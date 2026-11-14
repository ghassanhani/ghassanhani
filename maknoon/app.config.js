/* global __dirname */
// app.json holds the configuration; this only adds the commit the app was built from, shown at the
// bottom of Settings (so a build on the phone can be matched with `git log`).
const { execSync } = require('node:child_process');

let commit = null;
try {
  commit = execSync('git rev-parse --short=7 HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null;
} catch {
  // no git here (some build services copy the files without it): the version is shown alone
}

module.exports = ({ config }) => ({ ...config, extra: { ...config.extra, commit } });
