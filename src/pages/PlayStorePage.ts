import { getLogger } from '../helpers/Logger';
import { waitForAnyDisplayed, waitUntilCondition } from '../helpers/WaitHelper';
import { BasePage } from './BasePage';
import { GoogleSignInPage } from './GoogleSignInPage';

export class PlayStorePage extends BasePage {
  private readonly googleSignInPage = new GoogleSignInPage();

  private readonly searchEntrySelectors = [
    '//*[@content-desc="Search Google Play"]',
    '//*[@resource-id="com.android.vending:id/search_box_idle_text"]',
    '//*[@text="Search apps & games"]',
    '//*[@resource-id="com.android.vending:id/search_bar_hint"]',
  ];

  private readonly searchInputSelectors = [
    '//*[@resource-id="com.android.vending:id/search_box_text_input"]',
    '//*[@resource-id="android:id/search_src_text"]',
    '//android.widget.EditText',
  ];

  async launchPlayStore(): Promise<void> {
    await this.step('launch_play_store', async () => {
      await browser.activateApp('com.android.vending');
      await waitUntilCondition(
        'Play Store process in foreground',
        async () => {
          const currentPackage = await browser.getCurrentPackage();
          return currentPackage === 'com.android.vending';
        },
        30000,
      );
      getLogger().info('Google Play Store launched.');
    });
  }

  async ensureSignedIn(email: string, password: string): Promise<void> {
    await this.step('ensure_google_sign_in', async () => {
      await this.googleSignInPage.signIn(email, password);
    });
  }

  async searchApplication(searchTerm: string): Promise<void> {
    await this.step('search_application', async () => {
      await this.clickWithRetry(this.searchEntrySelectors, 'Play Store search');
      await this.typeWithRetry(
        this.searchInputSelectors,
        searchTerm,
        'Play Store search input',
      );
      await browser.pressKeyCode(66);
      getLogger().info(`Submitted search for: ${searchTerm}`);
    });
  }

  async openApplicationDetails(appSearchTerm: string, packageName: string): Promise<void> {
    await this.step('open_application_details', async () => {
      const resultSelectors = [
        `//*[contains(@text,"${appSearchTerm}") or contains(@content-desc,"${appSearchTerm}")]`,
        `//*[contains(@text,"Brisbane Broncos") or contains(@content-desc,"Brisbane Broncos")]`,
        `//*[contains(@content-desc,"${packageName}")]`,
      ];

      await waitUntilCondition(
        'search results visible',
        async () => this.isAnyVisible(resultSelectors),
        45000,
      );

      await this.clickWithRetry(resultSelectors, 'Application search result');
      getLogger().info('Opened application details page.');
    });
  }

  async installIfRequired(expectedPackage: string): Promise<void> {
    await this.step('install_application', async () => {
      const installSelectors = [
        '//*[@text="Install"]',
        '//*[@text="INSTALL"]',
        '//*[@content-desc="Install"]',
      ];
      const openSelectors = [
        '//*[@text="Open"]',
        '//*[@text="OPEN"]',
        '//*[@content-desc="Open"]',
      ];
      const updateSelectors = [
        '//*[@text="Update"]',
        '//*[@content-desc="Update"]',
      ];

      const hasInstall = await this.isAnyVisible(installSelectors);
      const hasOpen = await this.isAnyVisible(openSelectors);
      const hasUpdate = await this.isAnyVisible(updateSelectors);

      if (hasOpen && !hasInstall && !hasUpdate) {
        getLogger().info('Application already installed. Open button visible.');
        return;
      }

      if (hasUpdate) {
        await this.clickWithRetry(updateSelectors, 'Update');
      } else if (hasInstall) {
        await this.clickWithRetry(installSelectors, 'Install');
      } else {
        throw new Error(
          'Neither Install, Update, nor Open button was found on the app details page.',
        );
      }

      await waitUntilCondition(
        'installation completed and Open button visible',
        async () => this.isAnyVisible(openSelectors),
        180000,
        2000,
      );

      const currentPackage = await browser.getCurrentPackage();
      getLogger().info(
        `Installation complete. Current package: ${currentPackage}. Expected: ${expectedPackage}`,
      );
    });
  }

  async verifyOpenButtonVisible(): Promise<void> {
    await this.step('verify_open_button', async () => {
      const openSelectors = [
        '//*[@text="Open"]',
        '//*[@text="OPEN"]',
        '//*[@content-desc="Open"]',
      ];

      await waitForAnyDisplayed(openSelectors, 30000);
      getLogger().info('Verified Open button is displayed.');
    });
  }
}
