import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const requireAuth = vi.fn()
  const add = vi.fn()
  const get = vi.fn()
  const update = vi.fn()
  const doc = vi.fn(() => ({ get, update }))
  const collection = vi.fn(() => ({ add, doc }))

  return { requireAuth, add, get, update, doc, collection }
})

vi.mock('@/actions/auth.actions', () => ({ requireAuth: mocks.requireAuth }))
vi.mock('@/lib/firebase/admin', () => ({
  adminDb: { collection: mocks.collection },
}))

import {
  createDispatchRequest,
  scheduleDispatch,
} from '@/features/technician-dispatch/actions/dispatch.actions'

const validCreateInput = {
  premises: '12 Example Street, Melbourne VIC',
  faultId: 'F1',
  accessRequirementId: 'R1',
}

const storedRequest = {
  _schemaVersion: 1,
  ownerId: 'owner-1',
  premises: validCreateInput.premises,
  fault: { id: 'F1', name: 'No connection at the premises' },
  accessRequirement: { id: 'R1', name: 'Second storey' },
  status: 'matching',
  selectedTechnician: null,
  matchedEquipment: [],
  scheduledVisit: null,
  createdAt: new Date('2026-10-18T02:00:00.000Z'),
  updatedAt: new Date('2026-10-18T02:00:00.000Z'),
}

describe('technician dispatch server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ uid: 'owner-1', email: 'owner@example.test' })
    mocks.add.mockResolvedValue({ id: 'dispatch-1' })
    mocks.get.mockResolvedValue({ exists: true, id: 'dispatch-1', data: () => storedRequest })
    mocks.update.mockResolvedValue(undefined)
  })

  it('T2-AC01 to T2-AC05: authenticates, derives ownership, stores the request, and returns valid matches', async () => {
    const result = await createDispatchRequest(validCreateInput)

    expect(mocks.requireAuth).toHaveBeenCalledOnce()
    expect(mocks.collection).toHaveBeenCalledWith('dispatchRequests')
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        _schemaVersion: 1,
        ownerId: 'owner-1',
        premises: validCreateInput.premises,
        fault: { id: 'F1', name: 'No connection at the premises' },
        accessRequirement: { id: 'R1', name: 'Second storey' },
        status: 'matching',
        selectedTechnician: null,
        matchedEquipment: [],
        scheduledVisit: null,
      })
    )
    expect(result).toMatchObject({
      success: true,
      data: {
        request: {
          id: 'dispatch-1',
          premises: validCreateInput.premises,
          fault: { id: 'F1' },
          accessRequirement: { id: 'R1' },
        },
        matches: [
          {
            technician: { id: 'T1', name: 'Tech Alpha' },
            matchedEquipment: ['ladder'],
          },
        ],
      },
    })
    expect(result).not.toHaveProperty('data.request.ownerId')
  })

  it('rejects unauthenticated request creation before accessing Firestore', async () => {
    mocks.requireAuth.mockRejectedValueOnce(new Error('Unauthenticated'))

    await expect(createDispatchRequest(validCreateInput)).rejects.toThrow('Unauthenticated')
    expect(mocks.collection).not.toHaveBeenCalled()
  })

  it.each([
    ['fault', { ...validCreateInput, faultId: 'F999' }],
    ['access requirement', { ...validCreateInput, accessRequirementId: 'R999' }],
  ])('rejects an unknown fixture %s without writing a request', async (label, input) => {
    const result = await createDispatchRequest(input)

    expect(result).toMatchObject({
      success: false,
      error: expect.stringMatching(new RegExp(label, 'i')),
    })
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it('returns a safe error when request storage fails', async () => {
    mocks.add.mockRejectedValueOnce(new Error('sensitive Firestore failure'))

    const result = await createDispatchRequest(validCreateInput)

    expect(result).toEqual({
      success: false,
      error: 'Unable to create the dispatch request. Please try again.',
    })
    expect(JSON.stringify(result)).not.toContain('sensitive Firestore failure')
  })

  it('T2-AC10 and T2-AC11: schedules an owned request with a recomputed valid match', async () => {
    const result = await scheduleDispatch({
      requestId: 'dispatch-1',
      technicianId: 'T1',
      scheduledVisit: '2030-02-01T10:30:00.000Z',
    })

    expect(mocks.doc).toHaveBeenCalledWith('dispatch-1')
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'scheduled',
        selectedTechnician: { id: 'T1', name: 'Tech Alpha' },
        matchedEquipment: ['ladder'],
        scheduledVisit: new Date('2030-02-01T10:30:00.000Z'),
      })
    )
    expect(result).toMatchObject({
      success: true,
      data: {
        dispatch: {
          id: 'dispatch-1',
          premises: validCreateInput.premises,
          fault: { id: 'F1', name: 'No connection at the premises' },
          accessRequirement: { id: 'R1', name: 'Second storey' },
          technician: { id: 'T1', name: 'Tech Alpha' },
          matchedEquipment: ['ladder'],
          scheduledVisit: '2030-02-01T10:30:00.000Z',
        },
      },
    })
  })

  it('authenticates scheduling before loading a dispatch request', async () => {
    mocks.requireAuth.mockRejectedValueOnce(new Error('Unauthenticated'))

    await expect(
      scheduleDispatch({
        requestId: 'dispatch-1',
        technicianId: 'T1',
        scheduledVisit: '2030-02-01T10:30:00.000Z',
      })
    ).rejects.toThrow('Unauthenticated')
    expect(mocks.get).not.toHaveBeenCalled()
  })

  it('rejects a cross-owner scheduling attempt without revealing the request', async () => {
    mocks.get.mockResolvedValueOnce({
      exists: true,
      id: 'dispatch-1',
      data: () => ({ ...storedRequest, ownerId: 'different-owner' }),
    })

    const result = await scheduleDispatch({
      requestId: 'dispatch-1',
      technicianId: 'T1',
      scheduledVisit: '2030-02-01T10:30:00.000Z',
    })

    expect(result).toEqual({ success: false, error: 'Dispatch request not found.' })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects a client-supplied technician that is incompatible with the stored request', async () => {
    const result = await scheduleDispatch({
      requestId: 'dispatch-1',
      technicianId: 'T4',
      scheduledVisit: '2030-02-01T10:30:00.000Z',
    })

    expect(result).toEqual({
      success: false,
      error: 'The selected technician is not compatible with this request.',
    })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('does not allow a scheduled request to be rescheduled', async () => {
    mocks.get.mockResolvedValueOnce({
      exists: true,
      id: 'dispatch-1',
      data: () => ({ ...storedRequest, status: 'scheduled' }),
    })

    const result = await scheduleDispatch({
      requestId: 'dispatch-1',
      technicianId: 'T1',
      scheduledVisit: '2030-02-01T10:30:00.000Z',
    })

    expect(result).toEqual({ success: false, error: 'This dispatch has already been scheduled.' })
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('returns a safe error when scheduling storage fails', async () => {
    mocks.update.mockRejectedValueOnce(new Error('sensitive Firestore failure'))

    const result = await scheduleDispatch({
      requestId: 'dispatch-1',
      technicianId: 'T1',
      scheduledVisit: '2030-02-01T10:30:00.000Z',
    })

    expect(result).toEqual({
      success: false,
      error: 'Unable to schedule the dispatch. Please try again.',
    })
    expect(JSON.stringify(result)).not.toContain('sensitive Firestore failure')
  })
})
