// One entry per clip. Name = output file (section-feature-app). setup = python run with `t` (owner token), `ids`, api helpers.
import { URLS, ids, HERE } from './lib.mjs';
import fs from 'fs';
const last = () => JSON.parse(fs.readFileSync(`${HERE}/state/last.json`, 'utf8'));

const NEXT = "button:has-text('Next'):not(:has-text('·'))";

export const scenarios = {
  // §1 Customers follow their place in line: find the ticket again by phone number, see the position, cancel.
  '01-follow-ticket-phone': {
    setup: `
O=ids['outlet']; P=ids['products']; E=ids['employees']
tix=api('GET', f'/api/v1/outlets/{O}/queue-tickets', token=t)
ahead=[x for x in tix if x['status']=='Waiting' and x['lines'][0]['employeeName']=='Arun Kumar' and x['walkInLabel']=='Walk-in']
if not [x for x in tix if x['status']=='InProgress' and x['lines'][0]['employeeName']=='Arun Kumar'] and ahead:
    api('POST', f"/api/v1/queue-lines/{ahead[0]['lines'][0]['id']}/start", {}, token=t)
if not [x for x in tix if x['status']=='Waiting' and x.get('clientId')]:
    customer_join('aiman-test@gmail.com', 'Aiman-2026!x', O, P['Haircut + Beard'], E['Arun Kumar'])
`,
    run: async h => {
      await h.goto(URLS.qr, 2500);
      h.mark('start'); await h.wait(1500);
      await h.tap('I have a booking', { pause: 1300 });
      await h.type('input[type=tel]', '0123344556', 700);
      await h.tap('Find my ticket', { last: true, pause: 2200 });
      await h.tap('Open my ticket', { pause: 1500 });
      await h.see('people ahead of you'); await h.wait(1200); h.mark('still');
      await h.wait(1500);
      await h.css('button[aria-label*="efresh" i]', 1500).catch(() => {});
      await h.tap('Cancel this ticket', { pause: 1300 });
      const confirm = h.page.getByRole('button', { name: /cancel ticket|yes, cancel|confirm/i });
      if (await confirm.count()) { await confirm.last().click(); await h.wait(2200); }
      h.mark('end');
    },
  },

  // §1 Customers scan to book: QR page → service → barber → book a time slot → ticket.
  '01-scan-to-book-phone': {
    run: async h => {
      await h.goto(URLS.qr, 2500);
      h.mark('start'); await h.wait(1800); h.mark('still');
      await h.tap('Book now', { pause: 1300 });
      await h.tap('Haircut', { pause: 900 });
      await h.css("button:has-text('Next ·')", 1300);
      await h.tap('Faiz Hakimi', { pause: 900 });
      await h.css(NEXT, 1300);
      await h.tap('Book a time', { pause: 1000 });
      await h.tap('Select a time', { pause: 1000 });
      await h.tap('3:00 pm', { pause: 1000 });
      await h.css(NEXT, 1400);
      await h.tap('Confirm booking', { pause: 600 });
      await h.see('Your ticket'); await h.wait(2800);
      h.mark('end');
    },
  },
  // §1 One board: board with every chair → add a walk-in at the counter → start the cut.
  '01-queue-board-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Hakim', 'Haircut', 'Faiz Hakimi'), ('Wei Jie', 'Haircut + Beard', 'Daniel Lim')], waiting=[('Ravi', 'Haircut', 'Faiz Hakimi')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Walk-in', { last: true, pause: 1500 });
      const nameBox = await h.page.locator("input[value='Walk-in']").first().elementHandle();
      await nameBox.click({ clickCount: 3 }); await h.page.keyboard.type('Farid', { delay: 80 }); await h.wait(600);
      await h.tap('Hair Wash', { pause: 900 }); await h.tap('Haircut', { last: false, pause: 900 });
      await h.tap('Select a barber', { pause: 900 }); await h.tap('Arun Kumar', { last: true, pause: 900 });
      await h.tap('Add to queue', { last: true, pause: 2500 });
      await h.tap('Farid', { pause: 1500 });
      await h.tap('Start cut', { last: true, pause: 2500 });
      h.mark('end');
    },
  },

  // §1 One board: move a waiting customer to another barber (drag), put one back in the queue, mark a late booking as no-show.
  '01-move-requeue-noshow-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Hakim', 'Haircut', 'Faiz Hakimi')], waiting=[('Ravi', 'Haircut', 'Faiz Hakimi'), ('Jason', 'Kids Cut', 'Faiz Hakimi')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(2500);
      const from = h.page.getByText('Ravi', { exact: true }).last();
      const to = h.page.getByText('Arun Kumar', { exact: true }).last();
      const a = await from.boundingBox(), b = await to.boundingBox();
      await h.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await h.page.mouse.down(); await h.wait(400);
      for (let i = 1; i <= 25; i++) { await h.page.mouse.move(a.x + (b.x - a.x) * i / 25, a.y + (b.y + 160 - a.y) * i / 25); await h.wait(30); }
      await h.page.mouse.up(); await h.wait(2500); h.mark('still');
      await h.tap('Jason', { last: true, pause: 1500 });
      await h.tap('Requeue', { last: true, pause: 1500 });
      const c = h.page.getByRole('button', { name: /^(requeue|confirm|yes)/i }); if (await c.count() > 1) { await c.last().click(); await h.wait(1500); }
      await h.wait(1500);
      h.mark('end');
    },
  },

  // §1 Queue screen on the wall: More → Queue display.
  '01-wall-screen-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Hakim', 'Haircut', 'Faiz Hakimi'), ('Wei Jie', 'Haircut + Beard', 'Daniel Lim')], waiting=[('Ravi', 'Haircut', 'Arun Kumar'), ('Jason', 'Kids Cut', 'Faiz Hakimi'), ('Siti', 'Hair Wash', 'Daniel Lim')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1500);
      await h.tap('More', { last: true, pause: 1300 });
      await h.tap('Queue display', { pause: 3500 });
      h.mark('still'); await h.wait(3500);
      h.mark('end');
    },
  },

  // §2 Cash, DuitNow and card: the customer scans a QR on the tablet; the processing fee is shown; paid.
  '02-duitnow-card-qr-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Hakim', 'Haircut + Beard', 'Faiz Hakimi'), ('Wei Jie', 'Haircut', 'Daniel Lim')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1200);
      await h.tap('Haircut + Beard · now', { pause: 1300 });
      await h.tap('Complete & pay', { last: true, pause: 1500 });
      await h.tap('Card', { last: true, pause: 1000 }); await h.tap('QR', { last: true, pause: 1200 });
      await h.tap('Show DuitNow QR · RM 35.00', { last: true, pause: 2500 });
      await h.see('Scan with your banking app'); h.mark('still'); await h.wait(3500);
      await h.page.evaluate(() => [...document.querySelectorAll('div,button')].find(e => e.textContent?.trim() === 'Stub: webhook paid')?.click());
      await h.see('Paid', 30000, true); await h.wait(3000);
      h.mark('end');
    },
  },

  // §2 Discounts and tips at checkout.
  '02-discount-tip-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Hakim', 'Haircut + Beard', 'Faiz Hakimi')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('Haircut + Beard · now', { pause: 1300 });
      await h.tap('Complete & pay', { last: true, pause: 1500 });
      await h.tap('Discount & tip', { last: true, pause: 1300 });
      await h.type("input[placeholder*='ercent' i], input[inputmode='decimal']", '10', 700);
      await h.tap('Loyal customer', { pause: 900 });
      const tip = h.page.locator('input').last(); await tip.click(); await h.page.keyboard.type('5', { delay: 90 }); await h.wait(900);
      await h.tap('Done', { last: true, pause: 1800 });
      h.mark('still'); await h.wait(1500);
      await h.tap('Cash', { last: true, pause: 1200 });
      await h.css("text=/^Pay RM/", 2500);
      await h.see('Paid', 30000, true); await h.wait(2500);
      h.mark('end');
    },
  },

  // §2 Split the bill: a group pays two shares, each with a different method.
  '02-split-bill-tablet': {
    setup: `
reset_board(t, ids['outlet'])
party(t, ids, 'Lim family', [('Haircut', 'Faiz Hakimi'), ('Kids Cut', 'Daniel Lim')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('Kids Cut · now', { pause: 1300 });
      await h.tap('Complete & pay', { last: true, pause: 1500 });
      await h.tap('Split this bill between payment methods', { last: true, pause: 1500 });
      await h.page.getByText('Share 2', { exact: true }).nth(1).click(); await h.wait(1000);
      await h.page.getByText('Cash', { exact: true }).nth(0).click(); await h.wait(900);
      await h.page.getByText('Card', { exact: true }).nth(1).click(); await h.wait(1200);
      h.mark('still'); await h.wait(1200);
      await h.tap('Process split', { last: true, pause: 3000 });
      for (let i = 0; i < 2; i++) {
        const stub = await h.page.evaluate(() => { const b = [...document.querySelectorAll('div,button')].find(e => e.textContent?.trim() === 'Stub: webhook paid'); if (b) { b.click(); return true; } return false; });
        if (stub) await h.wait(3000);
      }
      await h.wait(2500);
      h.mark('end');
    },
  },

  // §2 Practice mode: a new staff member rings a practice sale; it isn't counted.
  '02-practice-sale-tablet': {
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('Pay', { last: true, pause: 1300 });
      await h.tap('New sale', { pause: 1500 });
      await h.page.getByRole('switch').first().click().catch(async () => { await h.tap('Practice sale', { pause: 0 }); }); await h.wait(1300);
      await h.tap('Add service or product', { last: true, pause: 1300 });
      await h.tap('Haircut', { last: true, pause: 1100 });
      await h.tap('Add 1', { last: true, pause: 1500 });
      h.mark('still'); await h.wait(1200);
      await h.css("text=/^Pay RM/", 2500);
      await h.wait(3000);
      h.mark('end');
    },
  },

  // §2 Cash in and cash out at the drawer.
  '02-cash-drawer-tablet': {
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('More', { last: true, pause: 1300 });
      await h.tap('Cash drawer', { pause: 1800 });
      await h.tap('Buy supplies', { pause: 900 });
      await h.type("input[inputmode='decimal'], input[placeholder*='0.00']", '15', 900);
      h.mark('still'); await h.wait(1000);
      await h.tap('Record', { last: true, pause: 2500 });
      h.mark('end');
    },
  },

  // §1 Calendar and bookings in the back office.
  '01-calendar-bookings-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/calendar`, 3500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Agenda', { pause: 2500 });
      await h.tap('Bookings', { pause: 3500 });
      await h.wait(1500);
      h.mark('end');
    },
  },

  // §2 Payouts to your bank, and who pays the card/DuitNow fee.
  '02-payouts-fees-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/settlement`, 3500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Fees', { pause: 3000 });
      await h.tap('See full example table', { pause: 2500 }).catch(() => {});
      await h.wait(1000);
      h.mark('end');
    },
  },

  // §6 Dashboard for each outlet, then the month in Reports (takings, expenses, profit).
  '06-dashboard-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/dashboard`, 4000);
      h.mark('start'); await h.wait(3000); h.mark('still');
      await h.page.mouse.wheel(0, 400); await h.wait(2000);
      await h.page.mouse.wheel(0, -400); await h.wait(800);
      await h.tap('View in Reports', { pause: 3500 });
      await h.wait(1500);
      h.mark('end');
    },
  },

  // §6 Tax export to Excel.
  '06-tax-export-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/reports/tax-export`, 3500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Last month', { pause: 1500 }); await h.tap('This month', { pause: 1500 });
      await h.page.mouse.wheel(0, 500); await h.wait(2500);
      h.mark('end');
    },
  },

  // Plans: current plan (Plus trial), then all plans.
  '07-plans-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/settings`, 3000);
      await h.tap('Plan', { pause: 2000 });
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('See all plans', { pause: 4500 });
      h.mark('end');
    },
  },

  // §3 Barbers and staff: hours, days off, rental barber with chair fee.
  '03-barbers-staff-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/barbers`, 3000); await h.shahAlam();
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Kamal Ariffin', { last: true, pause: 2500 });
      await h.page.mouse.move(1200, 500); await h.page.mouse.wheel(0, 500); await h.wait(2500);
      h.mark('end');
    },
  },

  // §3 Logins and roles: invite a cashier (link, no email sent here).
  '03-logins-roles-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/staff`, 3000);
      h.mark('start'); await h.wait(2000);
      await h.tap('Invite', { last: true, pause: 1500 });
      const inputs = h.page.locator("[role=dialog] input, form input");
      await inputs.nth(0).click(); await h.page.keyboard.type('Nadia Rahim', { delay: 70 }); await h.wait(500);
      await inputs.nth(1).click(); await h.page.keyboard.type('nadia-test@gmail.com', { delay: 50 }); await h.wait(700);
      const sel = h.page.locator('[role=dialog] select, form select');
      if (await sel.count()) { await sel.first().selectOption({ label: 'Cashier' }); }
      else { await h.tap('Administrator', { last: true, pause: 800 }); await h.tap('Cashier', { last: true, pause: 800 }); }
      await h.wait(1200); h.mark('still');
      await h.tap('Generate invite link', { last: true, pause: 3500 });
      h.mark('end');
    },
  },

  // §3 Attendance and leave.
  '03-attendance-leave-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/attendance`, 3500);
      h.mark('start'); await h.wait(3000); h.mark('still');
      await h.goto(`${URLS.portal}/leave`, 2500); await h.shahAlam();
      await h.wait(1500);
      await h.tap('Add leave', { last: true, pause: 2000 });
      await h.page.getByRole('button', { name: 'Add leave' }).last().click(); await h.wait(3000);
      h.mark('end');
    },
  },

  // §3 Rental barber earnings with "mark as paid".
  '03-rental-earnings-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/reports/rental-earnings?outlet=${ids.outlet}`, 3500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      const mp = h.page.getByText(/mark as paid/i);
      if (await mp.count()) { await mp.first().click(); await h.wait(1500);
        const c = h.page.getByRole('button', { name: /mark as paid|confirm/i }); if (await c.count()) { await c.last().click(); } await h.wait(2500); }
      h.mark('end');
    },
  },

  // §4 Your price list: services with prices, duration, level prices; open one.
  '04-price-list-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/services`, 3000);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.page.getByText('Edit', { exact: true }).nth(1).click(); await h.wait(2500);
      await h.page.mouse.move(1200, 500); await h.page.mouse.wheel(0, 500); await h.wait(2500);
      h.mark('end');
    },
  },

  // §4 Stock per outlet; sales take it down.
  '04-stock-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/inventory`, 3000); await h.shahAlam();
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.page.getByRole('button', { name: /^Movements/ }).first().click(); await h.wait(3000);
      await h.wait(1000);
      h.mark('end');
    },
  },

  // §5 Customer list with visits and spend; open one customer.
  '05-customers-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/customers`, 3000);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.tap('Nurul Aisyah', { last: true, pause: 3000 });
      await h.wait(1500);
      h.mark('end');
    },
  },

  // §5 Loyalty: turn on a stamp (punch) card.
  '05-loyalty-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/loyalty`, 3000);
      h.mark('start'); await h.wait(2000);
      await h.shahAlam();
      await h.page.getByRole('switch', { name: 'Punch card' }).click({ force: true, timeout: 5000 }).catch(async () => { await h.page.getByText('Punch card', { exact: true }).first().click(); });
      await h.wait(2500); h.mark('still');
      await h.page.mouse.move(900, 500); await h.page.mouse.wheel(0, 400); await h.wait(2500);
      h.mark('end');
    },
  },

  // §5 Email campaigns: start a campaign from a template (draft only, nothing sent).
  '05-email-campaign-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/marketing`, 3000);
      h.mark('start'); await h.wait(2500);
      await h.tap('Create campaign', { last: true, pause: 2500 });
      h.mark('still'); await h.wait(1500);
      await h.page.mouse.move(900, 500); await h.page.mouse.wheel(0, 400); await h.wait(2000);
      h.mark('end');
    },
  },

  // §6 Expenses: record a cost, see the list.
  '06-expenses-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/expenses`, 3000);
      h.mark('start'); await h.wait(2000);
      await h.type("input[placeholder='0.00']", '320', 700);
      await h.page.locator('select').first().selectOption({ label: 'Utilities' }, { force: true }).catch(() => {}); await h.wait(1200);
      h.mark('still');
      await h.tap('Record expense', { last: true, pause: 2500 });
      await h.tap('Categories & month lock', { exact: false, pause: 1500 }).catch(() => {});
      await h.page.mouse.move(900, 600); await h.page.mouse.wheel(0, 600); await h.wait(2500);
      h.mark('end');
    },
  },

  // §6 Several outlets: outlet list, then switch outlet on the dashboard.
  '06-several-outlets-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/outlets`, 3000);
      h.mark('start'); await h.wait(3000); h.mark('still');
      await h.goto(`${URLS.outlet}/dashboard`, 3000);
      await h.tap('Shah Alam', { pause: 1200 });
      await h.tap('Setia Alam', { last: true, pause: 3500 });
      h.mark('end');
    },
  },

  // §2 Receipts on the tablet: paid → scan for digital receipt, or email it (form shown, nothing sent).
  '02-receipt-tablet': {
    setup: `
reset_board(t, ids['outlet'])
scene(t, ids, chairs=[('Muthu Raj', 'Haircut', 'Arun Kumar')])
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('Haircut · now', { pause: 1300 });
      await h.tap('Complete & pay', { last: true, pause: 1500 });
      await h.tap('Cash', { last: true, pause: 1200 });
      await h.css("text=/^Pay RM/", 3000);
      h.mark('still'); await h.wait(1500);
      await h.tap('Email receipt', { last: true, pause: 1500 });
      const em = h.page.locator("input[type=email], input[inputmode=email]").last();
      if (await em.count()) { await em.click(); await h.page.keyboard.type('muthu-test@gmail.com', { delay: 60 }); await h.wait(1800); }
      h.mark('end');
    },
  },

  // §2 Receipts on the customer's phone: the digital receipt page.
  '02-receipt-phone': {
    setup: `
reset_board(t, ids['outlet'])
tk = customer_join('aiman-test@gmail.com', 'Aiman-2026!x', ids['outlet'], ids['products']['Haircut + Beard'], ids['employees']['Arun Kumar'])
txn = serve_and_pay(t, ids['outlet'], tk)
json.dump({'ticket': tk['id'], 'receipt': txn.get('receiptNumber') or txn.get('reference')}, open('state/last.json', 'w'))
print('receipt', txn.get('receiptNumber') or txn.get('reference'))
`,
    run: async h => {
      await h.goto(`${URLS.webapp}/r/${encodeURIComponent(last().receipt)}`, 2500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.page.mouse.wheel(0, 500); await h.wait(2500);
      h.mark('end');
    },
  },

  // §5 Google reviews: after the visit the ticket asks for a rating, then points to the Google review page.
  '05-google-review-phone': {
    run: async h => {
      await h.goto(`${URLS.webapp}/ticket/${last().ticket}`, 3000);
      h.mark('start'); await h.wait(2000);
      await h.page.getByText('How was your visit?').scrollIntoViewIfNeeded(); await h.wait(1500);
      const five = h.page.getByLabel('5 stars — excellent');
      for (let i = 0; i < await five.count(); i++) { await five.nth(i).evaluate(el => (el.closest('label') || el).click()); await h.wait(1000); }
      await h.page.getByRole('button', { name: 'Submit rating' }).scrollIntoViewIfNeeded(); await h.wait(800);
      h.mark('still'); await h.wait(800);
      await h.page.getByRole('button', { name: 'Submit rating' }).click(); await h.wait(3500);
      h.mark('end');
    },
  },

  // §2 Opening float (start of day) on the tablet.
  '02-opening-float-tablet': {
    run: async h => {
      await h.page.goto(URLS.pos, { waitUntil: 'load', timeout: 180000 }); await h.wait(6000);
      await h.see('Start the day', 30000, true);
      h.mark('start'); await h.wait(1800); h.mark('still');
      await h.type("input[placeholder*='150']", '200', 900);
      await h.tap('Start the day', { last: true, pause: 3000 });
      h.mark('end');
    },
  },

  // §2 Day close (recorded last: it closes the till for the day).
  '02-day-close-tablet': {
    setup: `reset_board(t, ids['outlet'])`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('More', { last: true, pause: 1300 });
      await h.tap('Day close', { pause: 2500 });
      h.mark('still'); await h.wait(2000);
      await h.page.mouse.move(600, 500); await h.page.mouse.wheel(0, 500); await h.wait(2500);
      h.mark('end');
    },
  },

  // §5 Import existing customers in one go, with undo.
  '05-import-customers-portal': {
    run: async h => {
      await h.goto(`${URLS.portal}/customers/import`, 3000); await h.shahAlam();
      h.mark('start'); await h.wait(2000);
      await h.page.locator('input[type=file]').setInputFiles(`${HERE}/state/fade-street-customers.csv`); await h.wait(1500);
      h.mark('still');
      await h.page.getByRole('button', { name: 'Upload and start import' }).click(); await h.wait(5000);
      await h.page.mouse.move(900, 600); await h.page.mouse.wheel(0, 500); await h.wait(1500);
      const undo = h.page.getByRole('button', { name: /undo/i });
      if (await undo.count()) { await undo.first().click(); await h.wait(1500);
        const box = h.page.locator('input:focus'); await box.pressSequentially('UNDO', { delay: 140 }); await h.wait(900);
        await h.page.getByRole('button', { name: 'Undo import' }).click(); await h.wait(3500); }
      h.mark('end');
    },
  },

  // §2 Refunds, part 1: the cashier raises a refund at the counter (no admin present → pending).
  '02-refund-request-tablet': {
    app: 'cashier',
    setup: `
nt = login('nadia-test@gmail.com', 'Nadia-2026!x'); O = ids['outlet']
reset_board(t, O)
tk = walk_in(nt, O, ids['products']['Haircut'], ids['employees']['Daniel Lim'], 'Jason')
for l in tk['lines']: api('POST', f"/api/v1/queue-lines/{l['id']}/start", {}, token=nt)
txn = serve_and_pay(nt, O, tk, start=False)
json.dump({'receipt': txn.get('receiptNumber')}, open('state/last.json', 'w')); print('refund sale', txn.get('receiptNumber'))
`,
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(1000);
      await h.tap('More', { last: true, pause: 1300 });
      await h.tap('My day', { pause: 2200 });
      await h.tap(last().receipt, { pause: 2200 });
      await h.page.evaluate(() => [...document.querySelectorAll('div,button,[role=button]')].reverse().find(e => e.textContent?.trim() === 'Refund')?.click()); await h.wait(1800);
      const amt = h.page.locator('input').nth(0); await amt.click({ clickCount: 3 }); await h.page.keyboard.type('25', { delay: 100 }); await h.wait(600);
      await h.page.getByPlaceholder('Why is this being refunded?').click(); await h.page.keyboard.type('Customer unhappy with the fade', { delay: 45 }); await h.wait(900);
      h.mark('still');
      await h.tap('No Admin. Raise as pending', { pause: 3000 });
      h.mark('end');
    },
  },

  // §2 Refunds, part 2: approve it in the back office with the admin PIN.
  '02-refund-approve-portal': {
    run: async h => {
      await h.goto(`${URLS.outlet}/payments/refunds`, 3500);
      h.mark('start'); await h.wait(2500); h.mark('still');
      await h.page.getByRole('button', { name: /approve/i }).first().click(); await h.wait(1800);
      const pin = h.page.locator('input[type=password], input[inputmode=numeric]').last();
      if (await pin.count()) { await pin.click(); await h.page.keyboard.type('246810', { delay: 120 }); await h.wait(900); }
      await h.page.getByRole('button', { name: /^approve|confirm/i }).last().click(); await h.wait(3500);
      h.mark('end');
    },
  },

  // §1 One board: mark a booked customer as a no-show.
  '01-no-show-tablet': {
    // setup done by hand: Aiman books a slot a few minutes ahead (API refuses past slots), recorded once the slot has passed
    run: async h => {
      await h.posReady();
      h.mark('start'); await h.wait(2000);
      await h.tap('Aiman', { last: true, pause: 1800 });
      h.mark('still');
      await h.tap('No-show', { last: true, pause: 1500 });
      const c = h.page.getByRole('button', { name: /no-show|confirm|yes/i }); if (await c.count() > 1) { await c.last().click(); }
      await h.wait(3000);
      h.mark('end');
    },
  },
};
