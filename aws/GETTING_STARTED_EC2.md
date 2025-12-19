# 🎯 Complete EC2 Deployment Setup - Getting Started

## ✅ What's Ready

Your News Aggregator is **fully dockerized and ready for EC2 deployment**!

### Current Status:
- ✅ **Local Docker** running and tested
- ✅ **Frontend**: http://localhost (nginx with React)
- ✅ **Backend**: http://localhost:4000 (Node.js/Express)
- ✅ **Database**: MongoDB on port 27017
- ✅ **Cache**: Redis on port 6379
- ✅ **Authentication**: Login/Registration working
- ✅ **EC2 scripts**: Ready for deployment

## 🚀 Deploy to EC2 in 3 Commands

### Step 1: Configure AWS (One-time setup)

```bash
# Install AWS CLI (if not already installed)
brew install awscli

# Configure your AWS credentials
aws configure
# When prompted, enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-east-1
# - Default output format: json
```

### Step 2: Navigate to Project

```bash
cd /Users/sahilrawat/Developer/projects/news-aggregator/Personalised-News-Aggregator
```

### Step 3: Deploy to EC2

```bash
# Run the quick deployment script
./aws/ec2-quick-deploy.sh
```

**That's it!** The script will:
1. Create an EC2 key pair
2. Create a security group
3. Launch an Ubuntu 22.04 instance
4. Install Docker and Docker Compose
5. Give you SSH connection details

## 📊 Deployment Timeline

| Step | Duration | What Happens |
|------|----------|--------------|
| 1. Script starts | 1 min | Creates AWS resources |
| 2. Instance launches | 2 min | EC2 instance boots up |
| 3. Initialization | 2-3 min | Docker/Docker Compose install |
| 4. Ready to use | Total: ~5 min | Instance ready for deployment |

## 🔌 After Deployment

Once the script completes, you'll get:

```
Instance Details:
  Instance ID:    i-xxxxxxxxxxxxx
  Public IP:      xx.xxx.xxx.xxx
  Key File:       news-aggregator-xxxxx.pem
  SSH Command:    ssh -i news-aggregator-xxxxx.pem ubuntu@xx.xxx.xxx.xxx
```

### Wait 2-3 minutes for Docker installation, then:

```bash
# SSH into your instance
ssh -i news-aggregator-xxxxx.pem ubuntu@<public-ip>

# Once connected, deploy the app:
cd /home/ubuntu
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator

# Copy environment template
cp .env.example .env

# Edit with your API keys (optional for demo)
nano .env

# Start the application
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Access Your App

After `docker-compose up -d` completes:

```
Frontend:  http://<your-public-ip>
Backend:   http://<your-public-ip>:4000
Health:    http://<your-public-ip>:4000/api/health
```

## 📋 Complete Example

```bash
# 1. Setup AWS (one-time)
aws configure
# Enter your credentials

# 2. Go to project
cd /Users/sahilrawat/Developer/projects/news-aggregator/Personalised-News-Aggregator

# 3. Deploy (5 minutes)
./aws/ec2-quick-deploy.sh

# Output will show something like:
# Instance ID:    i-0123456789abcdef0
# Public IP:      54.123.45.67
# SSH Command:    ssh -i news-aggregator-1703078400.pem ubuntu@54.123.45.67

# 4. Wait 2-3 minutes, then SSH in
ssh -i news-aggregator-1703078400.pem ubuntu@54.123.45.67

# 5. Deploy app on the instance
cd /home/ubuntu
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator
cp .env.example .env
docker-compose up -d

# 6. Access at http://54.123.45.67
```

## 🎓 Understanding EC2 Deployment

### What EC2 Provides
- Ubuntu Linux server on AWS
- Docker pre-installed via initialization script
- Security group (firewall rules) configured
- SSH access via key pair
- Fixed IP address

### What You Deploy
- Your News Aggregator application
- MongoDB and Redis databases
- Nginx reverse proxy
- All configured via docker-compose

### How It Works
```
Your Computer
     ↓
SSH Key
     ↓
EC2 Instance (Ubuntu 22.04)
     ↓
Docker Containers
├── Frontend (React + Nginx)
├── Backend (Node.js/Express)
├── MongoDB
└── Redis
     ↓
Public IP Address
     ↓
Internet
```

## 💡 Why This Setup is Great

✅ **Simple**: One command deployment  
✅ **Cheap**: ~$15-20/month  
✅ **Fast**: 5 minutes to deploy  
✅ **Flexible**: Can SSH in and manage  
✅ **Learning**: Great for understanding Docker + AWS  
✅ **Scalable**: Can upgrade instance type later  

## 🔒 Security Considerations

### SSH Key Security
```bash
# Your key file will be downloaded
ls -la news-aggregator-*.pem

