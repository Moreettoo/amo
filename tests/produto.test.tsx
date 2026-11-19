import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MolduraProduto, classeDoFormato } from '@/components/ui/MolduraProduto'
import { CardProduto } from '@/components/ui/CardProduto'
import { FotoParallax } from '@/components/ui/FotoParallax'
import { GradeProdutos } from '@/components/ui/GradeProdutos'
import { PRODUTOS } from '@/data/produtos'
import type { Produto } from '@/lib/catalogo'

const prestigio = PRODUTOS[0]
const nomes = { 'zero-acucar': 'Zero açúcar', fibras: 'Fonte de fibras' }

describe('classeDoFormato', () => {
  it.each([
    ['pote', 'pote'],
    ['inteiro', 'inteiro'],
    ['unidade', 'unidade'],
    ['caixa', 'neutra'],
    ['', 'neutra'],
  ])('%s vira %s', (formato, classe) => {
    expect(classeDoFormato(formato)).toBe(classe)
  })
})

describe('MolduraProduto', () => {
  const montar = (formato: string, nome = 'Prestígio') =>
    render(
      <MolduraProduto formato={formato} nome={nome}>
        <span>foto</span>
      </MolduraProduto>,
    ).container.firstElementChild as HTMLElement

  it('pote: arco com a etiqueta oval, decorativa', () => {
    const raiz = montar('pote')
    expect(raiz).toHaveClass('moldura', 'moldura--pote')
    const etiqueta = raiz.querySelector('.etiqueta')!
    expect(etiqueta).toHaveAttribute('aria-hidden', 'true')
    expect(etiqueta).toHaveTextContent('Prestígio')
  })

  it('nome com mais de 11 letras usa o corpo menor da etiqueta', () => {
    expect(montar('pote', 'Paçoca').querySelector('.etiqueta')).not.toHaveClass('etiqueta--longa')
    expect(montar('pote', 'Ninho com frutas vermelhas').querySelector('.etiqueta')).toHaveClass('etiqueta--longa')
  })

  it('inteiro: círculo com fita', () => {
    const raiz = montar('inteiro', 'Cenoura com cacau')
    expect(raiz).toHaveClass('moldura--inteiro')
    expect(raiz.querySelector('.fita')).toHaveAttribute('aria-hidden', 'true')
  })

  it('unidade: quadrado com carimbo', () => {
    const raiz = montar('unidade', 'Torta de frango')
    expect(raiz).toHaveClass('moldura--unidade')
    expect(raiz.querySelector('.carimbo')).toHaveAttribute('aria-hidden', 'true')
  })

  it('formato desconhecido: moldura neutra, sem acessório', () => {
    const raiz = montar('caixa')
    expect(raiz).toHaveClass('moldura--neutra')
    expect(raiz.querySelector('.etiqueta, .fita, .carimbo')).toBeNull()
    expect(raiz).toHaveTextContent('foto')
  })
})

