export interface DispatchFault {
  id: string
  name: string
}

export interface AccessRequirement {
  id: string
  name: string
  satisfiedBy: string[][]
}

export interface Technician {
  id: string
  name: string
  faults: string[]
  equipment: string[]
}

export interface TechnicianCatalog {
  _about: string
  faults: DispatchFault[]
  equipment: string[]
  accessRequirements: AccessRequirement[]
  technicians: Technician[]
}

export interface TechnicianMatch {
  technician: Technician
  matchedEquipment: string[]
}

export interface DispatchRequestSummary {
  id: string
  premises: string
  fault: DispatchFault
  accessRequirement: Pick<AccessRequirement, 'id' | 'name'>
}

export interface ScheduledDispatch extends DispatchRequestSummary {
  technician: Pick<Technician, 'id' | 'name'>
  matchedEquipment: string[]
  scheduledVisit: string
}

export interface CreateDispatchData {
  request: DispatchRequestSummary
  matches: TechnicianMatch[]
}

export interface ScheduleDispatchData {
  dispatch: ScheduledDispatch
}

export interface StoredDispatchRequest {
  _schemaVersion: 1
  ownerId: string
  premises: string
  fault: DispatchFault
  accessRequirement: Pick<AccessRequirement, 'id' | 'name'>
  status: 'matching' | 'scheduled'
  selectedTechnician: Pick<Technician, 'id' | 'name'> | null
  matchedEquipment: string[]
  scheduledVisit: Date | null
  createdAt: Date
  updatedAt: Date
}
