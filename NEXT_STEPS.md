# Deployment Success! Next Steps

## ✅ Backend is Working!

You're seeing the API root endpoint response, which means:
- ✅ Serverless function is deployed correctly
- ✅ Express app is running
- ✅ Vercel deployment is successful

## Quick Tests

### 1. Test Health Endpoint
Visit: `https://your-backend.vercel.app/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...,
  "version": "2.0.0",
  "environment": "production"
}
```

### 2. Test API Endpoints
```bash
# Health check
curl https://your-backend.vercel.app/api/health

# Register a user (test endpoint)
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

## Next: Deploy Frontend

### Step 1: Deploy Frontend to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your GitHub repository (same one: `sahilrawat08/Personalised-News-Aggregator`)
4. Configure:
   - **Project Name**: `news-aggregator-frontend` (or any name)
   - **Root Directory**: Click "Edit" → Set to `client`
   - **Framework Preset**: Vite (should auto-detect)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
5. **Add Environment Variable**:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://your-backend.vercel.app/api`
   - Replace `your-backend` with your actual backend project name
6. Click **"Deploy"**

### Step 2: Update Backend CORS

After frontend deploys:

1. Go to your **Backend** project in Vercel Dashboard
2. Go to **Settings** → **Environment Variables**
3. Find `CORS_ORIGIN` variable
4. Update it to include your frontend URL:
   ```
   https://your-frontend.vercel.app,https://*.vercel.app
   ```
   Replace `your-frontend` with your actual frontend project name
5. Save and redeploy backend (or wait for auto-redeploy)

### Step 3: Test Full Application

1. Visit your frontend URL: `https://your-frontend.vercel.app`
2. Try registering a new user
3. Try logging in
4. Browse articles
5. Test all features

## Troubleshooting

If frontend can't connect to backend:
- ✅ Check `VITE_API_BASE_URL` is set correctly
- ✅ Check `CORS_ORIGIN` includes frontend URL
- ✅ Check browser console for errors
- ✅ Verify backend URL is accessible

## Your URLs

**Backend:** `https://your-backend.vercel.app`
**Frontend:** `https://your-frontend.vercel.app` (after deployment)

## Need Help?

- Check logs: Vercel Dashboard → Project → Functions → Logs
- See `TROUBLESHOOTING.md` for common issues
- Test backend endpoints directly with curl/Postman

