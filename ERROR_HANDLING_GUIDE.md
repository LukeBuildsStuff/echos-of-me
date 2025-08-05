# Error Handling Guide for Echos Of Me

This guide covers the comprehensive error handling system implemented for the "Echos Of Me" legacy preservation application, designed with grief-sensitive UX principles.

## Overview

The error handling system prioritizes:
- **Emotional Safety**: Never jarring or technical language
- **User Reassurance**: Always emphasize data safety and support
- **Actionable Guidance**: Clear next steps for users
- **Graceful Degradation**: Fallbacks maintain core functionality
- **Recovery Support**: Multiple retry and recovery mechanisms

## Components Overview

### 1. Error Boundary Components

#### `ErrorBoundary.tsx`
- Catches React component errors
- Provides grief-sensitive error UI
- Includes development error details
- Offers recovery actions

```tsx
import ErrorBoundary from '@/components/ErrorBoundary'

// Wrap components that might error
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

#### Next.js Error Pages
- `app/error.tsx` - Route-level errors
- `app/global-error.tsx` - Application-level errors  
- `app/not-found.tsx` - 404 errors
- `app/loading.tsx` - Loading states

### 2. Error Message Components

#### `components/ui/error-message.tsx`

**ErrorMessage** - Base error display
```tsx
<ErrorMessage
  title="Optional title"
  message="Error description"
  variant="gentle" // default | gentle | warning | severe
  dismissible={true}
  onDismiss={() => {}}
/>
```

**NetworkError** - Network-specific errors
```tsx
<NetworkError
  onRetry={handleRetry}
  isRetrying={loading}
  dismissible={true}
/>
```

**ApiError** - API error handling
```tsx
<ApiError
  error={error}
  context="saving response"
  onRetry={handleRetry}
/>
```

**FormError** - Form validation errors
```tsx
<FormError
  errors={['Field is required', 'Invalid format']}
  field="email"
/>
```

**FieldError** - Inline field errors
```tsx
<FieldError error="This field is required" />
```

**SuccessMessage** - Success feedback
```tsx
<SuccessMessage
  message="Your memory has been preserved"
  dismissible={true}
/>
```

### 3. Loading Components

#### `components/ui/loading.tsx`

**LoadingSpinner** - Basic spinner
```tsx
<LoadingSpinner size="lg" />
```

**PageLoading** - Full page loading
```tsx
<PageLoading message="Loading your legacy..." />
```

**LoadingButton** - Button loading state
```tsx
<Button disabled={loading}>
  <LoadingButton loading={loading} loadingText="Saving...">
    Save Memory
  </LoadingButton>
</Button>
```

**ContentLoading** - Skeleton loading
```tsx
<ContentLoading lines={3} />
```

**ProgressLoading** - Multi-step progress
```tsx
<ProgressLoading
  steps={['Step 1', 'Step 2', 'Step 3']}
  currentStep={1}
/>
```

### 4. Error Handling Hooks

#### `hooks/useErrorHandler.ts`

**useErrorHandler** - Basic error state
```tsx
const { error, isError, setError, clearError, handleApiError } = useErrorHandler()

// Handle API errors
await handleApiError(error, { 
  context: 'saving data',
  showAlert: false 
})
```

**useAsyncOperation** - Async operations with loading/error
```tsx
const operation = useAsyncOperation()

const result = await operation.execute(
  async () => {
    const response = await fetch('/api/data')
    return response.json()
  },
  { context: 'loading data' }
)

// Access: operation.loading, operation.error, operation.isError
```

**useFormErrors** - Form-specific error handling
```tsx
const { 
  fieldErrors, 
  generalError, 
  setFieldError, 
  clearAllErrors,
  getFieldError 
} = useFormErrors<{ email: string, password: string }>()

// Set field error
setFieldError('email', 'Email is required')

// Get field error
const emailError = getFieldError('email')
```

**useRetry** - Retry functionality
```tsx
const { retry, retryCount, isRetrying } = useRetry()

const result = await retry(
  async () => await apiCall(),
  3, // max retries
  1000 // delay ms
)
```

### 5. Error Utilities

#### `lib/error-utils.ts`

**ErrorClassifier** - Categorizes errors
```tsx
const appError = ErrorClassifier.classify(error, 'user registration')
// Returns: { category, severity, userFriendlyMessage, retryable, ... }
```

**ErrorReporter** - Logs and reports errors
```tsx
ErrorReporter.report(appError)
const recentErrors = ErrorReporter.getRecentErrors(10)
```

**ErrorRecovery** - Recovery strategies
```tsx
// Retry with backoff
const result = await ErrorRecovery.withRetry(
  () => apiCall(),
  { maxRetries: 3, backoff: true }
)

// Fallback strategy
const data = await ErrorRecovery.withFallback(
  () => primaryApiCall(),
  () => fallbackApiCall()
)

// Timeout wrapper
const result = await ErrorRecovery.withTimeout(
  () => slowOperation(),
  5000, // 5 second timeout
  'Operation timed out'
)
```

**safeApiCall** - Wrapper for API calls
```tsx
const { data, error } = await safeApiCall(
  () => fetch('/api/data'),
  'loading user data'
)

