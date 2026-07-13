import path from 'node:path';
import { loadEnvConfig, ensureArtifactDirs } from './src/config/env';
import { initLogger } from './src/helpers/Logger';

const envConfig = loadEnvConfig();
const runId = new Date().toISOString().replace(/[:.]/g, '-');

export const config = {
  runner: 'local',
  specs: ['./src/specs/**/*.spec.ts'],
  maxInstances: 1,
  logLevel: 'info',
  bail: 0,
  waitforTimeout: 30000,
  connectionRetryTimeout: 180000,
  connectionRetryCount: 3,
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000,
  },

  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          port: envConfig.appiumPort,
          relaxedSecurity: true,
        },
      },
    ],
  ],

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': envConfig.deviceName,
      'appium:platformVersion': envConfig.platformVersion,
      'appium:appPackage': 'com.android.vending',
      'appium:appActivity': 'com.android.vending.AssetBrowserActivity',
      'appium:autoGrantPermissions': true,
      'appium:noReset': false,
      'appium:fullReset': false,
      'appium:newCommandTimeout': 300,
      'appium:uiautomator2ServerLaunchTimeout': 120000,
      'appium:uiautomator2ServerInstallTimeout': 120000,
      'appium:adbExecTimeout': 120000,
      'appium:ignoreHiddenApiPolicyError': true,
    },
  ],

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: './tsconfig.json',
      transpileOnly: true,
    },
  },

  before: async () => {
    ensureArtifactDirs();
    initLogger(runId);
  },

  afterTest: async (
    test: { title: string },
    _context: unknown,
    result: { passed?: boolean },
  ) => {
    if (!result.passed) {
      const { captureFailureDiagnostics } = await import(
        './src/helpers/ScreenshotHelper'
      );
      await captureFailureDiagnostics(`test_${test.title}`);
    }
  },

  outputDir: path.resolve(process.cwd(), 'artifacts', 'logs', 'wdio'),
};