# Keep it secure
chmod 400 news-aggregator-*.pem  # Restrict permissions

# Never commit to git
echo "*.pem" >> .gitignore
```

### Port Security
The security group opens:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 4000 (Backend API)

This is safe for development/demo. For production, restrict to your IP.

### Environment Variables
Store API keys in `.env` file, NOT in code:
```bash
# .env on the instance
NEWSAPI_KEY=your-secret-key
GUARDIAN_API_KEY=your-secret-key
NYT_API_KEY=your-secret-key
```

## 📊 Cost Analysis

### Monthly Costs (US-East-1)

| Component | Price |
|-----------|-------|
| t3.small EC2 instance (730 hours) | $12.00 |
| EBS storage (30 GB) | $3.00 |
| Data transfer (minimal for demo) | $0-5.00 |
| **Total** | **$15-20** |

### Free Tier
AWS gives 12 months free for:
- 750 hours t2.micro (too small)
- 30 GB EBS storage
- Data transfer (first 1 GB/month)

You can use free tier credits, or t3.small is very affordable.

## 🛠️ Troubleshooting

### Instance Won't Launch
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check region
aws configure get region

# Verify you have EC2 permissions
# Contact AWS support if needed
```

### Can't SSH Into Instance
```bash
# Check key permissions
chmod 400 news-aggregator-*.pem

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Verify instance is running
aws ec2 describe-instances --instance-ids i-xxxxx
```

### Docker Not Running on Instance
```bash
# SSH into instance
ssh -i news-aggregator-*.pem ubuntu@<public-ip>

# Check Docker status
sudo systemctl status docker

# View installation logs
sudo journalctl -u docker -n 50
```

### Application Not Accessible
```bash
# SSH into instance
ssh -i news-aggregator-*.pem ubuntu@<public-ip>

# Check if containers are running
docker ps

# View logs
docker-compose logs

# Test connectivity
curl http://localhost
curl http://localhost:4000/api/health
```

## 🔄 Managing Your Instance

### View Logs
```bash
ssh -i news-aggregator-*.pem ubuntu@<public-ip>
cd Personalised-News-Aggregator
docker-compose logs -f
```

### Stop Application
```bash
ssh -i news-aggregator-*.pem ubuntu@<public-ip>
cd Personalised-News-Aggregator
docker-compose down
```

### Restart Application
```bash
ssh -i news-aggregator-*.pem ubuntu@<public-ip>
cd Personalised-News-Aggregator
docker-compose restart
```

## 🧹 Cleanup

### Stop Instance (Saves Money, Keeps EBS)
```bash
aws ec2 stop-instances --instance-ids i-xxxxx
# Cost: Only EBS storage ($3/month)
```

### Terminate Instance (Full Cleanup)
```bash
aws ec2 terminate-instances --instance-ids i-xxxxx
aws ec2 delete-security-group --group-id sg-xxxxx
aws ec2 delete-key-pair --key-name news-aggregator-xxxxx
rm news-aggregator-xxxxx.pem
```

## 📈 Upgrading Instance

If you need better performance:

### Vertical Scaling (Larger Instance)
```bash
# In AWS Console:
# 1. Stop instance
# 2. Change instance type (t3.small → t3.medium)
# 3. Start instance
# Same IP, bigger performance

# Cost increases from $12 → $25/month
```

### Horizontal Scaling (Multiple Instances)
See `DEPLOYMENT_COMPARISON.md` for ECS setup.

## 🎯 Next Steps

### Immediate (Deployment)
1. Run `./aws/ec2-quick-deploy.sh`
2. SSH into instance
3. Deploy with `docker-compose up -d`
4. Access application

### Short Term (Customization)
1. Update `.env` with API keys
2. Add custom domain
3. Setup SSL/HTTPS
4. Configure monitoring

### Medium Term (Production)
1. Setup auto-backups
2. Configure email alerts
3. Add application monitoring
4. Plan for scaling

### Long Term (Growth)
1. Migrate to ECS for auto-scaling
2. Use RDS for database
3. Use ElastiCache for Redis
4. Multi-region deployment

## 📚 Related Documentation

- `README_EC2.md` - EC2 quick start
- `EC2_DEPLOYMENT_GUIDE.md` - Detailed guide
- `DEPLOYMENT_COMPARISON.md` - EC2 vs ECS
- `DEPLOYMENT_GUIDE.md` - ECS setup

## ✨ Summary

You have a **production-ready, dockerized News Aggregator** that:
- Runs locally with Docker
- Deploys to EC2 in 5 minutes
- Costs ~$15-20/month
- Can scale to production with ECS
- Includes complete AWS deployment automation

**Ready to deploy?**
```bash
./aws/ec2-quick-deploy.sh
```

That's it! 🚀
