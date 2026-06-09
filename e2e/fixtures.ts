import { test as base } from '@playwright/test';
import { setupMockApi } from './mock-api';
import type { MockApiOptions } from './mock-api';

export const test = base.extend({
  page: async ({ page }, use) => {
    await setupMockApi(page);
    await use(page);
  },
});

export function testWith(options: MockApiOptions) {
  return base.extend({
    page: async ({ page }, use) => {
      await setupMockApi(page, options);
      await use(page);
    },
  });
}

export { expect } from '@playwright/test';
