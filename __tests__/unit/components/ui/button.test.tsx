/**
 * @jest-environment jsdom
 */
import { render, screen } from '@/__tests__/utils/test-utils'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders button with default props', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'button')
    })

    it('renders button with custom text', () => {
      const buttonText = 'Custom Button Text'
      render(<Button>{buttonText}</Button>)
      
      expect(screen.getByRole('button', { name: buttonText })).toBeInTheDocument()
    })

    it('renders disabled button', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: /disabled button/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Variants', () => {
    it('applies default variant classes', () => {
      render(<Button>Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary', 'text-primary-foreground')
    })

    it('applies destructive variant classes', () => {
      render(<Button variant="destructive">Destructive</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive', 'text-white')
    })

    it('applies outline variant classes', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border', 'bg-background')
    })

    it('applies secondary variant classes', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary', 'text-secondary-foreground')
    })

    it('applies ghost variant classes', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent')
    })

    it('applies link variant classes', () => {
      render(<Button variant="link">Link</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary', 'underline-offset-4')
    })
  })

  describe('Sizes', () => {
    it('applies default size classes', () => {
      render(<Button>Default Size</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'px-4', 'py-2')
    })

    it('applies small size classes', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'px-3')
    })

    it('applies large size classes', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-10', 'px-6')
    })

    it('applies icon size classes', () => {
      render(<Button size="icon">Icon</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('size-9')
    })
  })

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const customClass = 'my-custom-class'
      render(<Button className={customClass}>Custom Class</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass(customClass)
    })

    it('handles onClick events', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Clickable</Button>)
      
      const button = screen.getByRole('button', { name: /clickable/i })
      button.click()
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('renders as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      
      const link = screen.getByRole('link', { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveAttribute('data-slot', 'button')
    })
  })

  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Accessible Button</Button>)
      
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      
      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toBeInTheDocument()
    })

    it('supports aria-describedby', () => {
      render(
        <>
          <Button aria-describedby="button-help">Submit</Button>
          <div id="button-help">This button submits the form</div>
        </>
      )
      
      const button = screen.getByRole('button', { name: /submit/i })
      expect(button).toHaveAttribute('aria-describedby', 'button-help')
    })
  })
})