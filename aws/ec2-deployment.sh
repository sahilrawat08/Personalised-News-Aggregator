#!/bin/bash

# AWS EC2 Deployment Script for News Aggregator
# This script automates the deployment of the News Aggregator on AWS EC2

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.small}
KEY_NAME=${KEY_NAME:-news-aggregator-key}
SECURITY_GROUP=${SECURITY_GROUP:-news-aggregator-sg}
INSTANCE_NAME=${INSTANCE_NAME:-news-aggregator-server}

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create Key Pair
create_key_pair() {
    log_info "Creating EC2 key pair: $KEY_NAME"
    
    if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" 2>/dev/null; then
        log_warning "Key pair $KEY_NAME already exists"
    else
        aws ec2 create-key-pair --key-name "$KEY_NAME" --region "$REGION" --query 'KeyMaterial' --output text > "$KEY_NAME.pem"
        chmod 400 "$KEY_NAME.pem"
        log_success "Key pair created and saved to $KEY_NAME.pem"
    fi
}

# Step 2: Create Security Group
create_security_group() {
    log_info "Creating security group: $SECURITY_GROUP"
    
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region "$REGION" --query 'Vpcs[0].VpcId' --output text)
    
    if aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP" --region "$REGION" 2>/dev/null | grep -q "GroupId"; then
        log_warning "Security group $SECURITY_GROUP already exists"
        SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name "$SECURITY_GROUP" \
            --description "Security group for News Aggregator" \
            --vpc-id "$VPC_ID" \
            --region "$REGION" \
            --query 'GroupId' \
            --output text)
        log_success "Security group created: $SG_ID"
    fi
    
    # Allow SSH (port 22)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 22 \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || log_warning "SSH rule already exists"
    
    # Allow HTTP (port 80)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 80 \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || log_warning "HTTP rule already exists"
    
    # Allow HTTPS (port 443)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 443 \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || log_warning "HTTPS rule already exists"
    
    # Allow backend API (port 4000)
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp --port 4000 \
        --cidr 0.0.0.0/0 \
        --region "$REGION" 2>/dev/null || log_warning "Backend API rule already exists"
    
    log_success "Security group configured"
}

# Step 3: Launch EC2 Instance
launch_instance() {
    log_info "Launching EC2 instance..."
    
    # Get the latest Ubuntu 22.04 LTS AMI
    AMI_ID=$(aws ec2 describe-images \
        --owners 099720109477 \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        --query 'sort_by(Images, &CreationDate)[-1].[ImageId]' \
        --output text \
        --region "$REGION")
    
    log_info "Using AMI: $AMI_ID"
    
    # Get security group ID
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP" --region "$REGION" --query 'SecurityGroups[0].GroupId' --output text)
    
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-group-ids "$SG_ID" \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
        --user-data file://aws/ec2-init-script.sh \
        --region "$REGION" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    log_success "Instance launched: $INSTANCE_ID"
    log_info "Waiting for instance to be in running state..."
    
    aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"
    log_success "Instance is now running"
    
    # Get the public IP
    PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    
    log_success "Instance details:"
    echo "  Instance ID: $INSTANCE_ID"
    echo "  Public IP: $PUBLIC_IP"
    echo "  SSH Command: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
    
    # Save instance info to file
    cat > aws/ec2-instance-info.txt <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
KEY_NAME=$KEY_NAME
REGION=$REGION
SECURITY_GROUP=$SECURITY_GROUP
EOF
    
    log_success "Instance information saved to aws/ec2-instance-info.txt"
}

# Step 4: Wait for instance to be ready
wait_for_instance() {
    log_info "Waiting for instance to complete initialization (this may take 2-3 minutes)..."
    sleep 60
    log_success "Instance initialization complete"
}

# Step 5: Deploy application
deploy_application() {
    source aws/ec2-instance-info.txt
    
    log_info "Connecting to instance and deploying application..."
    log_info "SSH Command: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
    
    # Create deployment script to run on the instance
    cat > aws/remote-deploy.sh <<'EOF'
#!/bin/bash
set -e

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker <<'NEWGRP'

# Clone repository
cd /home/ubuntu
git clone https://github.com/sahilrawat08/Personalised-News-Aggregator.git
cd Personalised-News-Aggregator

# Copy environment file
cp .env.example .env

# Update environment variables if needed
# Edit .env file with your API keys and configuration

# Start services
docker-compose up -d

echo "Deployment complete!"
NEWGRP
EOF

    chmod +x aws/remote-deploy.sh
    
    # Copy and execute deployment script
    scp -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no aws/remote-deploy.sh "ubuntu@$PUBLIC_IP:/home/ubuntu/deploy.sh"
    ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_IP" 'bash /home/ubuntu/deploy.sh'
    
    log_success "Application deployed successfully!"
    log_info "Application will be available at http://$PUBLIC_IP"
}

# Main execution
main() {
    log_info "Starting News Aggregator EC2 deployment..."
    
    create_key_pair
    create_security_group
    launch_instance
    wait_for_instance
    
    log_success "EC2 instance is ready!"
    log_info "Next steps:"
    echo "  1. Review aws/ec2-instance-info.txt for connection details"
    echo "  2. SSH into the instance and complete the deployment"
    echo "  3. Access your application at the Public IP"
}

main "$@"
