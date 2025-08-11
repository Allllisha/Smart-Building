#!/bin/bash

# Build script for production deployment

echo "Building Smart Building Planner Frontend for Production..."

# Export production environment variables
export VITE_API_URL="https://smart-building-planner-api.azurewebsites.net/api"
export VITE_MAPBOX_TOKEN="pk.eyJ1Ijoic2FyaWF0b21vbmUyMyIsImEiOiJjbWRpdmJjOTMwZ2dkMm1vajU2dGdkeHJkIn0.5V_adK0JNltd0nBcISnQUw"

# Clean and build
rm -rf dist
npm run build

echo "Build completed successfully!"