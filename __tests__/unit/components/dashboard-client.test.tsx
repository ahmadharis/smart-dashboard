/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { DashboardClient } from '@/components/dashboard-client';
import { ApiClient } from '@/lib/api-client';
import { useAuth } from '@/components/auth-provider';
import { formatRelativeTime } from '@/lib/time-utils';

// Mock dependencies
jest.mock('@/components/auth-provider');
jest.mock('@/lib/api-client');
jest.mock('@/lib/time-utils');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock child components
jest.mock('@/components/data-chart', () => ({
  DataChart: ({ data, title, chartType }: any) => (
    <div data-testid="data-chart">
      <span data-testid="chart-title">{title}</span>
      <span data-testid="chart-type">{chartType}</span>
      <span data-testid="chart-data-length">{data.length}</span>
    </div>
  ),
}));

jest.mock('@/components/chart-type-selector', () => ({
  ChartTypeSelector: ({ currentType, onTypeChange, disabled, isAuthenticated }: any) => (
    <select
      data-testid="chart-type-selector"
      value={currentType}
      onChange={(e) => onTypeChange(e.target.value)}
      disabled={disabled}
      aria-label={`Chart type selector, currently ${currentType}, authenticated: ${isAuthenticated}`}
    >
      <option value="line">Line</option>
      <option value="bar">Bar</option>
      <option value="area">Area</option>
      <option value="pie">Pie</option>
    </select>
  ),
}));

