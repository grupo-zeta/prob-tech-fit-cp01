#!/usr/bin/env python3
"""
Validador de .pptx — geometria, proporcao de imagem e estrutura do pacote.

Uso:
    python validar_pptx.py deck.pptx
    python validar_pptx.py deck.pptx --slides 49,50     # so estes (ordem de apresentacao)

Sai com codigo 1 se encontrar qualquer problema.

Verifica:
  1. shapes fora da borda do slide
  2. imagens com proporcao distorcida em relacao ao arquivo de origem
  3. entradas duplicadas em <p:sldIdLst>
  4. relationships de imagem orfas
  5. sobreposicao entre caixa de texto e imagem

Dependencia opcional: Pillow (para ler dimensoes de imagem).
Sem Pillow, a verificacao 2 e pulada com aviso.
"""

import argparse
import io
import re
import sys
import zipfile

try:
    from PIL import Image
    TEM_PIL = True
except ImportError:
    TEM_PIL = False

EMU_POR_POL = 914400
TOL_PROPORCAO = 0.01
MARGEM_AVISO = 228600  # 0,25" — abaixo disto e aperto real; 0,5" so como meta,
                       # porque muitos templates usam 311700 (0,34") por padrao
MIN_TEXTO_SOBREPOSICAO = 60   # so alerta sobreposicao de blocos de texto reais;
                              # titulo curto cruzando figura lateral e normal
FRACAO_SOBREPOSICAO = 0.15    # e so quando cobre parte relevante da caixa

RE_SLDID = re.compile(r'<p:sldId id="(\d+)" r:id="([^"]+)"/>')
RE_REL = re.compile(r'Id="([^"]+)"[^>]*Target="([^"]+)"')
RE_SHAPE = re.compile(r"<p:(sp|pic)>.*?</p:\1>", re.S)
RE_NOME = re.compile(r'name="([^"]*)"')
RE_XFRM = re.compile(
    r'<a:off x="(-?\d+)" y="(-?\d+)"\s*/>\s*<a:ext cx="(\d+)" cy="(\d+)"'
)
RE_EMBED = re.compile(r'r:embed="([^"]+)"')
RE_TEXTO = re.compile(r"<a:t>([^<]*)</a:t>")
RE_SRCRECT = re.compile(r"<a:srcRect([^/>]*)/?>")


def fracoes_srcrect(bloco):
    """Retorna (fracao_largura, fracao_altura) considerando o recorte <a:srcRect>.

    Os atributos l/r/t/b vem em milesimos de porcento (100000 = 100%).
    Sem srcRect, devolve (1.0, 1.0).
    """
    m = RE_SRCRECT.search(bloco)
    if not m:
        return 1.0, 1.0
    attrs = dict(re.findall(r'(\w+)="(-?\d+)"', m.group(1)))
    l = int(attrs.get("l", 0)) / 100000
    r = int(attrs.get("r", 0)) / 100000
    t = int(attrs.get("t", 0)) / 100000
    b = int(attrs.get("b", 0)) / 100000
    fw = max(1e-6, 1.0 - l - r)
    fh = max(1e-6, 1.0 - t - b)
    return fw, fh


class Achado:
    def __init__(self, nivel, slide, msg):
        self.nivel = nivel  # "ERRO" ou "AVISO"
        self.slide = slide
        self.msg = msg

    def __str__(self):
        onde = f"slide {self.slide}" if self.slide else "pacote"
        return f"[{self.nivel}] {onde}: {self.msg}"


def ler_pacote(caminho):
    z = zipfile.ZipFile(caminho)
    pres = z.read("ppt/presentation.xml").decode("utf-8")
    rels = dict(RE_REL.findall(z.read("ppt/_rels/presentation.xml.rels").decode("utf-8")))
    m = re.search(r'sldSz[^>]*cx="(\d+)"', pres) or re.search(r'cx="(\d+)"[^>]*sldSz', pres)
    largura = int(re.search(r'<p:sldSz[^>]*cx="(\d+)"', pres).group(1))
    altura = int(re.search(r'<p:sldSz[^>]*cy="(\d+)"', pres).group(1))
    ordem = []
    for _sid, rid in RE_SLDID.findall(pres):
        alvo = rels.get(rid)
        if alvo:
            ordem.append("ppt/" + alvo.lstrip("/"))
    return z, largura, altura, ordem


