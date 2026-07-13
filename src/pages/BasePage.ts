import { getLogger } from '../helpers/Logger';
import { captureScreenshot } from '../helpers/ScreenshotHelper';
import {
  waitForAnyDisplayed,
  waitForDisplayed,
  waitForTapReady,
  waitUntilElementTapReady,
} from '../helpers/WaitHelper';

export abstract class BasePage {
  protected async step<T>(name: string, action: () => Promise<T>): Promise<T> {
    const logger = getLogger();
    logger.info(`STEP START: ${name}`);
    await captureScreenshot(`before_${name}`);

    try {
      const result = await action();
      await captureScreenshot(`after_${name}`);
      logger.info(`STEP PASS: ${name}`);
      return result;
    } catch (error) {
      logger.error(`STEP FAIL: ${name} -> ${String(error)}`);
      throw error;
    }
  }

  protected async findWithRetry(
    selectors: string[],
    timeoutMs = 30000,
  ): Promise<WebdriverIO.Element> {
    const { selector, element } = await waitForAnyDisplayed(
      selectors,
      timeoutMs,
    );
    getLogger().debug(`Resolved selector: ${selector}`);
    return element;
  }

  protected async clickWithRetry(
    selectors: string[],
    label: string,
    timeoutMs = 30000,
  ): Promise<void> {
    const element = await this.findWithRetry(selectors, timeoutMs);
    await waitUntilElementTapReady(element, label, timeoutMs);
    getLogger().info(`Clicking ${label}`);
    await element.click();
  }

  protected async typeWithRetry(
    selectors: string[],
    value: string,
    label: string,
    timeoutMs = 30000,
  ): Promise<void> {
    const element = await this.findWithRetry(selectors, timeoutMs);
    await browser.waitUntil(
      async () => element.isEnabled().catch(() => true),
      {
        timeout: timeoutMs,
        timeoutMsg: `Field not enabled within ${timeoutMs}ms: ${label}`,
      },
    );
    getLogger().info(`Typing into ${label}`);
    await element.click();
    await element.clearValue();
    await element.setValue(value);
  }

  protected async isAnyVisible(selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      const element = await $(selector);
      if (await element.isExisting()) {
        if (await element.isDisplayed()) {
          return true;
        }
      }
    }
    return false;
  }

  protected async waitForHomeIndicator(
    selectors: string[],
    description: string,
    timeoutMs = 90000,
  ): Promise<void> {
    await waitForDisplayed(selectors[0], timeoutMs).catch(async () => {
      await waitForAnyDisplayed(selectors, timeoutMs);
    });
    getLogger().info(`Home indicator visible: ${description}`);
  }

  protected async safeClick(selector: string, label: string): Promise<void> {
    const element = await waitForTapReady(selector);
    getLogger().info(`Clicking ${label}`);
    await element.click();
  }
}
