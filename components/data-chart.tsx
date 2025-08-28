"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ChartTypeSelector } from "./chart-type-selector"

interface DataPoint {
  [key: string]: any
}

interface DataChartProps {
  data: DataPoint[]
  title: string
  chartType?: string
  fileId?: string
  onChartTypeChange?: (fileId: string, newType: string) => Promise<void>
  fieldOrder?: string[]
  isAuthenticated?: boolean
}

export function DataChart({
  data,
  title,
  chartType = "line",
  fileId,
  onChartTypeChange,
  fieldOrder,
  isAuthenticated = true,
}: DataChartProps) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No data to display</p>
          <p className="text-xs text-gray-400 mt-1">Waiting for data...</p>
        </div>
      </div>
    )
  }

  const getColumnNames = () => {
    if (data.length === 0) return { keyColumn: "date", valueColumn: "value" }

    if (fieldOrder && fieldOrder.length >= 2) {
      return { keyColumn: fieldOrder[0], valueColumn: fieldOrder[1] }
    }

    const firstRow = data[0]
    const columnNames = Object.keys(firstRow)

    // First column is key, second column is value
    const keyColumn = columnNames[0] || "date"
    const valueColumn = columnNames[1] || "value"

    return { keyColumn, valueColumn }
  }

  const { keyColumn, valueColumn } = getColumnNames()

  const chartData = data.map((point, index) => {
    const keyValue = point[keyColumn]
    let displayKey = keyValue

    // If the key looks like a date, format it nicely
    if (typeof keyValue === "string" && keyValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const dateParts = keyValue.split("-")
      if (dateParts.length === 3) {
        const year = Number.parseInt(dateParts[0])
        const month = Number.parseInt(dateParts[1]) - 1
        const day = Number.parseInt(dateParts[2])
        const localDate = new Date(year, month, day)
        displayKey = localDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "2-digit",
        })
      }
    }

    return {
      name: displayKey, // Use displayKey as name for proper legend labels
      [keyColumn]: keyValue, // Use actual key column name
      [valueColumn]: Number(point[valueColumn]) || 0, // Use actual value column name
      displayKey: displayKey, // For display purposes
      keyColumn: keyColumn,
      valueColumn: valueColumn,
      originalKey: keyValue,
      originalValue: point[valueColumn],
    }
  })

  const getChartTypeLabel = (type: string) => {
    switch (type) {
      case "bar":
        return "Bar Chart"
      case "area":
        return "Area Chart"
      case "pie":
        return "Pie Chart"
      case "line":
      default:
        return "Line Chart"
    }
  }

  const gradientColors = [
    { start: "#3B82F6", end: "#1D4ED8" }, // Blue gradient
    { start: "#10B981", end: "#059669" }, // Green gradient
    { start: "#F59E0B", end: "#D97706" }, // Orange gradient
    { start: "#EF4444", end: "#DC2626" }, // Red gradient
    { start: "#8B5CF6", end: "#7C3AED" }, // Purple gradient
  ]

  // Pie chart colors
  const pieColors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
  ]

  const colorIndex = title.length % gradientColors.length
  const colors = gradientColors[colorIndex]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{`${data.keyColumn}: ${label}`}</p>
          <p className="text-blue-600 font-semibold">{`${data.valueColumn}: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const total = chartData.reduce((sum, item) => sum + (item[valueColumn] || 0), 0)
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(1) : "0.0"
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{`${data.keyColumn}: ${data.displayKey}`}</p>
          <p className="text-blue-600 font-semibold">{`${data.valueColumn}: ${payload[0].value}`}</p>
          <p className="text-gray-500 text-xs">{`${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  const handleChartTypeChange = async (newType: string) => {
    if (fileId && onChartTypeChange) {
      await onChartTypeChange(fileId, newType)
    }
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" strokeOpacity={0.5} />
        <XAxis
          dataKey="displayKey"
          fontSize={11}
          stroke="#6B7280"
          tick={{ fill: "#6B7280" }}
          label={{
            value: keyColumn,
            position: "insideBottom",
            offset: -5,
            style: { textAnchor: "middle", fontSize: "10px", fill: "#6B7280" },
          }}
        />
        <YAxis
          fontSize={11}
          stroke="#6B7280"
          tick={{ fill: "#6B7280" }}
          label={{
            value: valueColumn,
            angle: -90,
            position: "insideLeft",
            style: { textAnchor: "middle", fontSize: "10px", fill: "#6B7280" },
          }}
        />
        <Tooltip content={<CustomTooltip />} />
      </>
    )

    switch (chartType) {
      case "pie":
        const hasMany = chartData.length > 6
        const pieMargin = hasMany
          ? { top: 10, right: 5, left: 5, bottom: 60 }
          : { top: 10, right: 10, left: 10, bottom: 10 }

        const smartLabel = ({ displayKey, percent }: any) => {
          const percentage = percent * 100
          // Only show labels for segments 3% or larger to prevent overlapping
          if (percentage >= 3) {
            return `${displayKey} (${percentage.toFixed(0)}%)`
          }
          return "" // Hide label for small segments
        }

        return (
          <PieChart data={chartData} margin={pieMargin}>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={hasMany ? 75 : 90}
              innerRadius={hasMany ? 30 : 35}
              paddingAngle={2}
              dataKey={valueColumn}
              label={hasMany ? false : smartLabel}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        )

      case "bar":
        return (
          <BarChart {...commonProps}>
            <defs>
              <linearGradient id={`barGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.start} stopOpacity={0.8} />
                <stop offset="100%" stopColor={colors.end} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            {commonElements}
            <Bar
              dataKey={valueColumn}
              fill={`url(#barGradient-${title})`}
              radius={[4, 4, 0, 0]}
              stroke={colors.end}
              strokeWidth={1}
            />
          </BarChart>
        )

      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`areaGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.start} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colors.end} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {commonElements}
            <Area
              type="monotone"
              dataKey={valueColumn}
              stroke={colors.start}
              strokeWidth={2}
              fill={`url(#areaGradient-${title})`}
              dot={{
                fill: colors.end,
                stroke: colors.start,
                strokeWidth: 2,
                r: 4,
              }}
            />
          </AreaChart>
        )

      case "line":
      default:
        return (
          <LineChart {...commonProps}>
            <defs>
              <linearGradient id={`lineGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.start} stopOpacity={0.3} />
                <stop offset="100%" stopColor={colors.end} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {commonElements}
            <Line
              type="monotone"
              dataKey={valueColumn}
              stroke={colors.start}
              strokeWidth={3}
              dot={{
                fill: colors.end,
                stroke: colors.start,
                strokeWidth: 2,
                r: 5,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}
              activeDot={{
                r: 7,
                fill: colors.start,
                stroke: "#fff",
                strokeWidth: 2,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
              }}
              fill={`url(#lineGradient-${title})`}
            />
          </LineChart>
        )
    }
  }

  return (
    <div
      className={`w-full p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-800">{title}</div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full font-medium">
            {chartData.length} points
          </div>
          {fileId && onChartTypeChange && isAuthenticated && (
            <ChartTypeSelector
              currentType={chartType}
              onTypeChange={handleChartTypeChange}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={chartType === "pie" ? (chartData.length > 6 ? 300 : 320) : 320}>
        {renderChart()}
      </ResponsiveContainer>

      {chartType === "pie" && chartData.length > 6 && (
        <div className="mt-2 pb-2 px-1 overflow-hidden max-h-20">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-1 gap-y-0.5 text-[9px] leading-tight">
            {chartData.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-1 min-w-0 overflow-hidden">
                <div
                  className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: pieColors[index % pieColors.length] }}
                />
                <span className="text-gray-700 truncate font-medium" title={entry.displayKey}>
                  {entry.displayKey}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
