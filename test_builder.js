const { execSync } = require('child_process');
try {
  console.log('Testing wine makensis execution...');
  execSync('npm run build:win', { stdio: 'inherit' });
} catch (e) {
  console.error('Failed build', e.message);
}
