#!/bin/bash

# Quick fix script for EC2 deployment issues
# Run this on your EC2 instance to fix the backend permission issues

echo "🔧 Fixing News Aggregator deployment issues..."

# Navigate to project directory
cd ~/Personalised-News-Aggregator || { echo "Error: Directory not found"; exit 1; }

# Stop containers
echo "📦 Stopping containers..."
docker-compose down

# Pull latest changes
echo "🔄 Pulling latest code..."
git pull origin main

# Ensure host permissions for backend bind mount
echo "🔐 Fixing host permissions for backend..."
mkdir -p server/logs
if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
else
    SUDO=""
fi
$SUDO chown -R 1001:1001 server || echo "⚠️  Unable to chown server directory (continuing)"

# Fix the Dockerfile if logs directory line is missing
echo "🔍 Checking Dockerfile..."
if ! grep -q "mkdir -p /app/logs" server/Dockerfile; then
    echo "⚠️  Dockerfile needs updating..."
    # Backup original
    cp server/Dockerfile server/Dockerfile.backup
    
    # Add logs directory creation after user creation
    sed -i '/RUN adduser -S nextjs -u 1001/a \\n# Create logs directory with proper permissions\nRUN mkdir -p /app/logs \&\& chown -R nextjs:nodejs /app/logs' server/Dockerfile
    
    echo "✅ Dockerfile updated"
else
    echo "✅ Dockerfile already has logs directory fix"
fi

# Update .env file with EC2 IP
echo "⚙️  Updating environment configuration..."
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Detected EC2 IP: $EC2_IP"

# Update CORS_ORIGIN in .env
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=http://$EC2_IP|g" .env
sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env

# Rebuild containers with latest changes
echo "🏗️  Rebuilding containers..."
docker-compose build --no-cache

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Check container status
echo "📊 Container status:"
docker-compose ps

# Check backend logs
echo ""
echo "📝 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend

# Test health endpoint
echo ""
echo "🏥 Testing backend health..."
curl -s http://localhost:4000/api/health | jq . || echo "Backend not responding yet"

echo ""
echo "✅ Fix complete!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   Frontend: http://$EC2_IP"
echo "   Backend:  http://$EC2_IP:4000"
echo ""
echo "💡 If issues persist, check logs with:"
echo "   docker-compose logs -f"
