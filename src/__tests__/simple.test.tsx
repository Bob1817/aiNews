import { render, screen } from '@testing-library/react'

describe('Simple test', () => {
  test('should pass', () => {
    render(<div>Test content</div>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })
})