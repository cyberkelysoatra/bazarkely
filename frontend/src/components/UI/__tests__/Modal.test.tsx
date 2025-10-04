import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal, { ConfirmModal } from '../Modal'

describe('Modal', () => {
  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders with title', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} showCloseButton={true}>
        <p>Modal content</p>
      </Modal>
    )
    
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnOverlayClick={true}>
        <p>Modal content</p>
      </Modal>
    )
    
    const overlay = screen.getByRole('button').parentElement?.parentElement
    fireEvent.click(overlay!)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders different sizes', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} size="sm">
        <p>Small modal</p>
      </Modal>
    )
    expect(screen.getByText('Small modal').closest('div')).toHaveClass('max-w-md')

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} size="lg">
        <p>Large modal</p>
      </Modal>
    )
    expect(screen.getByText('Large modal').closest('div')).toHaveClass('max-w-2xl')
  })

  it('handles escape key', () => {
    const handleClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEscape={true}>
        <p>Modal content</p>
      </Modal>
    )
    
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('applies custom className', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} className="custom-modal">
        <p>Modal content</p>
      </Modal>
    )
    
    expect(screen.getByText('Modal content').closest('div')).toHaveClass('custom-modal')
  })
})

describe('ConfirmModal', () => {
  it('renders confirmation modal', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    )
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByText('Confirmer')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn()
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={handleConfirm}
        title="Confirm Action"
        message="Are you sure?"
      />
    )
    
    const confirmButton = screen.getByText('Confirmer')
    fireEvent.click(confirmButton)
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is clicked', () => {
    const handleClose = vi.fn()
    render(
      <ConfirmModal
        isOpen={true}
        onClose={handleClose}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
      />
    )
    
    const cancelButton = screen.getByText('Annuler')
    fireEvent.click(cancelButton)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('renders with different variants', () => {
    const { rerender } = render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Danger Action"
        message="This is dangerous"
        variant="danger"
      />
    )
    
    expect(screen.getByText('This is dangerous')).toHaveClass('text-red-600')
    expect(screen.getByText('Confirmer')).toHaveClass('bg-red-600')

    rerender(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Warning Action"
        message="This is a warning"
        variant="warning"
      />
    )
    
    expect(screen.getByText('This is a warning')).toHaveClass('text-yellow-600')
  })

  it('shows loading state', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
        loading={true}
      />
    )
    
    const confirmButton = screen.getByText('Confirmer')
    expect(confirmButton).toBeDisabled()
  })

  it('uses custom button text', () => {
    render(
      <ConfirmModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Confirm Action"
        message="Are you sure?"
        confirmText="Yes, delete"
        cancelText="No, keep"
      />
    )
    
    expect(screen.getByText('Yes, delete')).toBeInTheDocument()
    expect(screen.getByText('No, keep')).toBeInTheDocument()
  })
})
