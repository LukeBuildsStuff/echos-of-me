'use client'

import AdminLayout from '@/components/AdminLayout'
import ContentModerationDashboard from '@/components/admin/ContentModerationDashboard'

export default function ContentModerationPage() {
  return (
    <AdminLayout
      title="Content Moderation"
      subtitle="Review, moderate, and manage user-generated content"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Content Management' },
        { label: 'Moderation' }
      ]}
    >
      <ContentModerationDashboard />
    </AdminLayout>
  )
}