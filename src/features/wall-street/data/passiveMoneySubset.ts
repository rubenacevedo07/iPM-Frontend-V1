export const PASSIVE_MONEY_NODE_IDS = [
  'asset_manager:blackrock',
  'asset_manager:vanguard',
  'asset_manager:state-street',
  'company:apple',
  'company:microsoft',
  'company:nvidia',
] as const

export const PASSIVE_MONEY_LEFT_IDS = [
  'asset_manager:blackrock',
  'asset_manager:vanguard',
  'asset_manager:state-street',
] as const

export const PASSIVE_MONEY_RIGHT_IDS = [
  'company:apple',
  'company:microsoft',
  'company:nvidia',
] as const

export const PASSIVE_MONEY_SHORT_LABEL: Record<string, string> = {
  'asset_manager:blackrock':   'BlackRock',
  'asset_manager:vanguard':    'Vanguard',
  'asset_manager:state-street':'State Street',
  'company:apple':             'Apple',
  'company:microsoft':         'Microsoft',
  'company:nvidia':            'Nvidia',
}

export const PASSIVE_MONEY_COLOR_OVERRIDES: Record<string, string> = {
  'asset_manager:blackrock':   '#a855f7',
  'asset_manager:vanguard':    '#a855f7',
  'asset_manager:state-street':'#a855f7',
  'company:apple':             '#00e5ff',
  'company:microsoft':         '#00e5ff',
  'company:nvidia':            '#00e5ff',
}
