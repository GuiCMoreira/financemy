import './globals.css'
import { Montserrat } from 'next/font/google'
import { Navegacao } from '@/components/Navegacao'
import { Preferencias } from '@/components/Preferencias'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--fonte-montserrat',
  display: 'swap',
})

export const metadata = {
  title: 'Caixa',
  description: 'Controle financeiro pessoal self-hosted',
}

export const viewport = { themeColor: '#8A19D6' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={montserrat.variable} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <Preferencias>
          {children}
          <Navegacao />
        </Preferencias>
      </body>
    </html>
  )
}
