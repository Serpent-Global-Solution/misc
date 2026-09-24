# Meikigo Merchant Portal Test Scripts

Automated test scripts for the Meikigo Brand Merchant Portal using Playwright.

## Scripts

### merchant-setup-cut-service.mjs

Automates the complete workflow for setting up and verifying a "Cut" service on the merchant portal.

**What it does:**
1. Logs into the merchant portal with provided credentials
2. Navigates to the services management page
3. Checks if a "Cut" service already exists
4. If not found, creates the service with:
   - Name: Cut
   - Base Price: RM25.00
   - Duration: 30 minutes
   - Junior Level Price: RM20.00
   - Senior Level Price: RM30.00
   - Pro Level Price: RM35.00

**Handles both scenarios:**
- Service already exists → verifies it's set up correctly
- Service doesn't exist → creates it with proper configuration

## Prerequisites

- Node.js 18+
- Playwright installed (`npm install --save-dev playwright`)
- Meikigo Brand Portal running on `http://meiki-brand.test:3000`

## Installation

```bash
# From project root
npm install --save-dev playwright
```

## Usage

### Basic Usage

```bash
# From test-scripts directory
node merchant-setup-cut-service.mjs
```

### With Custom Credentials

```bash
MERCHANT_EMAIL=your@email.com \
MERCHANT_PASSWORD=yourpassword \
node merchant-setup-cut-service.mjs
```

### With Custom Portal URL

```bash
PORTAL_URL=http://your-portal:3000 \
node merchant-setup-cut-service.mjs
```

### Show Browser Window (Non-Headless)

```bash
HEADLESS=false node merchant-setup-cut-service.mjs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MERCHANT_EMAIL` | `fakhrulsumarjono@gmail.com` | Email for portal login |
| `MERCHANT_PASSWORD` | `Test1234` | Password for portal login |
| `PORTAL_URL` | `http://meiki-brand.test:3000` | Base URL of merchant portal |
| `HEADLESS` | `true` | Run in headless mode (no browser window) |

## Service Configuration

Required fields for creating a service:

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| Service Name | String | "Cut" | Required, max 256 chars |
| Base Price | Decimal | "25.00" | Required, in Ringgit (RM) |
| Duration | Integer | 30 | Required, in minutes |
| Junior Price | Decimal | "20.00" | Optional, defaults to base price |
| Senior Price | Decimal | "30.00" | Optional, defaults to base price |
| Pro Price | Decimal | "35.00" | Optional, defaults to base price |

## Output

The script provides:
- Clear step-by-step console output showing progress
- Success/failure messages with emojis for easy scanning
- Service configuration summary
- Screenshot on error (saved to `/tmp/playwright-error-*.png`)

### Successful Run Output Example

```
🚀 Meikigo Merchant Portal - Cut Service Setup
==================================================
Portal: http://meiki-brand.test:3000
Email: fakhrulsumarjono@gmail.com

1️⃣  Navigating to portal...
    URL: http://meiki-brand.test:3000/login?callbackUrl=%2F

2️⃣  Authenticating...
    Email set: ✓
    Password set: ✓
    ✓ Form disappeared, login likely succeeded

3️⃣  Waiting for home page to load...
    Brand ID: 383f619d-f41d-4bfb-bed3-f301c41fb85c

4️⃣  Opening services page...
    URL: http://meiki-brand.test:3000/brands/383f.../services

5️⃣  Checking Cut service...
    ✗ Service not found, creating...

✅ Success!
==================================================

📋 Service Details:
   Name:     Cut
   Price:    RM25.00
   Duration: 30 min
   Junior:   RM20.00
   Senior:   RM30.00
   Pro:      RM35.00
```

## Merchant Portal Structure

### Login Flow
1. Navigate to `/login?callbackUrl=%2F`
2. Enter email and password credentials
3. Submit authentication via Supabase
4. Form disappears on successful auth
5. Redirect to home dashboard

### Services Page
- **Route:** `/brands/{brandId}/services`
- **Features:**
  - List of all active services
  - Add new service button
  - Edit/remove existing services
  - Price tiers by barber level

### Service Categories
Services are organized by category:
- Merchant selects from pre-defined categories
- Portal uses active category for new services
- Services grouped by category in UI

## Implementation Details

### Main Functions

**login(page)** - Handles Supabase authentication
- Waits for form to be available
- Fills email and password with type() for better simulation
- Finds and clicks the submit button below password field
- Waits up to 15 seconds for form to disappear
- Handles error states

**extractBrandId(page)** - Gets merchant's brand identifier
- Extracts from URL if available
- Falls back to searching page links
- Returns ID in UUID format

**serviceExists(page, name)** - Checks if service is already created
- Searches all table rows for service name
- Case-sensitive string matching

