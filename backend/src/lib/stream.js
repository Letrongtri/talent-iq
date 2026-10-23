import { StreamChat } from 'stream-chat'
import { StreamClient } from '@stream-io/node-sdk'

import { ENV } from './env.js'

const apiKey = ENV.STREAM_API_KEY
const apiSecret = ENV.STREAM_API_SECRET

if (!apiKey || !apiSecret) {
  console.error('Missing Stream API key or secret')
}

// chat features
export const chatClient = StreamChat.getInstance(apiKey, apiSecret)
//  for video calls
export const streamClient = new StreamClient(apiKey, apiSecret)

export const upsertStreamUser = async (userData) => {
  try {
    await chatClient.upsertUser(userData)
    return userData
  } catch (error) {
    console.error('Error upserting Stream user', error)
  }
}

export const removeStreamUser = async (userId) => {
  try {
    await chatClient.deleteUser(userId)
  } catch (error) {
    console.error('Error deleting Stream user', error)
  }
}
