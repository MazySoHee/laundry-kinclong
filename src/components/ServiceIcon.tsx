import { Scale, Shirt } from 'lucide-react'

type Props = {
  name: string
  category: string
  className?: string
}

function GarmentIcon({ kind, className }: { kind: 'cap' | 'pants' | 'sweater'; className?: string }) {
  const paths = {
    cap: (
      <>
        <path d="M4 14.5c.3-5.2 3.2-8.2 8-8.2s7.7 3 8 8.2" />
        <path d="M2.5 14.7c2.7-1 5.5-1 8.1-.1 3.2 1.1 6.3 1.1 10.9-.1-.8 2.4-3 3.8-6.2 3.8H9c-3.4 0-5.7-1.2-6.5-3.6Z" />
        <path d="M12 6.4v5.2" />
      </>
    ),
    pants: (
      <>
        <path d="M6 3.5h12l-.6 7.1-2.7 9.9h-3.2L10 11l-1.5 9.5H5.4l-2.1-9.9L6 3.5Z" />
        <path d="M6 6.5h12M12 3.8v6.8" />
      </>
    ),
    sweater: (
      <>
        <path d="m8.1 4.1-3.2 1-2.4 5.8 3.5 1.4 1.6-2.5V20h12.8V9.8l1.6 2.5 3.5-1.4-2.4-5.8-3.2-1c-.8 1.8-2.1 2.7-4.1 2.7s-3.3-.9-4.1-2.7Z" />
        <path d="M9.6 4.7c.5 1.4 1.3 2.1 2.8 2.1s2.3-.7 2.8-2.1M7.6 17.7h8.8" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[kind]}
    </svg>
  )
}

export default function ServiceIcon({ name, category, className }: Props) {
  const normalizedName = name.toLocaleLowerCase('id-ID')

  if (/\b(topi|cap)\b/.test(normalizedName)) {
    return <GarmentIcon kind="cap" className={className} />
  }
  if (/\b(celana|pants)\b/.test(normalizedName)) {
    return <GarmentIcon kind="pants" className={className} />
  }
  if (/\b(sweater|sweter|hoodie)\b/.test(normalizedName)) {
    return <GarmentIcon kind="sweater" className={className} />
  }

  const Icon = category.toLowerCase() === 'kiloan' ? Scale : Shirt
  return <Icon aria-hidden="true" className={className} />
}
