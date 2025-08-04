'use client'

import { useState } from 'react'
import { MilestoneType, milestoneTemplates } from '@/lib/milestone-messages'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MilestoneCreatorProps {
  onSave: (milestone: any) => void
  onCancel: () => void
  initialData?: any
  defaultTab?: 'milestone' | 'diary'
}

export default function MilestoneCreator({ onSave, onCancel, initialData, defaultTab = 'milestone' }: MilestoneCreatorProps) {
  const [activeTab, setActiveTab] = useState<'milestone' | 'diary'>(defaultTab)
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('wedding')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    // Milestone fields
    recipientName: initialData?.recipientName || '',
    messageTitle: initialData?.messageTitle || '',
    messageContent: initialData?.messageContent || '',
    triggerDate: initialData?.triggerDate || '',
    triggerAge: initialData?.triggerAge || '',
    triggerEvent: initialData?.triggerEvent || '',
    emotionalTone: initialData?.emotionalTone || 'loving',
    
    // Life detail entry fields
    entryTitle: initialData?.title || '',
    entryContent: initialData?.content || '',
    entryCategory: initialData?.category || 'memory',
    emotionalDepth: initialData?.emotionalDepth || 5,
    relatedPeople: initialData?.relatedPeople?.join(', ') || '',
    
    // Common fields
    tags: initialData?.tags?.join(', ') || '',
    isPrivate: initialData?.isPrivate || false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      if (activeTab === 'milestone') {
        await onSave({
          type: 'milestone',
          milestoneType,
          recipientName: formData.recipientName,
          messageTitle: formData.messageTitle,
          messageContent: formData.messageContent,
          triggerDate: formData.triggerDate || null,
          triggerAge: formData.triggerAge ? parseInt(formData.triggerAge) : null,
          triggerEvent: formData.triggerEvent || null,
          emotionalTone: formData.emotionalTone,
          tags: formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t),
          isPrivate: formData.isPrivate
        })
      } else {
        await onSave({
          type: 'entry',
          title: formData.entryTitle,
          content: formData.entryContent,
          category: formData.entryCategory,
          emotionalDepth: formData.emotionalDepth,
          relatedPeople: formData.relatedPeople.split(',').map((p: string) => p.trim()).filter((p: string) => p),
          tags: formData.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t),
          isPrivate: formData.isPrivate
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentTemplate = milestoneTemplates[milestoneType]

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('milestone')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'milestone'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Milestone Message
        </button>
        <button
          onClick={() => setActiveTab('diary')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'diary'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Life Detail Entry
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'milestone' ? (
          <>
            {/* Milestone Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Milestone Type</label>
              <Select
                value={milestoneType}
                onValueChange={(value) => setMilestoneType(value as MilestoneType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose milestone type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(milestoneTemplates).map(([type, template]) => (
                    <SelectItem key={type} value={type}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-sm text-gray-600">{currentTemplate.description}</p>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Who is this message for?
              </label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                placeholder="e.g., My daughter Sarah, My children, Anyone who needs it"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Message Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Message Title</label>
              <input
                type="text"
                value={formData.messageTitle}
                onChange={(e) => setFormData({ ...formData, messageTitle: e.target.value })}
                placeholder="Give your message a meaningful title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Message</label>
              <div className="mb-2">
                <p className="text-sm text-gray-600">Consider these prompts:</p>
                <ul className="text-sm text-gray-500 ml-4 list-disc">
                  {currentTemplate.prompts.slice(0, 3).map((prompt, i) => (
                    <li key={i}>{prompt}</li>
                  ))}
                </ul>
              </div>
              <textarea
                value={formData.messageContent}
                onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                rows={8}
                placeholder="Write your heartfelt message here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Trigger Conditions */}
            <div className="space-y-4">
              <h3 className="font-medium">When should this message be delivered?</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">On a specific date</label>
                <input
                  type="date"
                  value={formData.triggerDate}
                  onChange={(e) => setFormData({ ...formData, triggerDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">When they reach a certain age</label>
                <input
                  type="number"
                  value={formData.triggerAge}
                  onChange={(e) => setFormData({ ...formData, triggerAge: e.target.value })}
                  placeholder="e.g., 18, 21, 30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">When a specific event happens</label>
                <input
                  type="text"
                  value={formData.triggerEvent}
                  onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
                  placeholder="e.g., First child born, College graduation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Emotional Tone */}
            <div>
              <label className="block text-sm font-medium mb-2">Emotional Tone</label>
              <Select
                value={formData.emotionalTone}
                onValueChange={(value) => setFormData({ ...formData, emotionalTone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose emotional tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celebratory">🎉 Celebratory</SelectItem>
                  <SelectItem value="supportive">🤗 Supportive</SelectItem>
                  <SelectItem value="guiding">🧭 Guiding</SelectItem>
                  <SelectItem value="loving">💝 Loving</SelectItem>
                  <SelectItem value="reflective">🤔 Reflective</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <>
            {/* Life Detail Entry Form */}
            <div>
              <label className="block text-sm font-medium mb-2">Entry Title</label>
              <input
                type="text"
                value={formData.entryTitle}
                onChange={(e) => setFormData({ ...formData, entryTitle: e.target.value })}
                placeholder="Give this memory or reflection a title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <Select
                value={formData.entryCategory}
                onValueChange={(value) => setFormData({ ...formData, entryCategory: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose entry category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="memory">📷 Memory</SelectItem>
                  <SelectItem value="reflection">💭 Reflection</SelectItem>
                  <SelectItem value="advice">💡 Advice</SelectItem>
                  <SelectItem value="story">📚 Story</SelectItem>
                  <SelectItem value="feeling">❤️ Feeling</SelectItem>
                  <SelectItem value="observation">👁️ Observation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Entry Content</label>
              <textarea
                value={formData.entryContent}
                onChange={(e) => setFormData({ ...formData, entryContent: e.target.value })}
                rows={10}
                placeholder="Write your thoughts, memories, or reflections here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Emotional Depth (1-10)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.emotionalDepth}
                onChange={(e) => setFormData({ ...formData, emotionalDepth: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>Light</span>
                <span className="font-medium">{formData.emotionalDepth}</span>
                <span>Deep</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                People Mentioned (comma-separated)
              </label>
              <input
                type="text"
                value={formData.relatedPeople}
                onChange={(e) => setFormData({ ...formData, relatedPeople: e.target.value })}
                placeholder="e.g., Sarah, Mom, Grandpa Joe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="e.g., family, wisdom, love, memories"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPrivate"
            checked={formData.isPrivate}
            onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="isPrivate" className="text-sm">
            Keep this private (only accessible by specific recipients)
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : `Save ${activeTab === 'milestone' ? 'Milestone' : 'Entry'}`}
          </button>
        </div>
      </form>
    </div>
  )
}