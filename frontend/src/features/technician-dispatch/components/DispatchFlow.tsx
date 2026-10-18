'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, HardHat, MapPin, Wrench } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createDispatchRequest, scheduleDispatch } from '../actions/dispatch.actions'
import {
  createDispatchRequestSchema,
  scheduleSelectionSchema,
  type CreateDispatchInput,
  type ScheduleSelectionInput,
} from '../schemas'
import type {
  DispatchRequestSummary,
  ScheduledDispatch,
  TechnicianCatalog,
  TechnicianMatch,
} from '../types'

const fieldClassName =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 focus:outline-none aria-invalid:border-red-500 dark:border-zinc-700 dark:bg-zinc-900'
const primaryButtonClassName =
  'inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200'

const equipmentLabels: Record<string, string> = {
  ladder: 'Ladder',
  'elevated-work-platform': 'Elevated work platform',
  'pit-access': 'Pit access',
}

function equipmentText(equipment: string[]) {
  if (equipment.length === 0) return 'No equipment required'
  return equipment.map((item) => equipmentLabels[item] ?? item).join(', ')
}

function handleSelectArrowKey(event: KeyboardEvent<HTMLSelectElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

  event.preventDefault()
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextIndex = Math.min(
    Math.max(event.currentTarget.selectedIndex + direction, 0),
    event.currentTarget.options.length - 1
  )

  if (nextIndex === event.currentTarget.selectedIndex) return
  event.currentTarget.selectedIndex = nextIndex
  event.currentTarget.dispatchEvent(new Event('change', { bubbles: true }))
}

function RequestSummary({ request }: { request: DispatchRequestSummary }) {
  return (
    <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <dt className="font-medium text-zinc-500">Customer premises</dt>
        <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{request.premises}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-500">Fault or problem</dt>
        <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{request.fault.name}</dd>
      </div>
      <div>
        <dt className="font-medium text-zinc-500">Access requirement</dt>
        <dd className="mt-1 text-zinc-900 dark:text-zinc-100">{request.accessRequirement.name}</dd>
      </div>
    </dl>
  )
}

