import { describe, expect, it } from 'vitest'
import { technicianCatalog } from '@/features/technician-dispatch/catalog'
import { findCompatibleTechnicians } from '@/features/technician-dispatch/matching'

describe('technician dispatch matching', () => {
  it('T2-AC04: only returns technicians who support the recorded fault', () => {
    const matches = findCompatibleTechnicians('F1', 'R0', technicianCatalog)

    expect(matches.map((match) => match.technician.id)).toEqual(['T1', 'T4'])
    expect(matches.every((match) => match.technician.faults.includes('F1'))).toBe(true)
  })

  it('T2-AC05: returns the equipment combination that satisfies the job', () => {
    const [match] = findCompatibleTechnicians('F3', 'R1', technicianCatalog)

    expect(match?.technician.id).toBe('T2')
    expect(match?.matchedEquipment).toEqual(['elevated-work-platform'])
  })

  it('T2-AC06: rejects a second-storey technician without ladder or elevated-work-platform access', () => {
    const matches = findCompatibleTechnicians('F1', 'R1', technicianCatalog)

    expect(matches.map((match) => match.technician.id)).toEqual(['T1'])
    expect(matches.some((match) => match.technician.id === 'T4')).toBe(false)
  })

  it('T2-AC07: accepts a suitable second-storey technician with the required equipment', () => {
    const ladderMatches = findCompatibleTechnicians('F1', 'R1', technicianCatalog)
    const platformMatches = findCompatibleTechnicians('F3', 'R1', technicianCatalog)

    expect(ladderMatches).toEqual([
      expect.objectContaining({
        technician: expect.objectContaining({ id: 'T1' }),
        matchedEquipment: ['ladder'],
      }),
    ])
    expect(platformMatches).toEqual([
      expect.objectContaining({
        technician: expect.objectContaining({ id: 'T2' }),
        matchedEquipment: ['elevated-work-platform'],
      }),
    ])
  })

  it('T2-AC08: rejects a pit job when pit-access is unavailable', () => {
    expect(findCompatibleTechnicians('F1', 'R2', technicianCatalog)).toEqual([])
  })

  it('T2-AC08: accepts a pit job only when both fault suitability and pit-access are present', () => {
    const matches = findCompatibleTechnicians('F3', 'R2', technicianCatalog)

    expect(matches).toEqual([
      expect.objectContaining({
        technician: expect.objectContaining({ id: 'T2' }),
        matchedEquipment: ['pit-access'],
      }),
    ])
  })

  it('T2-AC09: returns no fallback when no compatible technician and equipment combination exists', () => {
    expect(findCompatibleTechnicians('F2', 'R1', technicianCatalog)).toEqual([])
  })
})
