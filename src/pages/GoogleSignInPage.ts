import { DialogHandler } from '../helpers/DialogHandler';
import { getLogger } from '../helpers/Logger';
import { waitForAnyDisplayed, waitUntilCondition } from '../helpers/WaitHelper';
import { BasePage } from './BasePage';

export class GoogleSignInPage extends BasePage {
  private readonly dialogHandler = new DialogHandler();

  private readonly signInButtonSelectors = [
    '//*[@text="Sign in"]',
    '//*[@content-desc="Sign in"]',
    '//*[contains(@text,"Sign in to")]',
    '//*[@resource-id="com.android.vending:id/unauth_sign_in_button"]',
  ];

  private readonly emailFieldSelectors = [
    '//*[@resource-id="identifierId"]',
    '//*[@content-desc="Email or phone"]',
    '//*[@text="Email or phone"]/following-sibling::*[@class="android.widget.EditText"][1]',
    '//android.widget.EditText[1]',
  ];

  private readonly passwordFieldSelectors = [
    '//*[@resource-id="password"]',
    '//*[@name="password"]',
    '//*[@text="Enter your password"]/following-sibling::*[@class="android.widget.EditText"][1]',
    '//android.widget.EditText[@password="true"]',
    '//android.widget.EditText[1]',
  ];

  private readonly signedInIndicators = [
    '//*[@content-desc="Search Google Play"]',
    '//*[@text="Search apps & games"]',
    '//*[@resource-id="com.android.vending:id/search_bar_hint"]',
    '//*[@resource-id="com.android.vending:id/search_box_idle_text"]',
    '//*[@content-desc="Games"]',
    '//*[@content-desc="Apps"]',
  ];

  async isSignedIn(): Promise<boolean> {
    await this.dialogHandler.dismissKnownPopups();
    return this.isAnyVisible(this.signedInIndicators);
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.step('google_sign_in', async () => {
      const logger = getLogger();

      if (await this.isSignedIn()) {
        logger.info('Already signed in to Google Play.');
        return;
      }

      await this.clickWithRetry(this.signInButtonSelectors, 'Sign in');
      await this.dialogHandler.dismissKnownPopups();

      await this.typeWithRetry(this.emailFieldSelectors, email, 'Google email');
      await this.dialogHandler.tapNextIfVisible();
      await this.dialogHandler.dismissKnownPopups();

      await waitUntilCondition(
        'password field visible',
        async () => this.isAnyVisible(this.passwordFieldSelectors),
        30000,
      );

      await this.typeWithRetry(
        this.passwordFieldSelectors,
        password,
        'Google password',
      );
      await this.dialogHandler.tapNextIfVisible();
      await this.dialogHandler.acceptTermsIfPresent();
      await this.dialogHandler.dismissKnownPopups();

      await waitUntilCondition(
        'Play Store home screen visible after sign-in',
        async () => this.isSignedIn(),
        90000,
        1500,
      );

      await waitForAnyDisplayed(this.signedInIndicators, 10000);
      logger.info('Google sign-in completed successfully.');
    });
  }
}
