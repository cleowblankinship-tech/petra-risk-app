# Postmark Email Configuration Guide

## Overview

This document explains how to configure Postmark for the Petra Risk Assessment application in a domain-agnostic way. The app now works independently of the custom domain `risk.petrafinancial.com`, which can be reconnected later when DNS issues are resolved.

## Current Status

✅ **App is live** on Vercel production URL
⏸️ **Custom domain temporarily unavailable** (DNS ownership changes)
✅ **Email functionality** works without custom domain dependency

---

## Quick Start: Postmark Configuration

### 1. Set Up Postmark Account

If you don't have a Postmark account yet:

1. Go to [Postmark](https://postmarkapp.com)
2. Create an account (free tier available)
3. Create a new server for "Petra Risk Assessment"
4. Get your **Server API Token** from the API Tokens section

### 2. Configure Sender Domain

**Option A: Use Postmark Sandbox (for testing only)**
- Postmark provides a sandbox sender for testing
- Email: Use Postmark's test email address
- ⚠️ **Not suitable for production** - emails won't reach real recipients

**Option B: Use a Verified Email Address (recommended for now)**
- Use a verified email address like your personal email or a Gmail account
- Go to Postmark → Signatures → Add signature → Verify single email
- Click verification link sent to that email
- Use this verified email as both `POSTMARK_FROM` and `ADVISOR_EMAIL`

**Option C: Use Alternative Domain (if available)**
- If you have another domain with proper DNS access
- Add and verify the domain in Postmark
- Set up DKIM, SPF, and Return-Path DNS records
- Use an email from that domain (e.g., `noreply@yourdomain.com`)

### 3. Configure Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

```bash
# Required: Postmark API credentials
POSTMARK_SERVER_TOKEN=your-postmark-server-token-here

# Required: Sender email (must be verified in Postmark)
POSTMARK_FROM=verified-email@example.com

# Required: Where assessment results are sent
ADVISOR_EMAIL=advisor-email@example.com

# Optional: Custom base URL (if different from auto-detected Vercel URL)
# BASE_URL=https://your-custom-url.com
```

**Important Notes:**
- Set these for **Production**, **Preview**, and **Development** environments
- `POSTMARK_FROM` must be a verified sender in your Postmark account
- `ADVISOR_EMAIL` is where internal notifications are sent (can be same as `POSTMARK_FROM`)
- If you don't set `BASE_URL`, the app automatically uses `VERCEL_URL` (Vercel's production URL)

### 4. Redeploy

After setting environment variables:
1. Go to Vercel dashboard → Deployments
2. Click the ⋯ menu on latest deployment → Redeploy
3. Monitor deployment logs to confirm email configuration is detected

---

## How Email Configuration Works

### URL Resolution Priority

The app uses this priority order for base URL:

1. **`BASE_URL`** - Explicitly set custom URL (highest priority)
2. **`SITE_URL`** - Alternative to BASE_URL (for compatibility)
3. **`VERCEL_URL`** - Automatically provided by Vercel (recommended)
4. **Fallback** - `https://petra-risk-app.vercel.app`

**Recommendation:** Don't set `BASE_URL` unless you have a custom domain. Let the app use `VERCEL_URL` automatically.

### Email Addresses

| Variable | Purpose | Example |
|----------|---------|---------|
| `POSTMARK_FROM` | Sender address for all emails | `risk@yourdomain.com` |
| `ADVISOR_EMAIL` | Recipient for internal notifications | `risk@yourdomain.com` |

### Email Flow

1. **Client submits assessment** → App generates results
2. **Advisor email sent** → To `ADVISOR_EMAIL` with full results + attachment
3. **Client email sent** (optional) → To client's email if they opted in

---

## Production-Safe Setup (Without Custom Domain)

### Current Recommended Configuration

```bash
# Postmark configuration
POSTMARK_SERVER_TOKEN=your-postmark-server-token
POSTMARK_FROM=your-verified-email@gmail.com
ADVISOR_EMAIL=your-verified-email@gmail.com

# URL configuration (leave blank to auto-detect)
# BASE_URL=
```

This configuration:
- ✅ Works immediately without DNS changes
- ✅ Emails are delivered reliably
- ✅ Assets (logo) load from Vercel URL
- ✅ Easy to migrate to custom domain later

### Verification Checklist

After deployment, verify the configuration:

1. **Check Vercel Function Logs:**
   ```
   [sendResults] Base URL for assets: https://[your-vercel-url].vercel.app
   [sendResults] POSTMARK_FROM: your-verified-email@gmail.com
   [sendResults] ADVISOR_EMAIL: your-verified-email@gmail.com
   ```

2. **Test Email Sending:**
   - Complete a test assessment
   - Check that advisor email is received at `ADVISOR_EMAIL`
   - Verify logo and formatting appear correctly
   - Test client email (opt-in during assessment)

3. **Common Issues:**
   - **"Missing required email configuration"** → Set `POSTMARK_FROM` and `ADVISOR_EMAIL`
   - **Email bounces** → Verify sender in Postmark
   - **Logo not loading** → Check `BASE_URL` points to correct deployment

