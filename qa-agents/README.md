# qa-agents: naive-user exploratory testing

AI agents role-play non-technical users (shop owner, cashier, customer, admin staff) and try to reach everyday goals in the Meikigo apps. They get **no test scripts, no documentation and no source code**. Only a persona, a goal, a start address and login details. Machine oracles record the errors the agents cannot see. A triage agent then writes a markdown bug report.

## How it fits together

| Piece | File | What it does |
|---|---|---|
| Personas | `personas/<app>/*.md` | Who the user is and what they want. Front matter: `app`, `secrets`, `maxActions`, optional `browser`, `device`, `model`. |
| Naive-user rules | `prompts/naive-user.md` | System prompt for every persona: no URL guessing, no dev tools, final diary format. |
| Persona runner | `bin/run.mjs` | Runs each persona as an isolated `claude -p` session. The browser is Playwright MCP (WebKit by default), and the native POS is driven through mobile-mcp. |
| Browser oracle | `oracle/init-page.cjs` | Records JS exceptions, HTTP 4xx/5xx, failed requests, blank screens, Next.js error overlays, stuck spinners, raw `undefined`/`NaN` on screen, horizontal overflow and axe accessibility violations to `oracle.jsonl`, with screenshots. |
| Native oracle | `oracle/native-oracle.mjs` | Streams simulator/emulator error logs, React Native JS errors and crash reports. |
| Fast crawl | `bin/crawl.mjs` | Lightpanda (non-Chromium) link crawl with no LLM. It is a cheap smoke pass. Re-check Lightpanda-only failures in WebKit. |
| Aggregate | `bin/aggregate.mjs` | Deduplicates oracle events into `signals.json` and builds `coverage.json`. |
| Triage | `bin/triage.mjs` | An Opus agent reads the run, reproduces the top bugs in a browser and writes `report.md`. The report is copied to `reports/`. |
| Preflight | `bin/preflight.mjs` | Checks services, browsers, devices and secrets. Changes nothing. |

### Isolation (why the agents stay naive)

- Each persona runs with `--tools ""`, so it has no file, shell or web tools. `--setting-sources ""` and `--strict-mcp-config` stop any CLAUDE.md, settings, memory or other MCP servers from loading. The working folder is the empty run folder.
- The Playwright tools for JS evaluation, console and network inspection are blocked. For native runs, the device-log and crash tools are blocked.
- Web login values never reach the model. The agent types the secret *name* (`OWNER_PASSWORD`) and Playwright MCP fills in the value. mobile-mcp has no masking, so native runs put test-account values in the prompt. `prompt.md` stores a redacted copy.

## Setup (one time)

```bash
cd qa-agents
npm install
cp config/secrets.env.example config/secrets.env   # fill with TEST accounts only
```

- `config/targets.json`: set the customer outlet URL (`/o/<brandId>/<outletId>`) for the test outlet.
- The POS web target needs the Expo web server on port 3003. Port 3003 is already in the API's CORS list:
  `cd meikigo-pos-native && npx expo start --web --port 3003`
- The iOS POS target needs a **Release** build on the simulator named in `targets.json`. A debug build shows a red "No script URL" screen without Metro. See `meikigo-doc/howtorun.md`, POS option B.
- The Android POS target needs the emulator (`emulator -avd Pixel_Tablet`) and the debug APK. The debug APK loads JS from Metro, so start Metro for Android with the API pointed at the host:
  `EXPO_PUBLIC_MEIKIGO_API_BASE_URL=http://10.0.2.2:8083 npx expo start --port 8081`, then run `adb reverse tcp:8081 tcp:8081`.

Then run `node bin/preflight.mjs` until every check passes.

## Running a campaign

```bash
node bin/preflight.mjs
node bin/crawl.mjs --apps admin,merchant,customer,pos-web --login --run runs/<name>   # optional, fast
node bin/run.mjs --personas all --concurrency 3 --run runs/<name>                    # web personas plus pos-ios
node bin/run.mjs --personas native --target pos-android --run runs/<name>        # same POS personas on Android
node bin/run.mjs --personas merchant --browser firefox --run runs/<name>             # cross-browser pass
node bin/triage.mjs --run runs/<name>
```

- `--personas` takes `all`, an app name (`admin`, `merchant`, `customer`, `marketing`, `pos-web`, `pos-ios`), a folder name or persona ids separated by commas.
- `--dry-run` writes the configs and prints the commands without starting agents.
- Each persona folder in a run holds `prompt.md`, `transcript.jsonl`, `diary.md`, `oracle.jsonl`, `evidence/`, `artifacts/` and `meta.json` (outcome, actions, minutes, cost).

## Safety

- The agents create, edit and delete real records through the real API. Point them only at a test brand/outlet and test accounts.
- The app database is the shared hosted Supabase project, so data the agents create is visible to everyone on it.
- Payments use CHIP in **Sandbox** mode (`Chip__*__Environment=Sandbox` in `meikigo-api/.env`). Check this before every campaign. Personas are told never to enter real card or bank details.
- Emails from sign-up or password-reset flows go to whatever address the persona uses. Use test mailboxes or `@example.com`.
