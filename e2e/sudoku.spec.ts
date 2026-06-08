import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForBoard(page: Page) {
  await page.waitForURL(/\/sessions\/.+/, { timeout: 15_000 });
  await expect(page.locator('.sidebar__btn--primary')).toBeEnabled({ timeout: 10_000 });
}

async function clickFirstEditableCell(page: Page) {
  const cell = page.locator('.sudoku-cell:not(.sudoku-cell--fixed)').first();
  await cell.click();
  return cell;
}

async function ensureGalleryRows(page: Page, minRows: number) {
  await page.locator('.gallery__refresh').click();
  await page.waitForFunction(
    (n) => document.querySelectorAll('.gallery__row').length >= n,
    minRows,
    { timeout: 10_000 }
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Board rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('renders a 9x9 board on page load', async ({ page }) => {
    await expect(page.locator('.sudoku-cell')).toHaveCount(81);
  });

  test('pre-filled cells have the fixed style', async ({ page }) => {
    await expect(page.locator('.sudoku-cell--fixed')).not.toHaveCount(0);
  });

  test('navigates to a session URL on load', async ({ page }) => {
    await expect(page).toHaveURL(/\/sessions\/.+/);
  });
});

test.describe('Cell editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('entering a digit in an empty cell updates the display', async ({ page }) => {
    // Try every editable cell × every digit until the API accepts one.
    // A single cell can conflict with all 9 digits; iterating all cells guarantees a hit.
    const editableCells = page.locator('.sudoku-cell:not(.sudoku-cell--fixed)');
    const count = await editableCells.count();
    let entered = false;

    outer:
    for (let ci = 0; ci < count; ci++) {
      const cell = editableCells.nth(ci);
      await cell.click();
      await expect(cell).toHaveClass(/sudoku-cell--selected/);

      for (let digit = 1; digit <= 9; digit++) {
        await page.keyboard.press(String(digit));
        try {
          // Wait for the API to respond and the cell text to update
          await expect(cell).toHaveText(String(digit), { timeout: 3_000 });
          entered = true;
          break outer;
        } catch {
          // Digit was rejected (conflict or server validation) — clear and try the next
          await page.keyboard.press('Backspace');
        }
      }
    }
    expect(entered).toBe(true);
  });

  test('pressing Backspace clears a cell value', async ({ page }) => {
    const cell = await clickFirstEditableCell(page);

    for (let digit = 1; digit <= 9; digit++) {
      await page.keyboard.press(String(digit));
      const text = await cell.textContent();
      if (text?.trim() === String(digit)) break;
    }

    await page.keyboard.press('Backspace');
    await expect(cell).toHaveText('');
  });

  test('fixed cells cannot be edited', async ({ page }) => {
    const fixedCell = page.locator('.sudoku-cell--fixed').first();
    const originalText = await fixedCell.textContent();
    await fixedCell.click();
    await page.keyboard.press('1');
    await expect(fixedCell).toHaveText(originalText!);
  });
});

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('arrow keys move the selected cell', async ({ page }) => {
    await page.locator('.sudoku-cell').first().click();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.sudoku-cell--selected')).toHaveCount(1);
  });

  test('selection does not go out of bounds', async ({ page }) => {
    await page.locator('.sudoku-cell').first().click();
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.sudoku-cell--selected')).toHaveCount(1);
  });
});

test.describe('Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('difficulty buttons are visible', async ({ page }) => {
    await expect(page.locator('.sidebar__diff-btn')).toHaveCount(4);
  });

  test('New Game button creates a new session', async ({ page }) => {
    const currentUrl = page.url();
    await page.locator('.sidebar__btn--primary').click();
    await expect(page).not.toHaveURL(currentUrl, { timeout: 15_000 });
    await waitForBoard(page);
  });

  test('Auto-Solve shows confirmation before solving', async ({ page }) => {
    await page.locator('button', { hasText: 'Auto-Solve' }).click();
    await expect(page.locator('.sidebar__confirm')).toBeVisible();
    await expect(page.locator('.sidebar__confirm-text')).toContainText("won't count");
  });

  test('cancelling solve dismisses confirmation', async ({ page }) => {
    await page.locator('button', { hasText: 'Auto-Solve' }).click();
    await page.locator('button', { hasText: 'Cancel' }).click();
    await expect(page.locator('.sidebar__confirm')).not.toBeVisible();
  });

  test('confirming solve fills the board and locks it', async ({ page }) => {
    await page.locator('button', { hasText: 'Auto-Solve' }).click();
    await page.locator('button', { hasText: 'Solve it' }).click();

    await page.waitForFunction(
      () => {
        const cells = document.querySelectorAll('.sudoku-cell');
        return cells.length === 81 && Array.from(cells).every((c) => c.textContent?.trim() !== '');
      },
      { timeout: 15_000 }
    );

    await expect(page.locator('button', { hasText: 'Auto-Solve' })).toBeDisabled();
  });
});

