import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2030-05-06T08:00:00') })
  await page.goto('/')
  await page.getByLabel('Select date').fill('2030-05-20')
  await expect(page.getByText('No bookings for this day.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'New booking', exact: true }).first().click()
})

async function createBooking(page: Page, expectedDate: string) {
  await page.getByLabel('Meeting title').fill('Review regression')
  await page.getByLabel('Start time').selectOption('10:00')
  await page.getByLabel('End time').selectOption('11:00')
  const saved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/api/bookings'))
  await page.getByRole('button', { name: 'Create booking' }).click()
  const response = await saved
  expect(response.status()).toBe(201)
  expect(response.request().postDataJSON().date).toBe(expectedDate)
  const booking = await response.json() as { id: string; date: string }
  expect(booking.date).toBe(expectedDate)
  const card = page.locator(`[data-booking-id="${booking.id}"]`)
  await expect(card).toBeVisible()
  return card
}

for (const scenario of [
  { name: 'past date', input: '2030-05-05', accepted: '2030-05-20' },
  { name: 'empty date', input: '', accepted: '2030-05-20' },
  { name: 'valid date', input: '2030-05-21', accepted: '2030-05-21' },
]) {
  test(`${scenario.name}: displayed date matches timeline and created booking`, async ({ page }) => {
    const date = page.getByLabel('Booking date', { exact: true })
    await date.fill(scenario.input)
    await expect(date).toHaveValue(scenario.accepted)
    await expect(page.getByLabel('Select date')).toHaveValue(scenario.accepted)
    await expect(page.getByRole('button', { name: 'Create booking' })).toBeEnabled()
    await createBooking(page, await date.inputValue())
  })
}

test('nested confirmation cancellation restores edit focus and retains the draft', async ({ page }) => {
  const card = await createBooking(page, '2030-05-20')
  await card.click()
  const edit = page.getByRole('dialog', { name: 'Edit booking', exact: true })
  const title = edit.getByLabel('Meeting title')
  await title.fill('Unsaved review changes')
  await page.keyboard.press('Escape')
  const discard = page.getByRole('dialog', { name: 'Discard unsaved changes?' })
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Keep working' }).click()
  await expect(discard).not.toBeVisible()
  await expect(edit).toBeVisible()
  await expect.poll(() => edit.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true)
  await expect(title).toHaveValue('Unsaved review changes')

  // Escape on the nested confirmation must cancel it, not discard the draft.
  await page.keyboard.press('Escape')
  await expect(discard).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(discard).not.toBeVisible()
  await expect.poll(() => edit.evaluate(dialog => dialog.contains(document.activeElement))).toBe(true)
  await expect(title).toHaveValue('Unsaved review changes')

  for (const cancelWithEscape of [false, true]) {
    const deleteButton = edit.getByRole('button', { name: 'Delete booking', exact: true })
    await deleteButton.click()
    const confirmation = page.getByRole('dialog', { name: 'Delete this booking?' })
    await expect(confirmation).toBeVisible()
    if (cancelWithEscape) await page.keyboard.press('Escape')
    else await confirmation.getByRole('button', { name: 'Keep working' }).click()
    await expect(confirmation).not.toBeVisible()
    await expect(edit).toBeVisible()
    await expect(deleteButton).toBeFocused()
    await expect(title).toHaveValue('Unsaved review changes')
  }
})
