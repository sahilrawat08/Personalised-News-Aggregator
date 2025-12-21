# Fix CORS and API Base URL Issues

## Current Problem

**Frontend:** `https://news-f.vercel.app`
**Backend:** `https://news-nu-five-83.vercel.app`
**Error:** CORS blocked and wrong API path (`/auth/register` instead of `/api/auth/register`)

## Fix 1: Update Frontend Environment Variable

Go to **Vercel Dashboard** → Your Frontend Project (`news-f`) → **Settings** → **Environment Variables**

**Find:** `VITE_API_BASE_URL`
**Update to:** `https://news-nu-five-83.vercel.app/api`

**Important:** Must include `/api` at the end!

Then **redeploy the frontend**.

## Fix 2: Update Backend CORS

Go to **Vercel Dashboard** → Your Backend Project (`news-nu-five-83`) → **Settings** → **Environment Variables**

**Find:** `CORS_ORIGIN`
**Update to:** `https://news-f.vercel.app,https://*.vercel.app`

**Or if it doesn't exist, add it:**
- Key: `CORS_ORIGIN`
- Value: `https://news-f.vercel.app,https://*.vercel.app`

Then **redeploy the backend** (or wait for auto-redeploy).

## Quick Checklist

### Frontend (`news-f.vercel.app`)
- [ ] `VITE_API_BASE_URL` = `https://news-nu-five-83.vercel.app/api`
- [ ] Redeploy frontend

### Backend (`news-nu-five-83.vercel.app`)
- [ ] `CORS_ORIGIN` = `https://news-f.vercel.app,https://*.vercel.app`
- [ ] Redeploy backend

## After Fixing

1. Clear browser cache or use incognito mode
2. Try login/register again
3. Check browser console - should see successful API calls

## Verify It's Working

After redeploying, check:
- Browser console should NOT show CORS errors
- Network tab should show successful requests to `/api/auth/login` and `/api/auth/register`
- Login/register should work

