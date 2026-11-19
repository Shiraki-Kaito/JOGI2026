import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

// 公開DBへの書き込みはaccountモードを明示した場合のみ行う。
const [target, mode = 'guest'] = process.argv.slice(2);
let origin;
try {
  const url = new URL(target);
  assert.ok(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
  assert.ok(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash);
  assert.ok(['guest', 'account'].includes(mode));
  origin = url.origin;
} catch {
  console.error('使用方法: npm run verify:browser -- <所有するサイトのURL> [guest|account]');
  process.exit(1);
}

const SCARF_PRICE = 25;
const MAX_RUNS = 8;
const RUN_TIMEOUT_MS = 120_000;
const output = new URL(`../.browser-results/${Date.now()}-${mode}/`, import.meta.url);
const credentials = { login: `verify${randomBytes(10).toString('hex')}`, password: `Aa1!${randomBytes(24).toString('base64url')}` };
const report = { origin, mode, runs: [], api: [], errors: [] };
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
let context;
let page;
let stage = 'open';
let balance = 0;
let best;

async function openSession() {
  context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on('pageerror', error => report.errors.push(error.name));
  page.on('response', response => {
    const route = new URL(response.url()).pathname;
    if (['/api/auth/register', '/api/auth/login', '/api/auth/logout', '/api/profile', '/api/run', '/api/purchase', '/api/equip'].includes(route)) {
      report.api.push({ route, status: response.status() });
    }
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await enterLobby();
}

async function enterLobby() {
  await page.locator('#title-start').click();
  await page.waitForFunction(() => !document.querySelector('#play-button').disabled);
}

async function authenticate(register) {
  await page.locator(register ? '#auth-register' : '#auth-login-link').click();
  await page.locator('#auth-login').fill(credentials.login);
  await page.locator('#auth-password').fill(credentials.password);
  await page.locator('#auth-submit').click();
  if (register) {
    await page.locator('#recovery-result').waitFor({ state: 'visible' });
    await page.locator('#auth-close').click();
  } else {
    await page.locator('#auth-modal').waitFor({ state: 'hidden' });
  }
  await page.waitForFunction(login => document.querySelector('#account-name').textContent === login, credentials.login);
}

async function logout() {
  await page.locator('#auth-open').click();
  await page.locator('#auth-logout').click();
  await page.locator('#guest-account').waitFor({ state: 'visible' });
}

async function finishRun() {
  await page.locator('#play-button').click();
  await page.locator('#keyboard-start').click();
  await page.locator('#countdown').waitFor({ state: 'hidden' });
  await page.keyboard.down('ArrowDown');
  // 左右移動とジャンプを実際のキー入力で行い、残りは加速して完走する。
  for (const [key, durationMs] of [['ArrowLeft', 400], ['ArrowRight', 500]]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(durationMs);
    await page.keyboard.up(key);
  }
  await page.keyboard.press('Space');
  await page.locator('#result').waitFor({ state: 'visible', timeout: RUN_TIMEOUT_MS });
  await page.keyboard.up('ArrowDown');
  await page.waitForFunction(() => !document.querySelector('#result-home').disabled);
  const finish = await page.locator('#final-time').textContent();
  const coins = Number(await page.locator('#final-crystals').textContent());
  assert.match(finish, /^\d{2}:\d{2}\.\d{2}$/);
  assert.ok(Number.isInteger(coins) && coins >= 0);
  best = await page.locator('#final-best').textContent();
  balance += coins;
  report.runs.push({ finish, coins, balance });
  await page.locator('#result-home').click();
  console.log(JSON.stringify({ stage, finish, coins, balance }));
}

async function verifyLobby() {
  assert.equal(Number(await page.locator('#lobby-coins').textContent()), balance);
  assert.equal(await page.locator('#lobby-best').textContent(), best);
}

async function selectScarf(color) {
  await page.locator(`[data-color="${color}"]`).click();
  const message = mode === 'account' ? 'アカウントに保存しました。' : 'このブラウザーに保存しました。';
  await page.waitForFunction(text => document.querySelector('#shop-status').textContent === text, message);
  await verifyScarf(color);
}

async function verifyScarf(color) {
  assert.ok((await page.locator(`[data-color="${color}"]`).getAttribute('class')).includes('selected'));
}

try {
  await openSession();
  if (mode === 'account') {
    stage = 'register';
    await authenticate(true);
    console.log('検証用アカウントを登録しました。アカウントと記録はDBに残ります。');
  }
  assert.equal(await page.locator('#lobby-coins').textContent(), '0');
  await page.locator('#shop-open').click();
  assert.ok(await page.locator('[data-color="red"]').isDisabled());
  await page.locator('#shop-close').click();
  for (let run = 1; balance < SCARF_PRICE && run <= MAX_RUNS; run += 1) {
    stage = `run-${run}`;
    await finishRun();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await enterLobby();
    await verifyLobby();
  }
  assert.ok(balance >= SCARF_PRICE, '購入用コインが不足。描画速度やコース変更を確認してください。');
  stage = 'purchase-and-equip';
  await page.locator('#shop-open').click();
  await selectScarf('red');
  balance -= SCARF_PRICE;
  assert.equal(Number(await page.locator('#wallet-coins').textContent()), balance);
  await selectScarf('none');
  await selectScarf('red');
  assert.equal(Number(await page.locator('#wallet-coins').textContent()), balance);
  await page.locator('#shop-close').click();
  if (mode === 'account') {
    stage = 'fresh-session-login';
    await logout();
    await context.close();
    await openSession();
    await authenticate(false);
    await verifyLobby();
    await page.locator('#shop-open').click();
    await verifyScarf('red');
    await page.locator('#shop-close').click();
  }
  stage = 'reload';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await enterLobby();
  await verifyLobby();
  await page.locator('#shop-open').click();
  await verifyScarf('red');
  await page.screenshot({ path: fileURLToPath(new URL('shop.png', output)) });
  await page.locator('#shop-close').click();
  if (mode === 'account') await logout();
  assert.deepEqual(report.errors, []);
  assert.ok(report.api.every(({ route, status }) => status === (route === '/api/auth/register' ? 201 : 200)));
  Object.assign(report, { passed: true, balance, best, equipped: 'red' });
  console.log('購入・装備・保存の確認に成功しました。');
} catch (error) {
  Object.assign(report, { passed: false, stage, error: error.name });
  // 認証値や復旧コードを含み得るDOM・例外本文・失敗画面は保存しない。
  console.error(`検証失敗: ${stage} (${error.name})`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(new URL('result.json', output), JSON.stringify(report, null, 2));
  console.log(`検証結果: ${output.href}`);
}
