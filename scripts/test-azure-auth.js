#!/usr/bin/env node

/**
 * Azure AD Authentication Test Script
 * Tests the current Azure AD configuration
 */

const { ClientSecretCredential } = require('@azure/identity');
require('dotenv').config({ path: '.env' });

async function testAzureAuth() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  
  console.log('🔍 Testing Azure AD Authentication...');
  console.log('Tenant ID:', tenantId);
  console.log('Client ID:', clientId);
  console.log('Client Secret available:', !!clientSecret);
  
  if (!tenantId || !clientId || !clientSecret) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    
    // Test with Azure AI scope
    console.log('🔐 Testing Azure AI scope...');
    const token = await credential.getToken(['https://ai.azure.com/.default']);
    
    if (token) {
      console.log('✅ Successfully authenticated with Azure AI scope');
      console.log('Token expires at:', new Date(token.expiresOnTimestamp));
    }
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    
    if (error.message.includes('AADSTS700016')) {
      console.error('📋 This error means:');
      console.error('   - The application ID is not registered in the specified tenant');
      console.error('   - The application might be registered in a different tenant');
      console.error('   - The application needs to be created in Azure Portal');
      console.error('');
      console.error('🔧 To fix:');
      console.error('   1. Go to https://portal.azure.com');
      console.error('   2. Navigate to Azure Active Directory > App registrations');
      console.error('   3. Create a new app registration or find the existing one');
      console.error('   4. Copy the correct Application (client) ID');
      console.error('   5. Update your .env file with the correct AZURE_CLIENT_ID');
    }
    
    // Try with different scopes
    try {
      console.log('🔐 Testing with Microsoft Graph scope...');
      const graphToken = await credential.getToken(['https://graph.microsoft.com/.default']);
      if (graphToken) {
        console.log('✅ Microsoft Graph authentication works - issue is with AI scope');
      }
    } catch (graphError) {
      console.error('❌ Microsoft Graph also failed:', graphError.message);
    }
  }
}

testAzureAuth().catch(console.error);