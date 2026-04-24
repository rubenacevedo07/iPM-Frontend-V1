// StrictMode removed — DeckGL imperative init fails under double-mount (React StrictMode).
// See: ipm-maps skill, "Common Errors" section.
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/routes/router'
import './index.css'
import '@/styles/shared/fonts.scss'
import './app/styles/global.scss'

createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
