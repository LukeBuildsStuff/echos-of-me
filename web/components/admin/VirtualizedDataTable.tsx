'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import { VariableSizeList as VariableList } from 'react-window'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Download,
  Search,
  Filter,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

// Types for the virtualized data table
export interface Column<T = any> {
  key: string
  title: string
  dataIndex: keyof T
  width?: number
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  filterType?: 'text' | 'select' | 'date' | 'number'
  filterOptions?: Array<{ label: string; value: any }>
}

export interface DataTableProps<T = any> {
  columns: Column<T>[]
  data: T[]
  totalCount: number
  pageSize?: number
  currentPage?: number
  loading?: boolean
  virtualized?: boolean
  itemHeight?: number
  variableHeight?: boolean
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onFilter?: (filters: Record<string, any>) => void
  onRefresh?: () => void
  onExport?: (format: 'csv' | 'json' | 'xlsx') => void
  selectable?: boolean
  onSelectionChange?: (selectedKeys: string[]) => void
  rowKey?: keyof T | ((record: T) => string)
  className?: string
  emptyText?: string
  showQuickFilters?: boolean
  exportFileName?: string
}

interface SortState {
  key: string
  direction: 'asc' | 'desc' | null
}

interface FilterState {
  [key: string]: any
}

export function VirtualizedDataTable<T extends Record<string, any>>({
  columns,
  data,
  totalCount,
  pageSize = 50,
  currentPage = 1,
  loading = false,
  virtualized = true,
  itemHeight = 56,
  variableHeight = false,
  onPageChange,
  onPageSizeChange,
  onSort,
  onFilter,
  onRefresh,
  onExport,
  selectable = false,
  onSelectionChange,
  rowKey = 'id',
  className = '',
  emptyText = 'No data available',
  showQuickFilters = true,
  exportFileName = 'data-export'
}: DataTableProps<T>) {
  const [sortState, setSortState] = useState<SortState>({ key: '', direction: null })
  const [filters, setFilters] = useState<FilterState>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [quickFilters, setQuickFilters] = useState<Record<string, any>>({})
  
  const tableRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<any>(null)

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalCount)

  // Filter and sort data locally if not handled by parent
  const processedData = useMemo(() => {
    let result = data

    // Apply search filter
    if (searchTerm) {
      result = result.filter(item =>
        columns.some(col => {
          const value = item[col.dataIndex]
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        result = result.filter(item => {
          const itemValue = item[key]
          if (Array.isArray(value)) {
            return value.includes(itemValue)
          }
          return itemValue?.toString().toLowerCase().includes(value.toString().toLowerCase())
        })
      }
    })

    // Apply quick filters
    Object.entries(quickFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        result = result.filter(item => item[key] === value)
      }
    })

    return result
  }, [data, searchTerm, filters, quickFilters, columns])

  // Handle sorting
  const handleSort = useCallback((columnKey: string) => {
    const newDirection = 
      sortState.key === columnKey && sortState.direction === 'asc' 
        ? 'desc' 
        : sortState.key === columnKey && sortState.direction === 'desc'
        ? null
        : 'asc'

    setSortState({ key: columnKey, direction: newDirection })
    
    if (onSort && newDirection) {
      onSort(columnKey, newDirection)
    }
  }, [sortState, onSort])

  // Handle filter changes
  const handleFilterChange = useCallback((columnKey: string, value: any) => {
    const newFilters = { ...filters, [columnKey]: value }
    setFilters(newFilters)
    
    if (onFilter) {
      onFilter(newFilters)
    }
  }, [filters, onFilter])

  // Handle row selection
  const handleRowSelection = useCallback((recordKey: string, selected: boolean) => {
    const newSelection = new Set(selectedRows)
    
    if (selected) {
      newSelection.add(recordKey)
    } else {
      newSelection.delete(recordKey)
    }
    
    setSelectedRows(newSelection)
    
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelection))
    }
  }, [selectedRows, onSelectionChange])

  // Select all rows
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allKeys = processedData.map(item => 
        typeof rowKey === 'function' ? rowKey(item) : item[rowKey]
      )
      setSelectedRows(new Set(allKeys))
      if (onSelectionChange) {
        onSelectionChange(allKeys)
      }
    } else {
      setSelectedRows(new Set())
      if (onSelectionChange) {
        onSelectionChange([])
      }
    }
  }, [processedData, rowKey, onSelectionChange])

  // Export functionality
  const handleExport = useCallback((format: 'csv' | 'json' | 'xlsx') => {
    if (onExport) {
      onExport(format)
    } else {
      // Default export implementation
      const dataToExport = selectedRows.size > 0 
        ? processedData.filter(item => 
            selectedRows.has(typeof rowKey === 'function' ? rowKey(item) : item[rowKey])
          )
        : processedData

      if (format === 'json') {
        const jsonData = JSON.stringify(dataToExport, null, 2)
        const blob = new Blob([jsonData], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportFileName}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else if (format === 'csv') {
        const csvHeaders = columns.map(col => col.title).join(',')
        const csvRows = dataToExport.map(item =>
          columns.map(col => {
            const value = item[col.dataIndex]
            return `"${value?.toString().replace(/"/g, '""') || ''}"`
          }).join(',')
        )
        const csvContent = [csvHeaders, ...csvRows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exportFileName}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }, [onExport, processedData, selectedRows, rowKey, columns, exportFileName])

  // Render table header
  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>

        {/* Quick filters */}
        {showQuickFilters && (
          <div className="flex items-center gap-2">
            {columns
              .filter(col => col.filterable && col.filterType === 'select')
              .slice(0, 3) // Show max 3 quick filters
              .map(col => (
                <select
                  key={col.key}
                  value={quickFilters[col.key] || ''}
                  onChange={(e) => {
                    const newQuickFilters = { ...quickFilters, [col.key]: e.target.value }
                    setQuickFilters(newQuickFilters)
                  }}
                  className="px-3 py-2 border border-gray-200 rounded-md text-sm"
                >
                  <option value="">{col.title}</option>
                  {col.filterOptions?.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ))}
          </div>
        )}

        {/* Results info */}
        <Badge variant="secondary">
          {totalCount.toLocaleString()} total • {processedData.length.toLocaleString()} filtered
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {/* Selection info */}
        {selectable && selectedRows.size > 0 && (
          <Badge variant="outline">
            {selectedRows.size} selected
          </Badge>
        )}

        {/* Export options */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={processedData.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('json')}
            disabled={processedData.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            JSON
          </Button>
        </div>

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  )

  // Render table column headers
  const renderColumnHeaders = () => (
    <div className="flex bg-gray-50 border-b border-gray-200" style={{ minWidth: 'max-content' }}>
      {selectable && (
        <div className="w-12 p-3 flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedRows.size === processedData.length && processedData.length > 0}
            onChange={(e) => handleSelectAll(e.target.checked)}
            className="rounded border-gray-300"
          />
        </div>
      )}
      {columns.map((column) => (
        <div
          key={column.key}
          className={`p-3 font-medium text-gray-900 border-r border-gray-200 ${
            column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
          }`}
          style={{ width: column.width || 150, minWidth: column.width || 150 }}
          onClick={() => column.sortable && handleSort(column.key)}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{column.title}</span>
            {column.sortable && (
              <div className="flex flex-col">
                {sortState.key === column.key ? (
                  sortState.direction === 'asc' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : sortState.direction === 'desc' ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                  )
                ) : (
                  <ArrowUpDown className="h-3 w-3 text-gray-400" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  // Render a single row (used by react-window)
  const renderRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = processedData[index]
    if (!record) return null

    const recordKey = typeof rowKey === 'function' ? rowKey(record) : record[rowKey]
    const isSelected = selectedRows.has(recordKey)

    return (
      <div
        style={style}
        className={`flex border-b border-gray-100 hover:bg-gray-50 ${
          isSelected ? 'bg-blue-50' : ''
        }`}
      >
        {selectable && (
          <div className="w-12 p-3 flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleRowSelection(recordKey, e.target.checked)}
              className="rounded border-gray-300"
            />
          </div>
        )}
        {columns.map((column) => (
          <div
            key={column.key}
            className="p-3 border-r border-gray-100 truncate"
            style={{ width: column.width || 150, minWidth: column.width || 150 }}
            title={record[column.dataIndex]?.toString()}
          >
            {column.render
              ? column.render(record[column.dataIndex], record, index)
              : record[column.dataIndex]?.toString() || '-'}
          </div>
        ))}
      </div>
    )
  }, [processedData, selectedRows, rowKey, selectable, columns, handleRowSelection])

  // Render pagination
  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Showing {startIndex + 1}-{endIndex} of {totalCount.toLocaleString()}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value={200}>200 per page</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = currentPage <= 3 
                ? i + 1 
                : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i
              
              if (page < 1 || page > totalPages) return null
              
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange?.(page)}
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  if (loading && processedData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading data...</p>
        </CardContent>
      </Card>
    )
  }

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        {renderHeader()}
        <CardContent className="p-8 text-center">
          <div className="text-gray-400 mb-2">📊</div>
          <p className="text-gray-600">{emptyText}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {renderHeader()}
      <div ref={tableRef} className="relative">
        {renderColumnHeaders()}
        
        {virtualized ? (
          <div style={{ height: Math.min(600, processedData.length * itemHeight) }}>
            {variableHeight ? (
              <VariableList
                ref={listRef}
                height={Math.min(600, processedData.length * itemHeight)}
                itemCount={processedData.length}
                itemSize={() => itemHeight}
                itemData={processedData}
              >
                {renderRow}
              </VariableList>
            ) : (
              <List
                ref={listRef}
                height={Math.min(600, processedData.length * itemHeight)}
                itemCount={processedData.length}
                itemSize={itemHeight}
                itemData={processedData}
              >
                {renderRow}
              </List>
            )}
          </div>
        ) : (
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {processedData.map((record, index) => 
              renderRow({ index, style: { height: itemHeight } })
            )}
          </div>
        )}
      </div>
      {renderPagination()}
    </Card>
  )
}

export default VirtualizedDataTable