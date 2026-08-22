"""Tira o xadrez de transparencia achatado do JPEG do logo AMO.

O arquivo de origem e um JPEG, e JPEG nao guarda canal alpha — o quadriculado
de transparencia foi rasterizado junto com a arte. Medicao do original:
o xadrez e grayscale puro (#FFFFFF e ~#CCCCCC, saturacao 0.000), enquanto o
cobre do logo tem saturacao alta e o contorno tem luminancia baixa. Da para
separar por saturacao + luminancia com rampa suave na borda.

Isto e paliativo. O certo e o logo em SVG ou PNG com alpha exportado do
original — esta na lista de pendencias da spec.
"""
from PIL import Image
import numpy as np
from pathlib import Path

ORIGEM = Path("_referencias/marca/Gemini_Generated_Image_29yuu129yuu129yu.jpeg")
DESTINO = Path("public/marca")

# Abaixo de SAT_MIN a cor e considerada cinza (candidata a xadrez).
# Acima de VAL_MIN ela e clara demais para ser o contorno preto da arte.
SAT_MIN = 0.12
VAL_MIN = 0.72
# Largura da rampa de alpha, para a borda anti-aliasada nao serrilhar.
#
# Medido no arquivo de origem: o quadrado cinza do xadrez fica em val=0.800
# exato (#CCCCCC = 204/255), com ruido de compressao na faixa ~198-208.
# Com RAMPA=0.10 (valor original da spec), o patamar de alpha=0 so comeca em
# VAL_MIN + RAMPA = 0.82 — o quadrado cinza (0.80) fica DENTRO da rampa, nunca
# alcanca o platô, e sobra com alpha residual de 0.2 (51/255) em vez de zero.
# Isso nao aparece como halo fino na borda: e o proprio miolo dos quadrados
# cinzas do xadrez inteiro, o que tambem impede o getbbox() de recortar de
# verdade (nao ha mais nenhuma margem com alpha exatamente 0 na imagem toda).
# RAMPA=0.06 poe o platô em 0.78, abaixo do 0.80 medido com folga para o
# ruido de compressao, e resolve o quadrado cinza para alpha=0 exato — sem
# custo para o cobre, que so entra no ramo de saturacao (sat > 0.3 sempre,
# bem acima de SAT_MIN) e nunca passa por este calculo.
RAMPA = 0.06


def recortar(img: Image.Image) -> Image.Image:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    mx = rgb.max(axis=2)
    mn = rgb.min(axis=2)
    val = mx
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)

    # 1.0 = totalmente opaco, 0.0 = totalmente transparente.
    # Pixel cinza E claro -> xadrez -> transparente.
    e_cinza = np.clip((SAT_MIN - sat) / SAT_MIN, 0.0, 1.0)
    e_claro = np.clip((val - VAL_MIN) / RAMPA, 0.0, 1.0)
    alpha = 1.0 - (e_cinza * e_claro)

    saida = np.dstack([
        (rgb * 255).astype(np.uint8),
        (alpha * 255).astype(np.uint8),
    ])
    return Image.fromarray(saida, mode="RGBA")


def recortar_caixa(img: Image.Image, box: tuple) -> Image.Image:
    """Corta e apara a moldura transparente que sobrar."""
    corte = img.crop(box)
    limites = corte.getbbox()
    return corte.crop(limites) if limites else corte


def main() -> None:
    if not ORIGEM.exists():
        raise SystemExit(f"origem nao encontrada: {ORIGEM}")

    DESTINO.mkdir(parents=True, exist_ok=True)
    original = Image.open(ORIGEM)
    L, A = original.size
    print(f"origem: {L}x{A}")

    limpo = recortar(original)

    # Lockup completo: a arte inteira, para o footer.
    completo = recortar_caixa(limpo, (0, 0, L, A))
    completo.save(DESTINO / "logo-amo-lockup.png", optimize=True)
    print(f"logo-amo-lockup.png: {completo.size}")

    # Lockup curto: so "A m [pote]", a faixa de cima. Para a nav, onde o
    # descritor e a assinatura ficariam ilegiveis a 40px de altura.
    curto = recortar_caixa(limpo, (0, 0, L, int(A * 0.46)))
    curto.save(DESTINO / "logo-amo.png", optimize=True)
    print(f"logo-amo.png: {curto.size}")


if __name__ == "__main__":
    main()