function ScheduledSummary({ dispatch }: { dispatch: ScheduledDispatch }) {
  const visit = new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(dispatch.scheduledVisit))

  return (
    <section className="space-y-6" aria-labelledby="scheduled-heading">
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
        <div>
          <h2 id="scheduled-heading" className="text-xl font-semibold">
            Dispatch scheduled
          </h2>
          <p className="mt-1 text-sm">The technician visit has been recorded successfully.</p>
        </div>
      </div>

      <dl className="grid gap-5 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <dt className="text-sm font-medium text-zinc-500">Customer premises</dt>
          <dd className="mt-1">{dispatch.premises}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Scheduled visit</dt>
          <dd className="mt-1">{visit}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Fault or problem</dt>
          <dd className="mt-1">{dispatch.fault.name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Access requirement</dt>
          <dd className="mt-1">{dispatch.accessRequirement.name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Technician</dt>
          <dd className="mt-1">{dispatch.technician.name}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-zinc-500">Equipment used for the match</dt>
          <dd className="mt-1">{equipmentText(dispatch.matchedEquipment)}</dd>
        </div>
      </dl>
    </section>
  )
}

export function DispatchFlow({ catalog }: { catalog: TechnicianCatalog }) {
  const [request, setRequest] = useState<DispatchRequestSummary | null>(null)
  const [matches, setMatches] = useState<TechnicianMatch[]>([])
  const [scheduledDispatch, setScheduledDispatch] = useState<ScheduledDispatch | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const requestForm = useForm<CreateDispatchInput>({
    resolver: zodResolver(createDispatchRequestSchema),
    defaultValues: { premises: '', faultId: '', accessRequirementId: '' },
  })
  const scheduleForm = useForm<ScheduleSelectionInput>({
    resolver: zodResolver(scheduleSelectionSchema),
    defaultValues: { technicianId: '', scheduledVisit: '' },
  })

  async function submitRequest(values: CreateDispatchInput) {
    setRequestError(null)
    const result = await createDispatchRequest(values)

    if (!result.success || !result.data) {
      const error = result.error ?? 'Unable to create the dispatch request.'
      setRequestError(error)
      toast.error(error)
      return
    }

    setRequest(result.data.request)
    setMatches(result.data.matches)
    toast.success('Dispatch request created.')
  }

  async function submitSchedule(values: ScheduleSelectionInput) {
    if (!request) return
    setScheduleError(null)

    const result = await scheduleDispatch({
      requestId: request.id,
      technicianId: values.technicianId,
      scheduledVisit: new Date(values.scheduledVisit).toISOString(),
    })

    if (!result.success || !result.data) {
      const error = result.error ?? 'Unable to schedule the dispatch.'
      setScheduleError(error)
      toast.error(error)
      return
    }

    setScheduledDispatch(result.data.dispatch)
    toast.success('Dispatch scheduled.')
  }

  if (scheduledDispatch) return <ScheduledSummary dispatch={scheduledDispatch} />

  if (request) {
    return (
      <section className="space-y-6" aria-labelledby="matching-heading">
        <div>
          <h2 id="matching-heading" className="text-xl font-semibold">
            {matches.length > 0 ? 'Compatible technicians' : 'No compatible technician found'}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {matches.length > 0
              ? 'Select a technician whose fault skills and equipment satisfy this request.'
              : 'No technician and equipment combination satisfies the recorded request.'}
          </p>
        </div>

        <RequestSummary request={request} />

        {matches.length > 0 && (
          <form
            onSubmit={scheduleForm.handleSubmit(submitSchedule)}
            className="space-y-6"
            noValidate
          >
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Select a compatible technician</legend>
              {matches.map((match) => {
                const descriptionId = `match-description-${match.technician.id}`
                return (
                  <label
                    key={match.technician.id}
                    data-testid={`technician-match-${match.technician.id}`}
                    className="flex cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-4 focus-within:ring-2 focus-within:ring-zinc-500 focus-within:ring-offset-2 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <input
                      type="radio"
                      value={match.technician.id}
                      aria-describedby={descriptionId}
                      className="mt-1 size-4"
                      {...scheduleForm.register('technicianId')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{match.technician.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          Compatible match
                        </span>
                      </span>
                      <span id={descriptionId} className="mt-3 flex items-center gap-2 text-sm">
                        <HardHat
                          className="size-5 shrink-0 text-zinc-500"
                          aria-hidden="true"
                          data-testid="equipment-icon"
                        />
                        <span>
                          <span className="font-medium">
                            Compatible match. <span>Equipment required</span>:{' '}
                          </span>
                          {equipmentText(match.matchedEquipment)}
                        </span>
                      </span>
                    </span>
                  </label>
                )
              })}
              {scheduleForm.formState.errors.technicianId && (
                <p className="text-sm text-red-600" role="alert">
                  {scheduleForm.formState.errors.technicianId.message}
                </p>
              )}
            </fieldset>

            <div className="max-w-md space-y-1.5">
              <label htmlFor="scheduledVisit" className="text-sm font-medium">
                Scheduled visit
              </label>
              <input
                id="scheduledVisit"
                type="datetime-local"
                required
                aria-invalid={Boolean(scheduleForm.formState.errors.scheduledVisit)}
                className={fieldClassName}
                {...scheduleForm.register('scheduledVisit')}
              />
              {scheduleForm.formState.errors.scheduledVisit && (
                <p className="text-sm text-red-600" role="alert">
                  {scheduleForm.formState.errors.scheduledVisit.message}
                </p>
              )}
            </div>

            {scheduleError && (
              <p className="text-sm text-red-600" role="alert" aria-live="polite">
                {scheduleError}
              </p>
            )}

            <button
              type="submit"
              disabled={scheduleForm.formState.isSubmitting}
              className={primaryButtonClassName}
            >
              {scheduleForm.formState.isSubmitting ? 'Scheduling…' : 'Schedule dispatch'}
            </button>
          </form>
        )}
      </section>
    )
  }

  return (
    <section className="space-y-6" aria-labelledby="create-dispatch-heading">
      <div>
        <h2 id="create-dispatch-heading" className="text-xl font-semibold">
          Create a dispatch request
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Record the customer premises, fault, and access needs to find a compatible technician.
        </p>
      </div>

      <form
        onSubmit={requestForm.handleSubmit(submitRequest)}
        className="max-w-2xl space-y-5"
        noValidate
      >
        <div className="space-y-1.5">
          <label htmlFor="premises" className="text-sm font-medium">
            Customer premises
          </label>
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute top-2.5 left-3 size-4 text-zinc-400"
              aria-hidden="true"
            />
            <input
              id="premises"
              type="text"
              required
              maxLength={200}
              autoComplete="street-address"
              aria-invalid={Boolean(requestForm.formState.errors.premises)}
              className={`${fieldClassName} pl-9`}
              {...requestForm.register('premises')}
            />
          </div>
          {requestForm.formState.errors.premises && (
            <p className="text-sm text-red-600" role="alert">
              {requestForm.formState.errors.premises.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="faultId" className="text-sm font-medium">
            Fault or problem
          </label>
          <select
            id="faultId"
            required
            onKeyDown={handleSelectArrowKey}
            aria-invalid={Boolean(requestForm.formState.errors.faultId)}
            className={fieldClassName}
            {...requestForm.register('faultId')}
          >
            <option value="">Select a fault or problem</option>
            {catalog.faults.map((fault) => (
              <option key={fault.id} value={fault.id}>
                {fault.name}
              </option>
            ))}
          </select>
          {requestForm.formState.errors.faultId && (
            <p className="text-sm text-red-600" role="alert">
              {requestForm.formState.errors.faultId.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="accessRequirementId" className="text-sm font-medium">
            Access or equipment requirement
          </label>
          <select
            id="accessRequirementId"
            required
            onKeyDown={handleSelectArrowKey}
            aria-invalid={Boolean(requestForm.formState.errors.accessRequirementId)}
            className={fieldClassName}
            {...requestForm.register('accessRequirementId')}
          >
            <option value="">Select an access or equipment requirement</option>
            {catalog.accessRequirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>
                {requirement.name}
              </option>
            ))}
          </select>
          {requestForm.formState.errors.accessRequirementId && (
            <p className="text-sm text-red-600" role="alert">
              {requestForm.formState.errors.accessRequirementId.message}
            </p>
          )}
        </div>

        {requestError && (
          <p className="text-sm text-red-600" role="alert" aria-live="polite">
            {requestError}
          </p>
        )}

        <button
          type="submit"
          disabled={requestForm.formState.isSubmitting}
          className={primaryButtonClassName}
        >
          <Wrench className="mr-2 size-4" aria-hidden="true" />
          {requestForm.formState.isSubmitting
            ? 'Finding technicians…'
            : 'Find compatible technicians'}
        </button>
      </form>
    </section>
  )
}
