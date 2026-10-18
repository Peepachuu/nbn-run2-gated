import { z } from 'zod'

export const createDispatchRequestSchema = z
  .object({
    premises: z
      .string()
      .trim()
      .min(5, 'Customer premises is required.')
      .max(200, 'Customer premises must be 200 characters or fewer.'),
    faultId: z.string().trim().min(1, 'Select a fault or problem.'),
    accessRequirementId: z.string().trim().min(1, 'Select an access or equipment requirement.'),
  })
  .strict()

export const scheduleDispatchSchema = z
  .object({
    requestId: z.string().trim().min(1, 'Dispatch request is required.'),
    technicianId: z.string().trim().min(1, 'Select a technician.'),
    scheduledVisit: z.string().datetime({ message: 'Enter a valid scheduled visit.' }),
  })
  .strict()

export const scheduleSelectionSchema = z.object({
  technicianId: z.string().trim().min(1, 'Select a technician.'),
  scheduledVisit: z
    .string()
    .min(1, 'Enter a scheduled visit.')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid scheduled visit.'),
})

export type CreateDispatchInput = z.infer<typeof createDispatchRequestSchema>
export type ScheduleDispatchInput = z.infer<typeof scheduleDispatchSchema>
export type ScheduleSelectionInput = z.infer<typeof scheduleSelectionSchema>
