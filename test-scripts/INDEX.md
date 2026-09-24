# Test Scripts Index

Complete guide to all test resources and documentation.

## Main Test Script

### customer-app-book-cut.mjs
**Type**: Automated E2E Test (Playwright)
**Status**: ✓ Ready to run
**Size**: ~13 KB
**Language**: JavaScript (ESM)

Automates the complete barber service booking flow through the customer web app.

**Quick run**:
```bash
npm install -D playwright
node test-scripts/customer-app-book-cut.mjs
```

**Features**:
- Browse outlet directory
- Select services and barbers
- Choose booking time/walk-in
- Review booking details
- Full error handling with screenshots
- Retry logic on failures
- CLI options for customization

## Documentation Files

### QUICK-START.md
**Best for**: Getting started in 3 minutes
**Length**: 2 pages
**Contains**:
- Prerequisites check
- Installation steps
- Running the test
- Troubleshooting basics
- Expected output

**Start here if you're new!**

### README.md
**Best for**: Understanding the test
**Length**: 15+ pages
**Contains**:
- Complete usage guide
- Test flow explanation
- All command options
- Detailed troubleshooting
- Extending the test
- CI/CD integration
- Best practices

**Read this for comprehensive understanding**

### SETUP.md
**Best for**: Configuration and setup
**Length**: 8 pages
**Contains**:
- Detailed prerequisites
- Installation instructions
- Environment setup
- Running options
- DNS/host configuration
- CI/CD examples

**Read this for setup issues**

### TEST-SUMMARY.md
**Best for**: Technical details
**Length**: 20+ pages
**Contains**:
- Complete test flow documentation
- Code structure breakdown
- Test data and credentials
- Robustness and error handling
- Extension examples
- Performance metrics
- Maintenance guide

**Read this to understand internals**

## Package Files

### package.json
**Purpose**: Node.js dependencies and scripts
**Contains**:
- Playwright dependency (v1.48.0+)
- Convenience npm scripts
- Project metadata

**Install dependencies**:
```bash
npm install
```

## Quick Reference

| Need | File | Section |
|------|------|---------|
| Get started NOW | QUICK-START.md | Top of file |
| Full instructions | README.md | "Quick Start" section |
| Troubleshoot issue | SETUP.md | "Troubleshooting" section |
| Understand code | TEST-SUMMARY.md | "Code Structure" section |
| Extend test | README.md | "Extending the Tests" section |
| Run in CI/CD | README.md | "CI/CD Integration" section |

## File Locations

```
/Users/user/Private/meikigo-project/test-scripts/
├── customer-app-book-cut.mjs          ← Main test script
├── package.json                       ← Dependencies
├── QUICK-START.md                    ← Start here!
├── README.md                         ← Full guide
├── SETUP.md                          ← Setup guide
├── TEST-SUMMARY.md                   ← Technical details
└── INDEX.md                          ← This file
```

## Common Tasks

### Install Playwright

```bash
npm install -D playwright
```

**See**: QUICK-START.md → Prerequisites Check

### Run Basic Test

```bash
node test-scripts/customer-app-book-cut.mjs
```

**See**: QUICK-START.md → Run the Test

### Watch Browser

```bash
node test-scripts/customer-app-book-cut.mjs --headless=false
```

**See**: README.md → Command Line Options

### Fix Setup Issue

1. Check QUICK-START.md Troubleshooting
2. See SETUP.md Troubleshooting section
3. Verify prerequisites are running

### Extend Test (add login)

**See**: README.md → Extending the Tests section

### Add to CI/CD

**See**: README.md → CI/CD Integration section

## What's Tested

✓ **Browsing**
- Outlet directory loading
- Service listings
- Barber availability

✓ **Selection**
- Service selection (looks for "cut")
- Barber picking
- Time slot choice

✓ **Navigation**
- Multi-step wizard flow
- Back button functionality
- Page transitions

✓ **Data Display**
- Pricing information
- Booking summary
- Queue status

## Prerequisites

| Item | Status | Check |
|------|--------|-------|
| Node.js v18+ | Required | `node --version` |
| npm v9+ | Required | `npm --version` |
| Playwright | Install | `npm install -D playwright` |
| Customer App (port 3001) | Running | `curl -I http://meiki-customer-webapp.test:3001` |
| API Backend (port 8083) | Running | `curl -I http://localhost:8083` |

## Test Execution Flow

```
┌──────────────────────────┐
│  Start Test              │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  1. Navigate Home        │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  2. Browse Outlets       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  3. Select Outlet        │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  4. Enter Booking        │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  5. Choose Service       │
│     (Prefers "Cut")      │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  6. Select Barber        │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  7. Choose When          │
│  (Walk-in or Time)       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  8. Review Details       │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  9. Go to Auth Gate      │
│  (Registration/Login)    │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│  ✓ Test Complete        │
└──────────────────────────┘
```

## Performance

- **Installation**: 2-5 minutes (first time, ~100MB)
- **Test Duration**: 30-60 seconds
- **Headless Mode**: Faster, no rendering
- **Headed Mode**: Slower, see browser in action

## Support & Troubleshooting

**3-Step Troubleshooting**:

1. **Check Prerequisites**
   ```bash
   node --version          # v18+
   npm --version           # v9+
   curl -I http://meiki-customer-webapp.test:3001
   curl -I http://localhost:8083
   ```

2. **Check Installation**
   ```bash
   npx playwright --version
   npm list playwright
   ```

3. **Run with Debug**
   ```bash
   PWDEBUG=1 node test-scripts/customer-app-book-cut.mjs
   ```

**Still stuck?**
- See QUICK-START.md → Troubleshooting
- See SETUP.md → Troubleshooting
- Check /tmp/playwright-test-failure.png for screenshot

## License & Attribution

These test scripts are part of the Meikigo project.

**Created**: 2024
**Last Updated**: 2024
**Maintained By**: QA/Test Team

---

**Start with QUICK-START.md if you're new! 🚀**
