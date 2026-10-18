'use server'

import { requireAuth } from '@/actions/auth.actions'
import { adminDb } from '@/lib/firebase/admin'
import type { ActionResult } from '@/types'
import { technicianCatalog } from '../catalog'
import { findCompatibleTechnicians } from '../matching'
import {
  createDispatchRequestSchema,
  scheduleDispatchSchema,
  type CreateDispatchInput,
  type ScheduleDispatchInput,
} from '../schemas'
import type { CreateDispatchData, ScheduleDispatchData, StoredDispatchRequest } from '../types'

const dispatchCollection = 'dispatchRequests'

function firstValidationError(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? 'Invalid dispatch details.'
}

export async function createDispatchRequest(
  input: CreateDispatchInput
): Promise<ActionResult<CreateDispatchData>> {
  const session = await requireAuth()
  const parsed = createDispatchRequestSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: firstValidationError(parsed.error) }
  }

  const fault = technicianCatalog.faults.find((item) => item.id === parsed.data.faultId)
  if (!fault) return { success: false, error: 'Unknown fault.' }

  const accessRequirement = technicianCatalog.accessRequirements.find(
    (item) => item.id === parsed.data.accessRequirementId
  )
  if (!accessRequirement) return { success: false, error: 'Unknown access requirement.' }

  const matches = findCompatibleTechnicians(fault.id, accessRequirement.id, technicianCatalog)

  try {
    const now = new Date()
    const request: StoredDispatchRequest = {
      _schemaVersion: 1,
      ownerId: session.uid,
      premises: parsed.data.premises,
      fault: { id: fault.id, name: fault.name },
      accessRequirement: { id: accessRequirement.id, name: accessRequirement.name },
      status: 'matching',
      selectedTechnician: null,
      matchedEquipment: [],
      scheduledVisit: null,
      createdAt: now,
      updatedAt: now,
    }

    const document = await adminDb.collection(dispatchCollection).add(request)

    return {
      success: true,
      data: {
        request: {
          id: document.id,
          premises: request.premises,
          fault: request.fault,
          accessRequirement: request.accessRequirement,
        },
        matches,
      },
    }
  } catch {
    return {
      success: false,
      error: 'Unable to create the dispatch request. Please try again.',
    }
  }
}

export async function scheduleDispatch(
  input: ScheduleDispatchInput
): Promise<ActionResult<ScheduleDispatchData>> {
  const session = await requireAuth()
  const parsed = scheduleDispatchSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: firstValidationError(parsed.error) }
  }

  try {
    const document = adminDb.collection(dispatchCollection).doc(parsed.data.requestId)
    const snapshot = await document.get()
    const request = snapshot.exists
      ? (snapshot.data() as StoredDispatchRequest | undefined)
      : undefined

    if (!request || request.ownerId !== session.uid) {
      return { success: false, error: 'Dispatch request not found.' }
    }

    if (request.status === 'scheduled') {
      return { success: false, error: 'This dispatch has already been scheduled.' }
    }

    const fault = technicianCatalog.faults.find((item) => item.id === request.fault.id)
    const accessRequirement = technicianCatalog.accessRequirements.find(
      (item) => item.id === request.accessRequirement.id
    )
    const match = findCompatibleTechnicians(
      request.fault.id,
      request.accessRequirement.id,
      technicianCatalog
    ).find((item) => item.technician.id === parsed.data.technicianId)

    if (!fault || !accessRequirement || !match) {
      return {
        success: false,
        error: 'The selected technician is not compatible with this request.',
      }
    }

    const scheduledVisit = new Date(parsed.data.scheduledVisit)
    const selectedTechnician = {
      id: match.technician.id,
      name: match.technician.name,
    }

    await document.update({
      status: 'scheduled',
      selectedTechnician,
      matchedEquipment: match.matchedEquipment,
      scheduledVisit,
      updatedAt: new Date(),
    })

    return {
      success: true,
      data: {
        dispatch: {
          id: snapshot.id,
          premises: request.premises,
          fault: { id: fault.id, name: fault.name },
          accessRequirement: { id: accessRequirement.id, name: accessRequirement.name },
          technician: selectedTechnician,
          matchedEquipment: match.matchedEquipment,
          scheduledVisit: scheduledVisit.toISOString(),
        },
      },
    }
  } catch {
    return {
      success: false,
      error: 'Unable to schedule the dispatch. Please try again.',
    }
  }
}
