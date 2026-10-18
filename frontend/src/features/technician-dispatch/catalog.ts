import { z } from 'zod'
import fixture from '../../../../fixtures/technicians.json'
import type { TechnicianCatalog } from './types'

const catalogSchema = z
  .object({
    _about: z.string(),
    faults: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
        })
        .strict()
    ),
    equipment: z.array(z.string().min(1)),
    accessRequirements: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
          satisfiedBy: z.array(z.array(z.string().min(1))),
        })
        .strict()
    ),
    technicians: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
          faults: z.array(z.string().min(1)),
          equipment: z.array(z.string().min(1)),
        })
        .strict()
    ),
  })
  .strict()

export const technicianCatalog: TechnicianCatalog = catalogSchema.parse(fixture)
