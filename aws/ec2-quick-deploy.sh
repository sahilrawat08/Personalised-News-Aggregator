#!/bin/bash

# News Aggregator EC2 Quick Deployment Script
# Simplified one-command deployment to AWS EC2

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     News Aggregator - EC2 Quick Deployment                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"

# Configuration
REGION=${1:-us-east-1}
INSTANCE_TYPE=${2:-t3.small}

echo -e "${YELLOW}Configuration:${NC}"
echo "  Region: $REGION"
echo "  Instance Type: $INSTANCE_TYPE"
echo ""

# Step 1: Create Key Pair
echo -e "${BLUE}[1/6]${NC} Creating EC2 key pair..."
KEY_NAME="news-aggregator-$(date +%s)"

if aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > "$KEY_NAME.pem"; then
    chmod 400 "$KEY_NAME.pem"
    echo -e "${GREEN}✓${NC} Key pair created: $KEY_NAME"
else
    echo -e "${YELLOW}Key pair already exists or error occurred${NC}"
fi

# Step 2: Create Security Group
echo -e "${BLUE}[2/6]${NC} Creating security group..."
SG_NAME="news-aggregator-sg-$(date +%s)"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region "$REGION" --query 'Vpcs[0].VpcId' --output text)

SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "News Aggregator Security Group" \
    --vpc-id "$VPC_ID" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)
echo -e "${GREEN}✓${NC} Security group created: $SG_ID"

# Allow inbound traffic
echo -e "${BLUE}[3/6]${NC} Configuring security group rules..."
for port in 22 80 443 4000; do
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port "$port" \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || true
done
echo -e "${GREEN}✓${NC} Security group configured (SSH, HTTP, HTTPS, API)"

# Step 3: Get Latest Ubuntu AMI
echo -e "${BLUE}[4/6]${NC} Finding latest Ubuntu 22.04 LTS AMI..."
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId]' \
    --output text \
    --region "$REGION")
echo -e "${GREEN}✓${NC} AMI: $AMI_ID"

# Step 4: Launch Instance
echo -e "${BLUE}[5/6]${NC} Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$AMI_ID" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=news-aggregator-$(date +%s)}]" \
    --user-data file://aws/ec2-init-script.sh \
    --region "$REGION" \
    --query 'Instances[0].InstanceId' \
    --output text)
echo -e "${GREEN}✓${NC} Instance launched: $INSTANCE_ID"

# Wait for instance
echo -e "${BLUE}[6/6]${NC} Waiting for instance to be ready (this may take a minute)..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo -e "${GREEN}✓${NC} Instance is running"

# Display Results
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Deployment Successful!                     ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Instance Details:${NC}"
echo "  Instance ID:    $INSTANCE_ID"
echo "  Public IP:      $PUBLIC_IP"
echo "  Key File:       $KEY_NAME.pem"
echo "  Region:         $REGION"
echo "  Security Group: $SG_ID"
echo ""
echo -e "${YELLOW}SSH Connection:${NC}"
echo "  ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo ""
echo -e "${YELLOW}Application URLs (wait 2-3 minutes for Docker to start):${NC}"
echo "  Frontend:  http://$PUBLIC_IP"
echo "  Backend:   http://$PUBLIC_IP:4000"
echo "  Health:    http://$PUBLIC_IP:4000/api/health"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Wait 2-3 minutes for Docker installation"
echo "  2. SSH into the instance:"
echo "     ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "  3. Clone and deploy the application:"
echo "     cd /home/ubuntu"
echo "     git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git"
echo "     cd Personalised-News-Aggregator"
echo "     cp .env.example .env"
echo "     nano .env  # Update API keys"
echo "     docker-compose up -d"
echo ""
echo -e "${YELLOW}Save this information:${NC}"
cat > aws/ec2-deployment-info.txt <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
KEY_FILE=$KEY_NAME.pem
REGION=$REGION
SECURITY_GROUP=$SG_ID
DEPLOYMENT_DATE=$(date)

SSH Command:
ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP

Cleanup Commands:
aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION
aws ec2 delete-security-group --group-id $SG_ID --region $REGION
aws ec2 delete-key-pair --key-name $KEY_NAME --region $REGION
rm $KEY_NAME.pem
EOF
echo "  Info saved to: aws/ec2-deployment-info.txt"
