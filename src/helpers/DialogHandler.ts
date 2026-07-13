import { getLogger } from './Logger';
import { waitForAnyDisplayed, waitForTapReady } from './WaitHelper';

const dismissSelectors = [
  '//*[@text="Allow"]',
  '//*[@text="ALLOW"]',
  '//*[@text="While using the app"]',
  '//*[@text="Accept"]',
  '//*[@text="I agree"]',
  '//*[@text="Agree"]',
  '//*[@text="Got it"]',
  '//*[@text="OK"]',
  '//*[@text="Continue"]',
  '//*[@text="No thanks"]',
  '//*[@text="Skip"]',
  '//*[@content-desc="Dismiss"]',
  '//*[@content-desc="Close"]',
  '//*[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]',
  '//*[@resource-id="com.android.permissioncontroller:id/permission_allow_foreground_only_button"]',
];

export class DialogHandler {
  async dismissKnownPopups(maxAttempts = 5): Promise<void> {
    const logger = getLogger();

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let dismissed = false;

      for (const selector of dismissSelectors) {
        const elements = await $$(selector);
        for (const element of elements) {
          if (await element.isDisplayed()) {
            logger.info(`Dismissing dialog via selector: ${selector}`);
            await element.click();
            dismissed = true;
            break;
          }
        }
        if (dismissed) {
          break;
        }
      }

      if (!dismissed) {
        return;
      }
    }
  }

  async acceptTermsIfPresent(): Promise<void> {
    const logger = getLogger();
    const termsSelectors = [
      '//*[@text="I agree"]',
      '//*[@text="Accept"]',
      '//*[@text="Agree"]',
      '//*[@text="Terms of Service"]/following-sibling::*[@clickable="true"][1]',
      '//*[@resource-id="terms_accept"]',
    ];

    try {
      const { selector, element } = await waitForAnyDisplayed(termsSelectors, 5000);
      logger.info(`Accepting terms via selector: ${selector}`);
      await element.click();
    } catch {
      logger.info('No terms dialog detected.');
    }
  }

  async tapIfVisible(selector: string, label: string): Promise<boolean> {
    const element = await $(selector);
    if (await element.isExisting()) {
      if (await element.isDisplayed()) {
        getLogger().info(`Tapping ${label}`);
        await element.click();
        return true;
      }
    }
    return false;
  }

  async tapNextIfVisible(): Promise<void> {
    const nextSelectors = [
      '//*[@text="Next"]',
      '//*[@content-desc="Next"]',
      '//*[@resource-id="identifierNext"]',
      '//*[@resource-id="passwordNext"]',
    ];

    for (const selector of nextSelectors) {
      const clicked = await this.tapIfVisible(selector, 'Next');
      if (clicked) {
        return;
      }
    }

    try {
      const next = await waitForTapReady('//*[@text="Next"]', 3000);
      await next.click();
    } catch {
      getLogger().info('Next button not visible.');
    }
  }
}
