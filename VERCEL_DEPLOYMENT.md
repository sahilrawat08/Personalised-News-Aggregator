# Vercel Deployment Guide

This guide will walk you through deploying the Personalized News Aggregator on Vercel, including the frontend, backend, and database setup.

## Overview

The application consists of:
- **Frontend**: React + Vite application (in `/client`)
- **Backend**: Express.js API (in `/server`)
- **Database**: MongoDB (we'll use MongoDB Atlas)
- **Cache**: Redis (optional, we'll use Upstash for serverless)

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas/register) (free tier available)
3. An [Upstash account](https://upstash.com/) (free tier available) - for Redis
4. API keys for news services:
   - NewsAPI.org key
   - Guardian API key
   - NYT API key

## Step 1: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (select the free M0 tier)
3. Create a database user:
   - Go to **Database Access** → **Add New Database User**
   - Choose **Password** authentication
   - Save the username and password securely
4. Whitelist IP addresses:
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0) for simplicity, or add Vercel's IP ranges
5. Get your connection string:
   - Go to **Clusters** → **Connect** → **Connect your application**
   - Copy the connection string (it will look like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/`)
   - Replace `<username>` and `<password>` with your database user credentials
   - Add the database name at the end: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/news-aggregator?retryWrites=true&w=majority`

## Step 2: Set Up Upstash Redis (Optional but Recommended)

1. Go to [Upstash](https://upstash.com/)
2. Sign up/login
3. Create a new Redis database:
   - Click **Create Database**
   - Select a region close to your users
   - Choose the **Free** tier
   - Click **Create**
4. Copy the connection details:
   - Go to your database dashboard
   - Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** (for REST API)
   - OR copy the **Redis URL** (for direct connection) - format: `redis://default:<password>@<host>:<port>`

## Step 3: Deploy Backend to Vercel

You can deploy via the Vercel website (recommended) or using the CLI. Both methods are described below.

### Option A: Deploy via Vercel Website (Recommended)

1. **Push your code to GitHub** (if not already):
   - Create a repository on GitHub
   - Push your code to the repository

2. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

3. **Click "Add New Project"**

4. **Import your Git repository**:
   - Select your GitHub/GitLab/Bitbucket repository
   - Click "Import"

5. **Configure the project**:
   - **Project Name**: e.g., `news-aggregator-backend`
   - **Root Directory**: Click "Edit" and set to `server`
   - **Framework Preset**: Select "Other" or leave as "Other"
   - **Build Command**: Leave empty (or use `npm install`)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

6. **Add Environment Variables**:
   Click "Environment Variables" and add:
   - Go to your project settings → **Environment Variables**
   - Add the following variables:

   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/news-aggregator?retryWrites=true&w=majority
   REDIS_URL=redis://default:password@host:port (optional)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   NEWSAPI_KEY=your-newsapi-key
   GUARDIAN_API_KEY=your-guardian-api-key
   NYT_API_KEY=your-nyt-api-key
   CORS_ORIGIN=https://your-frontend-domain.vercel.app,https://*.vercel.app
   ```

   **Important**: 
   - Replace all placeholder values with your actual credentials
   - For `CORS_ORIGIN`, include your frontend URL(s). You can use `*.vercel.app` to allow all Vercel preview deployments
   - Generate a secure `JWT_SECRET` (e.g., use `openssl rand -base64 32`)

7. **Click "Deploy"**
   - Vercel will automatically build and deploy your project
   - Wait for the deployment to complete (usually 1-2 minutes)

8. **Note your backend URL**: After deployment, you'll see a URL like `https://your-project.vercel.app`. Save this URL!

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Navigate to the server directory**:
   ```bash
   cd server
   ```

3. **Login to Vercel**:
   ```bash
   vercel login
   ```

4. **Link your project**:
   ```bash
   vercel link
   ```
   - Select or create a Vercel project
   - Choose your organization

5. **Set environment variables** (you can also do this via the dashboard):
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   # ... add all other variables
   ```

6. **Deploy**:
   ```bash
   vercel --prod
   ```

## Step 4: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Website (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**

2. **Click "Add New Project"**

3. **Import your Git repository** (same repository as backend):
   - Select your GitHub/GitLab/Bitbucket repository
   - Click "Import"

4. **Configure the project**:
   - **Project Name**: e.g., `news-aggregator-frontend`
   - **Root Directory**: Click "Edit" and set to `client`
   - **Framework Preset**: Select "Vite"
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   Click "Environment Variables" and add:
   ```
   VITE_API_BASE_URL=https://your-backend-url.vercel.app/api
   ```
   Replace `your-backend-url` with your actual backend URL from Step 3.

6. **Click "Deploy"**
   - Vercel will automatically build and deploy your frontend
   - Wait for the deployment to complete

### Option B: Deploy via Vercel CLI

1. **Navigate to the client directory**:
   ```bash
   cd ../client
   ```

2. **Login to Vercel** (if not already logged in):
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```

4. **Set environment variable**:
   ```bash
   vercel env add VITE_API_BASE_URL
   # Enter: https://your-backend-url.vercel.app/api
   ```

5. **Deploy**:
   ```bash
   vercel --prod
   ```

## Step 5: Update CORS in Backend

After deploying the frontend, update the backend's `CORS_ORIGIN` environment variable:

1. Go to your backend project in Vercel Dashboard
2. Settings → **Environment Variables**
3. Update `CORS_ORIGIN` to include your frontend URL:
   ```
   CORS_ORIGIN=https://your-frontend.vercel.app,https://*.vercel.app
   ```
4. Redeploy the backend or wait for automatic deployment

## Alternative: Monorepo Deployment

If you prefer to deploy both frontend and backend from the root directory:

### Option A: Two Separate Vercel Projects (Recommended)

Deploy frontend and backend as separate projects (as described above). This gives you:
- Independent scaling
- Separate environments
- Better isolation

### Option B: Monorepo with Vercel

1. Create `vercel.json` in the root directory:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/api/index.js",
         "use": "@vercel/node"
       },
       {
         "src": "client/package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/server/api/index.js"
       },
       {
         "src": "/(.*)",
         "dest": "/client/$1"
       }
     ]
   }
   ```

2. Update build scripts in root `package.json` (if exists) or set in Vercel dashboard:
   - Frontend build: `cd client && npm install && npm run build`
   - Backend build: `cd server && npm install`

## Environment Variables Summary

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment | Yes | `production` |
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb+srv://...` |
| `REDIS_URL` | Redis connection string | No | `redis://default:...` |
| `JWT_SECRET` | JWT signing secret | Yes | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT expiration | No | `24h` |
| `NEWSAPI_KEY` | NewsAPI.org API key | Yes | `...` |
| `GUARDIAN_API_KEY` | Guardian API key | Yes | `...` |
| `NYT_API_KEY` | NYT API key | Yes | `...` |
| `CORS_ORIGIN` | Allowed frontend origins | Yes | `https://your-app.vercel.app` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API URL | Yes | `https://your-backend.vercel.app/api` |

