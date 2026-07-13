import fs from 'node:fs';
import path from 'node:path';
import { artifactDirs } from '../config/env';
import { getLogger } from './Logger';

export async function captureScreenshot(stepName: string): Promise<string> {
  const safeName = stepName.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${timestamp}_${safeName}.png`;
  const filePath = path.join(artifactDirs.screenshots, fileName);

  const png = await browser.takeScreenshot();
  fs.writeFileSync(filePath, png, 'base64');
  getLogger().info(`Screenshot saved: ${filePath}`);
  return filePath;
}

export async function captureFailureDiagnostics(context: string): Promise<void> {
  const logger = getLogger();
  logger.error(`Failure context: ${context}`);

  try {
    const activity = await browser.getCurrentActivity();
    logger.error(`Current activity: ${activity ?? 'unknown'}`);
  } catch (error) {
    logger.error(`Unable to read current activity: ${String(error)}`);
  }

  try {
    const packageName = await browser.getCurrentPackage();
    logger.error(`Current package: ${packageName ?? 'unknown'}`);
  } catch (error) {
    logger.error(`Unable to read current package: ${String(error)}`);
  }

  try {
    const source = await browser.getPageSource();
    const sourcePath = path.join(
      artifactDirs.logs,
      `page-source_${Date.now()}.xml`,
    );
    fs.writeFileSync(sourcePath, source, 'utf8');
    logger.error(`Page source saved: ${sourcePath}`);
  } catch (error) {
    logger.error(`Unable to capture page source: ${String(error)}`);
  }

  await captureScreenshot(`failure_${context}`);
}
