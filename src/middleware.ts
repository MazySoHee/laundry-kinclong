import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Buat koneksi Supabase khusus sisi server (Middleware) untuk membaca cookie login
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Cek apakah ada user yang sedang login
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 3. Jika BELUM login & mencoba buka /kasir atau /dashboard -> lempar ke /login
  if (!user && (path.startsWith('/kasir') || path.startsWith('/dashboard'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. Jika SUDAH login, cek role-nya di tabel profiles
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Jika sudah login tapi buka /login -> arahkan ke halaman sesuai role
    if (path === '/login') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'owner' ? '/dashboard' : '/kasir'
      return NextResponse.redirect(url)
    }

    // Jika bukan 'owner' (misal: kasir) mencoba buka /dashboard -> kembalikan ke /kasir
    if (path.startsWith('/dashboard') && role !== 'owner') {
      const url = request.nextUrl.clone()
      url.pathname = '/kasir'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

// Tentukan halaman mana saja yang dijaga oleh Middleware
// (abaikan file gambar, css, dan api agar website tetap cepat)
export const config = {
  matcher: ['/login', '/kasir/:path*', '/dashboard/:path*'],
}