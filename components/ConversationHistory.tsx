'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SearchIcon, ClockIcon, HeartIcon, StarIcon, CalendarIcon, FilterIcon, ArchiveIcon, BookOpenIcon, SparklesIcon } from 'lucide-react'

interface ConversationMemory {
  id: string
  title: string
  preview: string
  fullContent: string
  date: Date
  messageCount: number
  emotionalTone: 'loving' | 'wise' | 'comforting' | 'reflective' | 'celebratory'
  participants: string[]
  isFavorite: boolean
  isArchived: boolean
  tags: string[]
  significance: 'everyday' | 'meaningful' | 'precious' | 'treasured'
  lastMessage: {
    content: string
    speaker: 'user' | 'assistant'
    timestamp: Date
  }
  highlights: string[]
  emotions: Array<{
    type: 'loving' | 'wise' | 'comforting' | 'reflective' | 'joyful' | 'nostalgic'
    intensity: number
    context: string
  }>
}

interface ConversationHistoryProps {
  memories?: ConversationMemory[]
  familyMemberName?: string
  onSelectMemory?: (memory: ConversationMemory) => void
  onFavoriteToggle?: (memoryId: string) => void
  onArchiveToggle?: (memoryId: string) => void
  className?: string
}

interface MemoryFilterOptions {
  timeRange: 'all' | 'today' | 'week' | 'month' | 'year'
  emotionalTone: 'all' | 'loving' | 'wise' | 'comforting' | 'reflective' | 'celebratory'
  significance: 'all' | 'everyday' | 'meaningful' | 'precious' | 'treasured'
  showArchived: boolean
  favoritesOnly: boolean
}

