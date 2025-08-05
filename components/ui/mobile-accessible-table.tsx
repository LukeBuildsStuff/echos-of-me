'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  ChevronDown, 
  ChevronRight, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2,
  Filter,
  Search,
  Download,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface TableColumn {
  id: string
  header: string
  accessorKey?: string
  sortable?: boolean
  width?: string
  mobileWidth?: string
  hideOnMobile?: boolean
  cell?: (row: any) => React.ReactNode
  accessibilityLabel?: string
}

interface TableAction {
  key: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'destructive' | 'outline'
  onClick: (row: any) => void
  disabled?: (row: any) => boolean
  hidden?: (row: any) => boolean
}

interface MobileAccessibleTableProps {
  data: any[]
  columns: TableColumn[]
  actions?: TableAction[]
  title?: string
  description?: string
  searchable?: boolean
  filterable?: boolean
  sortable?: boolean
  exportable?: boolean
  refreshable?: boolean
  onRefresh?: () => void
  loading?: boolean
  error?: string
  emptyMessage?: string
  emptyIcon?: React.ComponentType<{ className?: string }>
  className?: string
  mobileCardLayout?: boolean
  pageSize?: number
  totalCount?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  ariaLabel?: string
}

interface SortState {
  column: string | null
  direction: 'asc' | 'desc' | null
}

