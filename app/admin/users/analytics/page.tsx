'use client'

import AdminLayout from '@/components/AdminLayout'
import UserAnalyticsDashboard from '@/components/admin/UserAnalyticsDashboard'

export default function UserAnalyticsPage() {
  return (
    <AdminLayout
      title="User Analytics"
      subtitle="Comprehensive user behavior analysis and insights"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'User Management' },
        { label: 'Analytics' }
      ]}
    >
      <UserAnalyticsDashboard />
    </AdminLayout>
  )
}