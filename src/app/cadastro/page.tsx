import type { Metadata } from 'next'
import { paginaDaPorta } from '@/components/conta/PaginaDaPorta'

export const metadata: Metadata = { title: 'Criar conta · AMO', robots: { index: false } }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function PaginaCadastro({ searchParams }: Props) {
  return paginaDaPorta('cadastro', await searchParams)
}