## Testing Your Deployment

1. **Test Backend Health**:
   ```bash
   curl https://your-backend.vercel.app/api/health
   ```

2. **Test Frontend**:
   - Visit your frontend URL
   - Try registering a new user
   - Try logging in
   - Browse articles

3. **Check Logs**:
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Monitor for any errors

## Troubleshooting

### CORS Errors

If you see CORS errors:
1. Verify `CORS_ORIGIN` includes your frontend URL
2. Make sure there are no trailing slashes
3. Check browser console for the exact origin being blocked

### Database Connection Errors

1. Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` (or Vercel IPs)
2. Check connection string format (includes username, password, and database name)
3. Verify database user has proper permissions

### Redis Connection Errors

Redis is optional. If you don't set `REDIS_URL`, the app will run without caching. For better performance, set up Upstash.

### Environment Variables Not Working

1. Make sure variables are set for the correct environment (Production, Preview, Development)
2. Redeploy after adding new environment variables
3. For frontend, variables must start with `VITE_` to be exposed

### API Routes Not Working

1. Verify the backend is deployed and accessible
2. Check that routes start with `/api/`
3. Verify the `vercel.json` configuration is correct

## Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Database user created with secure password
- [ ] IP whitelist configured
- [ ] Upstash Redis configured (optional)
- [ ] All API keys obtained (NewsAPI, Guardian, NYT)
- [ ] Secure JWT_SECRET generated
- [ ] Backend deployed to Vercel
- [ ] Backend environment variables set
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variables set
- [ ] CORS configured correctly
- [ ] Health check endpoint working
- [ ] User registration/login tested
- [ ] Articles fetching working

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas connection logs
3. Review environment variables configuration
4. Test API endpoints directly with curl/Postman

