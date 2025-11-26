import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Navigation } from '../components/layout/Navigation'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CatchForm } from '../components/catches/CatchForm'
import { CatchList } from '../components/catches/CatchList'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')
  const [isCatchSheetOpen, setIsCatchSheetOpen] = useState(false)

  return (
    <Layout>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="relative flex-1 bg-background px-4 py-4">
        {activeTab === 'map' ? (
          <section className="flex h-[70vh] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-surface text-sm text-slate-500">
            Map View placeholder. Interactive Mapbox map and catch markers will appear here.
          </section>
        ) : (
          <section className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Your catches</p>
            <CatchList />
          </section>
        )}

        <button
          type="button"
          onClick={() => setIsCatchSheetOpen(true)}
          className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg shadow-emerald-500/40 hover:bg-accent/90"
          aria-label="Add catch"
        >
          +
        </button>

        <BottomSheet
          open={isCatchSheetOpen}
          title="Add catch"
          onClose={() => setIsCatchSheetOpen(false)}
        >
          <CatchForm onSuccess={() => setIsCatchSheetOpen(false)} />
        </BottomSheet>
      </main>
    </Layout>
  )
}
