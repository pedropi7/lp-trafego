/* REVELACAO — nao odometro.
 * A versao anterior contava de 0 ate o valor e, no meio do caminho, EXIBIA
 * NUMERO FALSO: a revisao capturou "R$ 246" e "9,3 mil" onde a verdade e
 * R$ 250 e 9,5 mil. Numa pagina cujo argumento inteiro e medicao verificavel,
 * qualquer print ou rolagem rapida pega um numero errado — e o DESIGN.md ja
 * proibia ("nao anime numero").
 * O valor final esta sempre no DOM. O que anima e a REVELACAO dele: uma
 * mascara que corre da esquerda para a direita. Mesmo evento, zero mentira. */
(() => {
  'use strict';
  const alvos = [...document.querySelectorAll('[data-conta]')];
  if (!alvos.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  alvos.forEach(el => el.classList.add('revela'));
  const olho = new IntersectionObserver((es, obs) => {
    for (const e of es) if (e.isIntersecting) {
      e.target.classList.add('revelado');
      obs.unobserve(e.target);
    }
  }, { threshold: .55 });
  alvos.forEach(el => olho.observe(el));

  // REDE DE SEGURANCA. O texto so fica escondido porque o JS o escondeu — mas
  // se o observer nunca disparar (elemento maior que a viewport, aba em
  // segundo plano, erro adiante no script), os numeros do climax somem para
  // sempre. Sao a prova central da pagina: nao podem depender de um evento.
  setTimeout(() => alvos.forEach(el => el.classList.add('revelado')), 4000);
})();
