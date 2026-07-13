import { ContextHelper } from '../helpers/ContextHelper';
import { DialogHandler } from '../helpers/DialogHandler';
import { getLogger } from '../helpers/Logger';
import { captureScreenshot } from '../helpers/ScreenshotHelper';
import { waitForAnyDisplayed, waitUntilCondition } from '../helpers/WaitHelper';
import { BasePage } from './BasePage';

export class GoogleSignInPage extends BasePage {
  private readonly dialogHandler = new DialogHandler();
  private readonly contextHelper = new ContextHelper();

  private readonly playStoreSignInSelectors = [
    '//*[@resource-id="com.android.vending:id/unauth_sign_in_button"]',
    '//*[@text="SIGN IN"]',
    '//*[@text="Sign in"]',
    '//*[@content-desc="Sign in"]',
    '//*[contains(@text,"Sign in to")]',
  ];

  private readonly addAccountSelectors = [
    '//*[@text="Add account"]',
    '//*[@text="Add another account"]',
    '//*[@content-desc="Add account"]',
  ];

  private readonly googleAccountTypeSelectors = [
    '//*[@text="Google"]',
    '//*[contains(@text,"Google")]',
  ];

  private readonly nativeEmailSelectors = [
    '//*[@resource-id="identifierId"]',
    '//*[@resource-id="com.google.android.gms:id/account_name"]',
    '//*[@content-desc="Email or phone"]',
    '//*[@text="Email or phone"]',
    '//*[@package="com.google.android.gms"]//android.widget.EditText[1]',
    '//*[@package="com.google.android.gms"]//android.widget.AutoCompleteTextView[1]',
    'android=new UiSelector().packageName("com.google.android.gms").className("android.widget.EditText").instance(0)',
    'android=new UiSelector().packageName("com.google.android.gms").className("android.widget.AutoCompleteTextView").instance(0)',
    '//android.widget.EditText[1]',
  ];

