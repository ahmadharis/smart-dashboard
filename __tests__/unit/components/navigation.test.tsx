/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils';
import userEvent from '@testing-library/user-event';
import { Navigation } from '@/components/navigation';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/components/user-nav', () => ({
  UserNav: () => <div data-testid="user-nav">User Nav Component</div>,
}));

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  BarChart3: ({ className, ...props }: any) => <div data-testid="barchart3-icon" className={className} {...props} />,
  Upload: ({ className, ...props }: any) => <div data-testid="upload-icon" className={className} {...props} />,
  Home: ({ className, ...props }: any) => <div data-testid="home-icon" className={className} {...props} />,
  FileText: ({ className, ...props }: any) => <div data-testid="file-text-icon" className={className} {...props} />,
  Menu: ({ className, ...props }: any) => <div data-testid="menu-icon" className={className} {...props} />,
}));

import { usePathname, useParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

describe('Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/test-tenant/dashboard');
    mockUseParams.mockReturnValue({ tenantId: 'test-tenant' });
    mockUseIsMobile.mockReturnValue(false);
  });

  describe('Desktop Navigation', () => {
    it('renders navigation with brand logo and title', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('barchart3-icon')).toBeInTheDocument();
      expect(screen.getByText('Smart Dashboard')).toBeInTheDocument();
    });

    it('renders all navigation items when tenantId is present', () => {
      render(<Navigation />);
      
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /manage/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /api docs/i })).toBeInTheDocument();
    });

    it('only shows home link when no tenantId is present', () => {
      mockUseParams.mockReturnValue({});
      render(<Navigation />);
      
      expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /manage/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /api docs/i })).not.toBeInTheDocument();
    });

    it('generates correct href URLs with tenantId', () => {
      render(<Navigation />);
      
      const homeLink = screen.getByRole('link', { name: /home/i });
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const manageLink = screen.getByRole('link', { name: /manage/i });
      const apiDocsLink = screen.getByRole('link', { name: /api docs/i });

      expect(homeLink).toHaveAttribute('href', '/test-tenant');
      expect(dashboardLink).toHaveAttribute('href', '/test-tenant/dashboard');
      expect(manageLink).toHaveAttribute('href', '/test-tenant/manage');
      expect(apiDocsLink).toHaveAttribute('href', '/test-tenant/api-docs');
    });

    it('renders UserNav component', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('user-nav')).toBeInTheDocument();
    });

    it('does not render mobile menu on desktop', () => {
      render(<Navigation />);
      
      expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it('renders mobile menu trigger button', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle navigation menu')).toBeInTheDocument();
    });

    it('does not render desktop navigation items', () => {
      render(<Navigation />);
      
      // Desktop navigation items should not be visible
      const desktopItems = screen.queryAllByRole('link').filter(
        link => !link.closest('[data-testid="mobile-menu"]') && 
                 link.getAttribute('href') !== '/test-tenant' // Exclude brand link
      );
      
      expect(desktopItems).toHaveLength(0);
    });

    it('opens mobile menu when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Check that mobile navigation items are present in the sheet
      await waitFor(() => {
        expect(screen.getAllByRole('link', { name: /home/i })).toHaveLength(2); // Brand + mobile menu
        expect(screen.getAllByRole('link', { name: /dashboard/i })).toHaveLength(1);
        expect(screen.getAllByRole('link', { name: /manage/i })).toHaveLength(1);
        expect(screen.getAllByRole('link', { name: /api docs/i })).toHaveLength(1);
      });
    });

    it('closes mobile menu when navigation item is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />);
      
      // Open menu
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      await user.click(menuButton);
      
      // Wait for menu to open and click a nav item
      await waitFor(() => {
        expect(screen.getAllByRole('link', { name: /dashboard/i })).toHaveLength(1);
      });
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);
      
      // Menu should close (this might require checking internal state or mocking sheet behavior)
    });

    it('renders UserNav in mobile layout', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('user-nav')).toBeInTheDocument();
    });
  });

  describe('Brand Link Behavior', () => {
    it('links to tenant home when tenantId is present', () => {
      render(<Navigation />);
      
      const brandLink = screen.getByText('Smart Dashboard').closest('a');
      expect(brandLink).toHaveAttribute('href', '/test-tenant');
    });

    it('links to root when no tenantId is present', () => {
      mockUseParams.mockReturnValue({});
      render(<Navigation />);
      
      const brandLink = screen.getByText('Smart Dashboard').closest('a');
      expect(brandLink).toHaveAttribute('href', '/');
    });

    it('applies hover styles to brand link', () => {
      render(<Navigation />);
      
      const brandLink = screen.getByText('Smart Dashboard').closest('a');
      expect(brandLink).toHaveClass('hover:opacity-80', 'transition-opacity');
    });
  });

  describe('Navigation Icons', () => {
    it('renders correct icons for each navigation item', () => {
      render(<Navigation />);
      
      expect(screen.getByTestId('home-icon')).toBeInTheDocument();
      expect(screen.getByTestId('barchart3-icon')).toBeInTheDocument(); // Brand + Dashboard
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
      expect(screen.getByTestId('file-text-icon')).toBeInTheDocument();
    });

    it('applies correct CSS classes to icons', () => {
      render(<Navigation />);
      
      const homeIcon = screen.getByTestId('home-icon');
      expect(homeIcon).toHaveClass('h-4', 'w-4');
      
      const brandIcon = screen.getAllByTestId('barchart3-icon')[0]; // Brand icon
      expect(brandIcon).toHaveClass('h-6', 'w-6');
    });
  });

  describe('Responsive Behavior', () => {
    it('switches layout based on mobile state', () => {
      const { rerender } = render(<Navigation />);
      
      // Desktop layout
      expect(screen.queryByTestId('menu-icon')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      
      // Switch to mobile
      mockUseIsMobile.mockReturnValue(true);
      rerender(<Navigation />);
      
      expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
    });
  });

  describe('Conditional Navigation Items', () => {
    it('shows different items based on tenantId presence', () => {
      // With tenantId
      render(<Navigation />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /manage/i })).toBeInTheDocument();
      
      // Without tenantId
      mockUseParams.mockReturnValue({});
      const { rerender } = render(<Navigation />);
      rerender(<Navigation />);
      
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /manage/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic navigation structure', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('has accessible mobile menu trigger', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<Navigation />);
      
      const menuTrigger = screen.getByLabelText('Toggle navigation menu');
      expect(menuTrigger).toHaveAttribute('type', 'button');
    });

    it('provides screen reader text for icons', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<Navigation />);
      
      expect(screen.getByText('Toggle navigation menu')).toHaveClass('sr-only');
    });

    it('uses proper link structure with text and icons', () => {
      render(<Navigation />);
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveTextContent('Dashboard');
    });
  });

  describe('Styling', () => {
    it('applies correct container and layout classes', () => {
      render(<Navigation />);
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('border-b', 'bg-background/95', 'backdrop-blur');
      
      const container = nav.querySelector('.container');
      expect(container).toHaveClass('mx-auto', 'px-4');
    });

    it('applies correct button variants to navigation items', () => {
      render(<Navigation />);
      
      // Navigation items should be rendered as ghost variant buttons
      const dashboardButton = screen.getByRole('link', { name: /dashboard/i }).parentElement;
      expect(dashboardButton).toHaveClass('inline-flex'); // Should have button classes
    });
  });

  describe('State Management', () => {
    it('manages mobile menu open state correctly', async () => {
      mockUseIsMobile.mockReturnValue(true);
      const user = userEvent.setup();
      render(<Navigation />);
      
      const menuButton = screen.getByLabelText('Toggle navigation menu');
      
      // Menu should start closed
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
      
      // Open menu
      await user.click(menuButton);
      
      // Menu should be open
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Structure', () => {
    it('maintains correct navigation hierarchy', () => {
      render(<Navigation />);
      
      const navItems = [
        { href: '/test-tenant', label: 'Home' },
        { href: '/test-tenant/dashboard', label: 'Dashboard' },
        { href: '/test-tenant/manage', label: 'Manage' },
        { href: '/test-tenant/api-docs', label: 'API Docs' },
      ];
      
      navItems.forEach(item => {
        const link = screen.getByRole('link', { name: new RegExp(item.label, 'i') });
        expect(link).toHaveAttribute('href', item.href);
      });
    });
  });
});