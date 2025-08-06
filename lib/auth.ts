import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { query } from './db'
import { logAdminAction, isIPBlocked } from './admin-security'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Check if IP is blocked (for security)
          const clientIP = req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'unknown'
          if (typeof clientIP === 'string' && await isIPBlocked(clientIP)) {
            console.warn(`Blocked IP attempted login: ${clientIP}`)
            return null
          }

          // Simple user query - removed non-existent table joins
          const result = await query(`
            SELECT 
              id, email, name, password_hash, is_admin,
              failed_login_attempts, locked_until
            FROM users
            WHERE email = $1 AND is_active = true
          `, [credentials.email])

          if (result.rows.length === 0) {
            // Log failed login attempt
            await logAdminAction({
              admin_email: credentials.email,
              action_type: 'login_failed',
              resource_type: 'authentication',
              action_details: { reason: 'user_not_found' },
              ip_address: typeof clientIP === 'string' ? clientIP : undefined,
              user_agent: req?.headers?.['user-agent'] as string,
              risk_level: 'medium'
            })
            return null
          }

          const user = result.rows[0]

          // Check if account is locked
          if (user.locked_until && new Date(user.locked_until) > new Date()) {
            await logAdminAction({
              admin_email: credentials.email,
              action_type: 'login_failed',
              resource_type: 'authentication',
              action_details: { reason: 'account_locked' },
              ip_address: typeof clientIP === 'string' ? clientIP : undefined,
              user_agent: req?.headers?.['user-agent'] as string,
              risk_level: 'high'
            })
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash)

          if (!isPasswordValid) {
            // Increment failed login attempts
            await query(`
              UPDATE users 
              SET failed_login_attempts = failed_login_attempts + 1,
                  locked_until = CASE 
                    WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '30 minutes'
                    ELSE locked_until
                  END
              WHERE id = $1
            `, [user.id])

            await logAdminAction({
              admin_email: credentials.email,
              action_type: 'login_failed',
              resource_type: 'authentication',
              action_details: { reason: 'invalid_password', attempts: user.failed_login_attempts + 1 },
              target_user_id: user.id,
              ip_address: typeof clientIP === 'string' ? clientIP : undefined,
              user_agent: req?.headers?.['user-agent'] as string,
              risk_level: user.failed_login_attempts >= 3 ? 'high' : 'medium'
            })
            return null
          }

          // Reset failed login attempts and update last login
          await query(`
            UPDATE users 
            SET 
              last_login_at = CURRENT_TIMESTAMP,
              failed_login_attempts = 0,
              locked_until = NULL
            WHERE id = $1
          `, [user.id])

          // Log successful login
          await logAdminAction({
            admin_user_id: user.id,
            admin_email: user.email,
            action_type: 'login_success',
            resource_type: 'authentication',
            action_details: { 
              is_admin: user.is_admin,
              role: user.role_name,
              family_id: user.family_id
            },
            ip_address: typeof clientIP === 'string' ? clientIP : undefined,
            user_agent: req?.headers?.['user-agent'] as string,
            risk_level: 'low'
          })

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            isAdmin: user.is_admin || false
          }
        } catch (error) {
          console.error('Auth error:', error)
          
          // Log authentication system error
          await logAdminAction({
            admin_email: credentials.email,
            action_type: 'login_error',
            resource_type: 'authentication',
            action_details: { error: error.message },
            ip_address: typeof req?.headers?.['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'] : undefined,
            user_agent: req?.headers?.['user-agent'] as string,
            risk_level: 'high'
          })
          
          return null
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Simple sign-in - no additional validation needed since tables don't exist
      return true
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.email) {
        await logAdminAction({
          admin_user_id: token.id as string,
          admin_email: token.email,
          action_type: 'logout',
          resource_type: 'authentication',
          action_details: { 
            is_admin: token.isAdmin
          },
          risk_level: 'low'
        })
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  url: process.env.NEXTAUTH_URL,
}