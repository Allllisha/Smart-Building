#!/bin/bash

echo "Setting environment variables for API..."
echo "======================================="

# 環境変数を個別に設定
echo "Setting DB_HOST..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "DB_HOST=smart-building-planner-db.postgres.database.azure.com"

echo "Setting DB_PORT..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "DB_PORT=5432"

echo "Setting DB_NAME..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "DB_NAME=smart_building_planner"

echo "Setting DB_USER..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "DB_USER=dbadmin"

echo "Setting DB_PASSWORD..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "DB_PASSWORD=SmartBuilding2025#"

echo "Setting AUTH_ENABLED..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "AUTH_ENABLED=false"

echo "Setting CORS_ORIGIN..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "CORS_ORIGIN=https://smart-building-planner-app.azurewebsites.net"

echo "Setting NODE_ENV..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "NODE_ENV=production"

echo "Setting WEBSITES_PORT..."
az webapp config appsettings set --name smart-building-planner-api --resource-group smart-building-planner-rg --settings "WEBSITES_PORT=8000"

echo -e "\nRestarting API..."
az webapp restart --name smart-building-planner-api --resource-group smart-building-planner-rg

echo -e "\nDone! Waiting 60 seconds for restart..."
sleep 60

echo -e "\nTesting API..."
curl -v https://smart-building-planner-api.azurewebsites.net/api/projects