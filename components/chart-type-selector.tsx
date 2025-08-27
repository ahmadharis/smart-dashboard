"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LineChart, BarChart3, AreaChart, PieChart, ChevronDown } from "lucide-react"

interface ChartTypeSelectorProps {
  currentType: string
  onTypeChange: (type: string) => void
  disabled?: boolean
  isAuthenticated?: boolean
}

const chartTypes = [
  { value: "line", label: "Line", icon: LineChart },
  { value: "bar", label: "Bar", icon: BarChart3 },
  { value: "area", label: "Area", icon: AreaChart },
  { value: "pie", label: "Pie", icon: PieChart },
]

export function ChartTypeSelector({
  currentType,
  onTypeChange,
  disabled,
  isAuthenticated = true,
}: ChartTypeSelectorProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const currentChart = chartTypes.find((type) => type.value === currentType) || chartTypes[0]
  const CurrentIcon = currentChart.icon

  const handleTypeChange = async (newType: string) => {
    if (newType === currentType || isUpdating) return

    setIsUpdating(true)
    try {
      await onTypeChange(newType)
    } catch (error) {
      console.error("Failed to update chart type:", error)
      // You could add a toast notification here if you have a toast system
    } finally {
      setIsUpdating(false)
    }
  }

  const isDisabled = disabled || isUpdating || !isAuthenticated

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isDisabled}
          className={`h-7 px-2 text-xs ${
            !isAuthenticated
              ? "text-gray-400 hover:text-gray-400 cursor-not-allowed"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
          title={!isAuthenticated ? "Sign in to change chart types" : undefined}
        >
          <CurrentIcon className="h-3.5 w-3.5 mr-1" />
          {currentChart.label}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      {isAuthenticated && (
        <DropdownMenuContent align="end" className="w-28">
          {chartTypes.map((type) => {
            const Icon = type.icon
            return (
              <DropdownMenuItem
                key={type.value}
                onClick={() => handleTypeChange(type.value)}
                className="cursor-pointer"
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  )
}