describe('CardProduto', () => {
  it('mostra tipo, nome em h3, frase, foto com alt e dimensões, e os selos', () => {
    render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    const card = screen.getByRole('article', { name: 'Prestígio' })
    expect(screen.getByRole('heading', { level: 3, name: 'Prestígio' })).toBeInTheDocument()
    expect(card).toHaveTextContent('Bolo no pote')
    expect(card).toHaveTextContent('Um abraço em forma de sobremesa')
    const foto = screen.getByAltText(prestigio.imagem.alt)
    expect(foto).toHaveAttribute('width', '666')
    expect(foto).toHaveAttribute('height', '1000')
    expect(foto).toHaveAttribute('loading', 'lazy')
    const selos = screen.getByRole('list', { name: 'Selos' })
    expect(selos).toHaveTextContent('Zero açúcar')
    expect(selos).toHaveTextContent('Fonte de fibras')
    // os selos moram no texto do card: por cima da foto tapavam o pote e o rótulo
    expect(selos.closest('.moldura')).toBeNull()
  })

  it('no catálogo o nome desce para h4 (categoria, linha, produto), e o card segue rotulado por ele', () => {
    render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} nivel={4} />)
    expect(screen.getByRole('heading', { level: 4, name: 'Prestígio' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getByRole('article', { name: 'Prestígio' })).toBeInTheDocument()
  })

  it('a foto pré-carregada sai sem lazy: é a primeira da página', () => {
    render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} precarregada />)
    expect(screen.getByAltText(prestigio.imagem.alt)).not.toHaveAttribute('loading')
  })

  it('sem frase, sem parágrafo de frase', () => {
    const semFrase: Produto = { ...prestigio, frase: undefined }
    const { container } = render(<CardProduto produto={semFrase} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.card-produto__frase')).toBeNull()
  })

  it('formato desconhecido não quebra o card', () => {
    const caixa: Produto = { ...prestigio, formato: 'caixa' }
    const { container } = render(<CardProduto produto={caixa} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.moldura--neutra')).toBeInTheDocument()
  })

  it('a foto entra num pote que enche (classe liq)', () => {
    const { container } = render(<CardProduto produto={prestigio} tipo="Bolo no pote" nomesDosSelos={nomes} />)
    expect(container.querySelector('.liq img')).toBeInTheDocument()
  })
})

describe('FotoParallax', () => {
  it('marca o miolo que se move com data-parallax', () => {
    const { container } = render(<FotoParallax imagem={prestigio.imagem} sizes="300px" />)
    expect(container.querySelector('[data-parallax] img')).toBeInTheDocument()
  })

  it('lazy por padrão, eager quando pedido, e sem loading quando é preload', () => {
    const { rerender } = render(<FotoParallax imagem={prestigio.imagem} sizes="300px" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'lazy')
    rerender(<FotoParallax imagem={prestigio.imagem} sizes="300px" carregamento="eager" />)
    expect(screen.getByRole('img')).toHaveAttribute('loading', 'eager')
    rerender(<FotoParallax imagem={prestigio.imagem} sizes="300px" preload />)
    expect(screen.getByRole('img')).not.toHaveAttribute('loading')
  })
})

describe('GradeProdutos', () => {
  const tipos = { 'bolos-no-pote': 'Bolo no pote' }

  it('lista os cards na ordem recebida', () => {
    render(<GradeProdutos produtos={PRODUTOS.slice(0, 3)} tipos={tipos} nomesDosSelos={nomes} />)
    expect(screen.getAllByRole('article').map((a) => a.getAttribute('aria-labelledby'))).toEqual([
      'produto-prestigio',
      'produto-pacoca',
      'produto-mousse-de-maracuja',
    ])
  })

  it('com âncora, cada card é alvo do link de sabor: id do slug e scroll-mt-24', () => {
    const { container } = render(
      <GradeProdutos produtos={[prestigio]} tipos={tipos} nomesDosSelos={nomes} comAncora />,
    )
    const item = container.querySelector('li')!
    expect(item).toHaveAttribute('id', 'prestigio')
    expect(item).toHaveClass('scroll-mt-24')
  })

  it('repassa o nível do título e pré-carrega só a foto pedida', () => {
    render(
      <GradeProdutos
        produtos={PRODUTOS.slice(0, 3)}
        tipos={tipos}
        nomesDosSelos={nomes}
        nivel={4}
        precarregar="prestigio"
      />,
    )
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(3)
    const semLazy = screen.getAllByRole('img').filter((img) => !img.hasAttribute('loading'))
    expect(semLazy.map((img) => img.getAttribute('alt'))).toEqual([prestigio.imagem.alt])
  })

  it('sem âncora, sem id', () => {
    const { container } = render(<GradeProdutos produtos={[prestigio]} tipos={tipos} nomesDosSelos={nomes} />)
    expect(container.querySelector('li')).not.toHaveAttribute('id')
  })
})
