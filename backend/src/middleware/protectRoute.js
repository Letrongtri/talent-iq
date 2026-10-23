import { getAuth } from '@clerk/express'
import { User } from '../models/index.js'

export const protectRoute = [
  async (req, res, next) => {
    try {
      const { isAuthenticated, userId: clerkId } = getAuth(req)
      if (!isAuthenticated || !clerkId) return res.status(401).json({ msg: 'Unauthorized - invalid token' })

      const user = await User.findOne({ clerkId })
      if (!user) return res.status(404).json({ msg: 'Unauthorized - user not found' })

      req.user = user

      next()
    } catch (error) {
      console.log('Error in protectRoute middleware', error)
      res.status(401).json({ msg: 'Unauthorized - invalid token' })
    }
  }
]
