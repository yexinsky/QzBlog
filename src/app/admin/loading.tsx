import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-background-cream">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="h-8 bg-background-hover dark:bg-background-hover rounded w-48" />
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-background-base dark:bg-background-base rounded-xl border-border dark:border-border-strong p-6"
              >
                <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-20 mb-3" />
                <div className="h-8 bg-background-hover dark:bg-background-hover rounded w-16" />
              </div>
            ))}
          </div>
          {/* Table */}
          <div className="bg-background-base dark:bg-background-base rounded-xl border-border dark:border-border-strong p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-background-hover dark:bg-background-hover rounded flex-1" />
                  <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-24" />
                  <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
