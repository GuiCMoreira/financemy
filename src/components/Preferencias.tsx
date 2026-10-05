'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Prefs = {
  oculto: boolean
  alternarOculto: () => void
  tema: 'claro' | 'escuro'
  alternarTema: () => void
}

const Contexto = createContext<Prefs | null>(null)

const CHAVE_OCULTO = 'financas:valores-ocultos'
const CHAVE_TEMA = 'financas:tema'

export function Preferencias({ children }: { children: React.ReactNode }) {
  const [oculto, setOculto] = useState(false)
  const [tema, setTema] = useState<'claro' | 'escuro'>('claro')

  // Lê a preferência salva só depois da hidratação: o servidor não conhece o
  // localStorage, e ler antes disso causaria divergência entre o HTML enviado
  // e o que o React renderiza.
  useEffect(() => {
    try {
      setOculto(localStorage.getItem(CHAVE_OCULTO) === '1')
      const salvo = localStorage.getItem(CHAVE_TEMA)
      if (salvo === 'escuro' || salvo === 'claro') setTema(salvo)
      else if (matchMedia('(prefers-color-scheme: dark)').matches) setTema('escuro')
    } catch {
      // Navegador com armazenamento bloqueado: seguir com os padrões.
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'escuro')
    try {
      localStorage.setItem(CHAVE_TEMA, tema)
    } catch {}
  }, [tema])

  function alternarOculto() {
    setOculto((v) => {
      try {
        localStorage.setItem(CHAVE_OCULTO, v ? '0' : '1')
      } catch {}
      return !v
    })
  }

  return (
    <Contexto.Provider
      value={{
        oculto,
        alternarOculto,
        tema,
        alternarTema: () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro')),
      }}
    >
      {children}
    </Contexto.Provider>
  )
}

export function usarPreferencias(): Prefs {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('usarPreferencias precisa estar dentro de <Preferencias>')
  return ctx
}
