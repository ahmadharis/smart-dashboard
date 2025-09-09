/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { FileManagementClient } from '@/components/file-management-client';
import { ApiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/time-utils';

// Mock dependencies
jest.mock('@/lib/api-client');
jest.mock('@/lib/time-utils');
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;
const mockFormatRelativeTime = formatRelativeTime as jest.MockedFunction<typeof formatRelativeTime>;

describe('FileManagementClient', () => {
  const mockDataFiles = [
    {
      id: 'file-1',
      name: 'test-file-1.xml',
      type: 'Cases',
      data: [{ date: '2024-01-01', value: 100 }],
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
      dashboard_id: 'dashboard-1',
    },
    {
      id: 'file-2',
      name: 'test-file-2.xml',
      type: 'Pallets',
      data: [{ month: 'Jan', count: 50 }],
      created_at: '2024-01-02T12:00:00Z',
      updated_at: '2024-01-02T12:00:00Z',
      dashboard_id: 'dashboard-2',
    },
  ];

  const mockDashboards = [
    {
      id: 'dashboard-1',
      title: 'Dashboard 1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      sort_order: 0,
    },
    {
      id: 'dashboard-2',
      title: 'Dashboard 2',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      sort_order: 1,
    },
  ];

  const mockSettings = [
    {
      tenant_id: 'test-tenant',
      key: 'dashboard-title',
      value: 'My Dashboard',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFormatRelativeTime.mockReturnValue('2 hours ago');
    
    // Setup default successful API responses
    const createMockResponse = (data: any) => ({
      ok: true,
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(''),
    } as unknown as Response);
    
    mockApiClient.get.mockImplementation((url) => {
      if (url.includes('/api/internal/dashboards')) {
        return Promise.resolve(createMockResponse(mockDashboards));
      }
      if (url.includes('/api/internal/data-files')) {
        return Promise.resolve(createMockResponse(mockDataFiles));
      }
      if (url.includes('/api/internal/settings')) {
        return Promise.resolve(createMockResponse(mockSettings));
      }
      return Promise.resolve(createMockResponse([]));
    });
    
    mockApiClient.post.mockResolvedValue(createMockResponse({ success: true }));
    mockApiClient.put.mockResolvedValue(createMockResponse({ success: true }));
    mockApiClient.patch.mockResolvedValue(createMockResponse({ success: true }));
    mockApiClient.delete.mockResolvedValue(createMockResponse({ success: true }));
  });

  describe('Initial Loading and Tab Navigation', () => {
    it('renders all tabs correctly', async () => {
      render(<FileManagementClient tenantId="test-tenant" />);
      
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /dashboard/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /data files/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument();
      });
    });

    it('loads data on component mount', async () => {
      render(<FileManagementClient tenantId="test-tenant" />);
      
      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/internal/dashboards', { tenantId: 'test-tenant' });
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/internal/data-files', { tenantId: 'test-tenant' });
        expect(mockApiClient.get).toHaveBeenCalledWith('/api/internal/settings', { tenantId: 'test-tenant' });
      });
    });

    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<FileManagementClient tenantId="test-tenant" />);
      
      // Should start with dashboard tab active
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /dashboard/i })).toHaveAttribute('aria-selected', 'true');
      });
      
      // Switch to data files tab
      await user.click(screen.getByRole('tab', { name: /data files/i }));
      expect(screen.getByText('Data Files')).toBeInTheDocument();
      
      // Switch to settings tab
      await user.click(screen.getByRole('tab', { name: /settings/i }));
      expect(screen.getByText('Settings Management')).toBeInTheDocument();
    });
  });

  describe('Dashboard Management Tab', () => {
    beforeEach(async () => {
      render(<FileManagementClient tenantId="test-tenant" />);
      await waitFor(() => {
        expect(screen.getByText('Dashboard Management')).toBeInTheDocument();
      });
    });

    it('displays existing dashboards', async () => {
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
        expect(screen.getByText('Dashboard 2')).toBeInTheDocument();
      });
    });

    it('shows file counts for each dashboard', async () => {
      await waitFor(() => {
        // Dashboard 1 should have 1 file, Dashboard 2 should have 1 file
        const badges = screen.getAllByText(/\d+ files?/);
        expect(badges).toHaveLength(2);
      });
    });

    it('creates new dashboard', async () => {
      const user = userEvent.setup();
      
      const titleInput = screen.getByPlaceholderText('Dashboard title');
      const createButton = screen.getByRole('button', { name: /create/i });
      
      await user.type(titleInput, 'New Dashboard');
      await user.click(createButton);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/internal/dashboards',
        {
          title: 'New Dashboard',
          tenant_id: 'test-tenant',
        },
        { tenantId: 'test-tenant' }
      );
    });

    it('validates dashboard name input', async () => {
      const user = userEvent.setup();
      
      const createButton = screen.getByRole('button', { name: /create/i });
      
      // Try to create without entering a name
      await user.click(createButton);
      
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('enables edit mode for dashboard names', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByLabelText(/edit/i);
      await user.click(editButtons[0]);
      
      expect(screen.getByDisplayValue('Dashboard 1')).toBeInTheDocument();
    });

    it('saves dashboard name changes', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const editButtons = screen.getAllByLabelText(/edit/i);
      await user.click(editButtons[0]);
      
      const input = screen.getByDisplayValue('Dashboard 1');
      await user.clear(input);
      await user.type(input, 'Updated Dashboard');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/internal/dashboards/dashboard-1',
        { title: 'Updated Dashboard' },
        { tenantId: 'test-tenant' }
      );
    });

    it('deletes dashboard with confirmation', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);
      
      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: /delete dashboard/i });
      await user.click(confirmButton);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/internal/dashboards/dashboard-1',
        { tenantId: 'test-tenant' }
      );
    });

    it('supports drag and drop reordering', async () => {
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const dashboards = screen.getAllByText(/Dashboard \d/);
      const firstDashboard = dashboards[0].closest('[draggable]');
      
      expect(firstDashboard).toHaveAttribute('draggable', 'true');
    });

    it('handles drag and drop events', async () => {
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const dashboards = screen.getAllByText(/Dashboard \d/);
      const firstDashboard = dashboards[0].closest('[draggable]') as HTMLElement;
      const secondDashboard = dashboards[1].closest('[draggable]') as HTMLElement;
      
      // Simulate drag and drop
      fireEvent.dragStart(firstDashboard, { dataTransfer: { setData: jest.fn(), effectAllowed: 'move' } });
      fireEvent.dragOver(secondDashboard, { preventDefault: jest.fn(), dataTransfer: { dropEffect: 'move' } });
      fireEvent.drop(secondDashboard, { preventDefault: jest.fn() });
      
      await waitFor(() => {
        expect(mockApiClient.patch).toHaveBeenCalledWith(
          '/api/internal/dashboards/reorder',
          expect.objectContaining({
            updates: expect.any(Array),
          }),
          { tenantId: 'test-tenant' }
        );
      });
    });
  });

  describe('Data Files Management Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<FileManagementClient tenantId="test-tenant" />);
      await user.click(screen.getByRole('tab', { name: /data files/i }));
    });

    it('displays existing data files', async () => {
      await waitFor(() => {
        expect(screen.getByText('Cases')).toBeInTheDocument();
        expect(screen.getByText('Pallets')).toBeInTheDocument();
      });
    });

    it('shows file metadata correctly', async () => {
      await waitFor(() => {
        expect(screen.getAllByText('1 records')).toHaveLength(2);
        expect(screen.getAllByText('Dashboard 1')).toHaveLength(1);
        expect(screen.getAllByText('Dashboard 2')).toHaveLength(1);
      });
    });

    it('filters files by dashboard', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Cases')).toBeInTheDocument();
        expect(screen.getByText('Pallets')).toBeInTheDocument();
      });
      
      const filterSelect = screen.getByLabelText(/filter by dashboard/i);
      await user.click(filterSelect);
      
      const dashboard1Option = screen.getByText('Dashboard 1');
      await user.click(dashboard1Option);
      
      await waitFor(() => {
        expect(screen.getByText('Cases')).toBeInTheDocument();
        expect(screen.queryByText('Pallets')).not.toBeInTheDocument();
      });
    });

    it('deletes data file with confirmation', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('Cases')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);
      
      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: /delete file/i });
      await user.click(confirmButton);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/internal/data-files/file-1',
        { tenantId: 'test-tenant' }
      );
    });

    describe('File Upload Form', () => {
      it('submits new data file successfully', async () => {
        const user = userEvent.setup();
        
        // Fill out the form
        const dashboardSelect = screen.getByLabelText(/dashboard/i);
        await user.click(dashboardSelect);
        await user.click(screen.getByText('Dashboard 1'));
        
        const typeSelect = screen.getByLabelText(/data type/i);
        await user.click(typeSelect);
        await user.click(screen.getByText('Cases'));
        
        const xmlTextarea = screen.getByLabelText(/xml data/i);
        await user.type(xmlTextarea, '<resultset><row><date>2024-01-01</date><value>100</value></row></resultset>');
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/internal/data-files',
          expect.any(FormData),
          { tenantId: 'test-tenant' }
        );
      });

      it('validates required fields', async () => {
        const user = userEvent.setup();
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        expect(screen.getByText(/please provide xml input/i)).toBeInTheDocument();
        expect(mockApiClient.post).not.toHaveBeenCalled();
      });

      it('creates new dashboard when selected', async () => {
        const user = userEvent.setup();
        
        const dashboardSelect = screen.getByLabelText(/dashboard/i);
        await user.click(dashboardSelect);
        await user.click(screen.getByText('Create New Dashboard...'));
        
        expect(screen.getByLabelText(/new dashboard title/i)).toBeInTheDocument();
        
        await user.type(screen.getByLabelText(/new dashboard title/i), 'Brand New Dashboard');
        
        const typeSelect = screen.getByLabelText(/data type/i);
        await user.click(typeSelect);
        await user.click(screen.getByText('Cases'));
        
        const xmlTextarea = screen.getByLabelText(/xml data/i);
        await user.type(xmlTextarea, '<resultset><row><date>2024-01-01</date><value>100</value></row></resultset>');
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        expect(mockApiClient.post).toHaveBeenCalled();
      });

      it('handles custom data type input', async () => {
        const user = userEvent.setup();
        
        const typeSelect = screen.getByLabelText(/data type/i);
        await user.click(typeSelect);
        await user.click(screen.getByText('Custom Type...'));
        
        expect(screen.getByLabelText(/custom type name/i)).toBeInTheDocument();
        
        await user.type(screen.getByLabelText(/custom type name/i), 'MyCustomType');
        
        const dashboardSelect = screen.getByLabelText(/dashboard/i);
        await user.click(dashboardSelect);
        await user.click(screen.getByText('Dashboard 1'));
        
        const xmlTextarea = screen.getByLabelText(/xml data/i);
        await user.type(xmlTextarea, '<resultset><row><date>2024-01-01</date><value>100</value></row></resultset>');
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        expect(mockApiClient.post).toHaveBeenCalled();
      });

      it('shows loading state during submission', async () => {
        const user = userEvent.setup();
        
        // Mock slow response
        let resolveRequest: (value: any) => void;
        const slowPromise = new Promise((resolve) => {
          resolveRequest = resolve;
        });
        mockApiClient.post.mockReturnValue(slowPromise as any);
        
        // Fill out form
        const dashboardSelect = screen.getByLabelText(/dashboard/i);
        await user.click(dashboardSelect);
        await user.click(screen.getByText('Dashboard 1'));
        
        const typeSelect = screen.getByLabelText(/data type/i);
        await user.click(typeSelect);
        await user.click(screen.getByText('Cases'));
        
        const xmlTextarea = screen.getByLabelText(/xml data/i);
        await user.type(xmlTextarea, '<xml>test</xml>');
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        // Should show loading state
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
        
        // Resolve request
        resolveRequest!({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        });
        
        await waitFor(() => {
          expect(screen.queryByText(/processing/i)).not.toBeInTheDocument();
        });
      });

      it('displays error messages on submission failure', async () => {
        const user = userEvent.setup();
        
        const errorResponse = {
          ok: false,
          json: jest.fn().mockResolvedValue({ error: 'Invalid XML format' }),
        };
        mockApiClient.post.mockResolvedValue(errorResponse as any);
        
        // Fill out form
        const dashboardSelect = screen.getByLabelText(/dashboard/i);
        await user.click(dashboardSelect);
        await user.click(screen.getByText('Dashboard 1'));
        
        const typeSelect = screen.getByLabelText(/data type/i);
        await user.click(typeSelect);
        await user.click(screen.getByText('Cases'));
        
        const xmlTextarea = screen.getByLabelText(/xml data/i);
        await user.type(xmlTextarea, 'invalid xml');
        
        const submitButton = screen.getByRole('button', { name: /add data file/i });
        await user.click(submitButton);
        
        await waitFor(() => {
          expect(screen.getByText('Invalid XML format')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Settings Management Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<FileManagementClient tenantId="test-tenant" />);
      await user.click(screen.getByRole('tab', { name: /settings/i }));
    });

    it('displays existing settings', async () => {
      await waitFor(() => {
        expect(screen.getByText('dashboard-title')).toBeInTheDocument();
        expect(screen.getByText('My Dashboard')).toBeInTheDocument();
      });
    });

    it('creates new setting', async () => {
      const user = userEvent.setup();
      
      const keyInput = screen.getByPlaceholderText('Setting key');
      const valueInput = screen.getByPlaceholderText('Setting value');
      const createButton = screen.getByRole('button', { name: /create setting/i });
      
      await user.type(keyInput, 'new-setting');
      await user.type(valueInput, 'new-value');
      await user.click(createButton);
      
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/internal/settings',
        {
          key: 'new-setting',
          value: 'new-value',
          tenant_id: 'test-tenant',
        },
        { tenantId: 'test-tenant' }
      );
    });

    it('edits existing setting', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('dashboard-title')).toBeInTheDocument();
      });
      
      const editButton = screen.getByLabelText(/edit/i);
      await user.click(editButton);
      
      const valueInput = screen.getByDisplayValue('My Dashboard');
      await user.clear(valueInput);
      await user.type(valueInput, 'Updated Title');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/internal/settings/dashboard-title',
        { value: 'Updated Title' },
        { tenantId: 'test-tenant' }
      );
    });

    it('deletes setting with confirmation', async () => {
      const user = userEvent.setup();
      
      await waitFor(() => {
        expect(screen.getByText('dashboard-title')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByLabelText(/delete/i);
      await user.click(deleteButton);
      
      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      const confirmButton = screen.getByRole('button', { name: /delete setting/i });
      await user.click(confirmButton);
      
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/api/internal/settings/dashboard-title',
        { tenantId: 'test-tenant' }
      );
    });

    it('validates setting creation inputs', async () => {
      const user = userEvent.setup();
      
      const createButton = screen.getByRole('button', { name: /create setting/i });
      await user.click(createButton);
      
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const errorResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Server Error' }),
      };
      mockApiClient.get.mockResolvedValue(errorResponse as any);
      
      render(<FileManagementClient tenantId="test-tenant" />);
      
      // Should not crash and continue rendering
      expect(screen.getByText('Dashboard Management')).toBeInTheDocument();
    });

    it('handles network errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network Error'));
      
      render(<FileManagementClient tenantId="test-tenant" />);
      
      // Should still render the component
      expect(screen.getByText('Dashboard Management')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state for data files', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
      let resolveRequest: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      
      mockApiClient.get.mockImplementation((url) => {
        if (url.includes('/api/internal/data-files')) {
          return slowPromise as any;
        }
        return Promise.resolve({
          ok: true,
          json: jest.fn().mockResolvedValue([]),
        } as any);
      });
      
      render(<FileManagementClient tenantId="test-tenant" />);
      await user.click(screen.getByRole('tab', { name: /data files/i }));
      
      expect(screen.getByText('Loading files...')).toBeInTheDocument();
      
      resolveRequest!({
        ok: true,
        json: jest.fn().mockResolvedValue(mockDataFiles),
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Loading files...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper tab navigation structure', async () => {
      render(<FileManagementClient tenantId="test-tenant" />);
      
      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('has proper form labels and validation', async () => {
      const user = userEvent.setup();
      render(<FileManagementClient tenantId="test-tenant" />);
      await user.click(screen.getByRole('tab', { name: /data files/i }));
      
      expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/data type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/xml data/i)).toBeInTheDocument();
    });

    it('provides meaningful button labels', () => {
      render(<FileManagementClient tenantId="test-tenant" />);
      
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    it('uses proper ARIA attributes for dialogs', async () => {
      const user = userEvent.setup();
      
      render(<FileManagementClient tenantId="test-tenant" />);
      
      await waitFor(() => {
        expect(screen.getByText('Dashboard 1')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      await user.click(deleteButtons[0]);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });
});