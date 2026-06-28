import { getDatabase } from '../firebase.js'
import type { ProjectRecord } from '../routes/projects.js'

export async function findProjectByTrackingId(
  trackingId: string,
): Promise<{ id: string; project: ProjectRecord } | null> {
  const db = await getDatabase()
  const snap = await db.ref('projects').once('value')
  const projects = snap.val() as Record<string, ProjectRecord> | null
  if (!projects) return null

  const entry = Object.entries(projects).find(([, p]) => p.trackingId === trackingId)
  if (!entry) return null
  return { id: entry[0], project: entry[1] }
}
