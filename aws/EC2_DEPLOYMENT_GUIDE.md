# EC2 Deployment Guide

Complete guide to deploy the News Aggregator on AWS EC2 instances.

## 📋 Prerequisites

### Local Machine
- AWS CLI installed and configured with credentials
- Access key and secret key from AWS IAM
- Enough AWS credits or billing set up

### AWS Account
- EC2 service available in your region
- Appropriate IAM permissions for EC2, security groups, and VPC

## 🚀 Quick Deployment

### Option 1: Automated Deployment (Recommended)

```bash
# Make the deployment script executable
chmod +x aws/ec2-deployment.sh

# Run the deployment
./aws/ec2-deployment.sh
```

This script will:
1. Create an EC2 key pair
2. Create a security group with required ports open
3. Launch an EC2 instance (t3.small by default)
4. Initialize it with Docker and Docker Compose
5. Save connection details to `aws/ec2-instance-info.txt`

### Option 2: Manual Deployment

#### Step 1: Create Key Pair

```bash
# Create and download key pair
aws ec2 create-key-pair \
    --key-name news-aggregator-key \
    --region us-east-1 \
    --query 'KeyMaterial' \
    --output text > news-aggregator-key.pem

# Set proper permissions
chmod 400 news-aggregator-key.pem
```

#### Step 2: Create Security Group

```bash
# Get default VPC ID
VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=isDefault,Values=true" \
    --region us-east-1 \
    --query 'Vpcs[0].VpcId' \
    --output text)

# Create security group
SG_ID=$(aws ec2 create-security-group \
    --group-name news-aggregator-sg \
    --description "Security group for News Aggregator" \
    --vpc-id $VPC_ID \
    --region us-east-1 \
    --query 'GroupId' \
    --output text)

# Allow SSH
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 22 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

# Allow HTTP
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 80 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 443 \
    --cidr 0.0.0.0/0 \
    --region us-east-1

# Allow Backend API
aws ec2 authorize-security-group-ingress \
    --group-id $SG_ID \
    --protocol tcp --port 4000 \
    --cidr 0.0.0.0/0 \
    --region us-east-1
```

#### Step 3: Launch EC2 Instance

```bash
# Get the latest Ubuntu 22.04 LTS AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId]' \
    --output text \
    --region us-east-1)

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t3.small \
    --key-name news-aggregator-key \
    --security-group-ids $SG_ID \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=news-aggregator-server}]' \
    --user-data file://aws/ec2-init-script.sh \
    --region us-east-1 \
    --query 'Instances[0].InstanceId' \
    --output text)

# Wait for instance to run
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region us-east-1

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --region us-east-1 \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)
```

#### Step 4: Connect to Instance

```bash
# Wait a few minutes for instance to initialize
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP
```

#### Step 5: Deploy Application on Instance

```bash
# On the instance, clone and deploy
cd /home/ubuntu
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator

# Copy environment configuration
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start the application
docker-compose up -d

# Check status
docker-compose ps
```

## 📊 Instance Sizing Options

| Instance Type | vCPU | Memory | Use Case | Hourly Cost (us-east-1) |
|---------------|------|--------|----------|----------------------|
| t3.nano       | 2    | 0.5 GB | Demo/Dev | $0.0104              |
| t3.micro      | 2    | 1 GB   | Light    | $0.0208              |
| t3.small      | 2    | 2 GB   | Development | $0.0416          |
| t3.medium     | 2    | 4 GB   | Small Production | $0.0832    |
| t3.large      | 2    | 8 GB   | Medium Production | $0.1664   |

## 🔧 Post-Deployment Configuration

### 1. Update Application Configuration

```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Edit environment variables
cd Personalised-News-Aggregator
nano .env

# Update the following:
# - API keys (NewsAPI, Guardian, NYT)
# - JWT secrets
# - CORS_ORIGIN (set to your domain or EC2 public IP)
# - Database credentials (if using external database)
```

### 2. View Application Logs

