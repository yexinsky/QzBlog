import { Container } from '@/components/layout/Container'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

export default function PostLoading() {
  return (
    <div className="min-h-screen bg-background-cream">
      <Header />
      <main className="py-8">
        <Container maxWidth="4xl">
          <div className="animate-pulse">
            {/* Title */}
            <div className="h-10 bg-background-hover dark:bg-background-hover rounded w-3/4 mb-4" />
            {/* Meta */}
            <div className="flex gap-4 mb-6">
              <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-24" />
              <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-20" />
              <div className="h-4 bg-background-hover dark:bg-background-hover rounded w-20" />
            </div>
            {/* Tags */}
            <div className="flex gap-2 mb-8">
              <div className="h-7 w-16 bg-background-hover dark:bg-background-hover rounded-full" />
              <div className="h-7 w-20 bg-background-hover dark:bg-background-hover rounded-full" />
            </div>
            {/* Content */}
            <div className="bg-background-base dark:bg-background-base rounded-xl border-border dark:border-border-strong p-8 space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-background-hover dark:bg-background-hover rounded"
                  style={{ width: `${85 + Math.random() * 15}%` }}
                />
              ))}
              <div className="h-8 bg-background-hover dark:bg-background-hover rounded w-1/3 mt-6" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-4 bg-background-hover dark:bg-background-hover rounded"
                  style={{ width: `${80 + Math.random() * 20}%` }}
                />
              ))}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  )
}