export function MobileAccessibleTable({
  data,
  columns,
  actions = [],
  title,
  description,
  searchable = true,
  filterable = false,
  sortable = true,
  exportable = false,
  refreshable = false,
  onRefresh,
  loading = false,
  error,
  emptyMessage = 'No data available',
  emptyIcon,
  className,
  mobileCardLayout = true,
  pageSize = 10,
  totalCount,
  currentPage = 1,
  onPageChange,
  ariaLabel
}: MobileAccessibleTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let filtered = data

    // Search filtering
    if (searchQuery) {
      filtered = filtered.filter(row =>
        columns.some(col => {
          const key = col.accessorKey || col.id
          const value = row[key]
          return value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    // Sorting
    if (sortState.column && sortState.direction) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortState.column!]
        const bVal = b[sortState.column!]
        
        let comparison = 0
        if (aVal < bVal) comparison = -1
        else if (aVal > bVal) comparison = 1
        
        return sortState.direction === 'desc' ? -comparison : comparison
      })
    }

    return filtered
  }, [data, searchQuery, sortState, columns])

  const handleSort = (columnId: string) => {
    if (!sortable) return
    
    setSortState(prev => {
      if (prev.column === columnId) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') return { column: columnId, direction: 'desc' }
        if (prev.direction === 'desc') return { column: null, direction: null }
      }
      return { column: columnId, direction: 'asc' }
    })
  }

  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  const getRowId = (row: any, index: number) => {
    return row.id || row._id || index.toString()
  }

  const getSortIcon = (columnId: string) => {
    if (sortState.column !== columnId) return <ArrowUpDown className="h-3 w-3 opacity-50" />
    if (sortState.direction === 'asc') return <ArrowUp className="h-3 w-3" />
    if (sortState.direction === 'desc') return <ArrowDown className="h-3 w-3" />
    return <ArrowUpDown className="h-3 w-3 opacity-50" />
  }

  // Mobile card layout
  if (isMobile && mobileCardLayout) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header with controls */}
        {(title || searchable || refreshable) && (
          <div className="space-y-3">
            {title && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {description && (
                  <p className="text-sm text-gray-600 mt-1">{description}</p>
                )}
              </div>
            )}
            
            <div className="flex flex-col space-y-2">
              {searchable && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    aria-label="Search table data"
                  />
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {processedData.length} {processedData.length === 1 ? 'item' : 'items'}
                </div>
                
                {refreshable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Data cards */}
        {!loading && !error && (
          <div className="space-y-3" role="list" aria-label={ariaLabel || title}>
            {processedData.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  {emptyIcon && (
                    <div className="flex justify-center mb-3">
                      {React.createElement(emptyIcon, { className: "h-8 w-8 text-gray-400" })}
                    </div>
                  )}
                  <p className="text-gray-500">{emptyMessage}</p>
                </CardContent>
              </Card>
            ) : (
              processedData.map((row, index) => {
                const rowId = getRowId(row, index)
                const isExpanded = expandedRows.has(rowId)
                const visibleColumns = columns.filter(col => !col.hideOnMobile)
                const hiddenColumns = columns.filter(col => col.hideOnMobile)
                const hasHiddenColumns = hiddenColumns.length > 0

                return (
                  <Card key={rowId} className="overflow-hidden" role="listitem">
                    <CardContent className="p-4">
                      {/* Main content */}
                      <div className="space-y-3">
                        {visibleColumns.map((column, colIndex) => {
                          const key = column.accessorKey || column.id
                          const value = row[key]
                          const displayValue = column.cell ? column.cell(row) : value

                          return (
                            <div key={column.id} className="flex justify-between items-start">
                              <div className="flex-1">
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  {column.header}
                                </dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                  {displayValue}
                                </dd>
                              </div>
                            </div>
                          )
                        })}

                        {/* Expanded content */}
                        {isExpanded && hiddenColumns.length > 0 && (
                          <div className="pt-3 border-t border-gray-200 space-y-3">
                            {hiddenColumns.map(column => {
                              const key = column.accessorKey || column.id
                              const value = row[key]
                              const displayValue = column.cell ? column.cell(row) : value

                              return (
                                <div key={column.id} className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                      {column.header}
                                    </dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                      {displayValue}
                                    </dd>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Actions row */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                          {/* Expand/collapse for hidden columns */}
                          {hasHiddenColumns && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpanded(rowId)}
                              className="text-xs"
                              aria-expanded={isExpanded}
                              aria-controls={`row-details-${rowId}`}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="h-3 w-3 mr-1" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="h-3 w-3 mr-1" />
                                  Show More
                                </>
                              )}
                            </Button>
                          )}

                          {/* Action buttons */}
                          {actions.length > 0 && (
                            <div className="flex gap-1">
                              {actions
                                .filter(action => !action.hidden?.(row))
                                .slice(0, 2) // Show max 2 actions on mobile
                                .map(action => {
                                  const IconComponent = action.icon
                                  return (
                                    <Button
                                      key={action.key}
                                      variant={action.variant || "outline"}
                                      size="sm"
                                      onClick={() => action.onClick(row)}
                                      disabled={action.disabled?.(row)}
                                      className="h-8 w-8 p-0"
                                      aria-label={`${action.label} for ${row.name || row.title || 'item'}`}
                                    >
                                      {IconComponent && <IconComponent className="h-3 w-3" />}
                                    </Button>
                                  )
                                })}
                              
                              {/* More actions menu if needed */}
                              {actions.filter(action => !action.hidden?.(row)).length > 2 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  aria-label="More actions"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  // Desktop table layout
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      {(title || searchable || refreshable || exportable || filterable) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
          
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  aria-label="Search table data"
                />
              </div>
            )}
            
            {filterable && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            )}
            
            {exportable && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            
            {refreshable && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table container with horizontal scroll */}
      <div 
        ref={tableRef}
        className="overflow-x-auto border border-gray-200 rounded-lg"
        role="region"
        aria-label="Data table"
        tabIndex={0}
      >
        <table 
          className="min-w-full divide-y divide-gray-200"
          role="table"
          aria-label={ariaLabel || title}
        >
          <thead className="bg-gray-50">
            <tr role="row">
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                    column.sortable && sortable && "cursor-pointer hover:bg-gray-100",
                    column.width && `w-${column.width}`,
                    column.hideOnMobile && "hidden sm:table-cell"
                  )}
                  onClick={() => column.sortable && sortable && handleSort(column.id)}
                  role="columnheader"
                  aria-sort={
                    sortState.column === column.id
                      ? sortState.direction === 'asc' ? 'ascending' : 'descending'
                      : sortable && column.sortable ? 'none' : undefined
                  }
                >
                  <div className="flex items-center gap-1">
                    <span>{column.header}</span>
                    {sortable && column.sortable && getSortIcon(column.id)}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Loading rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} role="row">
                  {columns.map((column) => (
                    <td key={column.id} className="px-6 py-4">
                      <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-6 py-4">
                      <div className="animate-pulse h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                    </td>
                  )}
                </tr>
              ))
            ) : processedData.length === 0 ? (
              <tr role="row">
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-6 py-12 text-center">
                  {emptyIcon && (
                    <div className="flex justify-center mb-3">
                      {React.createElement(emptyIcon, { className: "h-8 w-8 text-gray-400" })}
                    </div>
                  )}
                  <p className="text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              processedData.map((row, index) => {
                const rowId = getRowId(row, index)
                
                return (
                  <tr 
                    key={rowId} 
                    className="hover:bg-gray-50 focus-within:bg-gray-50"
                    role="row"
                  >
                    {columns.map((column) => {
                      const key = column.accessorKey || column.id
                      const value = row[key]
                      const displayValue = column.cell ? column.cell(row) : value

                      return (
                        <td
                          key={column.id}
                          className={cn(
                            "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                            column.hideOnMobile && "hidden sm:table-cell"
                          )}
                          role="cell"
                        >
                          {displayValue}
                        </td>
                      )
                    })}
                    
                    {actions.length > 0 && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" role="cell">
                        <div className="flex items-center justify-end gap-1">
                          {actions
                            .filter(action => !action.hidden?.(row))
                            .map(action => {
                              const IconComponent = action.icon
                              return (
                                <Button
                                  key={action.key}
                                  variant={action.variant || "outline"}
                                  size="sm"
                                  onClick={() => action.onClick(row)}
                                  disabled={action.disabled?.(row)}
                                  className="h-8 w-8 p-0"
                                  aria-label={`${action.label} for ${row.name || row.title || 'item'}`}
                                >
                                  {IconComponent && <IconComponent className="h-3 w-3" />}
                                </Button>
                              )
                            })}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      {totalCount && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
          </div>
          {onPageChange && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span>Page {currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage * pageSize >= totalCount}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}