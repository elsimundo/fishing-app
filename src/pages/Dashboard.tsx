import { useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Navigation } from '../components/layout/Navigation'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')

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
            <p className="text-sm font-medium text-slate-700">List View</p>
            <div className="rounded-lg border border-dashed border-slate-300 bg-surface p-4 text-sm text-slate-500">
              Catch list, filters, and sorting will be implemented here.
            </div>
          </section>
        )}

        <button
          type="button"
          className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl font-bold text-white shadow-lg shadow-emerald-500/40 hover:bg-accent/90"
        >
          +
        </button>
      </main>
    </Layout>
  )
}
