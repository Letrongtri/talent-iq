import { chatClient, streamClient } from '../lib/stream.js'
import { Session } from '../models/index.js'

export async function createSession(req, res) {
  try {
    const { problem, difficulty } = req.body
    const userId = req.user._id
    const clerkId = req.user.clerkId

    if (!problem || !difficulty) {
      return res.status(400).json({ msg: 'Missing problem or difficulty' })
    }

    // generate unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

    const session = await Session.create({ problem, difficulty, callId, host: userId })

    // create stream video call
    await streamClient.video.call('default', callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, session: session._id.toString() }
      }
    })

    // chat messaging
    const channel = chatClient.channel('messaging', callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
      image: req.user.profileImage
    })

    await channel.create()

    res.status(201).json({ session })
  } catch (error) {
    console.error('Error creating session', error)
    res.status(500).json({ msg: 'Error creating session' })
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = (await Session.find({ status: 'active' }).populate('host', 'name profileImage email clerkId'))
      .sort({ createdAt: -1 })
      .limit(20)

    res.status(200).json({ sessions })
  } catch (error) {
    console.error('Error getting active session', error)
    res.status(500).json({ msg: 'Error getting active session' })
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id
    const sessions = (
      await Session.find({ status: 'completed', $or: [{ host: userId }, { participant: userId }] }).populate(
        'host',
        'name profileImage email clerkId'
      )
    )
      .sort({ createdAt: -1 })
      .limit(20)

    res.status(200).json({ sessions })
  } catch (error) {
    console.error('Error getting my recent sessions', error)
    res.status(500).json({ msg: 'Error getting my recent sessions' })
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params

    const session = await Session.findById(id)
      .populate('host', 'name profileImage email clerkId')
      .populate('participant', 'name profileImage email clerkId')

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' })
    }

    res.status(200).json({ session })
  } catch (error) {
    console.error('Error getting session by id', error)
    res.status(500).json({ msg: 'Error getting session by id' })
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params
    const { _id: userId, clerkId } = req.user

    const session = await Session.findById(id)

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' })
    }

    if (session.status !== 'active') {
      return res.status(400).json({ msg: 'Session is not active' })
    }

    if (session.host.toString() === userId.toString()) {
      return res.status(400).json({ msg: 'You are the host of this session' })
    }

    if (session.participant) {
      return res.status(409).json({ msg: 'Session is already full' })
    }

    session.participant = userId
    await session.save()

    const channel = chatClient.channel('messaging', session.callId)

    await channel.addMembers([clerkId])

    res.status(200).json({ session })
  } catch (error) {
    console.error('Error joining session', error)
    res.status(500).json({ msg: 'Error joining session' })
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params
    const userId = req.user._id

    const session = await Session.findById(id)

    if (!session) {
      return res.status(404).json({ msg: 'Session not found' })
    }

    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ msg: 'You are not the host of this session' })
    }

    if (session.status !== 'active') {
      return res.status(400).json({ msg: 'Session is not active' })
    }

    session.status = 'completed'
    await session.save()

    // delete stream video call
    const call = streamClient.video.call('default', session.callId)
    await call.delete({ hard: true })

    // delete chat messaging
    const channel = chatClient.channel('messaging', session.callId)
    await channel.delete()

    res.status(200).json({ session, msg: 'Session ended successfully' })
  } catch (error) {
    console.error('Error ending session', error)
    res.status(500).json({ msg: 'Error ending session' })
  }
}
