import { chatClient } from '../lib/stream.js'

export async function getStreamToken(req, res) {
  try {
    const token = chatClient.createToken(req.user.clerkId.toString())
    res.status(200).json({
      token,
      userId: req.user.clerkId,
      userName: req.user.name,
      userImage: req.user.profileImage
    })
  } catch (error) {
    console.error('Error getting Stream token', error)
    res.status(500).json({ msg: 'Error getting Stream token' })
  }
}
