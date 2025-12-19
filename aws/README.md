# 🚀 AWS Deployment for News Aggregator

Complete AWS deployment solutions for your News Aggregator application. Choose between **EC2** (simple, cost-effective) or **ECS** (scalable, production-ready).

## 📁 What's Inside

```
aws/
├── README_EC2.md                      # EC2 deployment quick start
├── EC2_DEPLOYMENT_GUIDE.md            # Detailed EC2 setup guide
├── ec2-quick-deploy.sh                # One-command EC2 deployment ⚡
├── ec2-deployment.sh                  # Full EC2 deployment script
├── ec2-init-script.sh                 # Instance initialization
│
├── DEPLOYMENT_GUIDE.md                # ECS deployment guide
├── deploy-aws.sh                      # ECS automated deployment
├── task-definition-backend.json       # ECS backend task definition
├── task-definition-frontend.json      # ECS frontend task definition
│
├── DEPLOYMENT_COMPARISON.md           # EC2 vs ECS comparison
└── README.md                          # This file
```

## 🎯 Quick Start (Choose One)

### Option 1: EC2 (Recommended for Projects/Learning) ⚡

**Perfect for:** Portfolios, demos, learning AWS, cost-sensitive projects

```bash
# Setup takes ~5 minutes, deployment takes ~15 minutes
chmod +x aws/ec2-quick-deploy.sh
./aws/ec2-quick-deploy.sh

# Done! Your app is running on EC2 with Docker
```

**Cost:** ~$15-20/month

### Option 2: ECS Fargate (Recommended for Production) 🏢

**Perfect for:** Production applications, auto-scaling, high availability

```bash
# Setup takes ~30 minutes
chmod +x aws/deploy-aws.sh
./aws/deploy-aws.sh

# Follow prompts to set up ECS cluster
```

**Cost:** ~$60-100/month for typical workload

## 📊 Which One Should I Use?

| Need | Choose |
|------|--------|
| **Fastest deployment** | EC2 (`ec2-quick-deploy.sh`) |
| **Lowest cost** | EC2 (t3.small instance) |
| **Portfolio/Demo** | EC2 |
| **Learning AWS** | EC2 |
| **Production use** | ECS |
| **Auto-scaling** | ECS |
| **High traffic** | ECS |
| **Cost no concern** | ECS |

**Still unsure?** Read `DEPLOYMENT_COMPARISON.md` for detailed analysis.

## 🚀 Deployment Options

### EC2 Deployment

**Scripts:**
- `ec2-quick-deploy.sh` - One-liner deployment (recommended)
- `ec2-deployment.sh` - Full setup with configuration

**Documentation:**
- `README_EC2.md` - Quick start guide
- `EC2_DEPLOYMENT_GUIDE.md` - Detailed step-by-step guide

**What happens:**
1. AWS creates a key pair and security group
2. Launches Ubuntu 22.04 LTS instance
3. Installs Docker and Docker Compose
4. Provides SSH connection details
5. You then deploy your app with `docker-compose up -d`

### ECS Deployment

**Scripts:**
- `deploy-aws.sh` - Complete ECS setup

**Documentation:**
- `DEPLOYMENT_GUIDE.md` - ECS setup guide

**What happens:**
1. Creates ECS cluster
2. Builds Docker images
3. Pushes to AWS ECR (Elastic Container Registry)
4. Creates task definitions
5. Deploys services with load balancer
6. Sets up auto-scaling

## 🎓 Learning Path

### For Beginners:
1. Start with EC2: `./aws/ec2-quick-deploy.sh`
2. SSH into instance and run `docker-compose up -d`
3. Learn Docker, application deployment
4. When ready, migrate to ECS

### For Experienced Developers:
1. Choose based on your needs (EC2 or ECS)
2. Review the comparison: `DEPLOYMENT_COMPARISON.md`
3. Follow the specific deployment guide
4. Deploy with the automated scripts

## 🔧 Prerequisites

