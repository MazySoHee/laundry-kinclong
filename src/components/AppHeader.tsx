import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export const headerButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-3.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none'

type Props = {
  title: string
  subtitle: string
  icon: LucideIcon
  action?: ReactNode
}

export default function AppHeader({ title, subtitle, icon: Icon, action }: Props) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-teal-700"
      >
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-10 bg-gradient-to-r from-teal-600 to-cyan-600 pt-[env(safe-area-inset-top)] text-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
              <p className="truncate text-xs text-teal-50">{subtitle}</p>
            </div>
          </div>
          {action}
        </div>
      </header>
    </>
  )
}