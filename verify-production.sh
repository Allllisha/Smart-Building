#!/bin/bash

echo "Verifying Smart Building Planner Production Deployment..."
echo "=================================================="

# Production URLs
FRONTEND_URL="https://smart-building-planner-app.azurewebsites.net"
API_URL="https://smart-building-planner-api.azurewebsites.net/api"

# Check frontend is accessible
echo -e "\n1. Checking frontend accessibility..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL)
if [ $FRONTEND_STATUS -eq 200 ]; then
    echo "✓ Frontend is accessible (HTTP $FRONTEND_STATUS)"
else
    echo "✗ Frontend returned HTTP $FRONTEND_STATUS"
fi

# Check API health endpoint
echo -e "\n2. Checking API health..."
API_HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ $API_HEALTH_STATUS -eq 200 ]; then
    echo "✓ API is healthy (HTTP $API_HEALTH_STATUS)"
else
    echo "✗ API health check returned HTTP $API_HEALTH_STATUS"
fi

# Check if frontend is correctly configured with API URL
echo -e "\n3. Checking frontend configuration..."
echo "Fetching main JavaScript bundle to verify API URL configuration..."

# Get the main JS file
MAIN_JS=$(curl -s $FRONTEND_URL | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"//')
if [ ! -z "$MAIN_JS" ]; then
    echo "Found main JS bundle: $MAIN_JS"
    
    # Check if it contains the correct API URL
    if curl -s "$FRONTEND_URL$MAIN_JS" | grep -q "smart-building-planner-api.azurewebsites.net"; then
        echo "✓ Frontend is configured with correct production API URL"
    else
        echo "✗ Frontend may still be using localhost API URL"
    fi
else
    echo "✗ Could not find main JavaScript bundle"
fi

# Check for CORS headers on API
echo -e "\n4. Checking CORS configuration..."
CORS_HEADERS=$(curl -s -I -X OPTIONS "$API_URL/health" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET")

if echo "$CORS_HEADERS" | grep -q "Access-Control-Allow-Origin"; then
    echo "✓ CORS headers are present on API"
    echo "$CORS_HEADERS" | grep "Access-Control-"
else
    echo "✗ CORS headers not found"
fi

echo -e "\n=================================================="
echo "Verification complete!"
echo ""
echo "Next steps:"
echo "1. Open $FRONTEND_URL/dashboard in your browser"
echo "2. Open Developer Tools (F12) and check the Network tab"
echo "3. Verify API calls are going to $API_URL"
echo "4. Check Console for any CORS errors"