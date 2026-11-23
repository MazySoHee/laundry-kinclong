import { Inbox, Waves, CheckCircle2, PackageCheck, type LucideIcon } from 'lucide-react'

export type Status = 'masuk' | 'proses' | 'selesai' | 'diambil'

export const STATUS_LIST: Status[] = ['masuk', 'proses', 'selesai', 'diambil']

export const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: LucideIcon; box: string; badge: string }
> = {
  masuk: {
    label: 'Masuk',
    icon: Inbox,
    box: 'bg-indigo-50 text-indigo-600',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  proses: {
    label: 'Proses',
    icon: Waves,
    box: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  selesai: {
    label: 'Selesai',
    icon: CheckCircle2,
    box: 'bg-teal-50 text-teal-600',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  diambil: {
    label: 'Diambil',
    icon: PackageCheck,
    box: 'bg-cyan-50 text-cyan-600',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
}

export const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)