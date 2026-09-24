# Motion Export - Screen Capture Automation

Automatically captures screenshots of all key pages across meikigo projects for use in motion design/marketing materials.

## What it does

1. Starts dev servers for:
   - meikigo-admin (port 3000)
   - meikigo-customer-webapp (port 3001)
   - meikigo-brand (port 3003)
   - meikigo-pos-native web preview (port 19006)

2. Visits key routes on each project
3. Captures full-page screenshots at 2x device scale (1440×900)
4. Saves images to `./motion-assets/` with zero-padded filenames

## Requirements

- Node.js 18+
- Playwright: `npm install -D playwright` (already done)
- Playwright browsers: `npx playwright install` (downloads ~200MB)
- All target projects have dev dependencies installed

## How to run

```bash
cd scripts/motion-export
npm start
# or
npm run capture
# or
node capture-screens.mjs
```

## Output

Screenshots saved to `./motion-assets/` as:
- `01_meikooadmin_home.png`
- `02_meikooadmin_login.png`
- `03_meikooadmin_chip-disputes.png`
- etc.

File count depends on routes configured in `projects` array.

## Customization

Edit `capture-screens.mjs`:
- Modify `projects` array to add/remove routes per project
- Change viewport size in `newContext()` call
- Adjust `TIMEOUT` for slow servers
- Set `fullPage: false` in `screenshot()` to capture viewport only

## Notes

- Requires clean shutdown of any existing dev servers on target ports
- Expo web preview may take longer to start
- Images are captured with all CSS/styling rendered
