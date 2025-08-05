# Important People Enhancement Plan - Birthday & Memorial Dates

## Overview
Enhance the existing "important people" feature in RoleSelector to capture birthday and memorial dates, enabling more authentic and temporally-aware AI responses.

## Current State
- **Location**: `components/RoleSelector.tsx` (Step 3 of onboarding)
- **Data Structure**: `{name: string, relationship: string}`
- **Storage**: `users.important_people` JSONB column
- **Integration**: Already used in training pipeline via `enhanced-data-pipeline.ts`

## Proposed Enhancement

### New Data Structure
```json
{
  "name": "Sarah",
  "relationship": "daughter",
  "birthday": "2010-03-15",      // Optional
  "memorial_date": null           // Optional
}
```

### UI Changes in RoleSelector.tsx

#### 1. Add Date Fields (Lines ~380-420)
```tsx
// After relationship select, add:
<div className="grid grid-cols-2 gap-2">
  <div>
    <Label htmlFor={`birthday-${index}`} className="text-xs text-gray-600">
      Birthday (optional)
    </Label>
    <Input
      id={`birthday-${index}`}
      type="date"
      value={person.birthday || ''}
      onChange={(e) => updatePerson(index, 'birthday', e.target.value)}
      className="bg-gray-50"
    />
  </div>
  
  {/* Show memorial date only if it makes sense */}
  {['mother', 'father', 'grandmother', 'grandfather', 'spouse', 'partner'].includes(person.relationship) && (
    <div>
      <Label htmlFor={`memorial-${index}`} className="text-xs text-gray-600">
        Memorial date (optional)
      </Label>
      <Input
        id={`memorial-${index}`}
        type="date"
        value={person.memorial_date || ''}
        onChange={(e) => updatePerson(index, 'memorial_date', e.target.value)}
        className="bg-gray-50"
        placeholder="If applicable"
      />
    </div>
  )}
</div>
```

#### 2. Update Person Type
```typescript
interface ImportantPerson {
  name: string
  relationship: string
  birthday?: string        // ISO date string
  memorial_date?: string   // ISO date string
}
```

### Database Changes
No schema changes needed - JSONB column already supports additional fields.

### Training Pipeline Enhancement

#### enhanced-data-pipeline.ts Updates

**1. Parse Enhanced Important People (Line ~660)**
```typescript
function parseImportantPeople(jsonData: any): ImportantPerson[] {
  try {
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData
    return Array.isArray(parsed) ? parsed.map(person => ({
      name: person.name || '',
      relationship: person.relationship || '',
      birthday: person.birthday || null,
      memorial_date: person.memorial_date || null
    })) : []
  } catch (error) {
    return []
  }
}
```

**2. Enhanced Context Building (Line ~345)**
```typescript
// Add temporal context for important people
const temporalContext = importantPeople.map(person => {
  const age = person.birthday ? calculateAge(person.birthday) : null
  const yearsSincePassing = person.memorial_date ? calculateYearsSince(person.memorial_date) : null
  
  return {
    ...person,
    age,
    yearsSincePassing,
    isDeceased: !!person.memorial_date
  }
})
```

**3. Add Helper Functions**
```typescript
function calculateAge(birthday: string): number {
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function calculateYearsSince(date: string): number {
  const pastDate = new Date(date)
  const today = new Date()
  return today.getFullYear() - pastDate.getFullYear()
}
```

### AI Response Enhancement

#### Update Training Context (route.ts)
```typescript
// Line ~176 - Enhanced family context
const familyContext = importantPeople.map(person => {
  const context: any = {
    name: person.name,
    relationship: person.relationship
  }
  
  if (person.birthday) {
    context.age = calculateAge(person.birthday)
    context.birthday = new Date(person.birthday).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }
  
  if (person.memorial_date) {
    context.isDeceased = true
    context.yearsSincePassing = calculateYearsSince(person.memorial_date)
    context.memorialDate = new Date(person.memorial_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }
  
  return context
})
```

### Sensitive UI Considerations

1. **Gentle Language**
   - "Birthday" not "Date of birth"
   - "Memorial date" not "Date of death"
   - "Optional" clearly marked

2. **Conditional Display**
   - Only show memorial date for appropriate relationships
   - Hide for children/grandchildren by default
   - Allow for all relationships if user needs it

3. **Visual Indicators**
   - Subtle memorial indicator (🕊️) for deceased family members
   - Different styling for past vs present tense in UI

4. **Privacy & Respect**
   - All dates remain optional
   - No pressure to fill memorial dates
   - Clear explanation: "Helps preserve family history accurately"

### Expected AI Behavior Changes

**With Birthday Data:**
- "Sarah is turning 15 next month, a big milestone..."
- "At 28, you're at such an exciting point in your career..."
- "When you reach 30, like your brother did last year..."

**With Memorial Dates:**
- "Your grandmother, who passed 5 years ago, always said..."
- "I remember your grandfather teaching us..." (past tense)
- "On the anniversary of Mom's passing, remember that..."

**Without Dates (Graceful Fallback):**
- Continue using existing behavior
- No assumptions about age or life status
- General wisdom without temporal markers

### Implementation Priority

1. **Phase 1**: Add birthday field only (less sensitive, immediate value)
2. **Phase 2**: Add memorial date field with careful UI/UX
3. **Phase 3**: Enhance AI responses with temporal awareness
4. **Phase 4**: Special memorial features (anniversary reminders, etc.)

### Testing Considerations

1. **Data Validation**
   - Future dates for birthdays (newborns)
   - Memorial dates after birthdays
   - Partial dates (year only)

2. **AI Response Testing**
   - Appropriate tense usage
   - Sensitive handling of memorial references
   - Age-appropriate advice

3. **UI Testing**
   - Mobile date picker compatibility
   - Accessibility for elderly users
   - Clear optional indicators

This enhancement leverages the existing infrastructure while adding meaningful temporal context that will make the digital echo more authentic and emotionally aware.