```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Navigate to project
cd Personalised-News-Aggregator

# View logs
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

### 3. Stop/Restart Application

```bash
# Stop all containers
docker-compose down

# Restart all containers
docker-compose up -d

# Restart specific service
docker-compose restart backend
```

## 🌐 Accessing Your Application

Once deployed:

1. **Frontend**: `http://<EC2_PUBLIC_IP>`
2. **Backend API**: `http://<EC2_PUBLIC_IP>:4000`
3. **API Health**: `http://<EC2_PUBLIC_IP>:4000/api/health`

## 📝 Setting Up a Custom Domain

1. **Get a domain** (e.g., from Route53, GoDaddy, Namecheap)

2. **Create Route53 hosted zone** (if using AWS):
```bash
aws route53 create-hosted-zone \
    --name yourdomain.com \
    --caller-reference $(date +%s)
```

3. **Point domain to EC2 instance**:
   - Create an A record pointing to the EC2 public IP
   - Set TTL to 300

4. **Update application**:
   ```bash
   # Update CORS_ORIGIN in .env
   CORS_ORIGIN=https://yourdomain.com
   
   # Restart containers
   docker-compose down
   docker-compose up -d
   ```

## 🔒 Securing Your Instance

### 1. SSH Security
```bash
# Copy your SSH public key to instance
ssh-copy-id -i ~/.ssh/id_rsa.pub ubuntu@$PUBLIC_IP

# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
# Set: PubkeyAuthentication yes

sudo systemctl restart ssh
```

### 2. Enable HTTPS with Let's Encrypt

```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx configuration
# The certificate files will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### 3. Firewall Configuration
```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Enable UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4000/tcp
```

## 📈 Monitoring

### Using CloudWatch

```bash
# Enable detailed monitoring
aws ec2 monitor-instances --instance-ids $INSTANCE_ID --region us-east-1

# View metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=$INSTANCE_ID \
    --start-time 2025-01-01T00:00:00Z \
    --end-time 2025-01-02T00:00:00Z \
    --period 300 \
    --statistics Average
```

### Using Container Metrics

```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Check container stats
docker stats

# View system resources
top
htop  # if installed: sudo apt-get install htop
```

## 🧹 Cleanup

### Stop Instance
```bash
aws ec2 stop-instances --instance-ids $INSTANCE_ID --region us-east-1
```

### Terminate Instance
```bash
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region us-east-1
```

### Delete Security Group
```bash
aws ec2 delete-security-group --group-id $SG_ID --region us-east-1
```

### Delete Key Pair
```bash
aws ec2 delete-key-pair --key-name news-aggregator-key --region us-east-1
rm news-aggregator-key.pem
```

## 🆘 Troubleshooting

### Connection Issues
```bash
# Check security group allows SSH
aws ec2 describe-security-groups --group-ids $SG_ID

# Verify key pair permissions
ls -la news-aggregator-key.pem  # Should show -r--------

# Check instance status
aws ec2 describe-instance-status --instance-ids $INSTANCE_ID
```

### Docker Issues
```bash
# SSH into instance
ssh -i news-aggregator-key.pem ubuntu@$PUBLIC_IP

# Check Docker status
sudo systemctl status docker

# View Docker logs
sudo journalctl -u docker -n 50

# Check container logs
docker-compose logs backend
```

### Application Not Accessible
```bash
# Check if containers are running
docker ps

# Check port binding
netstat -tulpn | grep LISTEN
# or
ss -tulpn | grep LISTEN

# Test connectivity
curl http://localhost
curl http://localhost:4000/api/health
```

## 💡 Cost Optimization

1. **Use reserved instances** for long-term deployments
2. **Set up auto-shutdown** for development instances
3. **Monitor data transfer costs** - keep instance in same region as your users
4. **Use t3 burstable instances** for variable workloads

## 📞 Support

For issues:
1. Check CloudWatch logs
2. SSH into instance and check Docker logs
3. Review security group rules
4. Check EC2 instance status checks