**createService(page, config)** - Creates new service
- Finds Add button
- Waits for form to appear
- Fills all input fields in order:
  1. Service name
  2. Base price (RM)
  3. Duration (minutes)
  4. Junior price (optional)
  5. Senior price (optional)
  6. Pro price (optional)
- Submits form
- Waits for confirmation

**fillServiceForm(page, config)** - Helper to populate form fields
- Collects all input elements
- Maps values to appropriate fields
- Handles optional fields gracefully

### Error Handling

Specific error messages for:
- Missing form elements
- Login failures
- Navigation issues
- Service creation problems
- Timeout scenarios

Automatic screenshot capture on error for debugging.

## Troubleshooting

### "Login failed - form still visible"

Check:
- Email and password are correct
- Supabase is configured in `.env`
- Portal homepage loads at `http://meiki-brand.test:3000/`
- Check browser console in non-headless mode for JavaScript errors

### "Brand ID not found in URL"

Check:
- Merchant account has at least one brand created
- Home page loads after successful login
- Meikigo API service is running
- Check logs in meikigo-brand container

### "Service creation failed"

Check:
- Merchant plan allows adding more services
- No duplicate service name exists
- All required fields are properly filled
- Check backend logs for API errors
- Verify category is set up for the brand

### Service Creation but Script Reports Failure

The script checks for error elements on the page. If there's a validation error or network issue:
- Check screenshot saved to `/tmp/`
- Look at merchant portal UI logs
- Verify API connectivity
- Try again after a few seconds

## Advanced Usage

### Running in CI/CD Pipeline

```bash
#!/bin/bash
set -e

cd /path/to/meikigo-project

# Install dependencies
npm install --save-dev playwright

# Run test with CI-friendly output
MERCHANT_EMAIL="ci-test@example.com" \
MERCHANT_PASSWORD="ci-secure-password" \
HEADLESS=true \
node test-scripts/merchant-setup-cut-service.mjs

echo "✅ Merchant portal setup verified"
```

### Creating Multiple Services

Modify the script to run multiple service configurations:

```javascript
const services = [
  { name: 'Cut', price: '25.00', duration: '30', ... },
  { name: 'Fade', price: '20.00', duration: '25', ... },
  { name: 'Shave', price: '15.00', duration: '20', ... },
];

for (const svc of services) {
  await setupService(page, svc);
}
```

### Debugging in Browser

Run with `HEADLESS=false` to see what's happening:

```bash
HEADLESS=false node merchant-setup-cut-service.mjs
```

Browser will stay open, allowing you to inspect elements and check console.

## Related Source Code

- **Portal App:** `/meikigo-brand/`
- **Services Components:** `/meikigo-brand/src/components/services/`
  - `add-service-modal.tsx` - Service creation form
  - `service-list.tsx` - List of services
  - `services-page-client.tsx` - Services page
- **API Actions:** `/meikigo-brand/src/actions/catalog.ts`
- **Authentication:** `/meikigo-brand/src/actions/auth.ts`
- **Types:** `/meikigo-brand/src/lib/types.ts`

## Performance Characteristics

Typical execution timeline:
- Navigation to portal: 1-2 seconds
- Login (auth + redirect): 5-10 seconds
- Home page load: 2-3 seconds
- Navigate to services: 1-2 seconds
- Check for service: 1-2 seconds
- Create service (if needed): 5-10 seconds
- **Total:** 30-45 seconds

## System Requirements

- **Node.js:** 18.0.0 or higher
- **Playwright:** v1.40.0+
- **Memory:** 512MB minimum
- **Disk Space:** 200MB+ for browser binaries

## Exit Codes

- `0` - Successful execution
- `1` - Test failed (check error message)

## Limitations

- Single user account per run
- Single brand per run (first available brand is used)
- Linear execution (no concurrent operations)
- Requires network connectivity to portal and Supabase

## Future Enhancements

Potential improvements:
- [ ] Support multiple services in single run
- [ ] Outlet selection and configuration
- [ ] Barber level assignment to services
- [ ] Service categorization management
- [ ] Commission configuration
- [ ] Multiple merchant accounts in batch
- [ ] HTML/JSON report generation
- [ ] Performance metrics collection

## Support & Debugging

For issues:

1. **Check error message** - Usually indicates exact problem
2. **Review screenshot** - Visual clue of what failed
3. **Enable browser** - `HEADLESS=false` for interactive debugging
4. **Check logs** - Meikigo container logs for backend issues
5. **Verify environment** - Portal URL, credentials, network connectivity

## License & Attribution

Part of the Meikigo project. Used for automated testing and validation of merchant portal functionality.

---

**Last Updated:** 2026-09-25
**Script Version:** 1.0.0
**Compatible With:** Meikigo Brand Portal v1+
