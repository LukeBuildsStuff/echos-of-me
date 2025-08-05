'use client'

import ErrorRecoveryDashboard from '@/components/admin/ErrorRecoveryDashboard'
import AdminLayout from '@/components/AdminLayout'

export default function ErrorRecoveryPage() {
  return (
    <AdminLayout
      title="Error Recovery"
      subtitle="Monitor system health and manage error recovery"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Monitoring', href: '/admin/monitoring' },
        { label: 'Error Recovery' }
      ]}
    >
      <ErrorRecoveryDashboard />
    </AdminLayout>
  )
}