import { Inngest } from 'inngest'
import { connectDB } from './db.js'
import { User } from '../models/index.js'
import { removeStreamUser, upsertStreamUser } from './stream.js'

export const inngest = new Inngest({ id: 'talent-iq' })

const syncUser = inngest.createFunction(
  { id: 'sync-user', triggers: [{ event: 'clerk/user.created' }] },
  async ({ event }) => {
    await connectDB()

    const { id, email_addresses, first_name, last_name, image_url } = event.data

    const newUser = {
      clerkId: id,
      email: email_addresses[0]?.email_address,
      name: `${first_name || ''} ${last_name || ''}`,
      profileImage: image_url
    }

    await User.create(newUser)

    await upsertStreamUser({
      id: newUser.clerkId.toString(),
      name: newUser.name,
      image: newUser.profileImage
    })
  }
)

const deleteUserFromDB = inngest.createFunction(
  { id: 'delete-user-from-db', triggers: [{ event: 'clerk/user.deleted' }] },
  async ({ event }) => {
    await connectDB()

    const { id } = event.data

    await User.deleteOne({ clerkId: id })

    await removeStreamUser(id.toString())
  }
)

const updateUser = inngest.createFunction(
  { id: 'update-user-to-db', triggers: [{ event: 'clerk/user.updated' }] },
  async ({ event }) => {
    await connectDB()

    const { id, email_addresses, first_name, last_name, image_url } = event.data

    const updatedUser = {
      email: email_addresses[0]?.email_address,
      name: `${first_name || ''} ${last_name || ''}`,
      profileImage: image_url
    }

    await User.updateOne({ clerkId: id }, { $set: updatedUser }, { upsert: true })

    await upsertStreamUser({
      id: id.toString(),
      name: updatedUser.name,
      image: updatedUser.profileImage
    })
  }
)

export const functions = [syncUser, deleteUserFromDB, updateUser]
