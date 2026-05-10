import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const APP_URL = (process.env.APP_URL ?? 'http://127.0.0.1:4173').replace(/\/+$/, '');
const REPORT_PATH = path.resolve('evidence', 'kriteriju-parbaudes-zinojums.md');

function json(body, status = 200) {
  return {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  };
}

function paginated(data) {
  return {
    current_page: 1,
    data,
    last_page: 1,
    per_page: data.length || 20,
    total: data.length,
  };
}

function fixtureUser(roleCode = 'user') {
  return {
    id: roleCode === 'admin' ? 9001 : 101,
    name: roleCode === 'admin' ? 'Testa Administrators' : 'Testa Lietotājs',
    email: roleCode === 'admin' ? 'admin@demo.lv' : 'user@demo.lv',
    preferred_currency: 'EUR',
    locale: 'lv',
    timezone: 'Europe/Riga',
    date_format: 'dd.mm.yyyy',
    amount_format: 'local',
    address: 'Brivibas iela 1',
    phone: '+371 20000000',
    region: 'Riga',
    country: 'LV',
    postal_code: 'LV-1010',
    phone_country: '+371',
    theme_mode: 'light',
    email_notifications: true,
    push_notifications: true,
    marketing_notifications: false,
    compact_mode: false,
    default_dashboard_view: 'overview',
    mask_balances: false,
    require_payment_confirmation: true,
    profile_picture: null,
    two_factor_enabled: true,
    two_factor_confirmed_at: '2026-05-10T08:00:00.000Z',
    email_verified_at: '2026-05-10T08:00:00.000Z',
    revision_requested_at: null,
    status: 'active',
    role: {
      id: roleCode === 'admin' ? 1 : 2,
      code: roleCode,
      name_lv: roleCode === 'admin' ? 'Administrators' : 'Lietotājs',
    },
  };
}

const sharedAccounts = [
  {
    id: 1,
    owner_user_id: 101,
    iban: 'LV80BANK0000000000001',
    name: 'Algas konts',
    currency: 'EUR',
    balance: '1420.50',
    type: 'personal',
    company_name: null,
    registration_number: null,
    vat_number: null,
    first_name: 'Testa',
    last_name: 'Lietotājs',
    personal_code: '010190-12345',
    status: 'active',
    access_role: 'owner',
    can_initiate_transfer: true,
    can_update_status: true,
    can_close_account: true,
    created_at: '2026-05-01T08:00:00.000Z',
    updated_at: '2026-05-10T08:00:00.000Z',
  },
];

const sharedTransactions = [
  {
    id: 11,
    from_account_id: 1,
    to_account_id: 2,
    initiator_user_id: 101,
    amount: '120.00',
    fee: '3.00',
    currency: 'EUR',
    category: 'transfer',
    status: 'completed',
    reference: 'TX-20260510-0001',
    description: 'Mēneša pārskaitījums',
    executed_at: '2026-05-10T08:05:00.000Z',
    created_at: '2026-05-10T08:00:00.000Z',
    updated_at: '2026-05-10T08:05:00.000Z',
    from_iban: 'LV80BANK0000000000001',
    to_iban: 'LV91BANK0000000000002',
    initiator_name: 'Testa Lietotājs',
  },
];

function sharedStats() {
  return {
    totals: {
      inflow: 3400,
      outflow: 1980,
      net: 1420,
    },
    monthly_net: {
      '2026-05': 1420,
    },
    monthly_activity: {
      '2026-05': 12,
    },
    recent_activity: {
      '2026-05-10': 2,
    },
    outgoing_by_category: {
      transfer: 8,
      salary: 2,
      utilities: 1,
      shopping: 1,
      other: 0,
    },
    transactions_by_status: {
      pending: 1,
      completed: 10,
      rejected: 0,
      failed: 0,
    },
  };
}

function sharedAdminMetrics() {
  return {
    users: {
      total: 12,
      active: 10,
      blocked: 1,
      pending: 1,
    },
    accounts: {
      total: 18,
      active: 16,
      frozen: 1,
      closed: 1,
    },
    transactions: {
      total: 11,
      pending: 1,
      completed: 10,
      rejected: 0,
      failed: 0,
    },
    approvals: {
      pending: 1,
    },
    operations: {
      today_transactions: 4,
      unread_notifications: 2,
      audit_events_24h: 5,
      outgoing_volume_30d: 18200,
    },
  };
}

