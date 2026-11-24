export type ServiceTier = 'reguler' | 'sameday' | 'instant'

export type OperationalSettings = {
  kiloan_daily_capacity_kg: number
  satuan_daily_capacity_items: number
  express_daily_capacity: number
}

export type OrderItemData = {
  service_id?: string
  name: string
  category?: 'kiloan' | 'satuan' | string
  price: number
  unit: string
  qty: number
  subtotal: number
  duration?: string
  complexity_weight?: number
  service_tier?: ServiceTier
}

export type ActiveOrderForQueue = {
  status: string
  items: unknown
}

export type EstimationResult = {
  estimatedDate: Date
  baseDays: number
  queueDelayDays: number
  queueDelayHours: number
  isExpress: boolean
  notes: string[]
  queueSnapshot: {
    activeKiloanKg: number
    activeSatuanWeighted: number
    activeExpressCount: number
  }
}

// ==========================================
// 1. VALIDASI NOMOR TELEPON INDONESIA (0-9)
// ==========================================

/** Hapus semua karakter selain angka 0-9 saat user mengetik */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, '')
}

/** Validasi format nomor HP Indonesia (wajib angka, awalan 08 atau 628, panjang 10-15 digit) */
export function validateIndonesianPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.trim()

  if (!cleaned) {
    return { valid: false, error: 'Nomor WhatsApp wajib diisi.' }
  }
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Nomor WhatsApp hanya boleh berisi angka (0-9).' }
  }
  if (!/^(08|628)\d+$/.test(cleaned)) {
    return { valid: false, error: 'Gunakan format nomor Indonesia yang valid (diawali 08 atau 628).' }
  }
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: 'Panjang nomor WhatsApp harus 10 sampai 15 digit.' }
  }

  return { valid: true }
}

// ==========================================
// 2. MESIN ESTIMASI WAKTU DINAMIS
// ==========================================

/** Ubah teks durasi layanan (misal "2 hari", "30 menit", "6 jam") menjadi jam */
export function parseDurationToHours(durationText?: string, tier?: ServiceTier): number {
  if (!durationText) return 48
  const text = durationText.toLowerCase().trim()
  const match = text.match(/(\d+(?:[.,]\d+)?)/)
  const num = match ? parseFloat(match[1].replace(',', '.')) : 0

  if (text.includes('menit')) return Math.max(num / 60, 0.5)
  if (text.includes('jam')) return Math.max(num, 1)
  if (text.includes('hari')) return Math.max(num * 24, 24)
  if (tier === 'instant') return 2
  if (tier === 'sameday') return 8
  return 48
}

/** Deteksi tier layanan otomatis jika belum diset manual */
export function detectServiceTier(item: {
  name?: string
  duration?: string
  service_tier?: ServiceTier
}): ServiceTier {
  if (item.service_tier) return item.service_tier
  const combined = `${item.name ?? ''} ${item.duration ?? ''}`.toLowerCase()
  if (combined.includes('instant') || combined.includes('menit')) return 'instant'
  if (combined.includes('same day') || combined.includes('sameday') || combined.includes('kilat')) {
    return 'sameday'
  }
  return 'reguler'
}

