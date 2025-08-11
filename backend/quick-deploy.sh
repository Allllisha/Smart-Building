#!/bin/bash

echo "Quick deployment with AUTH_ENABLED=false..."
echo "=========================================="

# ACRにログイン
az acr login --name smartbuildingplanneracr

# Dockerイメージをビルド
cd /Users/anemoto/smart_building_planner/backend
docker build --no-cache \
  --platform linux/amd64 \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:latest \
  -t smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:v1.1 \
  -f Dockerfile .

# ACRにプッシュ
docker push smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:latest
docker push smartbuildingplanneracr.azurecr.io/smart-building-planner-backend:v1.1

# AUTH_ENABLEDをfalseに設定
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg \
  --settings AUTH_ENABLED="false"

# Web Appを再起動
az webapp restart --name smart-building-planner-api --resource-group smart-building-planner-rg

echo "Done! Waiting 30 seconds for restart..."
sleep 30

# テスト
curl -s https://smart-building-planner-api.azurewebsites.net/api/projects | jq . || echo "Projects API test"