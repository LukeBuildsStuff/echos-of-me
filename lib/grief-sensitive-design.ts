// Grief-Sensitive UI Design Patterns for Echos Of Me
// Designed with deep empathy for families dealing with loss and legacy preservation

export interface GriefSensitiveTheme {
  colors: {
    primary: string
    comfort: string
    hope: string
    memory: string
    peace: string
    warning: string
  }
  typography: {
    compassionate: string
    gentle: string
    supportive: string
  }
  spacing: {
    breathingRoom: string
    intimate: string
    contemplative: string
  }
}

// Color palette designed for emotional safety
export const griefSensitiveColors = {
  // Soft, non-aggressive blues that convey trust and peace
  primary: {
    50: '#f0f9ff',   // Almost white, peaceful
    100: '#e0f2fe',  // Very light blue, calming
    200: '#bae6fd',  // Gentle sky blue
    300: '#7dd3fc',  // Light blue
    500: '#0ea5e9',  // Trustworthy blue (not too bright)
    600: '#0284c7',  // Deeper blue for important actions
    700: '#0369a1',  // Darker blue for headings
    900: '#0c4a6e'   // Deep blue for text
  },
  
  // Warm, comforting purples for legacy and memory
  comfort: {
    50: '#faf5ff',   // Barely purple, very soft
    100: '#f3e8ff',  // Light lavender
    200: '#e9d5ff',  // Gentle purple
    300: '#d8b4fe',  // Light purple
    500: '#a855f7',  // Rich but not overwhelming purple
    600: '#9333ea',  // Deeper purple for emphasis
    700: '#7c3aed'   // Darker purple for headings
  },
  
  // Soft greens for hope and growth
  hope: {
    50: '#f0fdf4',   // Almost white green
    100: '#dcfce7',  // Very light green
    200: '#bbf7d0',  // Gentle green
    300: '#86efac',  // Light green
    400: '#4ade80',  // Bright hopeful green
    500: '#22c55e',  // Hopeful green
    600: '#16a34a',  // Deeper green
    700: '#15803d'   // Darker green for headings
  },
  
  // Warm golds for precious memories
  memory: {
    50: '#fffbeb',   // Cream
    100: '#fef3c7',  // Light gold
    200: '#fde68a',  // Soft gold
    300: '#fcd34d',  // Light gold
    500: '#f59e0b',  // Warm gold
    600: '#d97706',  // Rich gold
    700: '#b45309'   // Darker gold for headings
  },
  
  // Soft grays for peace and neutrality
  peace: {
    50: '#f9fafb',   // Almost white
    100: '#f3f4f6',  // Very light gray
    200: '#e5e7eb',  // Light gray
    300: '#d1d5db',  // Light gray
    400: '#9ca3af',  // Medium gray for text
    500: '#6b7280',  // Balanced gray for peace
    600: '#4b5563',  // Darker gray for important text
    700: '#374151',  // Darker gray for headings
    800: '#1f2937'   // Deep gray for headings
  },
  
  // Gentle red for important warnings (never harsh)
  warning: {
    50: '#fef2f2',   // Very light red
    100: '#fee2e2',  // Light red
    200: '#fecaca',  // Light red
    300: '#fca5a5',  // Light red
    400: '#f87171',  // Medium red
    500: '#ef4444',  // Red for important notices
    600: '#dc2626',  // Deeper red
    700: '#b91c1c',  // Darker red for headings
    800: '#991b1b'   // Deep red
  }
}

