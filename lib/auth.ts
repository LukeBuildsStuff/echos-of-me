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

          // Enhanced user query to include admin role information
          const result = await query(`
            SELECT 
              u.id, u.email, u.name, u.password_hash, u.is_admin, u.admin_role_id,
              u.failed_login_attempts, u.locked_until, u.memorial_account,
              ar.role_name, ar.permissions, ar.display_name as role_display_name,
              fm.family_id, f.family_name
            FROM users u
            LEFT JOIN admin_roles ar ON u.admin_role_id = ar.id
            LEFT JOIN family_members fm ON u.id = fm.user_id AND fm.family_role = 'primary'
            LEFT JOIN families f ON fm.family_id = f.id
            WHERE u.email = $1 AND u.is_active = true
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
            isAdmin: user.is_admin || false,
            adminRoleId: user.admin_role_id,
            roleName: user.role_name,
            roleDisplayName: user.role_display_name,
            permissions: user.permissions || {},
            familyId: user.family_id,
            familyName: user.family_name,
            isMemorialAccount: user.memorial_account || false
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
        token.adminRoleId = user.adminRoleId
        token.roleName = user.roleName
        token.roleDisplayName = user.roleDisplayName
        token.permissions = user.permissions
        token.familyId = user.familyId
        token.familyName = user.familyName
        token.isMemorialAccount = user.isMemorialAccount
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isAdmin = token.isAdmin as boolean
        session.user.adminRoleId = token.adminRoleId as string
        session.user.roleName = token.roleName as string
        session.user.roleDisplayName = token.roleDisplayName as string
        session.user.permissions = token.permissions as Record<string, string[]>
        session.user.familyId = token.familyId as string
        session.user.familyName = token.familyName as string
        session.user.isMemorialAccount = token.isMemorialAccount as boolean
      }
      return session
    },
    async signIn({ user, account, profile }) {
      // Additional validation for admin accounts
      if (user.isAdmin) {
        try {
          // Verify admin role is still active and valid
          const adminCheck = await query(`
            SELECT ar.role_name, ar.permissions 
            FROM users u
            JOIN admin_roles ar ON u.admin_role_id = ar.id
            WHERE u.id = $1 AND u.is_admin = true AND u.is_active = true
          `, [user.id])

          if (adminCheck.rows.length === 0) {
            console.warn(`Admin user ${user.email} failed role validation`)
            return false
          }

          return true
        } catch (error) {
          console.error('Admin validation error:', error)
          return false
        }
      }
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
            is_admin: token.isAdmin,
            role: token.roleName 
          },
          risk_level: 'low'
        })
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  url: process.env.NEXTAUTH_URL,
}