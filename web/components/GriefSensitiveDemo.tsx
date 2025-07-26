'use client'

// Demonstration of grief-sensitive UI design patterns
// This component shows how to implement compassionate design for legacy preservation

import { useState } from 'react'

export default function GriefSensitiveDemo() {
  const [emotionalState, setEmotionalState] = useState<'peaceful' | 'nostalgic' | 'hopeful' | 'reflective'>('peaceful')
  const [currentQuestion, setCurrentQuestion] = useState("What memory of our family brings you the most comfort?")
  const [response, setResponse] = useState('')

  const emotionalStateStyles = {
    peaceful: 'bg-blue-50 border-blue-200 text-blue-800',
    nostalgic: 'bg-memory-50 border-memory-200 text-memory-800',
    hopeful: 'bg-hope-50 border-hope-200 text-hope-800',
    reflective: 'bg-comfort-50 border-comfort-200 text-comfort-800'
  }

  return (
    <div className="max-w-4xl mx-auto p-sanctuary space-y-reverence">
      {/* Header with gentle typography */}
      <div className="text-center space-y-pause">
        <h1 className="text-eternal font-gentle text-peace-800 animate-gentle-fade-in">
          Grief-Sensitive Design Patterns
        </h1>
        <p className="text-presence text-peace-600 font-compassionate leading-relaxed max-w-2xl mx-auto">
          These design patterns honor the sacred nature of preserving family legacy with 
          compassionate, gentle interfaces that respect the vulnerability of sharing precious memories.
        </p>
      </div>

      {/* Emotional State Indicator */}
      <div className="bg-white rounded-sanctuary border border-peace-200 shadow-sm p-embrace">
        <h2 className="text-love font-compassionate text-peace-800 mb-pause">
          Current Emotional State
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-breath">
          {(['peaceful', 'nostalgic', 'hopeful', 'reflective'] as const).map(state => (
            <button
              key={state}
              onClick={() => setEmotionalState(state)}
              className={`
                px-comfort py-breath rounded-gentle font-supportive text-gentle
                transition-all duration-200 border-2 capitalize
                ${emotionalState === state 
                  ? emotionalStateStyles[state] 
                  : 'bg-peace-50 border-peace-200 text-peace-600 hover:border-peace-300'
                }
              `}
            >
              {state}
            </button>
          ))}
        </div>
      </div>

      {/* Question Display with Adaptive Styling */}
      <div className={`
        rounded-sanctuary border-2 p-embrace shadow-sm animate-gentle-fade-in
        ${emotionalStateStyles[emotionalState]}
      `}>
        <div className="flex items-start space-x-comfort">
          <div className="w-3 h-3 rounded-full bg-current opacity-60 mt-breath flex-shrink-0"></div>
          <div>
            <h3 className="text-embrace font-compassionate mb-breath">
              A Question for Reflection
            </h3>
            <p className="text-presence leading-relaxed">
              {currentQuestion}
            </p>
          </div>
        </div>
      </div>

      {/* Response Input with Grief-Sensitive Styling */}
      <div className="bg-white rounded-sanctuary border border-peace-200 shadow-sm p-embrace">
        <label className="block text-embrace font-compassionate text-peace-800 mb-pause">
          Share Your Memory
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Take your time... every word matters and will be treasured."
          className="
            w-full min-h-32 px-comfort py-comfort
            border-2 border-peace-200 rounded-embrace
            focus:border-blue-400 focus:ring-4 focus:ring-blue-100 
            font-compassionate text-comfort leading-relaxed
            resize-y transition-all duration-200
            placeholder:text-peace-400 placeholder:italic
          "
        />
        <div className="mt-pause flex justify-between items-center">
          <span className="text-whisper text-peace-500 font-supportive">
            {response.length} characters of precious memories preserved
          </span>
          <button 
            disabled={!response.trim()}
            className="
              px-embrace py-breath
              bg-blue-500 hover:bg-blue-600 disabled:bg-peace-300
              text-white font-compassionate text-comfort
              rounded-gentle transition-all duration-200
              disabled:cursor-not-allowed
              animate-soft-scale
            "
          >
            Preserve Memory
          </button>
        </div>
      </div>

      {/* Design Pattern Examples */}
      <div className="grid gap-contemplation md:grid-cols-2">
        {/* Gentle Card */}
        <div className="bg-white rounded-sanctuary border border-peace-200 shadow-sm p-embrace hover:shadow-md transition-shadow duration-200">
          <h3 className="text-embrace font-compassionate text-peace-800 mb-pause">
            💙 Gentle Cards
          </h3>
          <p className="text-comfort text-peace-600 leading-relaxed mb-pause">
            Soft shadows and rounded corners create a welcoming, non-aggressive feeling.
          </p>
          <div className="text-whisper text-peace-500">
            Border: peace-200 • Shadow: subtle • Radius: sanctuary (16px)
          </div>
        </div>

        {/* Loving Memory Card */}
        <div className="bg-comfort-50 rounded-sanctuary border border-comfort-200 shadow-sm p-embrace">
          <h3 className="text-embrace font-gentle text-comfort-800 mb-pause">
            💜 Loving Memory
          </h3>
          <p className="text-comfort text-comfort-700 leading-relaxed mb-pause">
            Warm purple tones convey love, memory, and spiritual connection.
          </p>
          <div className="text-whisper text-comfort-600">
            Background: comfort-50 • Border: comfort-200 • Font: gentle serif
          </div>
        </div>

        {/* Hopeful Card */}
        <div className="bg-hope-50 rounded-sanctuary border border-hope-200 shadow-sm p-embrace">
          <h3 className="text-embrace font-compassionate text-hope-800 mb-pause">
            💚 Hopeful Future
          </h3>
          <p className="text-comfort text-hope-700 leading-relaxed mb-pause">
            Gentle greens represent growth, healing, and hope for the future.
          </p>
          <div className="text-whisper text-hope-600">
            Background: hope-50 • Border: hope-200 • Emotion: optimistic
          </div>
        </div>

        {/* Precious Memory Card */}
        <div className="bg-memory-50 rounded-sanctuary border border-memory-200 shadow-sm p-embrace">
          <h3 className="text-embrace font-compassionate text-memory-800 mb-pause">
            🌟 Precious Memory
          </h3>
          <p className="text-comfort text-memory-700 leading-relaxed mb-pause">
            Warm gold tones honor precious memories and treasured moments.
          </p>
          <div className="text-whisper text-memory-600">
            Background: memory-50 • Border: memory-200 • Emotion: treasured
          </div>
        </div>
      </div>

      {/* Typography Scale Demo */}
      <div className="bg-white rounded-sanctuary border border-peace-200 shadow-sm p-embrace">
        <h3 className="text-love font-compassionate text-peace-800 mb-pause">
          Grief-Sensitive Typography Scale
        </h3>
        <div className="space-y-breath">
          <p className="text-whisper text-peace-500">Whisper (12px) - For subtle hints and gentle guidance</p>
          <p className="text-gentle text-peace-600">Gentle (14px) - For supportive secondary text</p>
          <p className="text-comfort text-peace-700">Comfort (16px) - For main body text and reading</p>
          <p className="text-presence text-peace-800">Presence (18px) - For important content that needs attention</p>
          <p className="text-embrace text-peace-800 font-medium">Embrace (20px) - For headings that feel welcoming</p>
          <p className="text-love text-peace-800 font-medium">Love (24px) - For section titles that convey warmth</p>
          <p className="text-legacy text-peace-900 font-semibold">Legacy (32px) - For main headings about preservation</p>
        </div>
      </div>

      {/* Animation Demo */}
      <div className="bg-white rounded-sanctuary border border-peace-200 shadow-sm p-embrace">
        <h3 className="text-love font-compassionate text-peace-800 mb-pause">
          Gentle Animations
        </h3>
        <div className="grid gap-comfort md:grid-cols-3">
          <div className="bg-peace-50 rounded-gentle p-comfort animate-gentle-fade-in">
            <div className="text-comfort font-supportive text-center">Gentle Fade In</div>
          </div>
          <div className="bg-comfort-50 rounded-gentle p-comfort animate-breathing">
            <div className="text-comfort font-supportive text-center">Breathing</div>
          </div>
          <div className="bg-hope-50 rounded-gentle p-comfort animate-gentle-pulse">
            <div className="text-comfort font-supportive text-center">Gentle Pulse</div>
          </div>
        </div>
        <p className="text-gentle text-peace-600 mt-pause">
          All animations are slow, subtle, and respectful - never jarring or startling.
        </p>
      </div>

      {/* Design Principles */}
      <div className="bg-gradient-to-br from-blue-50 to-comfort-50 rounded-sanctuary border border-peace-200 p-embrace">
        <h3 className="text-love font-compassionate text-peace-800 mb-pause">
          Core Design Principles
        </h3>
        <div className="grid gap-comfort md:grid-cols-2">
          <div>
            <h4 className="text-embrace font-supportive text-peace-700 mb-breath">Emotional Safety</h4>
            <ul className="text-comfort text-peace-600 space-y-breath leading-relaxed">
              <li>• Soft, non-aggressive colors</li>
              <li>• Gentle transitions and animations</li>
              <li>• Ample white space for breathing</li>
              <li>• Compassionate language throughout</li>
            </ul>
          </div>
          <div>
            <h4 className="text-embrace font-supportive text-peace-700 mb-breath">Sacred Honor</h4>
            <ul className="text-comfort text-peace-600 space-y-breath leading-relaxed">
              <li>• Warm colors that convey love</li>
              <li>• Typography that feels personal</li>
              <li>• Interfaces that respect vulnerability</li>
              <li>• Focus on meaning over efficiency</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}