require('dotenv').config({ path: '.env.local' })

console.log('🔍 ENVIRONMENT VARIABLE CHECK')
console.log('==============================')
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined')
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
console.log('Working directory:', process.cwd())

// Check which env files exist
const fs = require('fs')
const envFiles = ['.env', '.env.local', '.env.production', '.env.development']

console.log('\n📁 ENV FILES:')
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`)
  } else {
    console.log(`❌ ${file} does not exist`)
  }
})

// Test if we can access Next.js process env
console.log('\n🔧 PROCESS ENV CHECK:')
console.log('All NEXTAUTH vars:', Object.keys(process.env).filter(key => key.startsWith('NEXTAUTH')))