def dimensoes_imagem(z, caminho):
    if not TEM_PIL:
        return None
    try:
        with Image.open(io.BytesIO(z.read(caminho))) as im:
            return im.size
    except Exception:
        return None


def shapes_do_slide(xml):
    saida = []
    for m in RE_SHAPE.finditer(xml):
        bloco = m.group(0)
        nome = RE_NOME.search(bloco)
        xf = RE_XFRM.search(bloco)
        if not xf:
            continue  # herda geometria do layout, nada a checar aqui
        x, y, cx, cy = (int(v) for v in xf.groups())
        embed = RE_EMBED.search(bloco)
        texto = "".join(RE_TEXTO.findall(bloco))
        saida.append(
            {
                "tipo": m.group(1),
                "nome": nome.group(1) if nome else "(sem nome)",
                "x": x, "y": y, "cx": cx, "cy": cy,
                "embed": embed.group(1) if embed else None,
                "texto": texto,
                "crop": fracoes_srcrect(bloco),
            }
        )
    return saida


def sobrepoe(a, b):
    ox = min(a["x"] + a["cx"], b["x"] + b["cx"]) - max(a["x"], b["x"])
    oy = min(a["y"] + a["cy"], b["y"] + b["cy"]) - max(a["y"], b["y"])
    return (ox, oy) if ox > 0 and oy > 0 else None


