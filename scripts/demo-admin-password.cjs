const crypto = require('crypto');

/**
 * Password for local demo/admin scripts.
 * Reads DEMO_ADMIN_PASSWORD from the environment. When it is missing and
 * `generate` is true, creates a random password the caller can print once.
 * Never hardcode a password in source.
 */
function resolveDemoAdminPassword({ generate = true } = {}) {
  const fromEnv = process.env.DEMO_ADMIN_PASSWORD;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return { password: fromEnv, source: 'env' };
  }
  if (!generate) return null;
  return {
    password: crypto.randomBytes(18).toString('base64url'),
    source: 'generated',
  };
}

function logDemoAdminPassword(result) {
  if (!result) return;
  if (result.source === 'generated') {
    console.log('Generated admin password (shown once; not stored in source):');
    console.log(result.password);
    return;
  }
  console.log('Using admin password from DEMO_ADMIN_PASSWORD (value not printed).');
}

module.exports = { resolveDemoAdminPassword, logDemoAdminPassword };
