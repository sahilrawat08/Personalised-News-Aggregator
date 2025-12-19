#!/bin/bash

# AWS ECS Deployment Script for News Aggregator
set -e

echo "🚀 Starting AWS ECS deployment for News Aggregator..."

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
CLUSTER_NAME=${CLUSTER_NAME:-"news-aggregator-cluster"}
SERVICE_PREFIX=${SERVICE_PREFIX:-"news-aggregator"}
ECR_REPOSITORY_PREFIX=${ECR_REPOSITORY_PREFIX:-"news-aggregator"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$AWS_ACCOUNT_ID" ]; then
    print_error "Unable to get AWS account ID. Check your AWS credentials."
    exit 1
fi

print_status "AWS Account ID: $AWS_ACCOUNT_ID"
print_status "Region: $AWS_REGION"

# Create ECR repositories if they don't exist
create_ecr_repo() {
    local repo_name=$1
    echo "Creating ECR repository: $repo_name"
    
    if aws ecr describe-repositories --repository-names $repo_name --region $AWS_REGION &> /dev/null; then
        print_warning "ECR repository $repo_name already exists"
    else
        aws ecr create-repository --repository-name $repo_name --region $AWS_REGION
        print_status "Created ECR repository: $repo_name"
    fi
}

# Login to ECR
print_status "Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Create ECR repositories
create_ecr_repo "$ECR_REPOSITORY_PREFIX-backend"
create_ecr_repo "$ECR_REPOSITORY_PREFIX-frontend"

# Build and push backend image
print_status "Building and pushing backend image..."
cd server
docker build -t $ECR_REPOSITORY_PREFIX-backend:latest .
docker tag $ECR_REPOSITORY_PREFIX-backend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-backend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-backend:latest
cd ..

# Build and push frontend image
print_status "Building and pushing frontend image..."
cd client
docker build -t $ECR_REPOSITORY_PREFIX-frontend:latest .
docker tag $ECR_REPOSITORY_PREFIX-frontend:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-frontend:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-frontend:latest
cd ..

print_status "Docker images pushed successfully!"

# Create ECS cluster if it doesn't exist
if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
    print_warning "ECS cluster $CLUSTER_NAME already exists"
else
    print_status "Creating ECS cluster: $CLUSTER_NAME"
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
fi

print_status "Deployment completed! 🎉"
echo ""
echo "Next steps:"
echo "1. Update the task definitions with your ECR image URIs"
echo "2. Create ECS services using the AWS console or CLI"
echo "3. Configure Load Balancer and security groups"
echo ""
echo "Your images are available at:"
echo "Backend: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-backend:latest"
echo "Frontend: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_PREFIX-frontend:latest"