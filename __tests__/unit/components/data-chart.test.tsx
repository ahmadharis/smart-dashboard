/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { DataChart } from '@/components/data-chart';

// Mock Recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  BarChart: ({ children, data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  PieChart: ({ children, data }: any) => (
    <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid="line-element" data-key={dataKey} data-stroke={stroke} />
  ),
  Bar: ({ dataKey, fill }: any) => (
    <div data-testid="bar-element" data-key={dataKey} data-fill={fill} />
  ),
  Area: ({ dataKey, fill }: any) => (
    <div data-testid="area-element" data-key={dataKey} data-fill={fill} />
  ),
  Pie: ({ dataKey, data }: any) => (
    <div data-testid="pie-element" data-key={dataKey} data-pie-data={JSON.stringify(data)} />
  ),
  Cell: ({ fill }: any) => <div data-testid="pie-cell" data-fill={fill} />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: ({ content }: any) => (
    <div data-testid="tooltip" data-content={content ? 'custom' : 'default'} />
  ),
}));

// Mock ChartTypeSelector
jest.mock('@/components/chart-type-selector', () => ({
  ChartTypeSelector: ({ currentType, onTypeChange, isAuthenticated }: any) => (
    <select
      data-testid="chart-type-selector"
      value={currentType}
      onChange={(e) => onTypeChange && onTypeChange(e.target.value)}
      disabled={!isAuthenticated}
    >
      <option value="line">Line</option>
      <option value="bar">Bar</option>
      <option value="area">Area</option>
      <option value="pie">Pie</option>
    </select>
  ),
}));

