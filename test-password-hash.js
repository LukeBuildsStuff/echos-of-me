const bcrypt = require('bcryptjs')

const storedHash = '$2a$12$rh6QeKYZrgoBV6nfy9IA1OPdmOEzUaDcAdAc7j.bEnrbSMr4k7fxq'
const testPwds = ['password123', 'password', '123456', 'admin', 'luke123', 'test123']

async function checkPasswords() {
  console.log('Testing passwords against stored hash...')
  
  for (const password of testPwds) {
    try {
      const isMatch = await bcrypt.compare(password, storedHash)
      console.log(`Password: "${password}" - Match: ${isMatch}`)
    } catch (error) {
      console.error(`Error testing password "${password}":`, error.message)
    }
  }
}

checkPasswords()