/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { ChartTypeSelector } from '@/components/chart-type-selector';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  LineChart: ({ className, ...props }: any) => <div data-testid="line-icon" className={className} {...props} />,
  BarChart3: ({ className, ...props }: any) => <div data-testid="bar-icon" className={className} {...props} />,
  AreaChart: ({ className, ...props }: any) => <div data-testid="area-icon" className={className} {...props} />,
  PieChart: ({ className, ...props }: any) => <div data-testid="pie-icon" className={className} {...props} />,
  ChevronDown: ({ className, ...props }: any) => <div data-testid="chevron-icon" className={className} {...props} />,
}));

describe('ChartTypeSelector', () => {
  const mockOnTypeChange = jest.fn();

  const defaultProps = {
    currentType: 'line',
    onTypeChange: mockOnTypeChange,
    disabled: false,
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication States', () => {
    it('renders dropdown when authenticated', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByTestId('line-icon')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-icon')).toBeInTheDocument();
    });

    it('renders read-only view when not authenticated', () => {
      render(<ChartTypeSelector {...defaultProps} isAuthenticated={false} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.getByTestId('line-icon')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-icon')).not.toBeInTheDocument();
    });

    it('applies correct styling for unauthenticated view', () => {
      render(<ChartTypeSelector {...defaultProps} isAuthenticated={false} />);
      
      const readOnlyContainer = screen.getByText('Line').parentElement;
      expect(readOnlyContainer).toHaveTextContent('Line');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Chart Type Display', () => {
    it('displays line chart type correctly', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="line" />);
      
      expect(screen.getByTestId('line-icon')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
    });

    it('displays bar chart type correctly', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="bar" />);
      
      expect(screen.getByTestId('bar-icon')).toBeInTheDocument();
      expect(screen.getByText('Bar')).toBeInTheDocument();
    });

    it('displays area chart type correctly', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="area" />);
      
      expect(screen.getByTestId('area-icon')).toBeInTheDocument();
      expect(screen.getByText('Area')).toBeInTheDocument();
    });

    it('displays pie chart type correctly', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="pie" />);
      
      expect(screen.getByTestId('pie-icon')).toBeInTheDocument();
      expect(screen.getByText('Pie')).toBeInTheDocument();
    });

    it('falls back to line chart for unknown type', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="unknown" />);
      
      expect(screen.getByTestId('line-icon')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown menu when clicked', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('shows all chart type options in dropdown', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      expect(screen.getByRole('menuitem', { name: /line/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /bar/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /area/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /pie/i })).toBeInTheDocument();
    });

    it('displays icons for each option in dropdown', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      // Should have icons for all 4 chart types (trigger + 3 in dropdown)
      expect(screen.getAllByTestId('line-icon')).toHaveLength(2); // One in trigger, one in menu
      expect(screen.getByTestId('bar-icon')).toBeInTheDocument();
      expect(screen.getByTestId('area-icon')).toBeInTheDocument();
      expect(screen.getByTestId('pie-icon')).toBeInTheDocument();
    });

    it('calls onTypeChange when option is selected', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      expect(mockOnTypeChange).toHaveBeenCalledWith('bar');
    });

    it('does not call onTypeChange when same option is selected', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} currentType="line" />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const lineOption = screen.getByRole('menuitem', { name: /line/i });
      await user.click(lineOption);
      
      expect(mockOnTypeChange).not.toHaveBeenCalled();
    });

    it('handles async onTypeChange function', async () => {
      const asyncOnTypeChange = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<ChartTypeSelector {...defaultProps} onTypeChange={asyncOnTypeChange} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      await waitFor(() => {
        expect(asyncOnTypeChange).toHaveBeenCalledWith('bar');
      });
    });

    it('handles onTypeChange errors gracefully', async () => {
      const errorOnTypeChange = jest.fn().mockRejectedValue(new Error('Update failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const user = userEvent.setup();
      
      render(<ChartTypeSelector {...defaultProps} onTypeChange={errorOnTypeChange} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update chart type:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Disabled States', () => {
    it('disables button when disabled prop is true', () => {
      render(<ChartTypeSelector {...defaultProps} disabled={true} />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
    });

    it('disables button when updating', async () => {
      let resolveUpdate: () => void;
      const slowUpdate = jest.fn(() => new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }));
      
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} onTypeChange={slowUpdate} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      // Button should be disabled while updating
      expect(trigger).toBeDisabled();
      
      resolveUpdate!();
      
      await waitFor(() => {
        expect(trigger).not.toBeDisabled();
      });
    });

    it('disables button when not authenticated', () => {
      render(<ChartTypeSelector {...defaultProps} isAuthenticated={false} />);
      
      // Should not render button when not authenticated
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('prevents interaction when disabled', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} disabled={true} />);
      
      const trigger = screen.getByRole('button');
      
      // Button should be disabled
      expect(trigger).toBeDisabled();
      
      // Since the button is disabled, we don't expect the menu to open
      // This test verifies the button is properly disabled
    });
  });

  describe('Loading States', () => {
    it('shows loading state during update', async () => {
      let resolveUpdate: () => void;
      const slowUpdate = jest.fn(() => new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }));
      
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} onTypeChange={slowUpdate} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      // Should be in loading state
      expect(trigger).toBeDisabled();
      
      resolveUpdate!();
      
      await waitFor(() => {
        expect(trigger).not.toBeDisabled();
      });
    });

    it('prevents multiple simultaneous updates', async () => {
      const slowUpdate = jest.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      }));
      
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} onTypeChange={slowUpdate} />);
      
      // Start first update
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      let barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      // Try second update while first is in progress
      await user.click(trigger);
      barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      // Should only be called once
      await waitFor(() => {
        expect(slowUpdate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard activation of trigger', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      trigger.focus();
      
      await user.keyboard('{Enter}');
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('supports keyboard navigation in menu', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      
      expect(mockOnTypeChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-haspopup');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates ARIA attributes when menu is open', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('provides meaningful labels for screen readers', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      // Button should have meaningful content
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveTextContent('Line');
    });

    it('has proper menu role and items', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems).toHaveLength(4);
    });
  });

  describe('Visual Styling', () => {
    it('applies correct CSS classes to trigger button', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveClass(
        'h-7',
        'px-2',
        'text-xs',
        'text-gray-500',
        'hover:text-gray-700',
        'hover:bg-gray-100'
      );
    });

    it('applies correct icon sizing', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      const icon = screen.getByTestId('line-icon');
      expect(icon).toHaveClass('h-3.5', 'w-3.5', 'mr-1');
    });

    it('applies correct chevron icon styling', () => {
      render(<ChartTypeSelector {...defaultProps} />);
      
      const chevron = screen.getByTestId('chevron-icon');
      expect(chevron).toHaveClass('h-3', 'w-3', 'ml-1');
    });

    it('styles disabled state appropriately', () => {
      render(<ChartTypeSelector {...defaultProps} disabled={true} />);
      
      const trigger = screen.getByRole('button');
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveClass('h-7', 'px-2', 'text-xs');
    });
  });

  describe('Menu Positioning', () => {
    it('positions menu correctly relative to trigger', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      const menu = screen.getByRole('menu');
      expect(menu).toHaveClass('w-28'); // Should have appropriate width
    });
  });

  describe('Props Validation', () => {
    it('handles missing currentType gracefully', () => {
      render(<ChartTypeSelector {...defaultProps} currentType="" />);
      
      // Should default to line chart
      expect(screen.getByTestId('line-icon')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
    });

    it('handles null onTypeChange gracefully', async () => {
      const user = userEvent.setup();
      render(<ChartTypeSelector {...defaultProps} onTypeChange={undefined as any} />);
      
      const trigger = screen.getByRole('button');
      await user.click(trigger);
      
      // Should not crash when clicking menu items
      const barOption = screen.getByRole('menuitem', { name: /bar/i });
      await user.click(barOption);
      
      // Should not cause errors
    });

    it('handles boolean props correctly', () => {
      render(<ChartTypeSelector {...defaultProps} disabled={undefined} isAuthenticated={undefined} />);
      
      // Should handle undefined props gracefully
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});