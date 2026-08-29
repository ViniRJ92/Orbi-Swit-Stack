"""
Gera assets/icon.png e assets/icon.ico a partir do novo logo do Orbi Swit
Stack: squircle neutro (grafite) com uma esfera branca (hub) e uma esfera
satélite azul-violeta (conta orbitando), com um "halo" no tom de fundo entre
as duas para manter contraste nítido em tamanhos minúsculos (bandeja do
Windows / favicon). Desenhado em alta resolução com supersampling e depois
reduzido, para bordas bem suaves em qualquer tamanho de exportação.

Orbi Swit Stack — Criado por Vinicius Braga
"""
from PIL import Image, ImageDraw, ImageFilter

SS = 4  # fator de supersampling
BASE = 256
SIZE = BASE * SS

BG_TOP = (27, 34, 41, 255)      # #1B2229
BG_BOTTOM = (13, 16, 19, 255)   # #0D1013
WHITE = (244, 246, 248, 255)    # #F4F6F8
SAT_TOP = (108, 140, 245, 255)  # #6C8CF5
SAT_BOTTOM = (139, 111, 245, 255)  # #8B6FF5
RIM = (10, 12, 15, 255)         # traço escuro para reforçar contraste em micro-tamanhos


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def diagonal_gradient(size, top, bottom):
    img = Image.new('RGBA', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(top, bottom, t)
    return img


def rounded_rect_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def main():
    bg = diagonal_gradient(SIZE, BG_TOP, BG_BOTTOM)
    sat_gradient = diagonal_gradient(SIZE, SAT_TOP, SAT_BOTTOM)

    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0))

    scale = SIZE / 64
    draw = ImageDraw.Draw(canvas)

    # Esfera principal (hub) — branca, com margem generosa da borda.
    cx, cy, r = 27 * scale, 28 * scale, 15 * scale
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)

    # "Halo" no tom de fundo: recorta um respiro entre as duas esferas para
    # nunca perderem contraste, mesmo reduzidas a 16x16.
    sx, sy, halo_r = 42 * scale, 42 * scale, 15 * scale
    halo = diagonal_gradient(SIZE, BG_TOP, BG_BOTTOM)
    halo_mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(halo_mask).ellipse([sx - halo_r, sy - halo_r, sx + halo_r, sy + halo_r], fill=255)
    canvas.paste(halo, (0, 0), halo_mask)

    # Esfera satélite — gradiente azul-violeta, com um traço escuro fino no
    # contorno para reforçar a separação em ícones muito pequenos.
    sat_r = 12 * scale
    sat_mask = Image.new('L', (SIZE, SIZE), 0)
    ImageDraw.Draw(sat_mask).ellipse([sx - sat_r, sy - sat_r, sx + sat_r, sy + sat_r], fill=255)
    canvas.paste(sat_gradient, (0, 0), sat_mask)
    rim_w = max(2, int(1.6 * scale))
    draw.ellipse([sx - sat_r, sy - sat_r, sx + sat_r, sy + sat_r], outline=RIM, width=rim_w)

    # Squircle de fundo (aplicado por último, como máscara alfa geral do ícone).
    radius = int(16 * scale)
    mask = rounded_rect_mask(SIZE, radius)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(canvas, (0, 0), mask)

    out = out.resize((BASE, BASE), Image.LANCZOS)
    out.save('assets/icon.png')

    sizes = [16, 24, 32, 48, 64, 128, 256]
    out.save('assets/icon.ico', sizes=[(s, s) for s in sizes])
    print('OK: assets/icon.png + assets/icon.ico gerados.')


if __name__ == '__main__':
    main()
