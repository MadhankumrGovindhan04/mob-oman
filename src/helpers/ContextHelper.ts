import { getLogger } from './Logger';

const NATIVE_CONTEXT = 'NATIVE_APP';

export class ContextHelper {
  async switchToNative(): Promise<void> {
    await browser.switchContext(NATIVE_CONTEXT);
  }

  async refreshContexts(waitForWebviewMs = 20000): Promise<string[]> {
    try {
      await browser.execute('mobile: getContexts', { waitForWebviewMs });
    } catch (error) {
      getLogger().debug(`Context refresh fallback: ${String(error)}`);
    }
    return this.listContexts();
  }

  async listContexts(): Promise<string[]> {
    const contexts = await browser.getContexts();
    return contexts.map((context) => String(context));
  }

  async switchToFirstWebView(): Promise<boolean> {
    const contexts = await this.refreshContexts();
    const webview = contexts.find((context) => context.includes('WEBVIEW'));
    if (!webview) {
      return false;
    }
    getLogger().info(`Switching to context: ${webview}`);
    await browser.switchContext(webview);
    return true;
  }

  async runInEachWebView<T>(
    action: () => Promise<T | null>,
  ): Promise<T | null> {
    const contexts = await this.refreshContexts();
    for (const context of contexts) {
      if (!context.includes('WEBVIEW')) {
        continue;
      }
      await browser.switchContext(context);
      const result = await action();
      if (result !== null) {
        return result;
      }
    }
    await this.switchToNative();
    return null;
  }

  async getCurrentContextLabel(): Promise<string> {
    return String(await browser.getContext());
  }
}
