# 🐳 Docker & AWS Deployment Guide

Complete guide to containerize your News Aggregator and deploy it on AWS.

## 📋 Prerequisites

### Local Development
- Docker Desktop installed
- Docker Compose installed
- Node.js 18+ (for local development)

### AWS Deployment
- AWS CLI installed and configured
- AWS Account with appropriate permissions
- Docker Hub or AWS ECR access

## 🚀 Quick Start with Docker

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
# Database
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=securepassword123
MONGODB_URI=mongodb://admin:securepassword123@mongodb:27017/news-aggregator?authSource=admin

# Redis
REDIS_PASSWORD=redis123
REDIS_URL=redis://:redis123@redis:6379

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-change-this
JWT_EXPIRES_IN=24h

# API Keys (Optional - get from respective services)
NEWSAPI_KEY=your-newsapi-key
GUARDIAN_API_KEY=your-guardian-api-key
NYT_API_KEY=your-nyt-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### 2. Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

### 3. Access Your Application

- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:4000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 🔧 Individual Container Commands

### Backend Only
```bash
cd server
docker build -t news-backend .
docker run -p 4000:4000 --env-file ../.env news-backend
```

### Frontend Only
```bash
cd client
docker build -t news-frontend .
docker run -p 80:80 news-frontend
```

## ☁️ AWS Deployment Guide

### Step 1: AWS Setup

1. **Install AWS CLI**
```bash
# macOS
brew install awscli

# Windows
choco install awscli

# Verify installation
aws --version
```

2. **Configure AWS Credentials**
```bash
aws configure
# Enter your Access Key ID, Secret Key, Region, and output format
```

3. **Create IAM Roles**

Create these IAM roles in AWS Console:

**ECS Task Execution Role** (`ecsTaskExecutionRole`):
- Policy: `AmazonECSTaskExecutionRolePolicy`

**ECS Task Role** (`ecsTaskRole`):
- Policies: 
  - `AmazonECSTaskExecutionRolePolicy`
  - Custom policy for Secrets Manager access

### Step 2: Automated Deployment

```bash
# Make deployment script executable
chmod +x deploy-aws.sh

# Run deployment
./deploy-aws.sh
```

### Step 3: Manual AWS Setup

#### 3.1 Create VPC and Networking (if not using default)

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

#### 3.2 Create Application Load Balancer

```bash
# Create security group for ALB
aws ec2 create-security-group --group-name news-alb-sg --description "Security group for News Aggregator ALB"

# Create ALB
aws elbv2 create-load-balancer \
    --name news-aggregator-alb \
    --subnets subnet-xxxxx subnet-yyyyy \
    --security-groups sg-xxxxx
```

#### 3.3 Create ECS Services

```bash
# Register task definitions
aws ecs register-task-definition --cli-input-json file://aws/task-definition-backend.json
aws ecs register-task-definition --cli-input-json file://aws/task-definition-frontend.json

# Create services
aws ecs create-service \
    --cluster news-aggregator-cluster \
    --service-name news-aggregator-backend \
    --task-definition news-aggregator-backend:1 \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

### Step 4: Environment Variables in AWS

#### 4.1 AWS Secrets Manager

```bash
# Create secrets
aws secretsmanager create-secret \
    --name "news-aggregator/jwt-secret" \
    --description "JWT secret for news aggregator" \
    --secret-string "your-super-secure-jwt-secret"

aws secretsmanager create-secret \
    --name "news-aggregator/newsapi-key" \
    --description "News API key" \
    --secret-string "your-newsapi-key"
```

#### 4.2 Update Task Definitions

Replace placeholders in `aws/task-definition-*.json`:
- `YOUR_ACCOUNT_ID`: Your AWS account ID
- `YOUR_REGION`: Your AWS region (e.g., us-east-1)

## 📊 Monitoring and Logging

### CloudWatch Logs

Your containers automatically send logs to CloudWatch:
- Backend logs: `/ecs/news-aggregator-backend`
- Frontend logs: `/ecs/news-aggregator-frontend`

### Health Checks

Both containers have health checks configured:
- Backend: `GET /api/health`
- Frontend: `GET /` (nginx status)

## 🔒 Security Best Practices

### 1. Network Security
- Use private subnets for ECS tasks
- Configure security groups with minimal required access
- Use ALB for SSL termination

### 2. Secrets Management
- Store sensitive data in AWS Secrets Manager
- Use IAM roles for service-to-service communication
- Rotate secrets regularly

### 3. Container Security
- Use non-root user in containers
- Scan images for vulnerabilities
- Keep base images updated

## 🎯 Production Optimizations

### 1. Auto Scaling
```bash
# Enable auto scaling
aws application-autoscaling register-scalable-target \
    --service-namespace ecs \
    --resource-id service/news-aggregator-cluster/news-aggregator-backend \
    --scalable-dimension ecs:service:DesiredCount \
    --min-capacity 2 \
    --max-capacity 10
```

### 2. Performance
- Use Amazon ElastiCache for Redis
- Use Amazon RDS for MongoDB (DocumentDB)
- Enable CloudFront for static assets

### 3. Cost Optimization
- Use Spot instances for non-critical workloads
- Implement proper resource limits
- Monitor and optimize based on CloudWatch metrics

## 🔧 Troubleshooting

### Common Issues

1. **Container Won't Start**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Check ECS service events
aws ecs describe-services --cluster news-aggregator-cluster --services news-aggregator-backend
```

2. **Database Connection Issues**
```bash
# Test MongoDB connection
docker exec -it news-mongodb mongo -u admin -p password123
```

3. **Redis Connection Issues**
```bash
# Test Redis connection
docker exec -it news-redis redis-cli -a redis123 ping
```

### Health Check Commands

```bash
# Backend health
curl http://localhost:4000/api/health

# Frontend health
curl http://localhost/

# Database health
docker exec news-mongodb mongosh --eval "db.adminCommand('ping')"
```

## 📞 Support

For deployment issues:
1. Check CloudWatch logs
2. Verify security group configurations
3. Ensure IAM roles have proper permissions
4. Check ECS service events

## 🎉 Deployment Complete!

Your News Aggregator is now running on AWS with:
- ✅ Load balancer for high availability
- ✅ Auto-scaling capabilities
- ✅ Secure secrets management
- ✅ Comprehensive logging
- ✅ Health monitoring

Access your application at the ALB DNS name provided in the AWS Console!