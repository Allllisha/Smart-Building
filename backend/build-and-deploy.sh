#!/bin/bash

echo "Building and deploying backend with CORS configuration..."
echo "======================================================"

# ACRにログイン
echo "1. Logging in to ACR..."
az acr login --name smartbuildingplanneracr

# Dockerイメージをビルド（環境変数込み）
echo -e "\n2. Building backend Docker image with no cache..."
cd /Users/anemoto/smart_building_planner/backend

docker build --no-cache \
  --platform linux/amd64 \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:latest \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:v1.0 \
  -f Dockerfile .

# ACRにプッシュ
echo -e "\n3. Pushing to ACR..."
docker push smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:latest
docker push smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:v1.0

# Web Appの環境変数を設定（CORS_ORIGINを含む）
echo -e "\n4. Setting Web App environment variables..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg \
  --settings \
  CORS_ORIGIN="https://smart-building-planner-app.azurewebsites.net" \
  DB_HOST="smart-building-planner-db.postgres.database.azure.com" \
  DB_PORT="5432" \
  DB_NAME="smart_building_planner" \
  DB_USER="dbadmin" \
  DB_PASSWORD="${DB_PASSWORD}" \
  DATABASE_URL="${DATABASE_URL}" \
  AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY}" \
  AZURE_OPENAI_ENDPOINT="https://test-bing-ai-agent-resource.cognitiveservices.azure.com/" \
  AZURE_OPENAI_API_VERSION="2025-01-01-preview" \
  AZURE_OPENAI_DEPLOYMENT_NAME="gpt-4o-2" \
  AZURE_STORAGE_CONNECTION_STRING="${AZURE_STORAGE_CONNECTION_STRING}" \
  AZURE_STORAGE_ACCOUNT_NAME="meijichatbotrag" \
  AZURE_STORAGE_CONTAINER_BIM="bim-files" \
  AZURE_STORAGE_CONTAINER_REPORTS="bim-reports" \
  NODE_ENV="production" \
  API_PORT="8000" \
  PORT="8000" \
  WEBSITES_PORT="8000"

# Web Appを再起動
echo -e "\n5. Restarting Web App..."
az webapp restart --name smart-building-planner-api --resource-group smart-building-planner-rg

echo -e "\n6. Deployment complete! Waiting 60 seconds for app to start..."
sleep 60

# 確認
echo -e "\n7. Testing API health endpoint..."
curl -v https://smart-building-planner-api.azurewebsites.net/health

echo -e "\nDone!"