import React from 'react'

// Mock Select components
export const Select = ({ value, onValueChange, children }: any) => (
  <select 
    data-testid="select"
    value={value} 
    onChange={(e) => onValueChange(e.target.value)}
  >
    {children}
  </select>
)

export const SelectTrigger = ({ children }: any) => (
  <option data-testid="select-trigger" value="">
    {children}
  </option>
)

export const SelectValue = ({ children }: any) => (
  <span data-testid="select-value">
    {children}
  </span>
)

export const SelectContent = ({ children }: any) => (
  <>{children}</>
)

export const SelectItem = ({ value, children }: any) => (
  <option data-testid="select-item" value={value}>
    {children}
  </option>
)

// Mock Card component
export const Card = ({ children, className, onClick }: any) => (
  <div data-testid="card" className={className} onClick={onClick}>
    {children}
  </div>
)

// Mock ScrollArea component
export const ScrollArea = ({ children }: any) => (
  <div data-testid="scroll-area">{children}</div>
) 