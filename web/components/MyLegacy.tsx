'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

export default function MyLegacy() {
  const [responses, setResponses] = useState<SavedResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadResponses()
  }, [])

  const loadResponses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/responses?limit=50')
      const data = await response.json()
      
      if (data.success && data.responses) {
        setResponses(data.responses)
      } else {
        console.error('Failed to load responses:', data.error)
      }
    } catch (error) {
      console.error('Error loading responses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEditing = (response: SavedResponse) => {
    setEditingId(response.id)
    setEditText(response.response_text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (responseId: string, questionId: string) => {
    if (!editText.trim()) return

    try {
      setIsSaving(true)
      const result = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: questionId,
          responseText: editText,
          isDraft: false
        })
      })

      if (result.ok) {
        // Update the local state
        setResponses(prev => prev.map(r => 
          r.id === responseId 
            ? { ...r, response_text: editText, word_count: editText.split(/\s+/).length }
            : r
        ))
        setEditingId(null)
        setEditText('')
      } else {
        const errorData = await result.json()
        alert('Failed to save changes: ' + (errorData.error || 'Unknown error'))
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
          Review and refine the wisdom you've preserved. Each response becomes part of your irreplaceable digital legacy.
        </p>
        <div className="mt-4 text-gentle text-hope-600">
          {responses.length} responses preserved • {responses.reduce((total, r) => total + r.word_count, 0)} words of wisdom
        </div>
      </div>

      {responses.length === 0 ? (
        <Card className="text-center bg-gradient-to-br from-comfort-50 to-peace-50">
          <CardContent className="pt-8 pb-8">
            <div className="text-6xl mb-4">💭</div>
            <h3 className="text-xl font-gentle text-peace-800 mb-2">No Responses Yet</h3>
            <p className="text-comfort text-peace-600 mb-4">
              Start your legacy journey by answering some meaningful questions.
            </p>
            <Button 
              onClick={() => window.history.back()}
              className="bg-hope-500 hover:bg-hope-600"
            >
              Answer Your First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {responses.map((response) => (
            <Card key={response.id} className="bg-gradient-to-br from-white to-comfort-50 border border-peace-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-compassionate text-peace-800 leading-relaxed">
                      {response.question_text}
                    </CardTitle>
                    <CardDescription className="text-comfort text-peace-600 mt-2">
                      {response.category} • {formatDate(response.created_at)} • {response.word_count} words
                    </CardDescription>
                  </div>
                  {editingId !== response.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(response)}
                      className="text-hope-600 hover:text-hope-700 hover:bg-hope-50"
                    >
                      ✏️ Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingId === response.id ? (
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
                          onClick={() => saveEdit(response.id, response.question_id)}
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
                      {response.response_text}
                    </p>
                    {response.updated_at !== response.created_at && (
                      <div className="mt-3 text-xs text-comfort-600 font-supportive">
                        Last updated: {formatDate(response.updated_at)}
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
    </div>
  )
}