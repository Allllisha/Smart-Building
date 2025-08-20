#!/bin/bash

# エラーが発生したら即座に終了
set -e

echo "===================="
echo "Smart Building Planner - Azure Deployment"
echo "===================="

# Azure CLI へのログイン確認
echo "Azure CLIでログイン中..."
az account show > /dev/null 2>&1 || az login

# 環境変数の設定
ACR_NAME="smartbuildingplanneracr"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP="smart-building-planner-rg"
BACKEND_APP_NAME="smart-building-planner-api"
FRONTEND_APP_NAME="smart-building-planner-app"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# ACRへのログイン
echo "===================="
echo "Azure Container Registryへログイン中..."
echo "===================="
az acr login --name $ACR_NAME

# バックエンドのDockerイメージをビルド
echo "===================="
echo "バックエンドのDockerイメージをビルド中 (linux/amd64)..."
echo "===================="
cd backend
docker buildx build \
  --platform linux/amd64 \
  -t ${ACR_LOGIN_SERVER}/smart-building-planner-backend:latest \
  -t ${ACR_LOGIN_SERVER}/smart-building-planner-backend:${TIMESTAMP} \
  --push \
  .

# フロントエンドのDockerイメージをビルド
echo "===================="
echo "フロントエンドのDockerイメージをビルド中 (linux/amd64)..."
echo "===================="
cd ../
docker buildx build \
  --platform linux/amd64 \
  -f Dockerfile.frontend.prod \
  -t ${ACR_LOGIN_SERVER}/smart-building-planner-frontend:latest \
  -t ${ACR_LOGIN_SERVER}/smart-building-planner-frontend:${TIMESTAMP} \
  --push \
  .

# バックエンドのWeb Appを更新
echo "===================="
echo "バックエンドのWeb Appを更新中..."
echo "===================="
az webapp config container set \
  --name $BACKEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name ${ACR_LOGIN_SERVER}/smart-building-planner-backend:latest \
  --docker-registry-server-url https://${ACR_LOGIN_SERVER}

# フロントエンドのWeb Appを更新
echo "===================="
echo "フロントエンドのWeb Appを更新中..."
echo "===================="
az webapp config container set \
  --name $FRONTEND_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name ${ACR_LOGIN_SERVER}/smart-building-planner-frontend:latest \
  --docker-registry-server-url https://${ACR_LOGIN_SERVER}

# Web Appを再起動
echo "===================="
echo "Web Appを再起動中..."
echo "===================="
az webapp restart --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP
az webapp restart --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP

echo "===================="
echo "デプロイが完了しました！"
echo "===================="
echo "バックエンド: https://${BACKEND_APP_NAME}.azurewebsites.net"
echo "フロントエンド: https://${FRONTEND_APP_NAME}.azurewebsites.net"
echo "タグ: ${TIMESTAMP}"