def validar(caminho, filtro=None):
    z, W, H, ordem = ler_pacote(caminho)
    achados = []

    print(f"Arquivo........: {caminho}")
    print(f"Slide..........: {W} x {H} EMU  ({W/EMU_POR_POL:.3g} x {H/EMU_POR_POL:.3g} pol)")
    print(f"Total de slides: {len(ordem)}")
    if not TEM_PIL:
        print("AVISO: Pillow nao instalado — checagem de proporcao desativada.")
    print()

    # --- 3. slides duplicados no sldIdLst ---
    for alvo in sorted(set(ordem)):
        n = ordem.count(alvo)
        if n > 1:
            posicoes = [i + 1 for i, a in enumerate(ordem) if a == alvo]
            achados.append(
                Achado("ERRO", None,
                       f"{alvo} aparece {n}x em <p:sldIdLst>, nas posicoes {posicoes}. "
                       "Remova uma entrada <p:sldId> e a Relationship correspondente "
                       "em ppt/_rels/presentation.xml.rels. NAO apague o slideN.xml.")
            )

    for i, parte in enumerate(ordem, 1):
        if filtro and i not in filtro:
            continue
        try:
            xml = z.read(parte).decode("utf-8")
        except KeyError:
            achados.append(Achado("ERRO", i, f"parte ausente no pacote: {parte}"))
            continue

        rels_path = parte.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
        try:
            rels_xml = z.read(rels_path).decode("utf-8")
        except KeyError:
            rels_xml = ""
        rels = dict(RE_REL.findall(rels_xml))

        shapes = shapes_do_slide(xml)

        # --- 1. transbordo ---
        for s in shapes:
            fora = []
            if s["x"] < 0:
                fora.append(f"x={s['x']} < 0")
            if s["y"] < 0:
                fora.append(f"y={s['y']} < 0")
            if s["x"] + s["cx"] > W:
                fora.append(f"direita={s['x']+s['cx']} > {W} (excesso {s['x']+s['cx']-W})")
            if s["y"] + s["cy"] > H:
                fora.append(f"base={s['y']+s['cy']} > {H} (excesso {s['y']+s['cy']-H})")
            if fora:
                achados.append(
                    Achado("ERRO", i, f"{s['tipo']} \"{s['nome']}\" fora do slide: " + "; ".join(fora))
                )
            elif s["x"] < MARGEM_AVISO or s["x"] + s["cx"] > W - MARGEM_AVISO:
                achados.append(
                    Achado("AVISO", i,
                           f"{s['tipo']} \"{s['nome']}\" a menos de 0,25\" da borda lateral "
                           f"(x={s['x']}, direita={s['x']+s['cx']})")
                )

        # --- 2. proporcao das imagens ---
        if TEM_PIL:
            for s in shapes:
                if s["tipo"] != "pic" or not s["embed"]:
                    continue
                alvo = rels.get(s["embed"])
                if not alvo:
                    achados.append(
                        Achado("ERRO", i, f"pic \"{s['nome']}\" usa r:embed={s['embed']} "
                                          "sem Relationship correspondente")
                    )
                    continue
                cam = "ppt/" + alvo.replace("../", "")
                dim = dimensoes_imagem(z, cam)
                if not dim:
                    continue
                wpx, hpx = dim
                fw, fh = s["crop"]
                w_ef, h_ef = wpx * fw, hpx * fh  # area visivel apos <a:srcRect>
                razao_arq = w_ef / h_ef
                razao_shp = s["cx"] / s["cy"]
                if abs(razao_shp - razao_arq) > TOL_PROPORCAO:
                    cy_certo = round(s["cx"] * h_ef / w_ef)
                    cx_certo = round(s["cy"] * w_ef / h_ef)
                    nota = ""
                    if (fw, fh) != (1.0, 1.0):
                        nota = (f" (com recorte srcRect: area visivel "
                                f"{w_ef:.0f}x{h_ef:.0f} px)")
                    achados.append(
                        Achado("ERRO", i,
                               f"pic \"{s['nome']}\" DISTORCIDA. "
                               f"{alvo.split('/')[-1]} e {wpx}x{hpx} px{nota}, "
                               f"razao esperada {razao_arq:.4f}, "
                               f"mas ext e {s['cx']}x{s['cy']} (razao {razao_shp:.4f}). "
                               f"Corrija para ext({s['cx']}, {cy_certo}) "
                               f"ou ext({cx_certo}, {s['cy']}).")
                    )

        # --- 4. rels de imagem orfas ---
        usadas = set(RE_EMBED.findall(xml))
        for rid, alvo in rels.items():
            if "/media/" in alvo and rid not in usadas:
                achados.append(
                    Achado("AVISO", i,
                           f"relationship de imagem orfa: {rid} -> {alvo.split('/')[-1]} "
                           "(nenhum <p:pic> usa). Veja o que e antes de remover — "
                           "pode ser um arquivo que falta em outro slide.")
                )

        # --- 5. sobreposicao texto x imagem ---
        textos = [s for s in shapes if s["tipo"] == "sp" and s["texto"].strip()]
        pics = [s for s in shapes if s["tipo"] == "pic"]
        for t in textos:
            if len(t["texto"].strip()) < MIN_TEXTO_SOBREPOSICAO:
                continue  # titulo/rotulo curto: cruzar figura lateral e aceitavel
            for p in pics:
                ov = sobrepoe(t, p)
                menor = max(1, min(t["cx"] * t["cy"], p["cx"] * p["cy"]))
                if ov and (ov[0] * ov[1]) / menor >= FRACAO_SOBREPOSICAO:
                    achados.append(
                        Achado("AVISO", i,
                               f"sp \"{t['nome']}\" sobrepoe pic \"{p['nome']}\" "
                               f"em {ov[0]} x {ov[1]} EMU. Confirme na renderizacao: "
                               "titulo largo cruzando figura lateral pode ser aceitavel; "
                               "paragrafo por baixo da figura nao e.")
                    )

    return achados


def main():
    ap = argparse.ArgumentParser(description="Valida geometria e estrutura de um .pptx")
    ap.add_argument("pptx")
    ap.add_argument("--slides", help="lista de posicoes na apresentacao, ex: 49,50")
    args = ap.parse_args()

    filtro = None
    if args.slides:
        filtro = {int(n) for n in args.slides.replace(" ", "").split(",") if n}

    achados = validar(args.pptx, filtro)

    erros = [a for a in achados if a.nivel == "ERRO"]
    avisos = [a for a in achados if a.nivel == "AVISO"]

    for a in erros:
        print(a)
    if erros and avisos:
        print()
    for a in avisos:
        print(a)

    print()
    print(f"Resultado: {len(erros)} erro(s), {len(avisos)} aviso(s).")
    if erros:
        print("REPROVADO — corrija os erros antes de entregar.")
        return 1
    if avisos:
        print("APROVADO com avisos — confirme cada aviso na renderizacao visual.")
        return 0
    print("APROVADO — nenhuma inconsistencia geometrica ou estrutural.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
