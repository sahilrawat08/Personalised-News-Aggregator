# Quick Deployment Guide

## Prerequisites Setup

### 1. MongoDB Atlas (5 minutes)
1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create free M0 cluster
3. Database Access → Create user → Save username/password
4. Network Access → Allow 0.0.0.0/0 (or specific IPs)
5. Copy connection string: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/news-aggregator?retryWrites=true&w=majority`

### 2. Upstash Redis (Optional, 3 minutes)
1. Sign up at https://upstash.com/
2. Create Redis database → Free tier
3. Copy Redis URL: `redis://default:password@host:port`

### 3. Get API Keys
- NewsAPI: https://newsapi.org/register → Get free key
- Guardian: https://open-platform.theguardian.com/access/ → Register
- NYT: https://developer.nytimes.com/ → Get API key

## Deploy via Vercel Website (Easiest)

### 1. Push Code to GitHub
Make sure your code is pushed to a GitHub repository.

### 2. Deploy Backend

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure:
   - **Root Directory**: `server`
   - **Framework**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Add Environment Variables (click "Environment Variables"):
   - `MONGODB_URI` = your MongoDB connection string
   - `JWT_SECRET` = generate with: `openssl rand -base64 32`
   - `NEWSAPI_KEY` = your NewsAPI key
   - `GUARDIAN_API_KEY` = your Guardian API key
   - `NYT_API_KEY` = your NYT API key
   - `CORS_ORIGIN` = `https://your-frontend.vercel.app,https://*.vercel.app` (update after frontend deploy)
   - `REDIS_URL` = (optional) your Upstash Redis URL
6. Click **"Deploy"**
7. **Save the backend URL**: `https://your-project.vercel.app`

### 3. Deploy Frontend

1. Go to https://vercel.com/dashboard
2. Click **"Add New Project"**
3. Import your Git repository (same repo as backend)
4. Configure:
   - **Root Directory**: `client`
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
5. Add Environment Variable:
   - `VITE_API_BASE_URL` = `https://your-backend-url.vercel.app/api`
6. Click **"Deploy"**

### 4. Update Backend CORS

After frontend deploys, update backend's `CORS_ORIGIN` environment variable:
1. Go to backend project → Settings → Environment Variables
2. Update `CORS_ORIGIN` to include your frontend URL
3. Redeploy backend or wait for auto-deploy

---

## Deploy via CLI (Alternative)

### Backend
```bash
cd server
vercel login
vercel link
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NEWSAPI_KEY
vercel env add GUARDIAN_API_KEY
vercel env add NYT_API_KEY
vercel env add CORS_ORIGIN
vercel env add REDIS_URL  # optional
vercel --prod
```

### Frontend
```bash
cd client
vercel login
vercel link
vercel env add VITE_API_BASE_URL
# Enter: https://your-backend-url.vercel.app/api
vercel --prod
```

## Environment Variables Checklist

### Backend (in Vercel Dashboard)
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=<generate with: openssl rand -base64 32>`
- [ ] `NEWSAPI_KEY=<your-key>`
- [ ] `GUARDIAN_API_KEY=<your-key>`
- [ ] `NYT_API_KEY=<your-key>`
- [ ] `CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app`
- [ ] `REDIS_URL=<optional>`

### Frontend (in Vercel Dashboard)
- [ ] `VITE_API_BASE_URL=https://your-backend.vercel.app/api`

## Test Deployment

1. Backend health: `curl https://your-backend.vercel.app/api/health`
2. Frontend: Visit `https://your-frontend.vercel.app`
3. Register a user
4. Check articles load

## Troubleshooting

- **CORS errors**: Update `CORS_ORIGIN` to include your frontend URL
- **Database errors**: Check MongoDB Atlas IP whitelist and connection string
- **API errors**: Verify all API keys are set correctly
- **Build errors**: Check Vercel logs in dashboard

For detailed instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