jest.mock('@/components/dashboard-switcher', () => ({
  DashboardSwitcher: ({ onDashboardChange, currentDashboard }: any) => (
    <div data-testid="dashboard-switcher">
      <button
        data-testid="select-dashboard-btn"
        onClick={() =>
          onDashboardChange({
            id: 'test-dashboard-1',
            title: 'Test Dashboard',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
          })
        }
      >
        Select Dashboard
      </button>
      {currentDashboard && (
        <span data-testid="current-dashboard">{currentDashboard.title}</span>
      )}
    </div>
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;
const mockFormatRelativeTime = formatRelativeTime as jest.MockedFunction<typeof formatRelativeTime>;

describe('DashboardClient', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockDataFiles = [
    {
      id: 'file-1',
      name: 'test-file-1',
      type: 'Cases',
      data: [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
      ],
      updated_at: '2024-01-01T12:00:00Z',
      chart_type: 'line',
      sort_order: 0,
      field_order: ['date', 'value'],
    },
    {
      id: 'file-2',
      name: 'test-file-2',
      type: 'Pallets',
      data: [
        { month: 'Jan', count: 50 },
        { month: 'Feb', count: 75 },
      ],
      updated_at: '2024-01-02T12:00:00Z',
      chart_type: 'bar',
      sort_order: 1,
      field_order: ['month', 'count'],
    },
  ];

  const mockDashboard = {
    id: 'dashboard-1',
    title: 'Test Dashboard',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      tenantAccess: {},
      checkTenantAccess: jest.fn(),
      refreshPermissions: jest.fn(),
    });

    mockFormatRelativeTime.mockImplementation((date) => {
      if (typeof date === 'string') return '2 hours ago';
      return 'just now';
    });

    // Mock successful API response by default
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockDataFiles),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response;
    
    mockApiClient.get.mockResolvedValue(mockResponse);
    mockApiClient.patch.mockResolvedValue(mockResponse);
  });

  describe('Initial Loading State', () => {
    it('renders loading skeleton when no dashboard is selected', () => {
      render(<DashboardClient tenantId="test-tenant" />);
      
      expect(screen.getByTestId('dashboard-switcher')).toBeInTheDocument();
      expect(screen.getByText('Select a Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Choose a dashboard from the dropdown above or create a new one to get started.')).toBeInTheDocument();
    });

    it('shows loading state with spinner when dashboard is selected', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      
      // Select a dashboard
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
        expect(screen.getByRole('progressbar', { name: /loading/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading and Display', () => {
    it('loads and displays data files when dashboard is selected', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      
      // Select a dashboard
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/internal/data-files?dashboardId=test-dashboard-1',
          { signal: expect.any(AbortSignal), tenantId: 'test-tenant' }
        );
      });

      await waitFor(() => {
        expect(screen.getByText('2 Datasets')).toBeInTheDocument();
        expect(screen.getAllByTestId('data-chart')).toHaveLength(2);
      });

      // Verify chart data is displayed correctly
      const charts = screen.getAllByTestId('data-chart');
      expect(within(charts[0]).getByTestId('chart-title')).toHaveTextContent('Cases');
      expect(within(charts[0]).getByTestId('chart-type')).toHaveTextContent('line');
      expect(within(charts[0]).getByTestId('chart-data-length')).toHaveTextContent('2');
      
      expect(within(charts[1]).getByTestId('chart-title')).toHaveTextContent('Pallets');
      expect(within(charts[1]).getByTestId('chart-type')).toHaveTextContent('bar');
      expect(within(charts[1]).getByTestId('chart-data-length')).toHaveTextContent('2');
    });

    it('displays no data message when no files are available', async () => {
      const emptyResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([]),
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response;
      
      mockApiClient.get.mockResolvedValue(emptyResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByText('No Data Available')).toBeInTheDocument();
        expect(screen.getByText('Upload XML data through the API to see charts appear here automatically.')).toBeInTheDocument();
      });
    });

    it('sorts data files by sort_order', async () => {
      const unsortedData = [
        { ...mockDataFiles[1], sort_order: 0 }, // Pallets first
        { ...mockDataFiles[0], sort_order: 1 }, // Cases second
      ];
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(unsortedData),
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response;
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        const charts = screen.getAllByTestId('data-chart');
        expect(within(charts[0]).getByTestId('chart-title')).toHaveTextContent('Pallets');
        expect(within(charts[1]).getByTestId('chart-title')).toHaveTextContent('Cases');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server Error'),
      } as unknown as Response;
      
      mockApiClient.get.mockResolvedValue(errorResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('HTTP 500: Server Error')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('retries failed requests with exponential backoff', async () => {
      jest.useFakeTimers();
      
      const errorResponse = {
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server Error'),
      } as unknown as Response;
      
      mockApiClient.get.mockResolvedValueOnce(errorResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      });

      // Wait for first retry (1 second delay)
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('handles network errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByText('Connection Error')).toBeInTheDocument();
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });
  });

  describe('Chart Type Updates', () => {
    it('updates chart type when user changes selection', async () => {
      const updateResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      } as unknown as Response;
      
      mockApiClient.patch.mockResolvedValue(updateResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getAllByTestId('chart-type-selector')).toHaveLength(2);
      });

      const chartTypeSelectors = screen.getAllByTestId('chart-type-selector');
      await userEvent.selectOptions(chartTypeSelectors[0], 'bar');
      
      await waitFor(() => {
        expect(mockApiClient.patch).toHaveBeenCalledWith(
          '/api/internal/data-files/file-1',
          { chart_type: 'bar' },
          { tenantId: 'test-tenant' }
        );
      });
    });

    it('reverts chart type on update failure', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad Request'),
      } as unknown as Response;
      
      mockApiClient.patch.mockResolvedValue(errorResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getAllByTestId('chart-type-selector')).toHaveLength(2);
      });

      const chartTypeSelectors = screen.getAllByTestId('chart-type-selector');
      const originalValue = chartTypeSelectors[0].getAttribute('value');
      
      await userEvent.selectOptions(chartTypeSelectors[0], 'bar');
      
      await waitFor(() => {
        expect(chartTypeSelectors[0]).toHaveValue(originalValue);
      });
    });
  });

  describe('Data Refresh', () => {
    it('refreshes data when refresh button is clicked', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      jest.clearAllMocks();
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/internal/data-files?dashboardId=test-dashboard-1',
          { signal: expect.any(AbortSignal), tenantId: 'test-tenant' }
        );
      });
    });

    it('shows loading state during refresh', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      // Mock a slow response
      let resolveRequest: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      
      mockApiClient.get.mockReturnValue(slowPromise as any);
      
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      
      // Should show loading state
      expect(screen.getByRole('button', { name: /refresh/i })).toBeDisabled();
      
      // Resolve the request
      resolveRequest!({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDataFiles),
      });
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).not.toBeDisabled();
      });
    });
  });

  describe('Edit Mode and Drag & Drop', () => {
    it('toggles edit mode when edit button is clicked', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      
      expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
    });

    it('enables draggable functionality in edit mode', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getAllByTestId('data-chart')).toHaveLength(2);
      });

      // Enter edit mode
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      
      // Charts should have drag handles visible
      const chartCards = screen.getAllByTestId('data-chart').map(chart => chart.closest('[draggable]'));
      expect(chartCards[0]).toHaveAttribute('draggable', 'true');
      expect(chartCards[1]).toHaveAttribute('draggable', 'true');
    });
  });

  describe('Authentication States', () => {
    it('handles unauthenticated user correctly', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: jest.fn(),
        refreshPermissions: jest.fn(),
      });

      render(<DashboardClient tenantId="test-tenant" />);
      
      // Should still render the component but with limited functionality
      expect(screen.getByTestId('dashboard-switcher')).toBeInTheDocument();
    });

    it('passes authentication state to child components', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        const selectors = screen.getAllByTestId('chart-type-selector');
        expect(selectors[0]).toHaveAttribute('aria-label', expect.stringContaining('authenticated: true'));
      });
    });
  });

  describe('Data Processing', () => {
    it('processes chart data with field order', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        const charts = screen.getAllByTestId('data-chart');
        // Verify that the chart receives processed data
        expect(within(charts[0]).getByTestId('chart-data-length')).toHaveTextContent('2');
      });
    });

    it('handles invalid JSON data gracefully', async () => {
      const invalidDataFiles = [
        {
          ...mockDataFiles[0],
          data: 'invalid json string',
        },
      ];
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(invalidDataFiles),
      } as unknown as Response;
      
      mockApiClient.get.mockResolvedValue(mockResponse);

      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        // Should not crash and show empty state
        const charts = screen.getAllByTestId('data-chart');
        expect(within(charts[0]).getByTestId('chart-data-length')).toHaveTextContent('0');
      });
    });
  });

  describe('Memory Management', () => {
    it('cancels in-flight requests when component unmounts', async () => {
      const abortSpy = jest.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: { aborted: false } as AbortSignal,
      };
      
      jest.spyOn(globalThis, 'AbortController').mockImplementation(() => mockAbortController);

      const { unmount } = render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      // Unmount before request completes
      unmount();
      
      expect(abortSpy).toHaveBeenCalled();
    });

    it('uses cache for recent data requests', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      
      // First request
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      });
      
      // Trigger refresh within cache duration
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
      
      // Should use cache, not make new request
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });

      // Tab to refresh button and activate with Enter
      await user.tab();
      await user.keyboard('{Enter}');
      
      expect(mockApiClient.get).toHaveBeenCalled();
    });

    it('announces loading states to screen readers', async () => {
      render(<DashboardClient tenantId="test-tenant" />);
      fireEvent.click(screen.getByTestId('select-dashboard-btn'));
      
      await waitFor(() => {
        expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();
      });
    });
  });
});