import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Card, { StatCard, TransactionCard } from '../Card'

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>)
    
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Card variant="default">Default card</Card>)
    expect(screen.getByText('Default card').closest('div')).toHaveClass('border-gray-200')

    rerender(<Card variant="outlined">Outlined card</Card>)
    expect(screen.getByText('Outlined card').closest('div')).toHaveClass('border-2', 'border-gray-300')

    rerender(<Card variant="elevated">Elevated card</Card>)
    expect(screen.getByText('Elevated card').closest('div')).toHaveClass('shadow-lg')

    rerender(<Card variant="flat">Flat card</Card>)
    expect(screen.getByText('Flat card').closest('div')).toHaveClass('border-0', 'shadow-none')
  })

  it('renders with different padding sizes', () => {
    const { rerender } = render(<Card padding="none">No padding</Card>)
    expect(screen.getByText('No padding').closest('div')).not.toHaveClass('p-4', 'p-6', 'p-8')

    rerender(<Card padding="sm">Small padding</Card>)
    expect(screen.getByText('Small padding').closest('div')).toHaveClass('p-4')

    rerender(<Card padding="md">Medium padding</Card>)
    expect(screen.getByText('Medium padding').closest('div')).toHaveClass('p-6')

    rerender(<Card padding="lg">Large padding</Card>)
    expect(screen.getByText('Large padding').closest('div')).toHaveClass('p-8')
  })

  it('renders as clickable', () => {
    const handleClick = vi.fn()
    render(<Card clickable onClick={handleClick}>Clickable card</Card>)
    
    const card = screen.getByText('Clickable card').closest('div')
    expect(card).toHaveClass('cursor-pointer')
    
    fireEvent.click(card!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders with hover effect', () => {
    render(<Card hover>Hover card</Card>)
    
    expect(screen.getByText('Hover card').closest('div')).toHaveClass('hover:shadow-md')
  })

  it('applies custom className', () => {
    render(<Card className="custom-card">Custom card</Card>)
    
    expect(screen.getByText('Custom card').closest('div')).toHaveClass('custom-card')
  })

  it('forwards ref correctly', () => {
    const ref = vi.fn()
    render(<Card ref={ref}>Ref card</Card>)
    
    expect(ref).toHaveBeenCalled()
  })
})

describe('StatCard', () => {
  it('renders stat card with basic props', () => {
    render(
      <StatCard
        title="Total Balance"
        value="1,000,000 Ar"
        subtitle="This month"
      />
    )
    
    expect(screen.getByText('Total Balance')).toBeInTheDocument()
    expect(screen.getByText('1,000,000 Ar')).toBeInTheDocument()
    expect(screen.getByText('This month')).toBeInTheDocument()
  })

  it('renders with trend information', () => {
    render(
      <StatCard
        title="Revenue"
        value="500,000 Ar"
        trend={{ value: 15, isPositive: true }}
      />
    )
    
    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText('vs mois dernier')).toBeInTheDocument()
  })

  it('renders with icon', () => {
    const icon = <div data-testid="icon">💰</div>
    render(
      <StatCard
        title="Savings"
        value="200,000 Ar"
        icon={icon}
      />
    )
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(
      <StatCard
        title="Clickable Stat"
        value="100 Ar"
        onClick={handleClick}
      />
    )
    
    const card = screen.getByText('Clickable Stat').closest('div')
    fireEvent.click(card!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(
      <StatCard
        title="Custom Stat"
        value="50 Ar"
        className="custom-stat"
      />
    )
    
    expect(screen.getByText('Custom Stat').closest('div')).toHaveClass('custom-stat')
  })
})

describe('TransactionCard', () => {
  const mockTransaction = {
    title: 'Grocery Shopping',
    amount: -50000,
    type: 'expense' as const,
    category: 'alimentation',
    date: new Date('2024-01-15'),
    description: 'Weekly groceries'
  }

  it('renders expense transaction', () => {
    render(<TransactionCard {...mockTransaction} />)
    
    expect(screen.getByText('Grocery Shopping')).toBeInTheDocument()
    expect(screen.getByText('alimentation')).toBeInTheDocument()
    expect(screen.getByText('15/01/2024')).toBeInTheDocument()
    expect(screen.getByText('Weekly groceries')).toBeInTheDocument()
  })

  it('renders income transaction', () => {
    render(
      <TransactionCard
        {...mockTransaction}
        amount={100000}
        type="income"
        title="Salary"
      />
    )
    
    expect(screen.getByText('Salary')).toBeInTheDocument()
    expect(screen.getByText('+100 000 Ar')).toBeInTheDocument()
  })

  it('renders transfer transaction', () => {
    render(
      <TransactionCard
        {...mockTransaction}
        amount={-25000}
        type="transfer"
        title="Transfer to Savings"
      />
    )
    
    expect(screen.getByText('Sortie: Transfer to Savings')).toBeInTheDocument()
    expect(screen.getByText('Débit')).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    render(<TransactionCard {...mockTransaction} onClick={handleClick} />)
    
    const card = screen.getByText('Grocery Shopping').closest('div')
    fireEvent.click(card!)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(<TransactionCard {...mockTransaction} className="custom-transaction" />)
    
    expect(screen.getByText('Grocery Shopping').closest('div')).toHaveClass('custom-transaction')
  })

  it('formats currency correctly', () => {
    render(<TransactionCard {...mockTransaction} amount={1234567} />)
    
    expect(screen.getByText('1 234 567 Ar')).toBeInTheDocument()
  })
})
