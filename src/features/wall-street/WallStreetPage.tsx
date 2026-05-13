import { useSearch } from '@tanstack/react-router'
import { ModeSelector } from './ModeSelector'
import { PowerView } from './modes/PowerView'
import { CommandChainView } from './modes/CommandChainView'
import { PassiveMoneyView } from './modes/PassiveMoneyView'
import { AdvancedView } from './modes/AdvancedView'

export function WallStreetPage() {
  const search = useSearch({ from: '/wall-street' })
  switch (search.view) {
    case 'power':
      return <PowerView />
    case 'command':
      return <CommandChainView />
    case 'passive':
      return <PassiveMoneyView />
    case 'advanced':
      return <AdvancedView />
    default:
      return <ModeSelector />
  }
}
