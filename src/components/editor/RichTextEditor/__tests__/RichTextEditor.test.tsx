import { render, screen, fireEvent } from '@testing-library/react'
import { RichTextEditor } from '..'

// Mock TipTap since it's not compatible with JSDOM
jest.mock('@tiptap/react', () => ({
  EditorContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEditor: () => ({
    chain: () => ({
      focus: () => ({
        toggleBold: () => ({ run: jest.fn() }),
      }),
    }),
    isActive: () => false,
  }),
}))

// Mock the Toolbar component
jest.mock('../components/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar">Toolbar</div>
}))

describe('RichTextEditor', () => {
  it('renders with placeholder', () => {
    render(<RichTextEditor placeholder="Test placeholder" />)
    expect(screen.getByText('Test placeholder')).toBeInTheDocument()
  })

  it('renders with initial content', () => {
    const onChange = jest.fn()
    render(
      <RichTextEditor
        initialContent="Test content"
        onChange={onChange}
      />
    )
  })

  it('renders toolbar in editable mode', () => {
    render(<RichTextEditor />)
    expect(screen.getByRole('toolbar')).toBeInTheDocument()
  })

  it('hides toolbar in readonly mode', () => {
    render(<RichTextEditor readOnly />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('renders with default props', () => {
    render(<RichTextEditor />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByTestId('toolbar')).toBeInTheDocument()
  })

  it('renders without toolbar when showToolbar is false', () => {
    render(<RichTextEditor showToolbar={false} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByTestId('toolbar')).not.toBeInTheDocument()
  })

  it('applies maxLength prop', () => {
    render(<RichTextEditor maxLength={100} />)
    const editor = screen.getByRole('textbox')
    expect(editor).toHaveAttribute('maxLength', '100')
  })

  it('applies placeholder prop', () => {
    const placeholder = 'Type something...'
    render(<RichTextEditor placeholder={placeholder} />)
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
  })
}) 