'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import AppHeader, { headerButtonClass } from '@/components/AppHeader'
import { Toast, useToast } from '@/components/Toast'
import { rupiah } from '@/lib/ui'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Scale,
  Shirt,
  Clock,
  Loader2,
  Tags,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

type Category = 'kiloan' | 'satuan'

type Service = {
  id: string
  name: string
  category: Category
  price: number
  unit: string
  estimated_days: string
}

type FormState = {
  name: string
  category: Category
  price: string
  unit: string
  estimated_days: string
}

type FormErrors = Partial<Record<'name' | 'price' | 'unit' | 'estimated_days', string>>

const emptyForm: FormState = {
  name: '',
  category: 'kiloan',
  price: '',
  unit: 'kg',
  estimated_days: '',
}

const inputClass = (hasError: boolean) =>
  `min-h-11 w-full rounded-xl border bg-white px-3 py-2.5 text-base outline-none transition-colors duration-200 focus:ring-2 motion-reduce:transition-none ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-100'
  }`

const chipClass = (active: boolean) =>
  `inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-xl border px-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 motion-reduce:transition-none ${
    active
      ? 'border-teal-600 bg-teal-600 text-white'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`

function Field({
  id,
  label,
  error,
  helper,
  children,
}: {
  id: string
  label: string
  error?: string
  helper?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{' '}
        <span className="text-red-600" aria-hidden="true">
          *
        </span>
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : helper ? (
        <p id={`${id}-help`} className="mt-1.5 text-sm text-slate-500">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export default function ServicesPage() {
  const supabase = useMemo(() => createClient(), [])
  const { toast, show, hide } = useToast()
  const nameRef = useRef<HTMLInputElement>(null)

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<Category | 'semua'>('semua')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase.from('services').select('*').order('name')
    if (error) {
      setLoadError(true)
    } else {
      setServices((data as Service[]) ?? [])
      setLoadError(false)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  function retry() {
    setLoading(true)
    fetchServices()
  }

  const closeForm = useCallback(() => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
  }, [])

  // Tutup dialog dengan Escape + kunci scroll halaman saat dialog terbuka
  useEffect(() => {
    if (!showForm && !deleteTarget) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (deleteTarget) setDeleteTarget(null)
      else closeForm()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [showForm, deleteTarget, closeForm])

  useEffect(() => {
    if (showForm) nameRef.current?.focus()
  }, [showForm])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(s: Service) {
    setEditingId(s.id)
    setForm({
      name: s.name,
      category: s.category,
      price: String(s.price),
      unit: s.unit,
      estimated_days: s.estimated_days,
    })
    setErrors({})
    setShowForm(true)
  }

  function changeCategory(category: Category) {
    setForm((f) => ({
      ...f,
      category,
      // Saat tambah baru, satuan menyesuaikan kategori
      unit: editingId ? f.unit : category === 'kiloan' ? 'kg' : 'pcs',
    }))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'Nama layanan wajib diisi.'
    if (!form.price || Number(form.price) <= 0) e.price = 'Harga harus lebih dari 0.'
    if (!form.unit.trim()) e.unit = 'Satuan wajib diisi.'
    if (!form.estimated_days.trim()) e.estimated_days = 'Estimasi wajib diisi.'
    return e
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      unit: form.unit.trim(),
      estimated_days: form.estimated_days.trim(),
    }

    const { error } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert(payload)

    setSaving(false)

    if (error) {
      show('error', 'Gagal menyimpan layanan. Coba lagi.')
      return
    }

    show('success', editingId ? 'Layanan berhasil diperbarui.' : 'Layanan berhasil ditambahkan.')
    closeForm()
    fetchServices()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('services').delete().eq('id', deleteTarget.id)
    setDeleting(false)

    if (error) {
      show('error', 'Gagal menghapus layanan. Coba lagi.')
      return
    }

    show('success', `Layanan "${deleteTarget.name}" dihapus.`)
    setDeleteTarget(null)
    fetchServices()
  }

  const counts = {
    kiloan: services.filter((s) => s.category === 'kiloan').length,
    satuan: services.filter((s) => s.category === 'satuan').length,
  }
  const visible = services.filter((s) => filter === 'semua' || s.category === filter)

  return (
    <div className="min-h-dvh bg-slate-50">
      <AppHeader
        title="Layanan & Harga"
        subtitle="Kelola daftar layanan laundry"
        icon={Tags}
        action={
          <Link href="/dashboard" className={headerButtonClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sr-only sm:hidden">Kembali ke Dashboard</span>
          </Link>
        }
      />

      <main id="main" className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1" role="group" aria-label="Filter kategori">
            <button
              onClick={() => setFilter('semua')}
              aria-pressed={filter === 'semua'}
              className={chipClass(filter === 'semua')}
            >
              Semua ({services.length})
            </button>
            <button
              onClick={() => setFilter('kiloan')}
              aria-pressed={filter === 'kiloan'}
              className={chipClass(filter === 'kiloan')}
            >
              Kiloan ({counts.kiloan})
            </button>
            <button
              onClick={() => setFilter('satuan')}
              aria-pressed={filter === 'satuan'}
              className={chipClass(filter === 'satuan')}
            >
              Satuan ({counts.satuan})
            </button>
          </div>

          <button
            onClick={openAdd}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Layanan
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-12 text-center"
          >
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" aria-hidden="true" />
            <p className="font-medium text-red-800">Daftar layanan gagal dimuat.</p>
            <button
              onClick={retry}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Coba lagi
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center">
            <Tags className="mx-auto mb-2 h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="font-medium text-slate-700">
              {services.length === 0 ? 'Belum ada layanan' : 'Tidak ada layanan di kategori ini'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Tambahkan layanan agar kasir bisa memilihnya saat input order.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Tambah Layanan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => {
              const isKiloan = s.category === 'kiloan'
              const Icon = isKiloan ? Scale : Shirt
              return (
                <article
                  key={s.id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                          isKiloan ? 'bg-cyan-50 text-cyan-600' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-slate-800">{s.name}</h2>
                        <span
                          className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                            isKiloan
                              ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          {s.category}
                        </span>
                      </div>
                    </div>
                    <div className="-mr-2 -mt-1 flex shrink-0">
                      <button
                        onClick={() => openEdit(s)}
                        aria-label={`Edit layanan ${s.name}`}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 motion-reduce:transition-none"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        aria-label={`Hapus layanan ${s.name}`}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 motion-reduce:transition-none"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2 border-t border-slate-100 pt-4">
                    <p className="text-lg font-bold tabular-nums text-slate-800">
                      {rupiah(s.price)}
                      <span className="text-sm font-normal text-slate-500"> / {s.unit}</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      {s.estimated_days}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Dialog tambah / edit */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-2xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id="form-title" className="text-lg font-bold text-slate-800">
                {editingId ? 'Edit Layanan' : 'Tambah Layanan'}
              </h2>
              <button
                onClick={closeForm}
                aria-label="Tutup form"
                className="-mr-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="space-y-4">
              <Field id="f-name" label="Nama Layanan" error={errors.name} helper="Contoh: Cuci Kering Setrika">
                <input
                  id="f-name"
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? 'f-name-error' : 'f-name-help'}
                  className={inputClass(!!errors.name)}
                />
              </Field>

              <div>
                <label htmlFor="f-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kategori
                </label>
                <select
                  id="f-category"
                  value={form.category}
                  onChange={(e) => changeCategory(e.target.value as Category)}
                  className={`${inputClass(false)} cursor-pointer`}
                >
                  <option value="kiloan">Kiloan</option>
                  <option value="satuan">Satuan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field id="f-price" label="Harga (Rp)" error={errors.price} helper="Harga per satuan">
                  <input
                    id="f-price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    aria-invalid={!!errors.price}
                    aria-describedby={errors.price ? 'f-price-error' : 'f-price-help'}
                    className={inputClass(!!errors.price)}
                  />
                </Field>
                <Field id="f-unit" label="Satuan" error={errors.unit} helper="Contoh: kg, pcs">
                  <input
                    id="f-unit"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    aria-invalid={!!errors.unit}
                    aria-describedby={errors.unit ? 'f-unit-error' : 'f-unit-help'}
                    className={inputClass(!!errors.unit)}
                  />
                </Field>
              </div>

              <Field
                id="f-days"
                label="Estimasi Selesai"
                error={errors.estimated_days}
                helper="Contoh: 2 hari"
              >
                <input
                  id="f-days"
                  value={form.estimated_days}
                  onChange={(e) => setForm({ ...form, estimated_days: e.target.value })}
                  aria-invalid={!!errors.estimated_days}
                  aria-describedby={errors.estimated_days ? 'f-days-error' : 'f-days-help'}
                  className={inputClass(!!errors.estimated_days)}
                />
              </Field>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="min-h-11 flex-1 cursor-pointer rounded-xl border border-slate-200 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 motion-reduce:transition-none"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi hapus */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-title"
            aria-describedby="del-desc"
            className="w-full rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-sm sm:rounded-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 id="del-title" className="text-lg font-bold text-slate-800">
              Hapus layanan?
            </h2>
            <p id="del-desc" className="mt-1 text-sm text-slate-600">
              Layanan &quot;{deleteTarget.name}&quot; akan dihapus permanen dan tidak bisa
              dikembalikan.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                autoFocus
                className="min-h-11 flex-1 cursor-pointer rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={hide} />
    </div>
  )
}