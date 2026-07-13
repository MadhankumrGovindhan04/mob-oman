import { loadEnvConfig } from '../config/env';
import { captureFailureDiagnostics } from '../helpers/ScreenshotHelper';
import { getLogger } from '../helpers/Logger';
import { PlayStorePage } from '../pages/PlayStorePage';

describe('Google Play Store install flow', () => {
  const config = loadEnvConfig();
  const playStorePage = new PlayStorePage();

  it('signs in to Google and installs the target application', async () => {
    const logger = getLogger();
    logger.info('Starting Play Store automation flow.');
    logger.info(`Search term: ${config.appSearchTerm}`);
    logger.info(`Expected package: ${config.androidAppPackage}`);

    try {
      await playStorePage.launchPlayStore();
      await playStorePage.ensureSignedIn(
        config.googleEmail,
        config.googlePassword,
      );
      await playStorePage.searchApplication(config.appSearchTerm);
      await playStorePage.openApplicationDetails(
        config.appSearchTerm,
        config.androidAppPackage,
      );
      await playStorePage.installIfRequired(config.androidAppPackage);
      await playStorePage.verifyOpenButtonVisible();
      logger.info('Play Store automation flow completed successfully.');
    } catch (error) {
      await captureFailureDiagnostics('playstore_install_flow');
      throw new Error(
        `Play Store automation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
});
