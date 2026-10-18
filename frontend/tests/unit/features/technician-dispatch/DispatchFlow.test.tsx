import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '../../../../../fixtures/technicians.json'
import type { TechnicianCatalog } from '@/features/technician-dispatch/types'

const actionMocks = vi.hoisted(() => ({
  createDispatchRequest: vi.fn(),
  scheduleDispatch: vi.fn(),
}))

vi.mock('@/features/technician-dispatch/actions/dispatch.actions', () => actionMocks)

import { DispatchFlow } from '@/features/technician-dispatch/components/DispatchFlow'

const catalog = fixture as TechnicianCatalog

const createdRequest = {
  id: 'dispatch-1',
  premises: '12 Example Street, Melbourne VIC',
  fault: { id: 'F1', name: 'No connection at the premises' },
  accessRequirement: { id: 'R1', name: 'Second storey' },
}

const compatibleMatch = {
  technician: {
    id: 'T1',
    name: 'Tech Alpha',
    faults: ['F1'],
    equipment: ['ladder'],
  },
  matchedEquipment: ['ladder'],
}

async function completeRequestForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Customer premises'), createdRequest.premises)
  await user.selectOptions(screen.getByLabelText('Fault or problem'), 'F1')
  await user.selectOptions(screen.getByLabelText('Access or equipment requirement'), 'R1')
  await user.click(screen.getByRole('button', { name: 'Find compatible technicians' }))
}

describe('DispatchFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    actionMocks.createDispatchRequest.mockResolvedValue({
      success: true,
      data: { request: createdRequest, matches: [compatibleMatch] },
    })
    actionMocks.scheduleDispatch.mockResolvedValue({
      success: true,
      data: {
        dispatch: {
          ...createdRequest,
          technician: { id: 'T1', name: 'Tech Alpha' },
          matchedEquipment: ['ladder'],
          scheduledVisit: '2030-02-01T10:30:00.000Z',
        },
      },
    })
  })

  it('T2-AC01 to T2-AC03: presents labelled controls for premises, fault, and access requirements', async () => {
    const user = userEvent.setup()
    render(<DispatchFlow catalog={catalog} />)

    expect(screen.getByRole('heading', { name: 'Create a dispatch request' })).toBeInTheDocument()
    expect(screen.getByLabelText('Customer premises')).toBeRequired()
    expect(screen.getByLabelText('Fault or problem')).toBeRequired()
    expect(screen.getByLabelText('Access or equipment requirement')).toBeRequired()

    await user.click(screen.getByRole('button', { name: 'Find compatible technicians' }))

    const alerts = await screen.findAllByRole('alert')
    expect(
      alerts.some((alert) => /customer premises is required/i.test(alert.textContent ?? ''))
    ).toBe(true)
    expect(actionMocks.createDispatchRequest).not.toHaveBeenCalled()
  })

  it('T2-AC04 to T2-AC07: shows only a valid match and pairs its equipment icon with text', async () => {
    const user = userEvent.setup()
    render(<DispatchFlow catalog={catalog} />)

    await completeRequestForm(user)

    const matchCard = await screen.findByTestId('technician-match-T1')
    expect(within(matchCard).getByText('Tech Alpha')).toBeInTheDocument()
    expect(within(matchCard).getByText('Compatible match')).toBeInTheDocument()
    expect(within(matchCard).getByText('Ladder')).toBeInTheDocument()
    expect(within(matchCard).getByTestId('equipment-icon')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText('Tech Delta')).not.toBeInTheDocument()
  })

  it('T2-AC08 and T2-AC09: explains that no compatible match exists instead of rendering a fallback', async () => {
    const user = userEvent.setup()
    actionMocks.createDispatchRequest.mockResolvedValueOnce({
      success: true,
      data: {
        request: {
          ...createdRequest,
          accessRequirement: { id: 'R2', name: 'Pit job' },
        },
        matches: [],
      },
    })
    render(<DispatchFlow catalog={catalog} />)

    await user.type(screen.getByLabelText('Customer premises'), createdRequest.premises)
    await user.selectOptions(screen.getByLabelText('Fault or problem'), 'F1')
    await user.selectOptions(screen.getByLabelText('Access or equipment requirement'), 'R2')
    await user.click(screen.getByRole('button', { name: 'Find compatible technicians' }))

    expect(
      await screen.findByRole('heading', { name: 'No compatible technician found' })
    ).toBeInTheDocument()
    expect(screen.getByText(/pit job/i)).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Schedule dispatch' })).not.toBeInTheDocument()
  })

  it('T2-AC10 and T2-AC11: schedules the selected valid match and displays the recorded result', async () => {
    const user = userEvent.setup()
    render(<DispatchFlow catalog={catalog} />)

    await completeRequestForm(user)
    await user.click(await screen.findByRole('radio', { name: /Tech Alpha/i }))
    fireEvent.change(screen.getByLabelText('Scheduled visit'), {
      target: { value: '2030-02-01T10:30' },
    })
    await user.click(screen.getByRole('button', { name: 'Schedule dispatch' }))

    expect(actionMocks.scheduleDispatch).toHaveBeenCalledWith({
      requestId: 'dispatch-1',
      technicianId: 'T1',
      scheduledVisit: new Date('2030-02-01T10:30').toISOString(),
    })
    expect(await screen.findByRole('heading', { name: 'Dispatch scheduled' })).toBeInTheDocument()
    expect(screen.getByText(createdRequest.premises)).toBeInTheDocument()
    expect(screen.getByText('No connection at the premises')).toBeInTheDocument()
    expect(screen.getByText('Second storey')).toBeInTheDocument()
    expect(screen.getByText('Tech Alpha')).toBeInTheDocument()
    expect(screen.getByText('Ladder')).toBeInTheDocument()
    expect(screen.getByText(/1 February 2030/i)).toBeInTheDocument()
  })

  it('T2-AC12 and T2-AC14: exposes required meaning through text and semantics rather than colour alone', async () => {
    const user = userEvent.setup()
    render(<DispatchFlow catalog={catalog} />)

    await completeRequestForm(user)

    expect(await screen.findByText('Compatible match')).toBeInTheDocument()
    expect(screen.getByText('Equipment required')).toBeInTheDocument()
    expect(screen.getByText('Ladder')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tech Alpha/i })).toHaveAccessibleDescription(
      /compatible match.*ladder/i
    )
  })

  it('T2-AC13: uses native keyboard controls for the complete dispatch flow', async () => {
    const user = userEvent.setup()
    render(<DispatchFlow catalog={catalog} />)

    await user.tab()
    expect(screen.getByLabelText('Customer premises')).toHaveFocus()
    await user.keyboard(createdRequest.premises)
    await user.tab()
    expect(screen.getByLabelText('Fault or problem')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    await user.tab()
    expect(screen.getByLabelText('Access or equipment requirement')).toHaveFocus()
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.tab()
    expect(screen.getByRole('button', { name: 'Find compatible technicians' })).toHaveFocus()
    await user.keyboard('{Enter}')

    const technician = await screen.findByRole('radio', { name: /Tech Alpha/i })
    await user.tab()
    expect(technician).toHaveFocus()
    await user.keyboard(' ')
    expect(technician).toBeChecked()
    await user.tab()
    const scheduledVisit = screen.getByLabelText('Scheduled visit')
    expect(scheduledVisit).toHaveFocus()
    fireEvent.change(scheduledVisit, { target: { value: '2030-02-01T10:30' } })
    await user.tab()
    expect(screen.getByRole('button', { name: 'Schedule dispatch' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: 'Dispatch scheduled' })).toBeInTheDocument()
  })
})