test.describe('Board gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('shows the gallery section', async ({ page }) => {
    await expect(page.locator('.gallery')).toBeVisible();
  });

  test('lists at least the current session', async ({ page }) => {
    await expect(page.locator('.gallery__row')).not.toHaveCount(0);
  });

  test('clicking a gallery row navigates to that session', async ({ page }) => {
    await page.locator('.sidebar__btn--primary').click();
    await expect(page).not.toHaveURL(page.url(), { timeout: 15_000 });
    await waitForBoard(page);
    await ensureGalleryRows(page, 2);

    // Wait for the active row to be marked before querying for an inactive one
    await expect(page.locator('.gallery__row--active')).toHaveCount(1, { timeout: 5_000 });
    const inactiveRow = page.locator('.gallery__row:not(.gallery__row--active)').first();
    const sessionId = await inactiveRow.locator('.gallery__cell--id').getAttribute('title');
    await inactiveRow.click();
    await page.waitForURL(new RegExp(sessionId!.trim()), { timeout: 10_000 });
  });
});

test.describe('Leaderboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('shows the leaderboard section', async ({ page }) => {
    await expect(page.locator('.leaderboard')).toBeVisible();
  });

  test('shows empty state when the current session has no completions', async ({ page }) => {
    await expect(page.locator('.leaderboard__empty')).toBeVisible();
  });
});

// ── Keyboard accessibility ────────────────────────────────────────────────────

test.describe('Keyboard accessibility: sidebar buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
  });

  test('all visible sidebar buttons have tabindex="0"', async ({ page }) => {
    const btns = page.locator('.sidebar button');
    const count = await btns.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(btns.nth(i)).toHaveAttribute('tabindex', '0');
    }
  });

  test('difficulty buttons are focusable and activatable with keyboard', async ({ page }) => {
    const hardBtn = page.locator('.sidebar__diff-btn', { hasText: 'Hard' });
    await hardBtn.focus();
    await expect(hardBtn).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(hardBtn).toHaveClass(/sidebar__diff-btn--active/);
  });

  test('disabled buttons retain tabindex="0" after solving', async ({ page }) => {
    await page.locator('button', { hasText: 'Auto-Solve' }).click();
    await page.locator('button', { hasText: 'Solve it' }).click();

    await page.waitForFunction(
      () => {
        const cells = document.querySelectorAll('.sudoku-cell');
        return cells.length === 81 && Array.from(cells).every((c) => c.textContent?.trim() !== '');
      },
      { timeout: 15_000 }
    );

    const autoSolveBtn = page.locator('button', { hasText: 'Auto-Solve' });
    await expect(autoSolveBtn).toBeDisabled();
    await expect(autoSolveBtn).toHaveAttribute('tabindex', '0');
  });
});

test.describe('Keyboard accessibility: board gallery rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForBoard(page);
    await page.locator('.sidebar__btn--primary').click();
    await expect(page).not.toHaveURL(page.url(), { timeout: 15_000 });
    await waitForBoard(page);
    await ensureGalleryRows(page, 2);
  });

  test('first gallery row has tabindex="0", others have tabindex="-1"', async ({ page }) => {
    await expect(page.locator('.gallery__row').first()).toHaveAttribute('tabindex', '0');
    await expect(page.locator('.gallery__row').nth(1)).toHaveAttribute('tabindex', '-1');
  });

  test('ArrowDown moves focus to the next row', async ({ page }) => {
    const rows = page.locator('.gallery__row');
    // Click the active (first) row to enter the widget, then arrow down
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('tabindex', '0');
    await expect(rows.nth(1)).toBeFocused();
  });

  test('ArrowUp moves focus back to the previous row', async ({ page }) => {
    const rows = page.locator('.gallery__row');
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowUp');
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await expect(rows.first()).toBeFocused();
  });

  test('ArrowUp does not move before the first row', async ({ page }) => {
    const rows = page.locator('.gallery__row');
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowUp');
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await expect(rows.first()).toBeFocused();
  });

  test('Enter on a focused row navigates to that session', async ({ page }) => {
    const rows = page.locator('.gallery__row');
    // Get session ID from row 1 before navigating
    const sessionId = await rows.nth(1).locator('.gallery__cell--id').getAttribute('title');
    // Click active row to enter widget, arrow down to row 1, then activate with Enter
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Enter');
    await page.waitForURL(new RegExp(sessionId!.trim()), { timeout: 10_000 });
  });

  test('Space on a focused row navigates to that session', async ({ page }) => {
    const rows = page.locator('.gallery__row');
    const sessionId = await rows.nth(1).locator('.gallery__cell--id').getAttribute('title');
    await rows.first().click();
    await expect(rows.first()).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('ArrowDown');
    await expect(rows.nth(1)).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('Space');
    await page.waitForURL(new RegExp(sessionId!.trim()), { timeout: 10_000 });
  });
});
