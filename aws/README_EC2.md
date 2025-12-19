# 🚀 EC2 Deployment for News Aggregator

Deploy your News Aggregator to AWS EC2 with just one command!

## Quick Start (30 seconds)

```bash
# Make sure AWS CLI is configured
aws configure

# Run the quick deployment script
chmod +x aws/ec2-quick-deploy.sh
./aws/ec2-quick-deploy.sh
```

That's it! The script will:
- ✅ Create a key pair
- ✅ Create a security group with all required ports
- ✅ Launch an EC2 instance with Docker pre-installed
- ✅ Display your connection details

## Advanced Options

### 1. Quick Deployment with Custom Region/Instance Type

```bash
# Default: us-east-1, t3.small
./aws/ec2-quick-deploy.sh

# Custom region and instance type
./aws/ec2-quick-deploy.sh eu-west-1 t3.medium
```

### 2. Manual Step-by-Step Deployment

Follow the detailed guide in `aws/EC2_DEPLOYMENT_GUIDE.md`

## What You Get

After deployment, you'll have:

| Component | Details |
|-----------|---------|
| **Operating System** | Ubuntu 22.04 LTS |
| **Container Runtime** | Docker + Docker Compose |
| **Firewall** | Security group with SSH, HTTP, HTTPS, and API port open |
| **Key Pair** | Secure SSH key for authentication |
| **Public IP** | Dedicated IP address for your application |

## Post-Deployment Steps

### 1. SSH into Your Instance

```bash
# Get your SSH command from the output or from aws/ec2-deployment-info.txt
ssh -i <key-file>.pem ubuntu@<public-ip>
```

### 2. Deploy the Application

Once SSH'd into the instance:

```bash
# Navigate to home directory
cd /home/ubuntu

# Clone the repository
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator

# Copy environment template
cp .env.example .env

# Edit environment variables (add your API keys)
nano .env

# Start the application
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Access Your Application

```
Frontend:  http://<public-ip>
Backend:   http://<public-ip>:4000
Health:    http://<public-ip>:4000/api/health
```

## Environment Configuration

Edit the `.env` file on your instance with:

```bash
# API Keys - Get from respective services
NEWSAPI_KEY=your-key-here
GUARDIAN_API_KEY=your-key-here
NYT_API_KEY=your-key-here

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=24h

# CORS - Update to your domain or EC2 IP
CORS_ORIGIN=http://<your-public-ip>
```

## Accessing Your Application

### Option 1: Direct IP Access
```
http://<public-ip>
http://<public-ip>:4000/api/health
```

### Option 2: Custom Domain
1. Point your domain DNS records to the EC2 public IP
2. Update `CORS_ORIGIN` in `.env` to your domain
3. Restart containers: `docker-compose restart`

### Option 3: Load Balancer (Advanced)
Use AWS Application Load Balancer (ALB) for production deployments

## Managing Your Instance

### View Application Logs
```bash
docker-compose logs -f
docker-compose logs backend
docker-compose logs frontend
```

### Stop Application
```bash
docker-compose down
```

### Restart Application
```bash
docker-compose restart
```

### SSH into Running Container
```bash
docker exec -it news-backend sh
docker exec -it news-frontend sh
```

## Scaling & Optimization

### Vertical Scaling (Larger Instance)
1. Stop instance
2. Change instance type to larger size
3. Start instance

### Horizontal Scaling (Multiple Instances)
1. Create an Application Load Balancer
2. Create EC2 instances behind the load balancer
3. Use Route 53 for DNS management

## Cost Estimation

| Instance Type | vCPU | Memory | Monthly Cost* |
|---------------|------|--------|--------------|
| t3.nano       | 2    | 0.5GB  | ~$3-4        |
| t3.micro      | 2    | 1GB    | ~$6-7        |
| t3.small      | 2    | 2GB    | ~$12-14      |
| t3.medium     | 2    | 4GB    | ~$25-30      |

*Approximate for us-east-1 region (prices vary by region)

## Cleanup & Cost Saving

### Stop Instance (No Charges for Instance, Only Storage)
```bash
# Get instance ID from aws/ec2-deployment-info.txt
aws ec2 stop-instances --instance-ids i-xxxxx --region us-east-1
```

### Terminate Instance (Full Cleanup)
```bash
# This deletes everything
aws ec2 terminate-instances --instance-ids i-xxxxx --region us-east-1
aws ec2 delete-security-group --group-id sg-xxxxx --region us-east-1
aws ec2 delete-key-pair --key-name key-name --region us-east-1
rm key-file.pem
```

## Security Best Practices

### 1. SSH Key Security
```bash
# Keep key file secure
chmod 400 your-key.pem

