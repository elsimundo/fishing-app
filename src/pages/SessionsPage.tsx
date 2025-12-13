import { Layout } from '../components/layout/Layout'
import { SessionsList } from '../components/sessions/SessionsList'

export function SessionsPage() {
  return (
    <Layout>
      <main className="px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <header className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Sessions</h1>
            <p className="text-[11px] text-muted-foreground">
              Your completed fishing sessions, with quick access to catches, maps, and stats.
            </p>
          </header>
          <SessionsList />
        </div>
      </main>
    </Layout>
  )
}
