import type { Comentario } from '@/lib/produto'

/** Os comentarios aprovados que os testes de unidade usam no lugar do banco. Data em AAAA-MM-DD. */
export const COMENTARIOS: readonly Comentario[] = [
  { id: 'c1', produto: 'prestigio', nome: 'Carla M.', nota: 5, data: '2026-11-15', texto: 'Não acreditei que era sem açúcar. O coco é de verdade e o bolo é molhadinho até o fundo do pote.' },
  { id: 'c2', produto: 'prestigio', nome: 'Renata S.', nota: 4, data: '2026-11-11', texto: 'Sou diabética e foi o primeiro doce em meses que comi tranquila. Só queria que o pote fosse um pouco maior.' },
  { id: 'c3', produto: 'prestigio', nome: 'Juliana P.', nota: 5, data: '2026-11-04', texto: 'Guardei o pote para levar o próximo no trabalho. O tamanho é certo para depois do almoço.' },
  { id: 'c4', produto: 'prestigio', nome: 'Marina L.', nota: 5, data: '2026-10-29', texto: 'Chegou rapidinho pelo Uber e ainda gelado. Pedi mais dois para a semana.' },
  { id: 'c5', produto: 'prestigio', nome: 'Patrícia R.', nota: 5, data: '2026-10-21', texto: 'Comprei para minha mãe, que está de dieta. Ela disse que é melhor que o de padaria.' },
  { id: 'c6', produto: 'prestigio', nome: 'Fernanda A.', nota: 3, data: '2026-10-12', texto: 'Gostoso, mas eu esperava mais chocolate na massa. O creme de coco é ótimo.' },
  { id: 'c7', produto: 'prestigio', nome: 'Beatriz C.', nota: 5, data: '2026-10-02', texto: 'Low carb que tem gosto de sobremesa de verdade. Virou meu doce de sexta.' },
  { id: 'c8', produto: 'prestigio', nome: 'Aline T.', nota: 4, data: '2026-09-25', texto: 'Muito bom. Achei o adoçante quase imperceptível, o que para mim é o mais importante.' },
  { id: 'c9', produto: 'pacoca', nome: 'Camila F.', nota: 5, data: '2026-11-09', texto: 'Tem pedaço de amendoim de verdade. Me lembrou a paçoca da infância.' },
  { id: 'c10', produto: 'pacoca', nome: 'Luana D.', nota: 4, data: '2026-10-30', texto: 'Muito gostoso, um pouco mais denso que os outros sabores.' },
  { id: 'c11', produto: 'mousse-de-maracuja', nome: 'Tatiana V.', nota: 5, data: '2026-11-13', texto: 'Leve e azedinho, perfeito para o calor.' },
  { id: 'c12', produto: 'ninho-com-frutas-vermelhas', nome: 'Gabriela N.', nota: 5, data: '2026-11-06', texto: 'A calda de frutas vermelhas equilibra tudo. Meu favorito.' },
  { id: 'c13', produto: 'chocolate', nome: 'Daniela O.', nota: 4, data: '2026-11-01', texto: 'Chocolate intenso, do jeito que eu gosto. Pediria com mais creme.' },
  { id: 'c14', produto: 'beijinho', nome: 'Sofia B.', nota: 5, data: '2026-10-25', texto: 'Cremoso e com bastante coco. Ninguém em casa percebeu que era zero açúcar.' },
]
