# Complete Deployment Guide

## Frontend: Vercel
**Time:** ~5 min | **Cost:** Free

1. Install CLI: `npm i -g vercel`
2. Deploy: `vercel --prod`
3. Set env: `VITE_API_BASE_URL=https://your-backend-url/api`

See: [Vercel Docs](https://vercel.com/docs)

## Backend: Railway
**Time:** ~10 min | **Cost:** Free ($5/month after trial)

1. Create Railway project
2. Add MongoDB Atlas + Redis
3. Deploy from GitHub
4. Set environment variables
5. Get public URL

See: [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Frontend                      │
│            (React/Vite - Static Site)                   │
│         https://your-app.vercel.app                     │
└──────────────────────┬──────────────────────────────────┘
                       │ API Calls
                       ↓
┌─────────────────────────────────────────────────────────┐
│                   Railway Backend                       │
│        (Node.js/Express/MongoDB/Redis)                  │
│     https://your-service.up.railway.app/api             │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   MongoDB Atlas  Redis Cache   External APIs
   (Atlas Free)   (Railway)     (NewsAPI, etc.)
```

## Environment Variables

### Vercel (Frontend)
```
VITE_API_BASE_URL=https://your-backend-url/api
```

### Railway (Backend)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=...
NEWSAPI_KEY=...
GUARDIAN_API_KEY=...
NYT_API_KEY=...
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

## Testing

Frontend:
```bash
curl https://your-app.vercel.app
```

Backend:
```bash
curl https://your-service.up.railway.app/api/health
```

## Next Steps

1. Deploy backend on Railway
2. Get backend public URL
3. Set `VITE_API_BASE_URL` on Vercel
4. Redeploy frontend
5. Test registration/login

Need help? Open an issue on GitHub.
