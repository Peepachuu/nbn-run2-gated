import type { Metadata } from 'next'
import { PageHeader } from '@/components/layout/PageHeader'
import { technicianCatalog } from '@/features/technician-dispatch/catalog'
import { DispatchFlow } from '@/features/technician-dispatch/components/DispatchFlow'

export const metadata: Metadata = {
  title: 'Technician dispatch',
}

export default function DispatchPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician dispatch"
        description="Match a customer-premises fault and access requirement to a suitable technician."
      />
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <DispatchFlow catalog={technicianCatalog} />
      </div>
    </div>
  )
}