function sharedAdminUsers() {
  return [
    {
      id: 201,
      name: 'Lietotajs Adminam',
      email: 'managed@demo.lv',
      preferred_currency: 'EUR',
      locale: 'lv',
      timezone: 'Europe/Riga',
      date_format: 'dd.mm.yyyy',
      amount_format: 'local',
      address: 'Brivibas iela 2',
      phone: '+371 20000001',
      region: 'Riga',
      country: 'LV',
      postal_code: 'LV-1011',
      phone_country: '+371',
      theme_mode: 'light',
      email_notifications: true,
      push_notifications: true,
      marketing_notifications: false,
      compact_mode: false,
      default_dashboard_view: 'overview',
      mask_balances: false,
      require_payment_confirmation: true,
      profile_picture: null,
      two_factor_enabled: true,
      two_factor_confirmed_at: '2026-05-10T08:00:00.000Z',
      email_verified_at: '2026-05-10T08:00:00.000Z',
      revision_requested_at: null,
      status: 'active',
      created_at: '2026-05-01T08:00:00.000Z',
      updated_at: '2026-05-10T08:00:00.000Z',
      role: {
        id: 2,
        code: 'user',
        name_lv: 'Lietotājs',
      },
    },
  ];
}

function sharedRoles() {
  return [
    { id: 1, code: 'admin', name_lv: 'Administrators' },
    { id: 2, code: 'user', name_lv: 'Lietotājs' },
  ];
}

function sharedRecipients() {
  return [
    {
      id: 2,
      name: 'Saņēmējs Konts',
      iban: 'LV91BANK0000000000002',
      currency: 'EUR',
      owner_name: 'Saņēmējs',
      is_accessible: true,
    },
  ];
}

async function installApiMocks(context, roleCode = 'user') {
  const user = fixtureUser(roleCode);

  await context.addInitScript((token) => {
    localStorage.setItem('banka_api_token', token);
  }, 'criteria-test-token');

  await context.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;

    if (pathname === '/api/auth/me') {
      await route.fulfill(json({ user }));
      return;
    }

    if (pathname === '/api/accounts') {
      await route.fulfill(json(paginated(sharedAccounts)));
      return;
    }

    if (pathname === '/api/accounts/1/members') {
      await route.fulfill(json({ members: [] }));
      return;
    }

    if (pathname === '/api/transactions') {
      await route.fulfill(json(paginated(sharedTransactions)));
      return;
    }

    if (pathname === '/api/transactions/recipients') {
      await route.fulfill(json({ recipients: sharedRecipients() }));
      return;
    }

    if (pathname === '/api/transactions/stats') {
      await route.fulfill(json(sharedStats()));
      return;
    }

    if (pathname === '/api/admin/users') {
      await route.fulfill(json(paginated(sharedAdminUsers())));
      return;
    }

    if (pathname === '/api/admin/roles') {
      await route.fulfill(json({ roles: sharedRoles() }));
      return;
    }

    if (pathname === '/api/admin/metrics') {
      await route.fulfill(json(sharedAdminMetrics()));
      return;
    }

    await route.fulfill(json({}));
  });
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    return { name, ok: true };
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    return { name, ok: false, error };
  }
}

