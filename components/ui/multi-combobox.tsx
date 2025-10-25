"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "./utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface ComboboxOption {
  id?: string
  name: string
  slug?: string
}

interface MultiComboboxProps {
  options: ComboboxOption[]
  selectedValues: ComboboxOption[]
  onValueChange: (values: ComboboxOption[]) => void
  onCreateNew?: (name: string) => Promise<ComboboxOption>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  allowCreate?: boolean
}

export function MultiCombobox({
  options,
  selectedValues,
  onValueChange,
  onCreateNew,
  placeholder = "Select items...",
  searchPlaceholder = "Search or type to create...",
  emptyText = "No items found",
  className,
  allowCreate = true,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const handleSelect = async (option: ComboboxOption) => {
    const isSelected = selectedValues.some(
      (v) => v.id === option.id || v.name.toLowerCase() === option.name.toLowerCase()
    )

    if (isSelected) {
      onValueChange(selectedValues.filter((v) => v.id !== option.id && v.name.toLowerCase() !== option.name.toLowerCase()))
    } else {
      onValueChange([...selectedValues, option])
    }
  }

  const handleRemove = (option: ComboboxOption) => {
    onValueChange(selectedValues.filter((v) => v.id !== option.id && v.name.toLowerCase() !== option.name.toLowerCase()))
  }

  const handleCreateNew = async () => {
    if (!searchValue.trim() || !onCreateNew || !allowCreate) return

    const existingOption = options.find(
      (opt) => opt.name.toLowerCase() === searchValue.trim().toLowerCase()
    )

    if (existingOption) {
      await handleSelect(existingOption)
      setSearchValue("")
      return
    }

    const isAlreadySelected = selectedValues.some(
      (v) => v.name.toLowerCase() === searchValue.trim().toLowerCase()
    )

    if (isAlreadySelected) {
      setSearchValue("")
      return
    }

    try {
      setCreating(true)
      const newOption = await onCreateNew(searchValue.trim())
      onValueChange([...selectedValues, newOption])
      setSearchValue("")
    } catch (error) {
      console.error("Error creating new option:", error)
    } finally {
      setCreating(false)
    }
  }

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const canCreate =
    allowCreate &&
    searchValue.trim() &&
    !filteredOptions.some(
      (opt) => opt.name.toLowerCase() === searchValue.trim().toLowerCase()
    ) &&
    !selectedValues.some(
      (v) => v.name.toLowerCase() === searchValue.trim().toLowerCase()
    )

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {selectedValues.length > 0
                ? `${selectedValues.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {filteredOptions.length === 0 && !canCreate && (
                <CommandEmpty>{emptyText}</CommandEmpty>
              )}
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.some(
                    (v) =>
                      v.id === option.id ||
                      v.name.toLowerCase() === option.name.toLowerCase()
                  )
                  return (
                    <CommandItem
                      key={option.id || option.name}
                      value={option.name}
                      onSelect={() => handleSelect(option)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.name}
                    </CommandItem>
                  )
                })}
                {canCreate && onCreateNew && (
                  <CommandItem
                    onSelect={handleCreateNew}
                    disabled={creating}
                    className="text-primary"
                  >
                    <span className="mr-2">+</span>
                    {creating
                      ? "Creating..."
                      : `Create "${searchValue.trim()}"`}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((value) => (
            <Badge
              key={value.id || value.name}
              variant="secondary"
              className="gap-1"
            >
              {value.name}
              <button
                type="button"
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleRemove(value)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
