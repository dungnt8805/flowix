import { expect, test } from '@playwright/test';

test('shows the sprint 2 workspace diagram shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Flo Vis' })).toBeVisible();
  await expect(page.getByLabel('Mermaid source')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Live Preview' })).toBeVisible();
});

test('creates workspace, project, and first diagram draft', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'Workspace' }).fill('Release Planning');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('button', { name: /Release Planning/ })).toBeVisible();

  await page.getByRole('textbox', { name: 'Project' }).fill('Sprint Maps');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('button', { name: /Sprint Maps/ })).toBeVisible();
  await expect(page.getByText('No diagrams in this project')).toBeVisible();

  await page.getByRole('button', { name: 'New diagram' }).click();

  await expect(page.getByRole('button', { name: /Blank flowchart 1/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Blank flowchart 1' })).toBeVisible();
  await expect(page.getByLabel('Mermaid source')).toHaveValue(/Draft --> Preview/);
});

test('creates a diagram from a sequence starter template', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Template').selectOption('sequence-flow');
  await page.getByRole('button', { name: 'New diagram' }).click();

  await expect(page.getByRole('button', { name: /Sequence flow 3/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sequence flow 3' })).toBeVisible();
  await expect(page.getByLabel('Mermaid source')).toHaveValue(/sequenceDiagram/);
  await expect(page.getByLabel('Mermaid source')).toHaveValue(/participant API as Backend API/);
});

test('edits, saves, and reloads a selected diagram draft', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Mermaid source').fill('flowchart LR\nSaved[Saved] --> Reloaded[Reloaded]');
  await expect(page.getByText('Unsaved changes')).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: /Auth Request Flow/ }).click();
  await expect(page.getByLabel('Mermaid source')).toHaveValue(/sequenceDiagram/);

  await page.getByRole('button', { name: /System Context/ }).click();
  await expect(page.getByLabel('Mermaid source')).toHaveValue(/Saved.*Reloaded/s);
});

test('shows a structured render error without breaking the editor', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Mermaid source').fill('not mermaid');

  await expect(page.getByRole('alert', { name: 'Mermaid render error' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Render error' })).toBeVisible();
  await expect(page.getByLabel('Mermaid source')).toBeVisible();
});
