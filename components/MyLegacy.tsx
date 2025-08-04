'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DeleteMemoryDialog from '@/components/DeleteMemoryDialog'

interface SavedResponse {
  id: string
  response_text: string
  word_count: number
  created_at: string
  updated_at: string
  question_id: string
  question_text: string
  category: string
}

interface LifeDetailEntry {
  id: string
  entry_date: string
  title: string
  content: string
  category: string
  tags: string[]
  related_people: string[]
  emotional_depth: number
  is_private: boolean
  created_at: string
  updated_at: string
}

interface LegacyItem {
  id: string
  type: 'response' | 'entry'
  title: string
  content: string
  category: string
  created_at: string
  updated_at: string
  word_count?: number
  tags?: string[]
  related_people?: string[]
  emotional_depth?: number
  question_id?: string
}

export default function MyLegacy() {
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    item: LegacyItem | null
  }>({ open: false, item: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadLegacyData()
  }, [])

  // Refresh data when component becomes visible (e.g., after creating a new entry)
  useEffect(() => {
    const handleFocus = () => {
      loadLegacyData()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadLegacyData = async () => {
    try {
      setIsLoading(true)
      
      // Load both responses and life detail entries
      const [responsesRes, entriesRes] = await Promise.all([
        fetch('/api/responses?limit=50'),
        fetch('/api/milestones?type=entries&limit=50')
      ])
      
      const responsesData = await responsesRes.json()
      const entriesData = await entriesRes.json()
      
      const combinedItems: LegacyItem[] = []
      
      // Add responses
      if (responsesData.success && responsesData.responses) {
        responsesData.responses.forEach((response: SavedResponse) => {
          combinedItems.push({
            id: response.id,
            type: 'response',
            title: response.question_text,
            content: response.response_text,
            category: response.category,
            created_at: response.created_at,
            updated_at: response.updated_at,
            word_count: response.word_count,
            question_id: response.question_id
          })
        })
      }
      
      // Add life detail entries
      if (entriesData.entries) {
        entriesData.entries.forEach((entry: LifeDetailEntry) => {
          combinedItems.push({
            id: entry.id,
            type: 'entry',
            title: entry.title,
            content: entry.content,
            category: entry.category,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            word_count: entry.content.split(/\s+/).filter(w => w).length,
            tags: entry.tags,
            related_people: entry.related_people,
            emotional_depth: entry.emotional_depth
          })
        })
      }
      
      // Sort by creation date (newest first)
      combinedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setLegacyItems(combinedItems)
    } catch (error) {
      console.error('Error loading legacy data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (item: LegacyItem) => {
    setEditingId(item.id)
    setEditText(item.content)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (item: LegacyItem) => {
    if (!editText.trim()) return

    try {
      setIsSaving(true)
      
      if (item.type === 'response') {
        // Save response edit
        const result = await fetch('/api/responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId: item.question_id,
            responseText: editText,
            isDraft: false
          })
        })

        if (result.ok) {
          // Update the local state
          setLegacyItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, content: editText, word_count: editText.split(/\s+/).length }
              : i
          ))
          setEditingId(null)
          setEditText('')
        } else {
          const errorData = await result.json()
          alert('Failed to save changes: ' + (errorData.error || 'Unknown error'))
        }
      } else {
        // Save life detail entry edit
        const result = await fetch('/api/milestones', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            type: 'entry',
            content: editText
          })
        })

        if (result.ok) {
          // Update the local state
          setLegacyItems(prev => prev.map(i => 
            i.id === item.id 
              ? { ...i, content: editText, word_count: editText.split(/\s+/).length }
              : i
          ))
          setEditingId(null)
          setEditText('')
        } else {
          const errorData = await result.json()
          alert('Failed to save changes: ' + (errorData.error || 'Unknown error'))
        }
      }
    } catch (error) {
      console.error('Error saving edit:', error)
      alert('Network error while saving changes')
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openDeleteDialog = (item: LegacyItem) => {
    setDeleteDialog({ open: true, item })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ open: false, item: null })
  }

  const handleDelete = async () => {
    if (!deleteDialog.item) return

    try {
      setIsDeleting(true)
      const item = deleteDialog.item

      let deleteUrl = ''
      if (item.type === 'response') {
        deleteUrl = `/api/responses?id=${item.id}`
      } else {
        deleteUrl = `/api/milestones?id=${item.id}&type=entry`
      }

      const result = await fetch(deleteUrl, {
        method: 'DELETE',
      })

      if (result.ok) {
        // Remove from local state
        setLegacyItems(prev => prev.filter(i => i.id !== item.id))
        
        // Show success message
        const itemType = item.type === 'response' ? 'Response' : 'Life entry'
        setSuccessMessage(`${itemType} deleted successfully`)
        setTimeout(() => setSuccessMessage(null), 3000)
        
        closeDeleteDialog()
      } else {
        const errorData = await result.json()
        alert('Failed to delete: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Network error while deleting')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="text-lg">Loading your preserved responses...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center bg-gradient-to-br from-hope-50 to-comfort-50 rounded-sanctuary p-embrace border border-hope-200">
        <h1 className="text-3xl font-gentle text-hope-800 mb-2">📝 My Legacy</h1>
        <p className="text-comfort text-hope-700 max-w-2xl mx-auto">
          Review and refine the wisdom you&apos;ve preserved. Each response becomes part of your irreplaceable digital legacy.
        </p>
        <div className="mt-4 text-gentle text-hope-600">
          {legacyItems.length} items preserved • {legacyItems.reduce((total, item) => total + (item.word_count || 0), 0)} words of wisdom
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-embrace p-4 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2">
            <span className="text-green-600 text-lg">✅</span>
            <span className="text-green-800 font-gentle">{successMessage}</span>
          </div>
        </div>
      )}

      {legacyItems.length === 0 ? (
        <Card className="text-center bg-gradient-to-br from-comfort-50 to-peace-50">
          <CardContent className="pt-8 pb-8">
            <div className="text-6xl mb-4">💭</div>
            <h3 className="text-xl font-gentle text-peace-800 mb-2">No Legacy Items Yet</h3>
            <p className="text-comfort text-peace-600 mb-4">
              Start your legacy journey by answering questions or creating life detail entries.
            </p>
            <Button 
              onClick={() => window.history.back()}
              className="bg-hope-500 hover:bg-hope-600"
            >
              Begin Your Legacy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {legacyItems.map((item) => (
            <Card key={item.id} className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium px-2 py-1 rounded-full bg-gradient-to-r from-hope-100 to-comfort-100 text-hope-700">
                        {item.type === 'response' ? '💭 Response' : '📖 Life Entry'}
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1">
                          {item.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-full bg-memory-100 text-memory-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg font-compassionate text-peace-800 leading-relaxed">
                      {item.title}
                    </CardTitle>
                    <CardDescription className="text-comfort text-peace-600 mt-2">
                      {item.category} • {formatDate(item.created_at)} • {item.word_count} words
                      {item.related_people && item.related_people.length > 0 && (
                        <span className="ml-2">• People: {item.related_people.join(', ')}</span>
                      )}
                    </CardDescription>
                  </div>
                  {editingId !== item.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(item)}
                        className="text-hope-600 hover:text-hope-700 hover:bg-hope-50"
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(item)}
                        className="text-peace-500 hover:text-red-600 hover:bg-red-50 opacity-70 hover:opacity-100 transition-all duration-200"
                        title="Delete this memory"
                      >
                        🗑️
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingId === item.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full min-h-32 px-4 py-3 border-2 border-hope-200 rounded-embrace focus:border-hope-400 focus:ring-4 focus:ring-hope-100 font-compassionate leading-relaxed resize-y"
                      placeholder="Refine your response..."
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-peace-500">
                        {editText.length} characters • {editText.split(/\s+/).filter(w => w).length} words
                      </span>
                      <div className="space-x-3">
                        <Button 
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="border-peace-300 text-peace-700 hover:bg-peace-50"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => saveEdit(item)}
                          disabled={!editText.trim() || isSaving}
                          className="bg-hope-500 hover:bg-hope-600"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-sanctuary border border-peace-200 p-embrace">
                    <p className="text-comfort leading-relaxed font-compassionate text-peace-800 whitespace-pre-wrap">
                      {item.content}
                    </p>
                    {item.updated_at !== item.created_at && (
                      <div className="mt-3 text-xs text-comfort-600 font-supportive">
                        Last updated: {formatDate(item.updated_at)}
                      </div>
                    )}
                    {item.emotional_depth && (
                      <div className="mt-3 text-xs text-memory-600 font-supportive">
                        Emotional depth: {item.emotional_depth}/10
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Encouragement */}
      <div className="text-center bg-gradient-to-r from-comfort-50 to-hope-50 rounded-sanctuary p-embrace">
        <p className="text-comfort text-peace-700 font-compassionate">
          💝 Each refinement makes your legacy more authentic and meaningful for those you love
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteMemoryDialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        memoryTitle={deleteDialog.item?.title || ''}
        memoryType={deleteDialog.item?.type || 'response'}
        isDeleting={isDeleting}
      />
    </div>
  )
}