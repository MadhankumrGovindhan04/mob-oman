const { execSync } = require('node:child_process');

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function getInstalledDrivers() {
  try {
    return stripAnsi(
      execSync('npx appium driver list --installed 2>&1', { encoding: 'utf8' }),
    );
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || '';
    return stripAnsi(output);
  }
}

const installedDrivers = getInstalledDrivers();

if (/uiautomator2/i.test(installedDrivers)) {
  console.log('Appium uiautomator2 driver is already installed. Skipping setup.');
  process.exit(0);
}

console.log('Installing Appium uiautomator2 driver...');
execSync('npx appium driver install uiautomator2', { stdio: 'inherit' });
