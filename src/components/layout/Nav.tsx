'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const ITENS = [
  { href: '#sabores', rotulo: 'Sabores' },
  { href: '#marca', rotulo: 'A marca' },
  { href: '#ritual', rotulo: 'O ritual' },
] as const

export function Nav() {
  const [rolou, setRolou] = useState(false)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 40)
    aoRolar()
    window.addEventListener('scroll', aoRolar, { passive: true })
    return () => window.removeEventListener('scroll', aoRolar)
  }, [])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto])

  return (
    <div className="sticky top-3 z-40 px-3 md:top-4 md:px-6">
      <nav
        aria-label="Principal"
        className={
          'mx-auto flex h-[88px] max-w-[1280px] items-center justify-between ' +
          'rounded-[20px] px-5 md:px-8 ' +
          'transition-[background-color,box-shadow] duration-[240ms] ' +
          (rolou
            ? 'bg-sage/95 shadow-[0_8px_32px_-8px_rgb(46_36_31_/_0.12)] backdrop-blur-md'
            : 'bg-transparent')
        }
      >
        <Link href="#conteudo" className="shrink-0">
          <Image
            src="/marca/logo-amo.png"
            alt="AMO Sabores Saudáveis"
            width={132}
            height={44}
            priority
            className="h-9 w-auto md:h-11"
          />
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {ITENS.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className="font-sans text-sm text-ink transition-opacity duration-200 hover:opacity-60"
              >
                {i.rotulo}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          onClick={() => setAberto((v) => !v)}
          className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 md:hidden"
        >
          <span aria-hidden="true" className="text-lg leading-none text-ink">
            {aberto ? '×' : '≡'}
          </span>
        </button>
      </nav>

      <div
        id="menu-mobile"
        hidden={!aberto}
        className="mx-auto mt-2 max-w-[1280px] rounded-[20px] bg-sage px-6 py-5 md:hidden"
      >
        <ul className="flex flex-col gap-4">
          {ITENS.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                onClick={() => setAberto(false)}
                className="font-sans text-base text-ink"
              >
                {i.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
