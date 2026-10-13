import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiAssistantDrawer } from './AiAssistantDrawer'
import * as aiService from '../services/aiService'
import type { AiRecommendationResponse, ResourceRecommendation } from '../services/aiService'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const mockTopRecommendation: ResourceRecommendation = {
  resourceId: 'res-101',
  name: 'L2',
  type: 'Lecture Hall',
  location: 'LHC Complex',
  capacity: 100,
  baseRate: 0,
  bookingPolicy: 'OPEN',
  matchType: 'EXACT',
  available: true,
  date: '2026-10-14',
  requestedStartTime: '10:00',
  requestedEndTime: '12:00',
  suggestedStartTime: '10:00',
  suggestedEndTime: '12:00',
  explanation: 'Exact match: L2 has capacity for 100 people and is fully available.',
}

const mockAlternative: ResourceRecommendation = {
  resourceId: 'res-102',
  name: 'L6',
  type: 'Lecture Hall',
  location: 'LHC Complex',
  capacity: 120,
  baseRate: 0,
  bookingPolicy: 'OPEN',
  matchType: 'EXACT',
  available: true,
  date: '2026-10-14',
  requestedStartTime: '10:00',
  requestedEndTime: '12:00',
  explanation: 'Alternative: L6 is also available.',
}

describe('AiAssistantDrawer', () => {
  it('does not render when isOpen is false', () => {
    render(
      <AiAssistantDrawer
        isOpen={false}
        onClose={vi.fn()}
        onSelectRecommendation={vi.fn()}
      />
    )

    expect(screen.queryByRole('dialog', { name: /ai lab assistant/i })).not.toBeInTheDocument()
  })

  it('submits a user prompt and renders the recommendation results', async () => {
    const user = userEvent.setup()
    const mockResponse: AiRecommendationResponse = {
      success: true,
      message: 'Found matching lecture halls.',
      extractedIntent: {
        resourceType: 'Lecture Hall',
        date: '2026-10-14',
        minCapacity: 100,
        startTime: '10:00',
        endTime: '12:00',
      },
      topRecommendation: mockTopRecommendation,
      alternatives: [mockAlternative],
    }

    const askSpy = vi.spyOn(aiService, 'askAiAssistant').mockResolvedValue(mockResponse)

    render(
      <AiAssistantDrawer
        isOpen={true}
        onClose={vi.fn()}
        currentDate="2026-10-14"
        onSelectRecommendation={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/e\.g\. Lecture hall for 80 people/i)
    const sendButton = screen.getByRole('button', { name: /^send$/i })

    await user.type(input, 'I need lecture hall for 100 on 14th oct')
    await user.click(sendButton)

    expect(askSpy).toHaveBeenCalledWith('I need lecture hall for 100 on 14th oct', '2026-10-14', undefined)

    // Top recommended match verification
    expect(await screen.findByText('Top Recommended Match')).toBeInTheDocument()
    expect(screen.getByText('L2')).toBeInTheDocument()
    expect(screen.getByText('100 seats')).toBeInTheDocument()
    expect(screen.getByText('Free (0 cr)')).toBeInTheDocument()
    expect(screen.getByText(/Exact match: L2 has capacity for 100 people/i)).toBeInTheDocument()

    // Alternative resource verification
    expect(screen.getByText('Other Alternative Resources (1)')).toBeInTheDocument()
    expect(screen.getByText('L6')).toBeInTheDocument()

    // Intent criteria tags
    expect(screen.getByText(/Date: 2026-10-14/i)).toBeInTheDocument()
    expect(screen.getByText(/Capacity: 100\+/i)).toBeInTheDocument()
  })

  it('handles loading state and displays API errors properly', async () => {
    const user = userEvent.setup()
    vi.spyOn(aiService, 'askAiAssistant').mockRejectedValue(new Error('Network timeout contacting Gemini service'))

    render(
      <AiAssistantDrawer
        isOpen={true}
        onClose={vi.fn()}
        onSelectRecommendation={vi.fn()}
      />
    )

    const input = screen.getByPlaceholderText(/e\.g\. Lecture hall for 80 people/i)
    await user.type(input, 'GPU cluster for tomorrow')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(await screen.findByText('Unable to fetch AI recommendations')).toBeInTheDocument()
    expect(screen.getByText('Network timeout contacting Gemini service')).toBeInTheDocument()
  })

  it('renders follow-up clarification chips and triggers a query when clicked', async () => {
    const user = userEvent.setup()
    const mockFollowUp: AiRecommendationResponse = {
      success: true,
      followUpQuestion: 'Could you please specify which date you need this resource for?',
      suggestedRefinements: ['Tomorrow', 'Next Monday'],
      extractedIntent: {
        resourceType: 'Lecture Hall',
      },
    }

    const mockRefined: AiRecommendationResponse = {
      success: true,
      topRecommendation: mockTopRecommendation,
      alternatives: [],
    }

    const askSpy = vi
      .spyOn(aiService, 'askAiAssistant')
      .mockResolvedValueOnce(mockFollowUp)
      .mockResolvedValueOnce(mockRefined)

    render(
      <AiAssistantDrawer
        isOpen={true}
        onClose={vi.fn()}
        onSelectRecommendation={vi.fn()}
      />
    )

    // Initial prompt without date
    const input = screen.getByPlaceholderText(/e\.g\. Lecture hall for 80 people/i)
    await user.type(input, 'Lecture hall for 80 people')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    // Clarification card appears
    expect(await screen.findByText('Could you please specify which date you need this resource for?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /📅 Tomorrow/i })).toBeInTheDocument()

    // Click the refinement chip
    await user.click(screen.getByRole('button', { name: /📅 Tomorrow/i }))

    expect(askSpy).toHaveBeenCalledTimes(2)
    expect(askSpy).toHaveBeenLastCalledWith('Tomorrow', undefined, { resourceType: 'Lecture Hall' })
  })

  it('invokes onSelectRecommendation and closes drawer when Select & Book is clicked', async () => {
    const user = userEvent.setup()
    const onSelectSpy = vi.fn()
    const onCloseSpy = vi.fn()

    const mockResponse: AiRecommendationResponse = {
      success: true,
      topRecommendation: mockTopRecommendation,
      alternatives: [],
    }

    vi.spyOn(aiService, 'askAiAssistant').mockResolvedValue(mockResponse)

    render(
      <AiAssistantDrawer
        isOpen={true}
        onClose={onCloseSpy}
        onSelectRecommendation={onSelectSpy}
      />
    )

    // Type and search
    await user.type(screen.getByPlaceholderText(/e\.g\. Lecture hall for 80 people/i), 'lecture hall')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    // Find and click Select & Book button
    const selectButton = await screen.findByRole('button', { name: /select & book/i })
    await user.click(selectButton)

    expect(onSelectSpy).toHaveBeenCalledTimes(1)
    expect(onSelectSpy).toHaveBeenCalledWith(mockTopRecommendation)
    expect(onCloseSpy).toHaveBeenCalledTimes(1)
  })
})
