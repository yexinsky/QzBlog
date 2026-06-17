import { Container } from '@/components/layout/Container'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-8">
        <Container>
          <div className="flex gap-8">
            {/* Main content skeleton */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-background-base dark:bg-background-base rounded-xl border border-border dark:border-border-strong overflow-hidden animate-pulse"
                  >
                    <div className="h-48 bg-background-hover dark:bg-background-hover" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-3/4" />
                      <div className="h-3 bg-background-hover dark:bg-background-hover rounded w-full" />
                      <div className="h-3 bg-background-hover dark:bg-background-hover rounded w-2/3" />
                      <div className="flex gap-2 mt-4">
                        <div className="h-6 w-16 bg-background-hover dark:bg-background-hover rounded-full" />
                        <div className="h-6 w-20 bg-background-hover dark:bg-background-hover rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar skeleton */}
            <aside className="hidden lg:block w-72 space-y-6">
              <div className="bg-background-base dark:bg-background-base rounded-xl border border-border dark:border-border-strong p-5 animate-pulse">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-background-hover dark:bg-background-hover" />
                  <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-24" />
                  <div className="h-3 bg-background-hover dark:bg-background-hover rounded w-32" />
                </div>
              </div>
              <div className="bg-background-base dark:bg-background-base rounded-xl border border-border dark:border-border-strong p-5 animate-pulse space-y-3">
                <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-20" />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-7 w-16 bg-background-hover dark:bg-background-hover rounded-full" />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