### Required
- AWS Account with billing enabled
- AWS CLI installed: `brew install awscli` (macOS) or [AWS CLI docs](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- AWS credentials configured: `aws configure`

### Recommended
- Git installed
- Docker installed (for local testing)
- Basic understanding of AWS concepts

## 📋 Step-by-Step: EC2 Deployment

```bash
# 1. Ensure AWS CLI is configured
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output format (json)

# 2. Navigate to project directory
cd Personalised-News-Aggregator

# 3. Run quick deployment
chmod +x aws/ec2-quick-deploy.sh
./aws/ec2-quick-deploy.sh

# 4. Wait for output with your instance details
# Note: Instance ID, Public IP, and SSH command

# 5. Wait 2-3 minutes for Docker to install
sleep 180

# 6. SSH into your instance
ssh -i <key-file>.pem ubuntu@<public-ip>

# 7. On the instance, deploy the application
cd /home/ubuntu
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator
cp .env.example .env
nano .env  # Add your API keys
docker-compose up -d

# 8. Access your application
# Frontend: http://<public-ip>
# Backend: http://<public-ip>:4000
# Health: http://<public-ip>:4000/api/health
```

## 📋 Step-by-Step: ECS Deployment

```bash
# 1. Ensure AWS CLI is configured
aws configure

# 2. Navigate to project directory
cd Personalised-News-Aggregator

# 3. Run ECS deployment
chmod +x aws/deploy-aws.sh
./aws/deploy-aws.sh

# 4. Follow the prompts and wait for deployment
# The script will:
# - Create ECR repositories
# - Build Docker images
# - Create ECS cluster
# - Deploy services

# 5. Access your application via ALB URL (provided at the end)
```

## 🌍 What You Get

### EC2 Setup Includes:
- ✅ EC2 instance (Ubuntu 22.04 LTS)
- ✅ Docker + Docker Compose
- ✅ Security group with ports 22, 80, 443, 4000 open
- ✅ SSH key pair for secure access
- ✅ Elastic IP (free tier eligible)

### ECS Setup Includes:
- ✅ ECS cluster
- ✅ ECR repositories for Docker images
- ✅ Application Load Balancer
- ✅ Auto-scaling groups
- ✅ CloudWatch monitoring
- ✅ Automatic failover

## 💰 Cost Breakdown

### EC2 (Monthly Estimate)
- t3.small instance: $12
- EBS storage (30GB): $3
- Data transfer: $0-5
- **Total: $15-20/month**

### ECS Fargate (Monthly Estimate)
- 2x tasks running 24/7: $30-50
- Application Load Balancer: $16
- Data transfer: $5-10
- **Total: $50-75/month**

## 🔄 Deployment Flow

```
┌─────────────────────────────────────┐
│  Your Local Machine                 │
│  (Running deployment script)         │
└────────┬────────────────────────────┘
         │
         ├──[EC2 Path]─────────────────────────┐
         │                                      │
         └──> Create EC2 Instance              │
             + Security Group                  │
             + Key Pair                        │
             + Docker Pre-installed            │
                                               │
         ├──[ECS Path]──────────────────────┐  │
         │                                   │  │
         └──> Create ECS Cluster             │  │
             + Build Docker Images           │  │
             + Push to ECR                   │  │
             + Create Task Definitions       │  │
             + Deploy Services               │  │
             + Setup Load Balancer           │  │
             + Configure Auto-Scaling        │  │
                                               │
┌──────────────────────────────────────────────┴──┐
│  AWS Cloud                                     │
│  - Running Containers                         │
│  - Databases & Cache                          │
│  - Load Balancer                              │
└────────────────────────────────────────────────┘
         │
         └──> Access Application
             http://your-app-url
```

## 📚 Documentation Index

| Document | Purpose | Best For |
|----------|---------|----------|
| `README_EC2.md` | EC2 quick start | Getting started quickly |
| `EC2_DEPLOYMENT_GUIDE.md` | Detailed EC2 setup | Complete understanding |
| `DEPLOYMENT_GUIDE.md` | ECS setup guide | Production deployments |
| `DEPLOYMENT_COMPARISON.md` | EC2 vs ECS | Making the right choice |

## 🆘 Troubleshooting

### General Issues
- Check AWS CLI is configured: `aws configure`
- Verify credentials: `aws sts get-caller-identity`
- Check region matches: `aws configure get region`

### EC2 Issues
- Can't connect? Check security group rules
- Docker not running? SSH in and run `sudo systemctl status docker`
- See detailed guide: `EC2_DEPLOYMENT_GUIDE.md`

### ECS Issues
- Task won't start? Check CloudWatch logs
- Can't reach app? Check security group and load balancer
- See detailed guide: `DEPLOYMENT_GUIDE.md`

## 🔒 Security Reminders

1. **Never commit `.pem` files** to git
2. **Never commit `.env`** to git
3. **Restrict SSH access** in production (not 0.0.0.0/0)
4. **Use strong JWT secrets** in `.env`
5. **Rotate credentials** regularly
6. **Enable AWS CloudTrail** for audit logs

## 📞 Support & Resources

### Documentation
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)

### Getting Help
1. Check the specific deployment guide
2. Review CloudWatch logs
3. Check security groups
4. Verify IAM permissions
5. Contact AWS support

## ✅ Deployment Checklist

### Before Deployment
- [ ] AWS account created and verified
- [ ] AWS CLI installed and configured
- [ ] API keys obtained (NewsAPI, Guardian, NYT)
- [ ] JWT secret created
- [ ] Project cloned locally

### After Deployment
- [ ] Can access frontend at provided URL
- [ ] Can access backend at provided URL
- [ ] Health check returns 200 status
- [ ] Can register and login
- [ ] Application is responsive
- [ ] Logs show no errors

### Before Going Live
- [ ] Tested all features
- [ ] Updated CORS_ORIGIN in `.env`
- [ ] SSL/HTTPS configured (if needed)
- [ ] Database backups enabled
- [ ] Monitoring and alerts set up
- [ ] Security audit completed

## 🎉 You're Ready!

Choose your deployment path:

### → [EC2 Quick Start](README_EC2.md) 
For fastest, most cost-effective deployment

### → [ECS Production Setup](DEPLOYMENT_GUIDE.md)
For scalable, production-ready deployment

### → [Compare Both](DEPLOYMENT_COMPARISON.md)
For detailed analysis and decision making

---

**Questions?** Each deployment guide has detailed troubleshooting and frequently asked questions.

**Happy deploying!** 🚀
