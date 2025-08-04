const fs = require('fs')
const path = require('path')

const DYNAMIC_EXPORT = `// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

`

function fixApiRoute(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  
  // Check if already has dynamic export
  if (content.includes("export const dynamic")) {
    console.log(`✓ Already fixed: ${filePath}`)
    return
  }
  
  // Add dynamic export after imports
  const importMatch = content.match(/(import[\s\S]*?)\n\n/)
  if (importMatch) {
    const newContent = content.replace(
      importMatch[0],
      importMatch[0] + DYNAMIC_EXPORT
    )
    fs.writeFileSync(filePath, newContent)
    console.log(`✅ Fixed: ${filePath}`)
  } else {
    // If no imports, add at the beginning
    fs.writeFileSync(filePath, DYNAMIC_EXPORT + content)
    console.log(`✅ Fixed (no imports): ${filePath}`)
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      walkDir(filePath)
    } else if (file === 'route.ts' || file === 'route.js') {
      fixApiRoute(filePath)
    }
  })
}

// Fix all API routes
const apiDir = path.join(__dirname, '..', 'app', 'api')
console.log('Fixing API routes in:', apiDir)
walkDir(apiDir)
console.log('\nDone!')