---

## Migration Plan: Restoring Custom Domain

When DNS ownership for `risk.petrafinancial.com` is resolved:

### Step 1: Verify Domain in Postmark

1. Go to Postmark → Sender Signatures → Domains
2. Add `petrafinancial.com`
3. Add these DNS records to your domain:
   - **DKIM record** (for email authentication)
   - **Return-Path CNAME** (for bounce handling)
   - **SPF record** (add Postmark to existing SPF)
4. Wait for verification (usually instant, max 48 hours)

### Step 2: Update Vercel Environment Variables

Update these variables in Vercel:

```bash
# Update sender to custom domain
POSTMARK_FROM=risk@petrafinancial.com

# Update advisor email (can stay the same or change)
ADVISOR_EMAIL=risk@petrafinancial.com

# Set custom base URL
BASE_URL=https://risk.petrafinancial.com
```

### Step 3: Add Custom Domain to Vercel

1. Go to Vercel project → Settings → Domains
2. Add `risk.petrafinancial.com`
3. Follow Vercel's DNS instructions
4. Wait for SSL certificate provisioning

### Step 4: Redeploy and Test

1. Redeploy the application
2. Test email sending from custom domain
3. Verify logo loads from `https://risk.petrafinancial.com/assets/petra-email-logo.png`
4. Confirm advisor and client emails are received

**That's it!** No code changes required - just environment variable updates.

---

## Code Changes Made

The following files were modified to support domain-agnostic configuration:

### `api/sendResults.js`

**Change 1: Dynamic Base URL Resolution** (lines 287-293)
```javascript
// OLD: Hardcoded fallback
const baseURL = process.env.BASE_URL || process.env.SITE_URL || 'https://petra-risk-app.vercel.app';

// NEW: Uses VERCEL_URL automatically
const baseURL = process.env.BASE_URL
  || process.env.SITE_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://petra-risk-app.vercel.app';
```

**Change 2: Configurable Email Addresses** (lines 916-977)
```javascript
// OLD: Hardcoded values
From: process.env.POSTMARK_FROM || 'risk@petrafinancial.com',
To: 'risk@petrafinancial.com',

// NEW: Environment variables (required)
const fromEmail = process.env.POSTMARK_FROM;
const advisorEmail = process.env.ADVISOR_EMAIL;

// Validates configuration before sending
if (!fromEmail || !advisorEmail) {
  console.error('[sendResults] ✗ Missing required email configuration');
  // Skips email sending instead of using broken defaults
}
```

### `.env.example` (new file)

Created comprehensive documentation of all environment variables with:
- Required vs optional variables
- Examples for different scenarios
- Migration notes for custom domain restoration

---

## Email Content Notes

### Domain References in Email Bodies

The email templates still reference `www.petrafinancial.com` in:
- Footer text
- Company information
- Physical address

These are **intentionally not changed** because they refer to:
- The company's main website (not the risk app)
- Physical business location
- Brand identity

These references are independent of the risk app's domain and do not need to be dynamic.

### Logo and Assets

The logo (`petra-email-logo.png`) is loaded from the dynamic base URL:
- **Development:** Loads from localhost or dev URL
- **Production:** Loads from `VERCEL_URL` (or `BASE_URL` if set)
- **Future:** Will load from `risk.petrafinancial.com` after migration

---

## Troubleshooting

### Issue: Emails Not Sending

**Check:**
1. `POSTMARK_SERVER_TOKEN` is set in Vercel
2. `POSTMARK_FROM` is verified in Postmark
3. `ADVISOR_EMAIL` is set
4. View Vercel function logs for error messages

**Solution:**
- Verify sender signature in Postmark
- Check Postmark activity stream for bounces
- Ensure environment variables are set for correct environment

### Issue: Logo Not Displaying in Emails

**Check:**
1. Logo file exists at `/assets/petra-email-logo.png`
2. Base URL is correct in function logs
3. Logo is accessible at `{baseURL}/assets/petra-email-logo.png`

**Solution:**
- Ensure logo file is deployed to Vercel
- Check that base URL points to correct deployment
- Test URL in browser to confirm accessibility

### Issue: Wrong Domain in Emails

**Check:**
1. `BASE_URL` environment variable
2. Vercel deployment URL vs custom domain
3. Function logs show correct base URL

**Solution:**
- Update `BASE_URL` in Vercel environment variables
- Redeploy to pick up new environment variables

---

## Support Resources

- **Postmark Docs:** https://postmarkapp.com/support
- **Vercel Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **Domain Verification:** https://postmarkapp.com/support/article/1046-how-do-i-verify-a-domain

---

## Summary

✅ **Current State:**
- App works without custom domain dependency
- Email sending is fully configurable via environment variables
- Production-safe with verified email addresses
- Logo and assets load dynamically from deployment URL

✅ **Migration Ready:**
- No code changes needed to restore custom domain
- Only environment variable updates required
- Clear step-by-step migration path documented

✅ **Best Practices:**
- Validate configuration before email sending
- Log all configuration values (sanitized)
- Graceful fallback if configuration missing
- Clear error messages for troubleshooting