async function openPage(browser, path = '/', roleCode = null) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });

  if (roleCode) {
    await installApiMocks(context, roleCode);
  }

  const page = await context.newPage();
  await page.goto(`${APP_URL}${path}`, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

function buildLatvianReport(results) {
  const passedCount = results.filter((result) => result.ok).length;
  const failedCount = results.length - passedCount;
  const generatedAt = new Date().toISOString();

  const rows = results
    .map((result) => `| ${result.ok ? 'Izpildīts' : 'Neizdevās'} | ${result.name} |`)
    .join('\n');

  return [
    '# Kritēriju pārbaudes atskaite',
    '',
    `- Izveidota: ${generatedAt}`,
    `- Lietotnes adrese: ${APP_URL}`,
    `- Pārbaudes kopskaits: ${results.length}`,
    `- Izpildītas: ${passedCount}`,
    `- Neizdevās: ${failedCount}`,
    '',
    '## Pārbaudes rezultāti',
    '',
    '| Statuss | Pārbaude |',
    '| --- | --- |',
    rows,
    '',
  ].join('\n');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  results.push(
    await runTest('Publiskā sākumlapa rāda galveno saturu un ieejas punktus', async () => {
      const { context, page } = await openPage(browser, '/');
      await page.getByRole('heading', { name: 'Viss Tavai ikdienas bankošanai vienā drošā platformā.' }).waitFor();
      await assert.equal(await page.getByRole('button', { name: 'Ienākt / Reģistrēties' }).isVisible(), true);
      await assert.equal(await page.getByRole('link', { name: /Astera/ }).isVisible(), true);
      await context.close();
    })
  );

  results.push(
    await runTest('Publiskā autentifikācija pārslēdzas starp ielogošanos un reģistrāciju', async () => {
      const { context, page } = await openPage(browser, '/auth');
      await page.getByRole('button', { name: 'Reģistrēties' }).click();
      await assert.equal(await page.getByText('Paroles apstiprinājums').isVisible(), true);
      await assert.equal(
        await page.getByText('Vismaz 8 simboli, viens lielais burts, viens mazais burts un viens cipars.').isVisible(),
        true
      );
      await page.getByRole('button', { name: 'Ielogoties' }).click();
      await assert.equal(await page.getByLabel('E-pasts').count(), 1);
      await context.close();
    })
  );

  results.push(
    await runTest('Tastatūras pārlēkšanas saite ved uz galveno saturu', async () => {
      const { context, page } = await openPage(browser, '/');
      await page.keyboard.press('Tab');
      const skipLink = page.getByRole('link', { name: 'Pāriet uz galveno saturu' });
      await assert.equal(await skipLink.isVisible(), true);
      await assert.equal(await skipLink.getAttribute('href'), '#main-content');
      await assert.equal(await page.locator('#main-content').count(), 1);
      await assert.equal(await page.locator('#main-content').getAttribute('tabindex'), '-1');
      await context.close();
    })
  );

  results.push(
    await runTest('PWA faili ir publicēti ar standalone metadatiem', async () => {
      const { context, page } = await openPage(browser, '/');
      const manifestText = await page.locator('link[rel="manifest"]').evaluate(async (el) => {
        const response = await fetch(el.href, { cache: 'no-store' });
        return response.text();
      });
      const manifest = JSON.parse(manifestText);
      assert.equal(manifest.display, 'standalone');
      assert.equal(manifest.name, 'Digitala Banka');

      const offlineResponse = await context.request.get(`${APP_URL}/offline.html`);
      assert.equal(offlineResponse.ok(), true);

      const swResponse = await context.request.get(`${APP_URL}/sw.js`);
      assert.equal(swResponse.ok(), true);
      await context.close();
    })
  );

  results.push(
    await runTest('Lietotāja panelis slēpj administrācijas sadaļu parastam lietotājam', async () => {
      const { context, page } = await openPage(browser, '/', 'user');
      await page.getByRole('button', { name: 'Sākums' }).waitFor();
      await assert.equal(await page.getByRole('button', { name: 'Administrācija' }).count(), 0);
      await assert.equal(await page.getByRole('button', { name: 'Iestatījumi' }).isVisible(), true);
      await context.close();
    })
  );

  results.push(
    await runTest('Administratora panelis rāda pārvaldību un metriku', async () => {
      const { context, page } = await openPage(browser, '/', 'admin');
      await page.getByRole('button', { name: 'Administrācija' }).waitFor();
      await page.getByRole('button', { name: 'Administrācija' }).click();
      await page.getByRole('heading', { name: 'Lietotāju pārvaldība' }).waitFor();
      await assert.equal(await page.getByRole('heading', { name: 'Administratora kontroles centrs' }).isVisible(), true);
      await assert.equal(await page.getByRole('button', { name: 'Lietotāji' }).isVisible(), true);
      await context.close();
    })
  );

  await browser.close();

  await writeFile(REPORT_PATH, buildLatvianReport(results), 'utf8');

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    console.error(`\nNeizdevās ${failed.length} pārbaudes.`);
    process.exit(1);
  }

  console.log(`\nVeiksmīgi izpildītas ${results.length} pārbaudes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