// Typography patterns that feel compassionate
export const griefSensitiveTypography = {
  // Font families that feel warm and approachable
  fontFamily: {
    compassionate: '"Inter", "Segoe UI", system-ui, sans-serif', // Clean, readable
    gentle: '"Source Serif Pro", Georgia, serif', // Warm serif for special content
    supportive: '"Inter", system-ui, sans-serif' // Consistent sans-serif
  },
  
  // Text sizes that don't overwhelm
  fontSize: {
    whisper: '0.75rem',    // 12px - for subtle hints
    gentle: '0.875rem',    // 14px - for secondary text
    comfort: '1rem',       // 16px - for body text
    presence: '1.125rem',  // 18px - for important content
    embrace: '1.25rem',    // 20px - for headings
    love: '1.5rem',        // 24px - for section titles
    legacy: '2rem',        // 32px - for main headings
    eternal: '3rem'        // 48px - for hero content
  },
  
  // Line heights that provide breathing room
  lineHeight: {
    intimate: '1.2',       // Tight, for headings
    comfortable: '1.5',    // Standard, for body
    contemplative: '1.75'  // Spacious, for important content
  }
}

// Spacing that allows for emotional processing
export const griefSensitiveSpacing = {
  // Padding that feels supportive
  padding: {
    whisper: '0.25rem',    // 4px
    gentle: '0.5rem',      // 8px
    comfort: '1rem',       // 16px
    embrace: '1.5rem',     // 24px
    sanctuary: '2rem',     // 32px
    reverent: '3rem'       // 48px
  },
  
  // Margins that provide emotional space
  margin: {
    breath: '0.5rem',      // 8px
    pause: '1rem',         // 16px
    reflection: '1.5rem',  // 24px
    contemplation: '2rem', // 32px
    reverence: '3rem'      // 48px
  }
}

