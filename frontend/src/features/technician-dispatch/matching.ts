import type { TechnicianCatalog, TechnicianMatch } from './types'

export function findCompatibleTechnicians(
  faultId: string,
  accessRequirementId: string,
  catalog: TechnicianCatalog
): TechnicianMatch[] {
  const accessRequirement = catalog.accessRequirements.find(
    (requirement) => requirement.id === accessRequirementId
  )

  if (!catalog.faults.some((fault) => fault.id === faultId) || !accessRequirement) {
    return []
  }

  return catalog.technicians.flatMap((technician) => {
    if (!technician.faults.includes(faultId)) return []

    const matchedEquipment = accessRequirement.satisfiedBy.find((combination) =>
      combination.every((equipment) => technician.equipment.includes(equipment))
    )

    return matchedEquipment ? [{ technician, matchedEquipment: [...matchedEquipment] }] : []
  })
}
