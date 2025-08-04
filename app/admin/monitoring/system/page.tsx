'use client'

import AdminLayout from '@/components/AdminLayout'
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard'

export default function SystemHealthPage() {
  return (
    <AdminLayout
      title="System Health"
      subtitle="Monitor system performance, services, and infrastructure"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'System Monitoring' },
        { label: 'System Health' }
      ]}
    >
      <SystemHealthDashboard />
    </AdminLayout>
  )
}