/**
 * Unit tests for the Analytics_Dashboard (Next.js page).
 *
 * Run with: npx vitest run src/app/analytics/__tests__/analytics.test.tsx
 * (from commerce-os/)
 *
 * Uses Vitest + React Testing Library.
 * Mocks @/lib/auth, @/lib/api, and next/navigation.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockReplace = vi.fn()
const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    pathname: '/analytics',
  }),
}))

// Mock @/lib/auth — controls user state
const mockGetUser = vi.fn()
vi.mock('@/lib/auth', () => ({
  getUser: () => mockGetUser(),
}))

// Mock @/lib/api — controls API responses
const mockApiGet = vi.fn()
const mockApiPost = vi.fn()
vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: (...args: unknown[]) => mockApiPost(...args),
  },
}))

// Mock Sidebar to avoid layout dependencies
vi.mock('@/components/Sidebar', () => ({
  default: () => <nav data-testid="sidebar">Sidebar</nav>,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOwnerUser() {
  return { id: 'user-1', role: 'owner', businessId: 'biz-1', name: 'Alice' }
}

function makeStaffUser() {
  return { id: 'user-2', role: 'staff', businessId: 'biz-1', name: 'Bob' }
}

function makeForecastResponse() {
  return {
    data: {
      data: {
        forecast: [
          { date: '2024-01-01', predicted_revenue: 1000, confidence_interval: { lower: 900, upper: 1100 } },
        ],
        insight: 'Sales are trending upward.',
        data_quality_warning: null,
        generated_at: new Date().toISOString(),
      },
    },
  }
}

function makeLoadingApiGet() {
  // Returns a promise that never resolves — simulates loading state
  return new Promise(() => {})
}

// ── Import the component under test ──────────────────────────────────────────
// Imported after mocks are set up
import AnalyticsPage from '../page'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: API calls never resolve (keeps sections in loading state)
    mockApiGet.mockReturnValue(makeLoadingApiGet())
    mockApiPost.mockReturnValue(makeLoadingApiGet())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Test 1: Unauthenticated user is redirected from /analytics ──────────────

  describe('Test 1 — Unauthenticated user is redirected', () => {
    it('redirects to /dashboard when no user in localStorage', async () => {
      mockGetUser.mockReturnValue(null)

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('renders nothing (null) when user is not authenticated', () => {
      mockGetUser.mockReturnValue(null)

      const { container } = render(<AnalyticsPage />)

      // The page returns null when !isOwner, so the main content should not render
      expect(container.querySelector('main')).toBeNull()
    })
  })

  // ── Test 2: User without reports:read is redirected to /dashboard ───────────

  describe('Test 2 — User without reports:read is redirected', () => {
    it('redirects staff user to /dashboard', async () => {
      mockGetUser.mockReturnValue(makeStaffUser())

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('redirects manager user to /dashboard', async () => {
      mockGetUser.mockReturnValue({ id: 'u3', role: 'manager', businessId: 'biz-1' })

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('does NOT redirect owner user', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      render(<AnalyticsPage />)

      // Give time for any redirect to fire
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(mockReplace).not.toHaveBeenCalledWith('/dashboard')
    })
  })

  // ── Test 3: All 6 sections render with loading skeletons initially ───────────

  describe('Test 3 — All 6 sections render with loading skeletons', () => {
    it('renders all 6 analytics section headings', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      render(<AnalyticsPage />)

      // All 6 sections should be present in the DOM
      await waitFor(() => {
        // Sales Forecast
        expect(screen.getByText(/sales forecast/i)).toBeInTheDocument()
        // Demand
        expect(screen.getByText(/demand/i)).toBeInTheDocument()
        // Segmentation
        expect(screen.getByText(/segmentation/i)).toBeInTheDocument()
        // Best Sellers
        expect(screen.getByText(/best seller/i)).toBeInTheDocument()
        // Restock
        expect(screen.getByText(/restock/i)).toBeInTheDocument()
        // NL Query
        expect(screen.getAllByText(/query|ask|question/i).length).toBeGreaterThan(0)
      })
    })

    it('shows loading skeletons while data is being fetched', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())
      // API never resolves — keeps loading state
      mockApiGet.mockReturnValue(new Promise(() => {}))

      render(<AnalyticsPage />)

      await waitFor(() => {
        // LoadingSkeleton renders divs with skeleton animation
        // Each section renders a LoadingSkeleton while loading
        const skeletons = document.querySelectorAll('[style*="skeleton-pulse"], [style*="gradient"]')
        // At least some skeleton elements should be present
        expect(skeletons.length).toBeGreaterThan(0)
      })
    })
  })

  // ── Test 4: data_quality_warning renders as inline notice ───────────────────

  describe('Test 4 — data_quality_warning renders as DataQualityNotice', () => {
    it('renders DataQualityNotice when data_quality_warning is present', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      const warningMessage = 'Insufficient historical data (< 30 days)'
      mockApiGet.mockResolvedValue({
        data: {
          data: {
            forecast: [],
            insight: 'Test insight',
            data_quality_warning: warningMessage,
            generated_at: new Date().toISOString(),
          },
        },
      })

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(screen.getByText(warningMessage)).toBeInTheDocument()
      })
    })

    it('does not render DataQualityNotice when warning is null', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      mockApiGet.mockResolvedValue({
        data: {
          data: {
            forecast: [],
            insight: 'Test insight',
            data_quality_warning: null,
            generated_at: new Date().toISOString(),
          },
        },
      })

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(screen.queryByText(/insufficient historical/i)).not.toBeInTheDocument()
      })
    })
  })

  // ── Test 5: Branch context change triggers re-fetch ─────────────────────────

  describe('Test 5 — Branch context change triggers re-fetch', () => {
    it('calls API with initial branchId on mount', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())
      mockApiGet.mockResolvedValue(makeForecastResponse())

      render(<AnalyticsPage />)

      await waitFor(() => {
        // The page starts with branchId='default'
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.stringContaining('branch_id=default')
        )
      })
    })

    it('re-fetches when cross-branch toggle changes branchId to all', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())
      mockApiGet.mockResolvedValue(makeForecastResponse())

      render(<AnalyticsPage />)

      // Wait for initial render
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalled()
      })

      const initialCallCount = mockApiGet.mock.calls.length

      // Click the cross-branch toggle
      const toggle = screen.getByRole('button', { name: /cross-branch/i })
      await act(async () => {
        toggle.click()
      })

      // After toggle, new API calls should be made with branch_id=all
      await waitFor(() => {
        expect(mockApiGet.mock.calls.length).toBeGreaterThan(initialCallCount)
        const newCalls = mockApiGet.mock.calls.slice(initialCallCount)
        const hasAllBranchCall = newCalls.some(([url]: [string]) =>
          url.includes('branch_id=all')
        )
        expect(hasAllBranchCall).toBe(true)
      })
    })
  })

  // ── Test 6: Owner role shows cross-branch toggle ─────────────────────────────

  describe('Test 6 — Owner role shows cross-branch toggle', () => {
    it('renders cross-branch toggle for owner', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      render(<AnalyticsPage />)

      await waitFor(() => {
        const toggle = screen.getByRole('button', { name: /cross-branch/i })
        expect(toggle).toBeInTheDocument()
      })
    })

    it('renders cross-branch label text for owner', async () => {
      mockGetUser.mockReturnValue(makeOwnerUser())

      render(<AnalyticsPage />)

      await waitFor(() => {
        expect(screen.getByText(/cross-branch view/i)).toBeInTheDocument()
      })
    })

    it('does not render cross-branch toggle for non-owner (page redirects)', async () => {
      mockGetUser.mockReturnValue(makeStaffUser())

      const { container } = render(<AnalyticsPage />)

      // Staff user gets redirected and page returns null
      expect(container.querySelector('[aria-label*="cross-branch"]')).toBeNull()
    })
  })
})