/** Hitung estimasi tanggal selesai berdasarkan antrean aktif & kapasitas harian */
export function calculateDynamicEstimation(
  cartItems: OrderItemData[],
  activeOrders: ActiveOrderForQueue[],
  settings: OperationalSettings,
  baseNow: Date = new Date()
): EstimationResult {
  // 1. Hitung total beban antrean aktif (status 'masuk' atau 'proses')
  let activeKiloanKg = 0
  let activeSatuanWeighted = 0
  let activeExpressCount = 0

  for (const order of activeOrders) {
    if (order.status !== 'masuk' && order.status !== 'proses') continue
    if (!Array.isArray(order.items)) continue

    for (const raw of order.items as OrderItemData[]) {
      const qty = Number(raw.qty) || 0
      const weight = Number(raw.complexity_weight) || 1
      const tier = detectServiceTier(raw)
      const isKiloan = (raw.category ?? '').toLowerCase() === 'kiloan' || (raw.unit ?? '').toLowerCase() === 'kg'

      if (tier === 'instant' || tier === 'sameday') {
        activeExpressCount += qty
      } else if (isKiloan) {
        activeKiloanKg += qty
      } else {
        activeSatuanWeighted += qty * weight
      }
    }
  }

  // 2. Hitung beban dari keranjang saat ini
  let cartKiloanKg = 0
  let cartSatuanWeighted = 0
  let cartExpressCount = 0

  for (const item of cartItems) {
    const qty = Number(item.qty) || 0
    const weight = Number(item.complexity_weight) || 1
    const tier = detectServiceTier(item)
    const isKiloan = (item.category ?? '').toLowerCase() === 'kiloan' || (item.unit ?? '').toLowerCase() === 'kg'

    if (tier === 'instant' || tier === 'sameday') {
      cartExpressCount += qty
    } else if (isKiloan) {
      cartKiloanKg += qty
    } else {
      cartSatuanWeighted += qty * weight
    }
  }

  const kiloanCap = Math.max(Number(settings.kiloan_daily_capacity_kg) || 50, 1)
  const satuanCap = Math.max(Number(settings.satuan_daily_capacity_items) || 30, 1)
  const expressCap = Math.max(Number(settings.express_daily_capacity) || 10, 1)

  // 3. Hitung tambahan waktu akibat antrean melebihi kapasitas harian
  const kiloanDelayDays =
    cartKiloanKg > 0 ? Math.floor((activeKiloanKg + cartKiloanKg) / kiloanCap) : 0
  const satuanDelayDays =
    cartSatuanWeighted > 0 ? Math.floor((activeSatuanWeighted + cartSatuanWeighted) / satuanCap) : 0
  const expressOverflow =
    cartExpressCount > 0 ? Math.max(0, activeExpressCount + cartExpressCount - expressCap) : 0
  const expressDelayHours = expressOverflow > 0 ? Math.ceil(expressOverflow / expressCap) * 4 : 0

  // 4. Cari estimasi paling akhir di antara semua item dalam keranjang
  let maxTotalHours = 0
  let maxBaseDays = 0
  let maxDelayDays = 0
  let isAllExpress = cartItems.length > 0

  for (const item of cartItems) {
    const tier = detectServiceTier(item)
    const isKiloan = (item.category ?? '').toLowerCase() === 'kiloan' || (item.unit ?? '').toLowerCase() === 'kg'
    const baseHours = parseDurationToHours(item.duration, tier)

    let itemDelayHours = 0
    if (tier === 'instant' || tier === 'sameday') {
      itemDelayHours = expressDelayHours
    } else {
      isAllExpress = false
      const delayDays = isKiloan ? kiloanDelayDays : satuanDelayDays
      itemDelayHours = delayDays * 24
      if (delayDays > maxDelayDays) maxDelayDays = delayDays
    }

    const totalHours = baseHours + itemDelayHours
    if (totalHours > maxTotalHours) {
      maxTotalHours = totalHours
      maxBaseDays = Math.ceil(baseHours / 24)
    }
  }

  const estimatedDate = new Date(baseNow.getTime() + maxTotalHours * 60 * 60 * 1000)

  // 5. Susun catatan transparansi untuk kasir
  const notes: string[] = []
  if (cartKiloanKg > 0) {
    notes.push(
      `Antrean Kiloan: ${activeKiloanKg.toFixed(1)} / ${kiloanCap} kg` +
        (kiloanDelayDays > 0 ? ` (+${kiloanDelayDays} hari antrean)` : ' (normal)')
    )
  }
  if (cartSatuanWeighted > 0) {
    notes.push(
      `Antrean Satuan: ${activeSatuanWeighted} / ${satuanCap} poin` +
        (satuanDelayDays > 0 ? ` (+${satuanDelayDays} hari antrean)` : ' (normal)')
    )
  }
  if (cartExpressCount > 0) {
    notes.push(
      `Antrean Express: ${activeExpressCount} / ${expressCap} slot` +
        (expressDelayHours > 0 ? ` (+${expressDelayHours} jam antrean)` : ' (tersedia)')
    )
  }

  return {
    estimatedDate,
    baseDays: maxBaseDays,
    queueDelayDays: maxDelayDays,
    queueDelayHours: expressDelayHours,
    isExpress: isAllExpress,
    notes,
    queueSnapshot: {
      activeKiloanKg,
      activeSatuanWeighted,
      activeExpressCount,
    },
  }
}

export function formatDateTimeID(dateInput?: string | Date | null): string {
  if (!dateInput) return '-'
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}