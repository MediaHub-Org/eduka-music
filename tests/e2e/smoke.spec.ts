import { expect, test } from '@playwright/test'

test('flujo principal', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').fill('re/fa#')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('chord-symbol')).toHaveText(/^Re\/Fa[#♯]$/)
  await page.getByRole('button', { name: /Siguiente|Variante/ }).click()
  await page.getByRole('link', { name: 'Practicar' }).click()
  await expect(page).toHaveURL(/#\/practicar$/)
})

test('sin scroll horizontal', async ({ page }) => {
  await page.goto('/')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('la PWA precarga su app shell y conserva interacciones offline', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker?.ready
    return !!navigator.serviceWorker?.controller && registration?.active?.state === 'activated'
  }, null, { timeout: 15_000 })
  const precached = await page.evaluate(async () => {
    const names = await caches.keys()
    const entries = await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => request.url)))
    return entries.flat()
  })
  expect(precached.some((url) => url.includes('/index.html?__WB_REVISION__'))).toBe(true)
  expect(precached.some((url) => url.includes('/assets/index-') && url.endsWith('.js'))).toBe(true)
  await context.setOffline(true)
  const offlineResponse = await page.evaluate(async () => {
    const response = await fetch('/index.html')
    return { ok: response.ok, text: await response.text() }
  })
  expect(offlineResponse.ok).toBe(true)
  expect(offlineResponse.text).toContain('<div id="root">')
  await page.getByRole('link', { name: 'Practicar' }).click()
  await expect(page).toHaveURL(/#\/practicar$/)
  await expect(page.getByRole('heading', { name: 'Practicar' })).toBeVisible()
})

test('favorito sobrevive a recarga', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Añadir a favoritos' }).click()
  await page.getByRole('link', { name: 'Mis cosas' }).click()
  await expect(page.getByRole('button', { name: /Mim7.*Guitarra/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: /Mim7.*Guitarra/ })).toBeVisible()
})