// Component-specific design patterns
export const griefSensitivePatterns = {
  // Cards that feel like gentle embraces
  card: {
    borderRadius: '12px',              // Soft rounded corners
    padding: griefSensitiveSpacing.padding.embrace,
    border: `1px solid ${griefSensitiveColors.peace[200]}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', // Very subtle shadow
    hoverShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', // Gentle hover
    backgroundColor: 'white'
  },
  
  // Buttons that feel supportive, never aggressive
  button: {
    primary: {
      backgroundColor: griefSensitiveColors.primary[500],
      color: 'white',
      padding: `${griefSensitiveSpacing.padding.comfort} ${griefSensitiveSpacing.padding.embrace}`,
      borderRadius: '8px',
      fontSize: griefSensitiveTypography.fontSize.comfort,
      fontWeight: '500', // Medium weight, not bold
      transition: 'all 0.2s ease',
      hoverBackgroundColor: griefSensitiveColors.primary[600]
    },
    
    gentle: {
      backgroundColor: griefSensitiveColors.peace[100],
      color: griefSensitiveColors.peace[800],
      border: `1px solid ${griefSensitiveColors.peace[200]}`,
      padding: `${griefSensitiveSpacing.padding.comfort} ${griefSensitiveSpacing.padding.embrace}`,
      borderRadius: '8px',
      fontSize: griefSensitiveTypography.fontSize.comfort,
      fontWeight: '500',
      transition: 'all 0.2s ease',
      hoverBackgroundColor: griefSensitiveColors.peace[200]
    },
    
    loving: {
      backgroundColor: griefSensitiveColors.comfort[500],
      color: 'white',
      padding: `${griefSensitiveSpacing.padding.comfort} ${griefSensitiveSpacing.padding.embrace}`,
      borderRadius: '8px',
      fontSize: griefSensitiveTypography.fontSize.comfort,
      fontWeight: '500',
      transition: 'all 0.2s ease',
      hoverBackgroundColor: griefSensitiveColors.comfort[600]
    }
  },
  
  // Input fields that feel safe and welcoming
  input: {
    padding: griefSensitiveSpacing.padding.comfort,
    borderRadius: '8px',
    border: `2px solid ${griefSensitiveColors.peace[200]}`,
    fontSize: griefSensitiveTypography.fontSize.comfort,
    lineHeight: griefSensitiveTypography.lineHeight.comfortable,
    backgroundColor: 'white',
    focusBorderColor: griefSensitiveColors.primary[500],
    focusRingColor: `${griefSensitiveColors.primary[500]}33`, // 20% opacity
    transition: 'all 0.2s ease'
  },
  
  // Text areas for sharing memories and stories
  textarea: {
    padding: griefSensitiveSpacing.padding.comfort,
    borderRadius: '12px',
    border: `2px solid ${griefSensitiveColors.peace[200]}`,
    fontSize: griefSensitiveTypography.fontSize.comfort,
    lineHeight: griefSensitiveTypography.lineHeight.contemplative,
    backgroundColor: 'white',
    focusBorderColor: griefSensitiveColors.primary[500],
    focusRingColor: `${griefSensitiveColors.primary[500]}33`,
    minHeight: '120px',
    resize: 'vertical'
  }
}

// Emotional state indicators
export const emotionalStateColors = {
  peaceful: griefSensitiveColors.primary[500],
  hopeful: griefSensitiveColors.hope[500],
  nostalgic: griefSensitiveColors.memory[500],
  loving: griefSensitiveColors.comfort[500],
  reflective: griefSensitiveColors.peace[600],
  celebratory: griefSensitiveColors.hope[400],
  supportive: griefSensitiveColors.primary[500],
  grieving: griefSensitiveColors.peace[500]
}

// Animation patterns that feel gentle and respectful
export const griefSensitiveAnimations = {
  // Fade transitions that don't startle
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  // Gentle scale effects
  gentleScale: {
    initial: { scale: 0.98 },
    animate: { scale: 1 },
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  
  // Breathing effect for loading states
  breathing: {
    animate: { scale: [1, 1.02, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
  }
}

// Content tone guidelines
export const griefSensitiveContent = {
  // Language patterns that feel supportive
  toneGuidelines: {
    // Use "preserve" instead of "capture"
    // Use "share" instead of "input" 
    // Use "wisdom" instead of "data"
    // Use "legacy" instead of "training"
    // Use "connect" instead of "interface"
    // Use "remember" instead of "recall"
    // Use "honor" instead of "process"
  },
  
  // Emotional safety considerations
  emotionalSafety: {
    // Never use aggressive language
    // Avoid clinical or technical terms
    // Always acknowledge the meaningful nature of memories
    // Provide gentle encouragement
    // Respect the vulnerability of sharing
    // Honor the love behind every response
  },
  
  // Inclusive language for all family structures
  inclusiveLanguage: {
    // Use "chosen family" alongside "biological family"
    // Include adoptive, step, and blended family dynamics
    // Honor all forms of love and connection
    // Respect different cultural approaches to family
    // Include single parents, grandparents as primary caregivers
  }
}

// Helper functions for implementing grief-sensitive design
export function getEmotionalColor(emotion: keyof typeof emotionalStateColors): string {
  return emotionalStateColors[emotion] || griefSensitiveColors.peace[400]
}

export function getGentleTransition(duration: number = 0.2): string {
  return `all ${duration}s ease-out`
}

export function getSafeSpacing(level: 'intimate' | 'comfortable' | 'contemplative'): string {
  const spacing = {
    intimate: griefSensitiveSpacing.padding.comfort,
    comfortable: griefSensitiveSpacing.padding.embrace,
    contemplative: griefSensitiveSpacing.padding.sanctuary
  }
  return spacing[level]
}

// CSS-in-JS helper for Tailwind classes
export function generateGriefSensitiveClasses() {
  return {
    // Card styles
    'card-gentle': `bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200`,
    'card-loving': `bg-purple-50 border border-purple-200 rounded-xl p-6 shadow-sm`,
    'card-memory': `bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm`,
    
    // Button styles  
    'btn-primary': `bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200`,
    'btn-gentle': `bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium border border-gray-200 transition-all duration-200`,
    'btn-loving': `bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200`,
    
    // Text styles
    'text-compassionate': `text-gray-700 leading-relaxed`,
    'text-gentle': `text-gray-600 text-sm`,
    'text-legacy': `text-2xl font-semibold text-gray-800`,
    'text-whisper': `text-xs text-gray-500`,
    
    // Input styles
    'input-safe': `px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-400 focus:ring focus:ring-blue-100 transition-all duration-200`,
    'textarea-memory': `px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring focus:ring-blue-100 min-h-32 resize-y transition-all duration-200`
  }
}