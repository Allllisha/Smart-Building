import { BlobServiceClient } from '@azure/storage-blob'
import { AzureOpenAI } from 'openai'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

// Azure Blob Storage
export const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined')
  }
  return BlobServiceClient.fromConnectionString(connectionString)
}

// Azure OpenAI
export const getOpenAIClient = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  
  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration is missing')
  }
  
  return new AzureOpenAI({
    endpoint,
    apiKey,
    apiVersion: '2024-11-20'
  })
}

export const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'