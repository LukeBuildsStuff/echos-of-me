'use client'

import { useState } from 'react'
import { MilestoneType, milestoneTemplates } from '@/lib/milestone-messages'

interface MilestoneCreatorProps {
  onSave: (milestone: any) => void
  onCancel: () => void
  initialData?: any
}

export default function MilestoneCreator({ onSave, onCancel, initialData }: MilestoneCreatorProps) {
  const [activeTab, setActiveTab] = useState<'milestone' | 'diary'>('milestone')
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('wedding')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (activeTab === 'milestone') {
      onSave({
        type: 'milestone',
        milestoneType,
        recipientName: formData.recipientName,
        messageTitle: formData.messageTitle,
        messageContent: formData.messageContent,
        triggerDate: formData.triggerDate || null,
        triggerAge: formData.triggerAge ? parseInt(formData.triggerAge) : null,
        triggerEvent: formData.triggerEvent || null,
        emotionalTone: formData.emotionalTone,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        isPrivate: formData.isPrivate
      })
    } else {
      onSave({
        type: 'entry',
        title: formData.entryTitle,
        content: formData.entryContent,
        category: formData.entryCategory,
        emotionalDepth: formData.emotionalDepth,
        relatedPeople: formData.relatedPeople.split(',').map(p => p.trim()).filter(p => p),
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        isPrivate: formData.isPrivate
      })
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
              <select
                value={milestoneType}
                onChange={(e) => setMilestoneType(e.target.value as MilestoneType)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(milestoneTemplates).map(([type, template]) => (
                  <option key={type} value={type}>
                    {template.title}
                  </option>
                ))}
              </select>
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
              <select
                value={formData.emotionalTone}
                onChange={(e) => setFormData({ ...formData, emotionalTone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="celebratory">Celebratory</option>
                <option value="supportive">Supportive</option>
                <option value="guiding">Guiding</option>
                <option value="loving">Loving</option>
                <option value="reflective">Reflective</option>
              </select>
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
              <select
                value={formData.entryCategory}
                onChange={(e) => setFormData({ ...formData, entryCategory: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="memory">Memory</option>
                <option value="reflection">Reflection</option>
                <option value="advice">Advice</option>
                <option value="story">Story</option>
                <option value="feeling">Feeling</option>
                <option value="observation">Observation</option>
              </select>
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save {activeTab === 'milestone' ? 'Milestone' : 'Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}