import { createElement } from 'react'
import { isAdmin } from '../api/admin.js'

export default function AdminNavigation({ user, onOpen }) {
  if (!isAdmin(user)) return null
  return createElement('button', { onClick: onOpen }, 'Admin Dashboard')
}
