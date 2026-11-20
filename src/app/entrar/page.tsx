import type { Metadata } from 'next'
import { paginaDaPorta } from '@/components/conta/PaginaDaPorta'

export const metadata: Metadata = { title: 'Entrar · AMO', robots: { index: false } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PaginaEntrar({ searchParams }: Props) {
  return paginaDaPorta('entrar', await searchParams)
}
