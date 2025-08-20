#!/bin/bash

# Build and push frontend Docker image
echo "Building frontend Docker image..."

# Get current timestamp for tagging
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Build and push the image with multiple tags
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.frontend.prod \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-frontend:latest \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-frontend:$TIMESTAMP \
  --no-cache \
  --push \
  .

echo "Frontend image pushed with tags: latest and $TIMESTAMP"