# Troubleshooting Vercel Deployment

## Common Issues and Solutions

### 1. Serverless Function Crashed (500 Error)

**Symptoms:**
- Error: `500: INTERNAL_SERVER_ERROR`
- Code: `FUNCTION_INVOCATION_FAILED`

**Possible Causes & Solutions:**

#### A. Missing Environment Variables
- **Check:** Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- **Fix:** Ensure all required environment variables are set:
  - `MONGODB_URI` - MongoDB connection string
  - `JWT_SECRET` - JWT signing secret
  - `NEWSAPI_KEY`, `GUARDIAN_API_KEY`, `NYT_API_KEY` - News API keys
  - `CORS_ORIGIN` - Frontend URL(s)

#### B. MongoDB Connection Issues
- **Check:** Verify MongoDB Atlas connection string is correct
- **Fix:**
  1. Check MongoDB Atlas → Network Access → Ensure IP whitelist includes `0.0.0.0/0` (or Vercel IPs)
  2. Verify connection string format: `mongodb+srv://username:password@cluster.mongodb.net/news-aggregator?retryWrites=true&w=majority`
  3. Ensure username/password are URL-encoded (replace special chars with % encoding)
  4. Check MongoDB Atlas cluster is running (not paused)

#### C. Import/Module Errors
- **Check:** Check Vercel build logs for import errors
- **Fix:** Ensure all imports use `.js` extension (not `.jsx` or without extension)
- Check `package.json` has `"type": "module"` for ES modules

#### D. Logger File System Errors
- **Status:** Fixed in latest code - logger now skips file writes in serverless
- **If still occurring:** Ensure latest code is deployed

### 2. Check Deployment Logs

**How to view logs:**
1. Go to Vercel Dashboard → Your Project
2. Click on the latest deployment
3. Click "Functions" tab → Click on your function → View "Logs"

**What to look for:**
- Database connection errors
- Missing environment variables
- Import/module errors
- Uncaught exceptions

### 3. Test Backend Health Endpoint

```bash
curl https://your-backend.vercel.app/api/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": ...,
  "version": "2.0.0",
  "environment": "production"
}
```

### 4. MongoDB Connection String Format

**Correct format:**
```
mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/news-aggregator?retryWrites=true&w=majority
```

**Common mistakes:**
- Missing database name at the end
- Username/password with special characters not URL-encoded
- Wrong cluster address
- Missing `?retryWrites=true&w=majority` parameters

**How to encode special characters:**
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`

### 5. Environment Variables Not Working

**Check:**
1. Variables are set for **Production** environment (not just Preview/Development)
2. Variable names are correct (case-sensitive)
3. No trailing spaces in values
4. Redeploy after adding new variables

**For Frontend (`VITE_*` variables):**
- Must start with `VITE_` prefix
- Rebuild required after adding new variables

### 6. CORS Errors

**Symptoms:**
- Frontend can't connect to backend
- Browser console shows CORS errors

**Fix:**
1. Go to Backend project → Settings → Environment Variables
2. Update `CORS_ORIGIN` to include your frontend URL:
   ```
   https://your-frontend.vercel.app,https://*.vercel.app
   ```
3. Redeploy backend
4. Ensure frontend's `VITE_API_BASE_URL` points to backend URL

### 7. Function Timeout

**Symptoms:**
- Requests take too long
- 504 Gateway Timeout errors

**Causes:**
- Database queries taking too long
- External API calls timing out
- Large response payloads

**Solutions:**
- Optimize database queries
- Add proper indexing in MongoDB
- Implement response caching
- Reduce response payload size

### 8. Cold Start Issues

**Symptoms:**
- First request after inactivity is slow
- Subsequent requests are fast

**This is normal** for serverless functions. The function "warms up" after first request.

### 9. Redis Connection Issues

**Note:** Redis is optional. If `REDIS_URL` is not set or connection fails, the app will run without caching.

**If you want Redis:**
- Set up Upstash Redis (free tier available)
- Add `REDIS_URL` environment variable
- Format: `redis://default:password@host:port`

### 10. Debugging Tips

1. **Add console.log statements:**
   ```javascript
   console.log('[DEBUG] Environment:', process.env.NODE_ENV);
   console.log('[DEBUG] MongoDB URI:', process.env.MONGODB_URI ? 'Set' : 'Missing');
   ```

2. **Check function logs in real-time:**
   - Vercel Dashboard → Project → Functions → Your Function → Logs

3. **Test locally with Vercel:**
   ```bash
   cd server
   vercel dev
   ```

4. **Test individual endpoints:**
   ```bash
   # Health check
   curl https://your-backend.vercel.app/api/health
   
   # Test with authentication
   curl -H "Authorization: Bearer YOUR_TOKEN" https://your-backend.vercel.app/api/users/me
   ```

### 11. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `MONGODB_URI not set` | Missing env variable | Add `MONGODB_URI` in Vercel dashboard |
| `MongooseError: connect ECONNREFUSED` | MongoDB not accessible | Check IP whitelist in MongoDB Atlas |
| `JWT_SECRET not set` | Missing env variable | Add `JWT_SECRET` in Vercel dashboard |
| `CORS blocked origin` | Frontend URL not allowed | Update `CORS_ORIGIN` env variable |
| `Module not found` | Import error | Check file paths and extensions |
| `Cannot read property of undefined` | Runtime error | Check function logs for details |

### 12. Getting Help

If you're still stuck:
1. Check Vercel function logs (most important!)
2. Verify all environment variables are set
3. Test MongoDB connection string independently
4. Check GitHub Issues or Vercel Discord
5. Review the deployment logs in Vercel dashboard

