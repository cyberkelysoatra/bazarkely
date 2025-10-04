import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { User, Eye } from 'lucide-react'
import Input from '../Input'

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
    expect(input).toHaveClass('border-gray-300')
  })

  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter username" />)
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('renders with required indicator', () => {
    render(<Input label="Username" required />)
    
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('renders with error state', () => {
    render(<Input error="This field is required" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300', 'text-red-900')
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('renders with helper text', () => {
    render(<Input helperText="This is helpful information" />)
    
    expect(screen.getByText('This is helpful information')).toBeInTheDocument()
  })

  it('renders with left icon', () => {
    render(<Input leftIcon={User} placeholder="Enter username" />)
    
    const input = screen.getByPlaceholderText('Enter username')
    expect(input).toHaveClass('pl-10')
    expect(input.parentElement?.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with right icon', () => {
    render(<Input rightIcon={Eye} placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toHaveClass('pr-10')
    expect(input.parentElement?.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with password toggle', () => {
    render(<Input type="password" showPasswordToggle placeholder="Enter password" />)
    
    const input = screen.getByPlaceholderText('Enter password')
    expect(input).toHaveAttribute('type', 'password')
    
    const toggleButton = screen.getByRole('button')
    expect(toggleButton).toBeInTheDocument()
  })

  it('toggles password visibility', () => {
    render(<Input type="password" showPasswordToggle placeholder="Enter password" />)
    
    const input = screen.getByPlaceholderText('Enter password')
    const toggleButton = screen.getByRole('button')
    
    expect(input).toHaveAttribute('type', 'password')
    
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'text')
    
    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('renders with currency formatting for MGA', () => {
    const handleChange = vi.fn()
    render(<Input currency="MGA" onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    expect(input.parentElement?.querySelector('span')).toHaveTextContent('Ar')
  })

  it('formats currency input correctly', () => {
    const handleChange = vi.fn()
    render(<Input currency="MGA" onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    
    fireEvent.change(input, { target: { value: '1000000' } })
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '1 000 000'
        })
      })
    )
  })

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)
    
    const input = screen.getByRole('textbox')
    
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Input ref={ref} />)
    
    expect(ref).toHaveBeenCalled()
  })

  it('renders different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    
    rerender(<Input type="tel" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'tel')
    
    rerender(<Input type="number" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'number')
  })

  it('shows error instead of helper text when both are provided', () => {
    render(
      <Input 
        error="This is an error" 
        helperText="This is helper text" 
      />
    )
    
    expect(screen.getByText('This is an error')).toBeInTheDocument()
    expect(screen.queryByText('This is helper text')).not.toBeInTheDocument()
  })

  it('handles disabled state', () => {
    render(<Input disabled />)
    
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })
})