  private readonly nativePasswordSelectors = [
    '//*[@resource-id="password"]',
    '//*[@text="Enter your password"]',
    '//*[@package="com.google.android.gms"]//android.widget.EditText[@password="true"]',
    '//*[@package="com.google.android.gms"]//android.widget.EditText[2]',
    'android=new UiSelector().packageName("com.google.android.gms").className("android.widget.EditText").instance(1)',
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
    await this.contextHelper.switchToNative();
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

      let signedIn = await this.trySignInViaPlayStore(email, password);
      if (!signedIn) {
        logger.info('Play Store sign-in path did not complete, trying Settings.');
        signedIn = await this.trySignInViaAndroidSettings(email, password);
      }

      if (!signedIn) {
        throw new Error('Google sign-in did not complete on Play Store.');
      }

      await browser.activateApp('com.android.vending');
      await waitUntilCondition(
        'Play Store home screen visible after sign-in',
        async () => this.isSignedIn(),
        90000,
        1500,
      );

      logger.info('Google sign-in completed successfully.');
    });
  }

  private async trySignInViaPlayStore(
    email: string,
    password: string,
  ): Promise<boolean> {
    await browser.activateApp('com.android.vending');
    await this.dialogHandler.dismissKnownPopups();
    await this.clickWithRetry(this.playStoreSignInSelectors, 'Play Store SIGN IN');
    await this.dialogHandler.dismissKnownPopups();
    await this.waitForSignInSurface();
    await this.enterCredentials(email, password);
    await this.dialogHandler.acceptTermsIfPresent();
    await this.dialogHandler.dismissKnownPopups();
    await browser.activateApp('com.android.vending');
    return this.isSignedIn();
  }

  private async trySignInViaAndroidSettings(
    email: string,
    password: string,
  ): Promise<boolean> {
    const logger = getLogger();
    logger.info('Opening Android Add Account settings.');

    await browser.execute('mobile: shell', {
      command: 'am',
      args: ['start', '-a', 'android.settings.ADD_ACCOUNT_SETTINGS'],
    });

    await waitUntilCondition(
      'Add account settings visible',
      async () =>
        this.isAnyVisible(this.googleAccountTypeSelectors) ||
        this.isAnyVisible(this.addAccountSelectors),
      30000,
    );

    if (await this.isAnyVisible(this.addAccountSelectors)) {
      await this.clickWithRetry(this.addAccountSelectors, 'Add account');
    }

    await this.clickWithRetry(this.googleAccountTypeSelectors, 'Google account');
    await this.dialogHandler.dismissKnownPopups();
    await this.waitForSignInSurface();
    await this.enterCredentials(email, password);
    await this.dialogHandler.acceptTermsIfPresent();
    await this.dialogHandler.dismissKnownPopups();
    await browser.activateApp('com.android.vending');
    return this.isSignedIn();
  }

  private async waitForSignInSurface(): Promise<void> {
    await waitUntilCondition(
      'Google sign-in surface visible',
      async () => {
        if (await this.hasCredentialInputs()) {
          return true;
        }

        const contexts = await this.contextHelper.listContexts();
        if (contexts.some((context) => context.includes('WEBVIEW'))) {
          return true;
        }

        const activity = await browser.getCurrentActivity();
        const pkg = await browser.getCurrentPackage();
        return (
          pkg === 'com.google.android.gms' ||
          Boolean(activity && activity.includes('MinuteMaid'))
        );
      },
      45000,
      1000,
    );
  }

  private async prepareGmsSignInScreen(): Promise<void> {
    await this.contextHelper.switchToNative();
    const safeIntermediateSelectors = [
      '//*[@text="Add another account"]',
      '//*[@text="Use another account"]',
      '//*[@resource-id="com.google.android.gms:id/add_account"]',
    ];

    for (const selector of safeIntermediateSelectors) {
      const element = await $(selector);
      if (await element.isExisting()) {
        if (await element.isDisplayed()) {
          getLogger().info(`Tapping intermediate GMS selector: ${selector}`);
          await element.click();
          return;
        }
      }
    }
  }

  private async hasCredentialInputs(): Promise<boolean> {
    if (await this.isAnyVisible(this.nativeEmailSelectors)) {
      return true;
    }
    const editTexts = await this.getVisibleInputFields();
    return editTexts.length > 0;
  }

  private async getVisibleInputFields(): Promise<WebdriverIO.Element[]> {
    await this.contextHelper.switchToNative();
    const candidates = await $$(
      '//android.widget.EditText | //android.widget.AutoCompleteTextView',
    );
    const visible: WebdriverIO.Element[] = [];
    for (const candidate of await candidates.getElements()) {
      if (await candidate.isDisplayed()) {
        visible.push(candidate);
      }
    }
    return visible;
  }

  private async enterCredentials(email: string, password: string): Promise<void> {
    const logger = getLogger();
    await this.prepareGmsSignInScreen();

    if (await this.tryWebViewCredentials(email, password)) {
      logger.info('Entered credentials via WebView.');
      return;
    }

    if (await this.tryNativeCredentials(email, password)) {
      logger.info('Entered credentials via native UI.');
      return;
    }

    if (await this.tryVisibleInputFields(email, password)) {
      logger.info('Entered credentials via visible input scan.');
      return;
    }

    await captureScreenshot('google_sign_in_fields_not_found');
    throw new Error(
      'Could not locate Google email/password fields in native or WebView contexts.',
    );
  }

  private async tryVisibleInputFields(
    email: string,
    password: string,
  ): Promise<boolean> {
    await this.contextHelper.switchToNative();
    const emailInputs = await this.getVisibleInputFields();
    if (emailInputs.length === 0) {
      return false;
    }

    getLogger().info(`Found ${emailInputs.length} visible input field(s).`);
    await emailInputs[0].click();
    await emailInputs[0].setValue(email);
    await this.dialogHandler.tapNextIfVisible();
    await this.dialogHandler.dismissKnownPopups();

    await waitUntilCondition(
      'password input visible after email entry',
      async () => (await this.getVisibleInputFields()).length > 0,
      30000,
    );

    const passwordInputs = await this.getVisibleInputFields();
    let passwordField = passwordInputs[passwordInputs.length - 1];
    for (const field of passwordInputs) {
      const isPassword = await field.getAttribute('password');
      if (isPassword === 'true') {
        passwordField = field;
        break;
      }
    }

    await passwordField.click();
    await passwordField.setValue(password);
    await this.dialogHandler.tapNextIfVisible();
    return true;
  }

  private async tryNativeCredentials(
    email: string,
    password: string,
  ): Promise<boolean> {
    await this.contextHelper.switchToNative();

    if (!(await this.isAnyVisible(this.nativeEmailSelectors))) {
      return false;
    }

    await this.typeWithRetry(this.nativeEmailSelectors, email, 'Google email');
    await this.dialogHandler.tapNextIfVisible();
    await this.dialogHandler.dismissKnownPopups();

    await waitUntilCondition(
      'password field visible',
      async () => this.isAnyVisible(this.nativePasswordSelectors),
      30000,
    );

    await this.typeWithRetry(
      this.nativePasswordSelectors,
      password,
      'Google password',
    );
    await this.dialogHandler.tapNextIfVisible();
    await this.contextHelper.switchToNative();
    return true;
  }

  private async tryWebViewCredentials(
    email: string,
    password: string,
  ): Promise<boolean> {
    const emailSelectors = [
      '#identifierId',
      'input[type="email"]',
      'input[name="identifier"]',
      'input[name="Email"]',
    ];
    const passwordSelectors = [
      'input[name="Passwd"]',
      'input[type="password"]',
      '#password',
      'input[name="password"]',
    ];
    const nextSelectors = [
      '#identifierNext',
      '#passwordNext',
      'button[type="button"]',
      'button[type="submit"]',
    ];

    await this.contextHelper.refreshContexts(15000);

    const emailEntered = await this.contextHelper.runInEachWebView(async () => {
      for (const selector of emailSelectors) {
        const field = await $(selector);
        if (await field.isExisting()) {
          if (await field.isDisplayed()) {
            await field.setValue(email);
            for (const nextSelector of nextSelectors) {
              const nextButton = await $(nextSelector);
              if (await nextButton.isExisting()) {
                if (await nextButton.isDisplayed()) {
                  await nextButton.click();
                  break;
                }
              }
            }
            return true;
          }
        }
      }
      return null;
    });

    if (!emailEntered) {
      await this.contextHelper.switchToNative();
      return false;
    }

    await this.contextHelper.refreshContexts(15000);

    await waitUntilCondition(
      'WebView password field visible',
      async () => {
        const result = await this.contextHelper.runInEachWebView(async () => {
          for (const selector of passwordSelectors) {
            const field = await $(selector);
            if (await field.isExisting()) {
              if (await field.isDisplayed()) {
                return true;
              }
            }
          }
          return null;
        });
        return Boolean(result);
      },
      30000,
    );

    await this.contextHelper.runInEachWebView(async () => {
      for (const selector of passwordSelectors) {
        const field = await $(selector);
        if (await field.isExisting()) {
          if (await field.isDisplayed()) {
            await field.setValue(password);
            for (const nextSelector of nextSelectors) {
              const nextButton = await $(nextSelector);
              if (await nextButton.isExisting()) {
                if (await nextButton.isDisplayed()) {
                  await nextButton.click();
                  break;
                }
              }
            }
            return true;
          }
        }
      }
      return null;
    });

    await this.contextHelper.switchToNative();
    return true;
  }
}
