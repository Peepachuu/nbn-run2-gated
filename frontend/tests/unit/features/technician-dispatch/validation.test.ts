import { describe, expect, it } from 'vitest'
import {
  createDispatchRequestSchema,
  scheduleDispatchSchema,
} from '@/features/technician-dispatch/schemas'

describe('technician dispatch validation', () => {
  const validRequest = {
    premises: '12 Example Street, Melbourne VIC',
    faultId: 'F1',
    accessRequirementId: 'R1',
  }

  it('accepts a complete dispatch request', () => {
    expect(createDispatchRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it.each([
    ['blank premises', { ...validRequest, premises: '' }],
    ['overlong premises', { ...validRequest, premises: 'x'.repeat(201) }],
    ['blank fault', { ...validRequest, faultId: '' }],
    ['blank access requirement', { ...validRequest, accessRequirementId: '' }],
    ['unexpected protected fields', { ...validRequest, ownerId: 'another-user' }],
  ])('rejects %s', (_caseName, input) => {
    expect(createDispatchRequestSchema.safeParse(input).success).toBe(false)
  })

  it('accepts a complete scheduling request', () => {
    expect(
      scheduleDispatchSchema.safeParse({
        requestId: 'dispatch-1',
        technicianId: 'T1',
        scheduledVisit: '2030-02-01T10:30:00.000Z',
      }).success
    ).toBe(true)
  })

  it.each([
    [
      'blank request identifier',
      { requestId: '', technicianId: 'T1', scheduledVisit: '2030-02-01T10:30:00.000Z' },
    ],
    [
      'blank technician identifier',
      { requestId: 'dispatch-1', technicianId: '', scheduledVisit: '2030-02-01T10:30:00.000Z' },
    ],
    [
      'invalid visit date',
      { requestId: 'dispatch-1', technicianId: 'T1', scheduledVisit: 'not-a-date' },
    ],
    [
      'unexpected ownership data',
      {
        requestId: 'dispatch-1',
        technicianId: 'T1',
        scheduledVisit: '2030-02-01T10:30:00.000Z',
        ownerId: 'another-user',
      },
    ],
  ])('rejects %s', (_caseName, input) => {
    expect(scheduleDispatchSchema.safeParse(input).success).toBe(false)
  })
})
