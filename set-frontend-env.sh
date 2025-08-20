#!/bin/bash

echo "Setting environment variables for Frontend..."
echo "============================================"

# フロントエンド環境変数を設定
echo "Setting VITE_API_URL..."
az webapp config appsettings set --name smart-building-planner-app --resource-group smart-building-planner-rg --settings "VITE_API_URL=https://smart-building-planner-api.azurewebsites.net"

echo "Setting NODE_ENV..."
az webapp config appsettings set --name smart-building-planner-app --resource-group smart-building-planner-rg --settings "NODE_ENV=production"

echo "Setting WEBSITES_PORT..."
az webapp config appsettings set --name smart-building-planner-app --resource-group smart-building-planner-rg --settings "WEBSITES_PORT=80"

echo "Setting VITE_MAPBOX_TOKEN..."
az webapp config appsettings set --name smart-building-planner-app --resource-group smart-building-planner-rg --settings "VITE_MAPBOX_TOKEN=pk.eyJ1IjoiYW5lbW90byIsImEiOiJjbTBvdjkzN3gwMm9wMnJxMndnNndjdW1qIn0.0E8l2mO4-G-EhCXjIWg3dg"

echo -e "\nRestarting Frontend..."
az webapp restart --name smart-building-planner-app --resource-group smart-building-planner-rg

echo -e "\nDone! Waiting 60 seconds for restart..."
sleep 60

echo -e "\nTesting Frontend..."
curl -v https://smart-building-planner-app.azurewebsites.net