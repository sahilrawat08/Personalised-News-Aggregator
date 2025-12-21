# Debugging Login/Register Failures

## Quick Checks

### 1. Check Vercel Function Logs (MOST IMPORTANT!)

1. Go to **Vercel Dashboard** → Your Backend Project
2. Click on the latest **Deployment**
3. Go to **Functions** tab
4. Click on your function (`/api/index.js`)
5. Click **"Logs"** tab
6. Look for errors when you try to register/login

**What to look for:**
- `MongoDB connection error`
- `MONGODB_URI not set`
- `JWT_SECRET not set`
- `MongooseError`
- `ECONNREFUSED`

### 2. Verify Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

**REQUIRED variables:**
- ✅ `MONGODB_URI` - Must be set!
- ✅ `JWT_SECRET` - Must be set!
- ✅ `NODE_ENV` = `production` (usually auto-set)

**Check:**
- [ ] All variables are set for **Production** environment
- [ ] No typos in variable names (case-sensitive)
- [ ] MongoDB URI format is correct
- [ ] Values don't have extra spaces

### 3. Test Database Connection

The registration/login requires MongoDB to work. Check if MongoDB is connected:

**Option A: Check Health Endpoint**
```bash
curl https://your-backend.vercel.app/api/health
```

**Option B: Check Vercel Logs**
Look for these messages in logs:
- ✅ `[Vercel] Database connected` - Good!
- ❌ `Database connection error` - Bad!

### 4. Common Issues

#### Issue: "MongoDB connection error" or "ECONNREFUSED"

**Causes:**
1. `MONGODB_URI` not set in Vercel
2. MongoDB Atlas IP whitelist blocking Vercel
3. Wrong connection string format
4. Database user credentials incorrect

**Fix:**
1. Verify `MONGODB_URI` is set in Vercel Dashboard
2. MongoDB Atlas → Network Access → Add IP `0.0.0.0/0` (allow all)
3. Check connection string format:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/news-aggregator?retryWrites=true&w=majority
   ```
4. Verify username/password in MongoDB Atlas

#### Issue: "JWT_SECRET not set"

**Fix:**
1. Go to Vercel → Settings → Environment Variables
2. Add `JWT_SECRET` with any secure random string
3. You can generate one: `openssl rand -base64 32`
4. Redeploy backend

#### Issue: "User with this email already exists"

This is normal if you try to register the same email twice. Try a different email or login instead.

#### Issue: Frontend can't connect to backend

**Check:**
1. Frontend's `VITE_API_BASE_URL` is set correctly
2. Backend's `CORS_ORIGIN` includes frontend URL
3. Test backend directly with curl

### 5. Test Endpoints Directly

Test registration with curl to see the actual error:

```bash
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123456"
  }'
```

**Expected success response:**
```json
{
  "message": "User registered successfully",
  "user": { ... },
  "token": "..."
}
```

**If you get an error, check:**
- The error message in the response
- Vercel function logs
- Environment variables

### 6. MongoDB Atlas Checklist

✅ **Database Access:**
- User created with username/password
- User has read/write permissions

✅ **Network Access:**
- IP whitelist includes `0.0.0.0/0` (or Vercel IPs)
- No IP restrictions blocking connections

✅ **Connection String:**
- Format: `mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/news-aggregator?retryWrites=true&w=majority`
- Replace USERNAME and PASSWORD with actual values
- Include database name (`news-aggregator`)
- URL-encode special characters in password if needed

### 7. Still Not Working?

1. **Check Vercel Logs** - This is the most important step!
2. **Share the error message** from logs or browser console
3. **Verify all environment variables** are set correctly
4. **Test MongoDB connection** independently if possible
5. **Redeploy** after changing environment variables