const MemoryCard: React.FC<{
  memory: ConversationMemory
  onSelect: () => void
  onFavoriteToggle: () => void
  onArchiveToggle: () => void
  familyMemberName?: string
}> = ({ memory, onSelect, onFavoriteToggle, onArchiveToggle, familyMemberName }) => {
  
  // Get emotion-based styling
  const getEmotionStyling = () => {
    switch (memory.emotionalTone) {
      case 'loving':
        return 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100'
      case 'wise':
        return 'border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100'
      case 'reflective':
        return 'border-purple-200 bg-gradient-to-br from-purple-50 to-comfort-50 hover:from-purple-100 hover:to-comfort-100'
      case 'comforting':
        return 'border-hope-200 bg-gradient-to-br from-hope-50 to-peace-50 hover:from-hope-100 hover:to-peace-100'
      default:
        return 'border-hope-200 bg-gradient-to-br from-peace-50 to-hope-50 hover:from-peace-100 hover:to-hope-100'
    }
  }
  
  // Get significance indicator
  const getSignificanceIndicator = () => {
    switch (memory.significance) {
      case 'treasured':
        return { icon: '💎', label: 'Treasured', color: 'text-purple-600' }
      case 'precious':
        return { icon: '✨', label: 'Precious', color: 'text-amber-600' }
      case 'meaningful':
        return { icon: '🌟', label: 'Meaningful', color: 'text-blue-600' }
      default:
        return { icon: '💫', label: 'Memory', color: 'text-peace-600' }
    }
  }
  
  const significance = getSignificanceIndicator()
  
  return (
    <Card className={`${getEmotionStyling()} border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group relative overflow-hidden`}>
      {/* Background pattern for treasured memories */}
      {memory.significance === 'treasured' && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(120,119,198,0.3),_transparent_50%),radial-gradient(circle_at_80%_20%,_rgba(255,119,198,0.3),_transparent_50%)]"></div>
        </div>
      )}
      
      <CardContent className="p-4 relative z-10" onClick={onSelect}>
        {/* Header with metadata */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{significance.icon}</span>
            <div>
              <h3 className="font-supportive text-peace-800 text-sm group-hover:text-peace-900">
                {memory.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-peace-600 mt-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{memory.date.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: memory.date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                })}</span>
                <span>•</span>
                <span>{memory.messageCount} exchanges</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {memory.isFavorite && (
              <HeartIcon className="w-4 h-4 text-rose-500 fill-current" />
            )}
            {memory.significance !== 'everyday' && (
              <Badge className={`text-xs ${significance.color} bg-white/60`}>
                {significance.label}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Conversation preview */}
        <div className="space-y-2 mb-3">
          <p className="text-sm text-peace-700 leading-relaxed line-clamp-2">
            {memory.preview}
          </p>
          
          {/* Last message indicator */}
          <div className="flex items-center gap-2 text-xs text-peace-500">
            <div className={`w-2 h-2 rounded-full ${
              memory.lastMessage.speaker === 'assistant' 
                ? 'bg-hope-400' 
                : 'bg-comfort-400'
            }`}></div>
            <span className="truncate flex-1">
              {memory.lastMessage.speaker === 'assistant' 
                ? (familyMemberName ? `${familyMemberName}: ` : 'AI: ')
                : 'You: '
              }
              {memory.lastMessage.content.substring(0, 60)}
              {memory.lastMessage.content.length > 60 ? '...' : ''}
            </span>
          </div>
        </div>
        
        {/* Emotional highlights */}
        {memory.emotions.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {memory.emotions.slice(0, 3).map((emotion, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-white/40 rounded-comfort px-2 py-1"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  emotion.intensity > 0.7 ? 'bg-current opacity-100' :
                  emotion.intensity > 0.4 ? 'bg-current opacity-70' :
                  'bg-current opacity-40'
                }`}></div>
                <span className="text-xs capitalize text-peace-700">
                  {emotion.type}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Tags */}
        {memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {memory.tags.slice(0, 4).map((tag, index) => (
              <Badge 
                key={index}
                variant="outline"
                className="text-xs bg-white/40 border-hope-300"
              >
                {tag}
              </Badge>
            ))}
            {memory.tags.length > 4 && (
              <Badge variant="outline" className="text-xs bg-white/40 border-hope-300">
                +{memory.tags.length - 4} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onFavoriteToggle()
              }}
              className={`h-7 px-2 ${memory.isFavorite ? 'text-rose-500' : 'text-peace-500 hover:text-rose-500'}`}
            >
              <HeartIcon className={`w-3 h-3 ${memory.isFavorite ? 'fill-current' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onArchiveToggle()
              }}
              className="h-7 px-2 text-peace-500 hover:text-peace-700"
            >
              <ArchiveIcon className="w-3 h-3" />
            </Button>
          </div>
          
          <div className="text-xs text-peace-500">
            {memory.lastMessage.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  memories = [],
  familyMemberName,
  onSelectMemory,
  onFavoriteToggle,
  onArchiveToggle,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<MemoryFilterOptions>({
    timeRange: 'all',
    emotionalTone: 'all',
    significance: 'all',
    showArchived: false,
    favoritesOnly: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const [filteredMemories, setFilteredMemories] = useState<ConversationMemory[]>(memories)
  const [selectedMemory, setSelectedMemory] = useState<ConversationMemory | null>(null)
  
  // Filter memories based on search and filters
  const filterMemories = useCallback(() => {
    let filtered = memories.filter(memory => {
      // Archive filter
      if (!selectedFilters.showArchived && memory.isArchived) return false
      
      // Favorites filter
      if (selectedFilters.favoritesOnly && !memory.isFavorite) return false
      
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const searchableContent = [
          memory.title,
          memory.preview,
          memory.fullContent,
          ...memory.tags,
          ...memory.highlights,
          memory.lastMessage.content
        ].join(' ').toLowerCase()
        
        if (!searchableContent.includes(query)) return false
      }
      
      // Time range filter
      if (selectedFilters.timeRange !== 'all') {
        const now = new Date()
        const memoryDate = memory.date
        
        switch (selectedFilters.timeRange) {
          case 'today':
            if (memoryDate.toDateString() !== now.toDateString()) return false
            break
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            if (memoryDate < weekAgo) return false
            break
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            if (memoryDate < monthAgo) return false
            break
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
            if (memoryDate < yearAgo) return false
            break
        }
      }
      
      // Emotional tone filter
      if (selectedFilters.emotionalTone !== 'all' && memory.emotionalTone !== selectedFilters.emotionalTone) {
        return false
      }
      
      // Significance filter
      if (selectedFilters.significance !== 'all' && memory.significance !== selectedFilters.significance) {
        return false
      }
      
      return true
    })
    
    // Sort by significance and date
    filtered.sort((a, b) => {
      const significanceOrder = { treasured: 4, precious: 3, meaningful: 2, everyday: 1 }
      const aSignificance = significanceOrder[a.significance]
      const bSignificance = significanceOrder[b.significance]
      
      if (aSignificance !== bSignificance) {
        return bSignificance - aSignificance
      }
      
      return b.date.getTime() - a.date.getTime()
    })
    
    setFilteredMemories(filtered)
  }, [memories, searchQuery, selectedFilters])
  
  useEffect(() => {
    filterMemories()
  }, [filterMemories])
  
  // Handle memory selection
  const handleSelectMemory = (memory: ConversationMemory) => {
    setSelectedMemory(memory)
    onSelectMemory?.(memory)
  }
  
  // Handle favorite toggle
  const handleFavoriteToggle = (memoryId: string) => {
    onFavoriteToggle?.(memoryId)
  }
  
  // Handle archive toggle
  const handleArchiveToggle = (memoryId: string) => {
    onArchiveToggle?.(memoryId)
  }
  
  // Get memory statistics
  const getMemoryStats = () => {
    const total = memories.length
    const favorites = memories.filter(m => m.isFavorite).length
    const treasured = memories.filter(m => m.significance === 'treasured').length
    const thisMonth = memories.filter(m => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      return m.date > monthAgo
    }).length
    
    return { total, favorites, treasured, thisMonth }
  }
  
  const stats = getMemoryStats()
  
  return (
    <div className={`conversation-history space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 text-hope-600" />
            <div>
              <h2 className="text-xl font-compassionate text-peace-800">
                {familyMemberName ? `Memories with ${familyMemberName}` : 'Conversation Memories'}
              </h2>
              <p className="text-sm text-peace-600">
                Treasured moments from your conversations
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <FilterIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/60 rounded-embrace p-3 text-center border border-hope-200">
            <div className="text-lg font-supportive text-hope-600">{stats.total}</div>
            <div className="text-xs text-peace-600">Total Memories</div>
          </div>
          <div className="bg-rose-50 rounded-embrace p-3 text-center border border-rose-200">
            <div className="text-lg font-supportive text-rose-600">{stats.favorites}</div>
            <div className="text-xs text-peace-600">Favorites</div>
          </div>
          <div className="bg-purple-50 rounded-embrace p-3 text-center border border-purple-200">
            <div className="text-lg font-supportive text-purple-600">{stats.treasured}</div>
            <div className="text-xs text-peace-600">Treasured</div>
          </div>
          <div className="bg-amber-50 rounded-embrace p-3 text-center border border-amber-200">
            <div className="text-lg font-supportive text-amber-600">{stats.thisMonth}</div>
            <div className="text-xs text-peace-600">This Month</div>
          </div>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-peace-400" />
          <Input
            placeholder="Search memories, emotions, or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/60 border-hope-200 focus:border-hope-400"
          />
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <Card className="bg-white/80 backdrop-blur-sm border-hope-200">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Time Range */}
                <div className="space-y-2">
                  <label className="text-sm font-supportive text-peace-700">Time Range</label>
                  <select
                    value={selectedFilters.timeRange}
                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-hope-200 rounded-comfort text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                
                {/* Emotional Tone */}
                <div className="space-y-2">
                  <label className="text-sm font-supportive text-peace-700">Emotional Tone</label>
                  <select
                    value={selectedFilters.emotionalTone}
                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, emotionalTone: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-hope-200 rounded-comfort text-sm"
                  >
                    <option value="all">All Emotions</option>
                    <option value="loving">Loving</option>
                    <option value="wise">Wise</option>
                    <option value="comforting">Comforting</option>
                    <option value="reflective">Reflective</option>
                    <option value="celebratory">Celebratory</option>
                  </select>
                </div>
                
                {/* Significance */}
                <div className="space-y-2">
                  <label className="text-sm font-supportive text-peace-700">Significance</label>
                  <select
                    value={selectedFilters.significance}
                    onChange={(e) => setSelectedFilters(prev => ({ ...prev, significance: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white border border-hope-200 rounded-comfort text-sm"
                  >
                    <option value="all">All Levels</option>
                    <option value="treasured">Treasured</option>
                    <option value="precious">Precious</option>
                    <option value="meaningful">Meaningful</option>
                    <option value="everyday">Everyday</option>
                  </select>
                </div>
                
                {/* Special Filters */}
                <div className="space-y-3">
                  <label className="text-sm font-supportive text-peace-700">Special</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.favoritesOnly}
                        onChange={(e) => setSelectedFilters(prev => ({ ...prev, favoritesOnly: e.target.checked }))}
                        className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded"
                      />
                      <span className="text-sm text-peace-700">Favorites only</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFilters.showArchived}
                        onChange={(e) => setSelectedFilters(prev => ({ ...prev, showArchived: e.target.checked }))}
                        className="w-4 h-4 text-hope-600 bg-white border-hope-300 rounded"
                      />
                      <span className="text-sm text-peace-700">Show archived</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Results */}
      <div className="space-y-4">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <SparklesIcon className="w-12 h-12 text-peace-300 mx-auto mb-4" />
            <h3 className="text-lg font-compassionate text-peace-700 mb-2">
              No memories found
            </h3>
            <p className="text-sm text-peace-600">
              {searchQuery.trim() 
                ? "Try adjusting your search or filters to find more memories."
                : "Start a conversation to create your first precious memory."
              }
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-peace-600">
                {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} found
              </p>
              
              {searchQuery.trim() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="text-peace-500 hover:text-peace-700"
                >
                  Clear search
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onSelect={() => handleSelectMemory(memory)}
                  onFavoriteToggle={() => handleFavoriteToggle(memory.id)}
                  onArchiveToggle={() => handleArchiveToggle(memory.id)}
                  familyMemberName={familyMemberName}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ConversationHistory