# Never commit key to version control
echo "*.pem" >> .gitignore
```

### 2. Security Group Best Practices
- Restrict SSH access to specific IPs (not 0.0.0.0/0)
- Use security groups to control traffic between instances

### 3. Instance Security
```bash
# SSH into instance and:

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Enable firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 4. Data Security
- Never commit `.env` file to git
- Use AWS Secrets Manager for sensitive data (advanced)
- Enable EBS encryption for volumes

## Troubleshooting

### Can't Connect to Instance
```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Check instance status
aws ec2 describe-instance-status --instance-ids i-xxxxx

# Verify key pair permissions
ls -la your-key.pem  # Should show -r--------
```

### Docker Not Running
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

### Application Not Accessible
```bash
# Check if containers are running
docker ps

# Check port bindings
ss -tulpn | grep LISTEN

# View application logs
docker-compose logs
```

## Advanced Configurations

### Enable HTTPS with Let's Encrypt

```bash
# SSH into instance
ssh -i your-key.pem ubuntu@<public-ip>

# Install certbot
sudo apt-get install -y certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx configuration with certificate paths
```

### Setup Auto-Scaling Group (Production)

See AWS documentation for setting up Auto Scaling Groups for high availability.

### Custom Domain with Route 53

```bash
# Create hosted zone
aws route53 create-hosted-zone \
    --name yourdomain.com \
    --caller-reference $(date +%s)

# Create A record pointing to EC2 IP
aws route53 change-resource-record-sets \
    --hosted-zone-id <zone-id> \
    --change-batch file://route53-changes.json
```

## Performance Tuning

### Container Resource Limits
Edit `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Optimization
For production, use:
- AWS RDS for managed MongoDB (DocumentDB)
- AWS ElastiCache for managed Redis

## Monitoring & Logging

### CloudWatch Integration
```bash
# Enable detailed monitoring
aws ec2 monitor-instances --instance-ids i-xxxxx

# View metrics in AWS Console or CLI
aws cloudwatch get-metric-statistics \
    --namespace AWS/EC2 \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=i-xxxxx \
    --start-time 2025-01-01T00:00:00Z \
    --end-time 2025-01-02T00:00:00Z \
    --period 300 \
    --statistics Average
```

### Docker Container Monitoring
```bash
# Real-time container stats
docker stats

# View detailed logs
docker-compose logs -f --tail=100
```

## Support & Resources

- **AWS EC2 Documentation**: https://docs.aws.amazon.com/ec2/
- **Docker Documentation**: https://docs.docker.com/
- **GitHub Issues**: Report issues on the project repository
- **AWS Support**: Contact AWS support for AWS-specific issues

## Key Files

- `aws/ec2-quick-deploy.sh` - One-command deployment
- `aws/ec2-deployment.sh` - Full deployment with configuration
- `aws/ec2-init-script.sh` - Instance initialization script
- `aws/EC2_DEPLOYMENT_GUIDE.md` - Detailed deployment guide
- `aws/ec2-deployment-info.txt` - Your deployment information (created after deployment)

---

**Ready to deploy? Run:** `./aws/ec2-quick-deploy.sh`
