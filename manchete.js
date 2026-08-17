/* MANCHETE QUE ENCOSTA NAS BORDAS.
 * A medicao mostrou que "Cliente novo," ocupava 66,9% da viewport e "todo dia."
 * 85,6% — o clamp em vw dimensiona a CAIXA, nao os glifos, entao cada linha
 * parava onde a palavra acabava e o dispositivo lia como texto alinhado a
 * esquerda com bandeira, nao como duas linhas em tensao.
 * Aqui cada linha e medida e recebe o tamanho que faz ELA preencher a medida.
 * O eixo wdth continua sendo a assinatura: linha 1 condensada, linha 2 expandida.
 * Texto real no DOM — nada de SVG textLength, que custaria selecao e SEO. */
(() => {
  'use strict';
  const h1 = document.querySelector('.hero h1');
  if (!h1) return;
  const linhas = [...h1.querySelectorAll('.h1__a, .h1__b')];
  if (!linhas.length) return;

  const TETO = 175;   // o climax precisa ser o maior elemento da pagina
  const PISO = 34;

  const faixa = document.createRange();
  const larguraDe = el => { faixa.selectNodeContents(el); return faixa.getBoundingClientRect().width; };

  let larguraAnterior = 0;
  function ajustar() {
    const cs = getComputedStyle(h1);
    const disponivel = h1.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (disponivel < 10) return;
    // A manchete so depende da medida HORIZONTAL. No iOS o resize dispara
    // durante a rolagem (barra do Safari) e isto rodava 4 iteracoes de
    // Range.getBoundingClientRect() intercaladas com escrita de fontSize —
    // thrash de layout sincrono, a cada evento, sem nada ter mudado.
    if (Math.abs(disponivel - larguraAnterior) < 1) return;
    larguraAnterior = disponivel;

    for (const l of linhas) {
      // A escala NAO e linear: medido, 441px a 100px virava 1589px a 307px —
      // 17% acima do previsto por regra de tres (kerning e o eixo wdth da
      // variavel nao escalam proporcionalmente). Em vez de modelar isso,
      // converge por iteracao: tres passadas bastam para ficar sub-pixel.
      let tam = 100;
      l.style.fontSize = tam + 'px';
      for (let i = 0; i < 4; i++) {
        const largura = larguraDe(l);
        if (!largura) break;
        tam = Math.min(TETO, Math.max(PISO, tam * disponivel / largura));
        l.style.fontSize = tam.toFixed(2) + 'px';
        if (Math.abs(largura - disponivel) < 0.5) break;
      }
    }
  }

  const refazer = () => requestAnimationFrame(ajustar);

  // document.fonts.ready resolve ANTES de a face ser pedida, entao a primeira
  // medicao saia com metricas da fonte de fallback e o tamanho calculado
  // estourava a medida em 10%. Carrega as duas faces explicitamente e so
  // entao mede. O primeiro refazer() imediato evita manchete de 100px na
  // pintura inicial, e e corrigido assim que as faces chegam.
  refazer();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('900 100px "Archivo"'),
      document.fonts.load('900 100px "Archivo"', 'Cliente novo, todo dia.'),
    ]).then(refazer).catch(refazer);
  }
  addEventListener('resize', refazer, { passive: true });
})();
