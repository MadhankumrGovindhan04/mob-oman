import { getLogger } from './Logger';

export async function waitForDisplayed(
  selector: string,
  timeoutMs = 30000,
  intervalMs = 500,
): Promise<WebdriverIO.Element> {
  const element = await browser.waitUntil(
    async () => {
      const candidate = await $(selector);
      if (!(await candidate.isExisting())) {
        return false;
      }
      return (await candidate.isDisplayed()) ? candidate : false;
    },
    {
      timeout: timeoutMs,
      interval: intervalMs,
      timeoutMsg: `Element not displayed within ${timeoutMs}ms: ${selector}`,
    },
  );

  return element as unknown as WebdriverIO.Element;
}

export async function waitForTapReady(
  selector: string,
  timeoutMs = 30000,
  intervalMs = 500,
): Promise<WebdriverIO.Element> {
  const element = await browser.waitUntil(
    async () => {
      const candidate = await $(selector);
      if (!(await candidate.isExisting())) {
        return false;
      }
      if (!(await candidate.isDisplayed())) {
        return false;
      }
      const enabled = await candidate.isEnabled().catch(() => true);
      return enabled ? candidate : false;
    },
    {
      timeout: timeoutMs,
      interval: intervalMs,
      timeoutMsg: `Element not ready to tap within ${timeoutMs}ms: ${selector}`,
    },
  );

  return element as unknown as WebdriverIO.Element;
}

/** Native Appium alias — do not use browser-only waitForClickable. */
export async function waitForClickable(
  selector: string,
  timeoutMs = 30000,
  intervalMs = 500,
): Promise<WebdriverIO.Element> {
  return waitForTapReady(selector, timeoutMs, intervalMs);
}

export async function waitUntilElementTapReady(
  element: WebdriverIO.Element,
  label: string,
  timeoutMs = 30000,
  intervalMs = 500,
): Promise<void> {
  await browser.waitUntil(
    async () => {
      if (!(await element.isExisting())) {
        return false;
      }
      if (!(await element.isDisplayed())) {
        return false;
      }
      return element.isEnabled().catch(() => true);
    },
    {
      timeout: timeoutMs,
      interval: intervalMs,
      timeoutMsg: `Element not ready to tap within ${timeoutMs}ms: ${label}`,
    },
  );
}

export async function waitUntilCondition(
  description: string,
  condition: () => Promise<boolean>,
  timeoutMs = 60000,
  intervalMs = 1000,
): Promise<void> {
  await browser.waitUntil(condition, {
    timeout: timeoutMs,
    interval: intervalMs,
    timeoutMsg: `Timed out waiting for condition: ${description}`,
  });
  getLogger().info(`Condition met: ${description}`);
}

export async function waitForAnyDisplayed(
  selectors: string[],
  timeoutMs = 30000,
): Promise<{ selector: string; element: WebdriverIO.Element }> {
  let resolved: { selector: string; element: WebdriverIO.Element } | undefined;

  await browser.waitUntil(
    async () => {
      for (const selector of selectors) {
        const element = await $(selector);
        if (await element.isExisting()) {
          if (await element.isDisplayed()) {
            resolved = {
              selector,
              element: element as unknown as WebdriverIO.Element,
            };
            return true;
          }
        }
      }
      return false;
    },
    {
      timeout: timeoutMs,
      interval: 500,
      timeoutMsg: `None of the selectors became visible within ${timeoutMs}ms: ${selectors.join(', ')}`,
    },
  );

  if (!resolved) {
    throw new Error(
      `None of the selectors became visible within ${timeoutMs}ms: ${selectors.join(', ')}`,
    );
  }

  return resolved;
}
