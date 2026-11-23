import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { phone, customerName, invoiceNumber } = await request.json()

    // Ubah format nomor 08xx menjadi 628xx (standar internasional WhatsApp)
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1)
    }

    // Template pesan otomatis sesuai proposal Laundry Kinclong
    const message = `Halo ${customerName}, cucian Anda (${invoiceNumber}) sudah selesai dan siap diambil. Terima kasih telah memilih Laundry Kinclong.`

    // --- MODE SIMULASI (Log di terminal VS Code) ---
    console.log('=== SIMULASI KIRIM WHATSAPP ===')
    console.log('Tujuan:', formattedPhone)
    console.log('Pesan :', message)
    console.log('===============================')

    /* 
    // CONTOH NANTI JIKA SUDAH PAKAI PROVIDER (Misal: Fonnte)
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: process.env.FONNTE_TOKEN! },
      body: new URLSearchParams({ target: formattedPhone, message }),
    })
    */

    // Kembalikan link wa.me agar bisa langsung dites di browser
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`

    return NextResponse.json({
      success: true,
      message: 'Notifikasi WA berhasil diproses (Mode Simulasi)',
      waUrl,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Gagal memproses notifikasi WA' },
      { status: 500 }
    )
  }
}