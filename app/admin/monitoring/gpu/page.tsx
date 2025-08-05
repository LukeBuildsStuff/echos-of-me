'use client'

import AdminLayout from '@/components/AdminLayout'
import RTXMonitoringDashboard from '@/components/admin/RTXMonitoringDashboard'

export default function GPUMonitoringPage() {
  return (
    <AdminLayout
      title="GPU Monitoring"
      subtitle="Real-time RTX 5090 performance and training job monitoring"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'System Monitoring' },
        { label: 'GPU Monitoring' }
      ]}
    >
      <RTXMonitoringDashboard />
    </AdminLayout>
  )
}