if (error) {
  // Handle error (already classified and logged)
} else {
  // Use data
}
```

**GriefSensitiveMessages** - Compassionate error messages
```tsx
const message = GriefSensitiveMessages.getCompassionateMessage(appError)
const encouragement = GriefSensitiveMessages.getEncouragementMessage()
```

## Usage Patterns

### 1. Component Error Handling

```tsx
function MyComponent() {
  const { loading, error, execute } = useAsyncOperation()
  
  const handleSave = async () => {
    const result = await execute(
      async () => {
        return await safeApiCall(() => fetch('/api/save'))
      }
    )
    
    if (result) {
      // Success
    }
  }
  
  return (
    <div>
      {error && <ApiError error={error} onRetry={handleSave} />}
      <Button onClick={handleSave} disabled={loading}>
        <LoadingButton loading={loading}>Save</LoadingButton>
      </Button>
    </div>
  )
}
```

### 2. Form Error Handling

```tsx
function MyForm() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const { fieldErrors, setFieldError, clearAllErrors } = useFormErrors()
  
  const validateField = (field: string, value: string) => {
    if (!value.trim()) {
      setFieldError(field, 'This field is required')
      return false
    }
    setFieldError(field, null)
    return true
  }
  
  return (
    <form>
      <input
        value={formData.email}
        onChange={(e) => {
          setFormData(prev => ({ ...prev, email: e.target.value }))
          validateField('email', e.target.value)
        }}
      />
      <FieldError error={fieldErrors.email} />
    </form>
  )
}
```

### 3. API Error Recovery

```tsx
async function robustApiCall() {
  try {
    // Try with retry and fallback
    return await ErrorRecovery.withFallback(
      // Primary attempt with retry
      () => ErrorRecovery.withRetry(
        () => fetch('/api/primary'),
        { maxRetries: 2 }
      ),
      // Fallback
      () => fetch('/api/fallback')
    )
  } catch (error) {
    const classified = ErrorClassifier.classify(error)
    ErrorReporter.report(classified)
    throw classified
  }
}
```

## Error Categories and Severities

### Categories
- **network** - Connection/fetch issues
- **validation** - Form validation errors  
- **api** - Server/API errors
- **auth** - Authentication issues
- **storage** - Data persistence errors
- **system** - Application errors
- **user** - User action errors

### Severities
- **low** - Minor issues, app functional
- **medium** - Notable issues, workarounds available
- **high** - Significant issues, some functionality lost
- **critical** - Major issues, app may be unusable

## Grief-Sensitive Design Principles

### Language Guidelines
- Use warm, supportive language
- Emphasize data safety and security
- Avoid technical jargon
- Provide clear, actionable guidance
- Include emotional reassurance

### Visual Design
- Soft colors from grief-sensitive palette
- Gentle transitions and animations
- Breathing room in layouts
- Comforting icons and imagery
- Non-aggressive warning states

### Example Messages

**Good:**
- "We're having trouble connecting right now, but your precious memories are safe with us."
- "Let's take another gentle look at the information together."
- "Your legacy journey is meaningful - we're honored to help preserve your wisdom."

**Avoid:**
- "ERROR 500: Internal Server Error"
- "Connection failed"
- "Invalid input"

## Testing Error Handling

### Manual Testing
1. Test network disconnection scenarios
2. Test form validation edge cases
3. Test server error responses
4. Test component error boundaries
5. Test retry mechanisms

### Error Simulation
```tsx
// Force network error
const simulateNetworkError = () => {
  throw new TypeError('Failed to fetch')
}

// Force API error
const simulateApiError = () => {
  return new Response('{"error": "Server error"}', { 
    status: 500,
    statusText: 'Internal Server Error' 
  })
}
```

## Integration with Monitoring

The error handling system is designed to integrate with monitoring services:

```tsx
// In production, integrate with Sentry, LogRocket, etc.
if (process.env.NODE_ENV === 'production') {
  // Send to monitoring service
  Sentry.captureException(error, {
    tags: {
      category: classifiedError.category,
      severity: classifiedError.severity,
      context: classifiedError.context
    }
  })
}
```

## Migration Guide

To update existing components:

1. **Replace alert() calls**:
   ```tsx
   // Old
   alert('Error: ' + error.message)
   
   // New
   <ApiError error={error} />
   ```

2. **Add error boundaries**:
   ```tsx
   // Wrap components prone to errors
   <ErrorBoundary>
     <RiskyComponent />
   </ErrorBoundary>
   ```

3. **Use loading states**:
   ```tsx
   // Old
   {loading && <div>Loading...</div>}
   
   // New
   <LoadingButton loading={loading}>Save</LoadingButton>
   ```

4. **Implement form validation**:
   ```tsx
   // Use useFormErrors hook instead of manual state
   const { fieldErrors, setFieldError } = useFormErrors()
   ```

This error handling system ensures that users of the "Echos Of Me" application always feel supported and reassured, even when technical issues occur, maintaining the grief-sensitive and compassionate experience that's core to the application's mission.