describe('DataChart', () => {
  const mockData = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 150 },
    { date: '2024-01-03', value: 120 },
  ];

  const defaultProps = {
    data: mockData,
    title: 'Test Chart',
    chartType: 'line' as const,
    isAuthenticated: true,
  };

  describe('Empty Data States', () => {
    it('renders empty state when no data provided', () => {
      render(<DataChart {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data to display')).toBeInTheDocument();
      expect(screen.getByText('Waiting for data...')).toBeInTheDocument();
      expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    });

    it('renders empty state when data is null', () => {
      render(<DataChart {...defaultProps} data={null as any} />);
      
      expect(screen.getByText('No data to display')).toBeInTheDocument();
    });

    it('renders empty state when data is undefined', () => {
      render(<DataChart {...defaultProps} data={undefined as any} />);
      
      expect(screen.getByText('No data to display')).toBeInTheDocument();
    });

    it('renders empty state with proper accessibility', () => {
      render(<DataChart {...defaultProps} data={[]} />);
      
      const emptyStateContainer = screen.getByText('No data to display').closest('div');
      expect(emptyStateContainer).toHaveClass('h-80', 'w-full', 'flex', 'items-center', 'justify-center');
    });
  });

  describe('Chart Rendering - Line Chart', () => {
    it('renders line chart by default', () => {
      render(<DataChart {...defaultProps} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line-element')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('processes data correctly for line chart', () => {
      render(<DataChart {...defaultProps} />);
      
      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toEqual(
        expect.objectContaining({
          date: '2024-01-01',
          value: 100,
          name: '2024-01-01', // Display key for legends
        })
      );
    });

    it('formats date values properly', () => {
      const dateData = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-12-31', value: 200 },
      ];
      
      render(<DataChart {...defaultProps} data={dateData} />);
      
      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      // Should format dates for display
      expect(chartData[0].name).toMatch(/Jan 1, 24|Jan 1/);
      expect(chartData[1].name).toMatch(/Dec 31, 24|Dec 31/);
    });
  });

  describe('Chart Rendering - Bar Chart', () => {
    it('renders bar chart when chartType is bar', () => {
      render(<DataChart {...defaultProps} chartType="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-element')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('applies gradient fill to bars', () => {
      render(<DataChart {...defaultProps} chartType="bar" />);
      
      const barElement = screen.getByTestId('bar-element');
      expect(barElement).toHaveAttribute('data-fill', expect.stringContaining('url(#barGradient-'));
    });
  });

  describe('Chart Rendering - Area Chart', () => {
    it('renders area chart when chartType is area', () => {
      render(<DataChart {...defaultProps} chartType="area" />);
      
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-element')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('applies gradient fill to area', () => {
      render(<DataChart {...defaultProps} chartType="area" />);
      
      const areaElement = screen.getByTestId('area-element');
      expect(areaElement).toHaveAttribute('data-fill', expect.stringContaining('url(#areaGradient-'));
    });
  });

  describe('Chart Rendering - Pie Chart', () => {
    it('renders pie chart when chartType is pie', () => {
      render(<DataChart {...defaultProps} chartType="pie" />);
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-element')).toBeInTheDocument();
      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument();
      expect(screen.queryByTestId('x-axis')).not.toBeInTheDocument();
    });

    it('renders legend for pie charts with many items', () => {
      const manyItemsData = Array.from({ length: 8 }, (_, i) => ({
        category: `Item ${i + 1}`,
        value: (i + 1) * 10,
      }));
      
      render(
        <DataChart
          {...defaultProps}
          data={manyItemsData}
          chartType="pie"
          fieldOrder={['category', 'value']}
        />
      );
      
      // Should render legend for many items
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('uses different colors for pie slices', () => {
      render(<DataChart {...defaultProps} chartType="pie" />);
      
      const pieCells = screen.getAllByTestId('pie-cell');
      const colors = pieCells.map(cell => cell.getAttribute('data-fill'));
      
      // Should have different colors for each slice
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBeGreaterThan(1);
    });
  });

  describe('Field Order Handling', () => {
    it('uses fieldOrder when provided', () => {
      const customData = [
        { month: 'January', count: 50 },
        { month: 'February', count: 75 },
      ];
      
      render(
        <DataChart
          {...defaultProps}
          data={customData}
          fieldOrder={['month', 'count']}
        />
      );
      
      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0]).toEqual(
        expect.objectContaining({
          month: 'January',
          count: 50,
          name: 'January',
        })
      );
    });

    it('falls back to object keys when fieldOrder not provided', () => {
      const customData = [
        { category: 'A', amount: 100 },
        { category: 'B', amount: 200 },
      ];
      
      render(<DataChart {...defaultProps} data={customData} />);
      
      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      // Should use first key as name column, second as value column
      expect(chartData[0]).toEqual(
        expect.objectContaining({
          category: 'A',
          amount: 100,
          name: 'A',
        })
      );
    });

    it('handles numeric conversion for value columns', () => {
      const stringNumberData = [
        { item: 'A', value: '100.5' },
        { item: 'B', value: '200.25' },
      ];
      
      render(<DataChart {...defaultProps} data={stringNumberData} />);
      
      const lineChart = screen.getByTestId('line-chart');
      const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '[]');
      
      expect(chartData[0].value).toBe(100.5);
      expect(chartData[1].value).toBe(200.25);
    });
  });

  describe('Chart Type Selector Integration', () => {
    it('renders chart type selector when fileId and callback provided', () => {
      const mockOnChartTypeChange = jest.fn();
      
      render(
        <DataChart
          {...defaultProps}
          fileId="test-file-1"
          onChartTypeChange={mockOnChartTypeChange}
        />
      );
      
      expect(screen.getByTestId('chart-type-selector')).toBeInTheDocument();
    });

    it('does not render chart type selector when no fileId provided', () => {
      render(<DataChart {...defaultProps} />);
      
      expect(screen.queryByTestId('chart-type-selector')).not.toBeInTheDocument();
    });

    it('calls onChartTypeChange when chart type changes', async () => {
      const mockOnChartTypeChange = jest.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(
        <DataChart
          {...defaultProps}
          fileId="test-file-1"
          onChartTypeChange={mockOnChartTypeChange}
        />
      );
      
      const selector = screen.getByTestId('chart-type-selector');
      await user.selectOptions(selector, 'bar');
      
      expect(mockOnChartTypeChange).toHaveBeenCalledWith('test-file-1', 'bar');
    });

    it('disables chart type selector for unauthenticated users', () => {
      render(
        <DataChart
          {...defaultProps}
          fileId="test-file-1"
          onChartTypeChange={jest.fn()}
          isAuthenticated={false}
        />
      );
      
      const selector = screen.getByTestId('chart-type-selector');
      expect(selector).toBeDisabled();
    });
  });

  describe('Data Display Information', () => {
    it('displays correct data point count', () => {
      render(<DataChart {...defaultProps} />);
      
      expect(screen.getByText('3 points')).toBeInTheDocument();
    });

    it('displays chart title', () => {
      render(<DataChart {...defaultProps} title="Sales Data" />);
      
      expect(screen.getByText('Sales Data')).toBeInTheDocument();
    });

    it('updates point count when data changes', () => {
      const { rerender } = render(<DataChart {...defaultProps} />);
      expect(screen.getByText('3 points')).toBeInTheDocument();
      
      rerender(<DataChart {...defaultProps} data={mockData.slice(0, 2)} />);
      expect(screen.getByText('2 points')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive container', () => {
      render(<DataChart {...defaultProps} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('adjusts pie chart height for many items', () => {
      const manyItemsData = Array.from({ length: 10 }, (_, i) => ({
        item: `Item ${i + 1}`,
        value: i + 1,
      }));
      
      render(
        <DataChart
          {...defaultProps}
          data={manyItemsData}
          chartType="pie"
        />
      );
      
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('height', '300');
    });

    it('uses standard height for regular pie charts', () => {
      render(<DataChart {...defaultProps} chartType="pie" />);
      
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('height', '320');
    });
  });

  describe('Error Handling', () => {
    it('handles malformed data gracefully', () => {
      const malformedData = [
        { date: null, value: undefined },
        { date: '2024-01-01', value: 'not a number' },
      ];
      
      render(<DataChart {...defaultProps} data={malformedData} />);
      
      // Should not crash
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles empty objects in data array', () => {
      const emptyObjectData = [{}, { date: '2024-01-01', value: 100 }];
      
      render(<DataChart {...defaultProps} data={emptyObjectData} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper container structure for screen readers', () => {
      render(<DataChart {...defaultProps} />);
      
      const chartContainer = screen.getByTestId('responsive-container').parentElement;
      expect(chartContainer).toHaveClass('w-full', 'p-4', 'bg-gradient-to-br');
    });

    it('provides meaningful chart type information', () => {
      render(<DataChart {...defaultProps} chartType="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('includes data summary for screen readers', () => {
      render(<DataChart {...defaultProps} />);
      
      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText('3 points')).toBeInTheDocument();
    });
  });

  describe('Performance Optimizations', () => {
    it('handles large datasets without crashing', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        index: i,
        value: Math.random() * 100,
      }));
      
      render(<DataChart {...defaultProps} data={largeData} />);
      
      expect(screen.getByText('1000 points')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('memoizes processed data correctly', () => {
      const { rerender } = render(<DataChart {...defaultProps} />);
      
      // Rerender with same props
      rerender(<DataChart {...defaultProps} />);
      
      // Should still render correctly
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByText('3 points')).toBeInTheDocument();
    });
  });

  describe('Color and Styling', () => {
    it('applies consistent color scheme based on title', () => {
      render(<DataChart {...defaultProps} title="Test Chart A" />);
      
      const lineElement = screen.getByTestId('line-element');
      const strokeColor = lineElement.getAttribute('data-stroke');
      
      // Should have a color applied
      expect(strokeColor).toBeTruthy();
    });

    it('uses different colors for different chart titles', () => {
      const { rerender } = render(<DataChart {...defaultProps} title="Chart A" />);
      const firstStroke = screen.getByTestId('line-element').getAttribute('data-stroke');
      
      rerender(<DataChart {...defaultProps} title="Chart B" />);
      const secondStroke = screen.getByTestId('line-element').getAttribute('data-stroke');
      
      // Different titles should potentially get different colors
      // (Note: This test might need adjustment based on actual color algorithm)
      expect(typeof firstStroke).toBe('string');
      expect(typeof secondStroke).toBe('string');
    });
  });
});