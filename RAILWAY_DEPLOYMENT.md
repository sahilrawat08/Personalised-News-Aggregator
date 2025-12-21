# Railway Backend Deployment Guide

Deploy the News Aggregator backend to Railway in 5 minutes.

## Prerequisites
- Railway account (free tier available): https://railway.app
- Backend code in `server/` directory
- All API keys (NewsAPI, Guardian, NYT)

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Connect your GitHub account and select `Personalised-News-Aggregator` repo

## Step 2: Configure Services

### MongoDB Atlas (Free tier)
1. Sign up at [mongodb.com/cloud](https://mongodb.com/cloud)
2. Create a free cluster
3. Get your connection string: `mongodb+srv://user:password@cluster.mongodb.net/news-aggregator?retryWrites=true&w=majority`
4. In Railway dashboard: Add MongoDB plugin OR paste connection string as env var

### Redis (Railway Plugin)
1. In Railway dashboard, click **+ New**
2. Select **Redis**
3. Railway auto-configures the connection

### Backend Service
1. In Railway, click **+ New** → **GitHub Repo**
2. Select this repo
3. Set **Root Directory** to `server`
4. Configure environment variables (see below)

## Step 3: Environment Variables

Add these to Railway (Settings → Variables):

```
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/news-aggregator?retryWrites=true&w=majority
REDIS_URL=redis://default:password@redis-service:6379
JWT_SECRET=your-very-secure-jwt-secret-change-this
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-change-this
SESSION_SECRET=your-session-secret-change-this
NEWSAPI_KEY=your-newsapi-key
GUARDIAN_API_KEY=your-guardian-api-key
NYT_API_KEY=your-nyt-api-key
CORS_ORIGIN=https://your-vercel-frontend-url.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## Step 4: Deploy

1. Railway auto-deploys on `git push`
2. Monitor deployment in Railway dashboard
3. Get your backend URL: `https://your-service.up.railway.app`

## Step 5: Link Frontend to Backend

In Vercel dashboard:
- Set environment variable: `VITE_API_BASE_URL=https://your-service.up.railway.app/api`
- Trigger redeploy

## Test

```bash
curl https://your-service.up.railway.app/api/health
```

Should return: `{"status":"healthy", ...}`

## Troubleshooting

**502 Bad Gateway:**
- Check MongoDB connection string
- Verify all required env vars are set
- Check Railway logs

**CORS Errors:**
- Ensure `CORS_ORIGIN` matches your Vercel frontend URL exactly

**Rate limit issues:**
- Increase `RATE_LIMIT_MAX` if needed
