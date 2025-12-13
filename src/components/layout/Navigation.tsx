type NavigationProps = {
  activeTab: 'map' | 'list'
  onTabChange: (tab: 'map' | 'list') => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="flex gap-2 border-b border-border bg-card px-4 pt-3">
      <button
        type="button"
        onClick={() => onTabChange('map')}
        className={`flex-1 rounded-t-md px-3 py-2 text-center text-xs font-medium ${
          activeTab === 'map'
            ? 'bg-background text-primary shadow-inner'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Map View
      </button>
      <button
        type="button"
        onClick={() => onTabChange('list')}
        className={`flex-1 rounded-t-md px-3 py-2 text-center text-xs font-medium ${
          activeTab === 'list'
            ? 'bg-background text-primary shadow-inner'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        List View
      </button>
    </nav>
  )
}
