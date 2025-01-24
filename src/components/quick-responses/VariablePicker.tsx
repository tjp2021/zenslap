import { SYSTEM_VARIABLES } from '@/lib/types/variables'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface VariablePickerProps {
  onSelect: (variableName: string) => void
  disabled?: boolean
}

export function VariablePicker({ onSelect, disabled }: VariablePickerProps) {
  return (
    <Select
      onValueChange={(value) => onSelect(`{${value}}`)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Insert variable..." />
      </SelectTrigger>
      <SelectContent>
        {SYSTEM_VARIABLES.map((variable) => (
          <SelectItem
            key={variable.name}
            value={variable.name}
          >
            {variable.name}
            {variable.required && ' *'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 