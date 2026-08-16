/* Regua em odometro-revelacao. HONESTO por construcao: o texto no DOM e sempre
 * o valor verdadeiro — o que anima e a POSICAO de cada caractere subindo na
 * janela de recorte, nunca o valor. (O odometro que contava exibia "R$ 246"
 * num print; esse erro nao volta.) A11y: o pai carrega aria-label com o valor,
 * os caracteres sao aria-hidden. */
(() => {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const alvos = [...document.querySelectorAll('.regua b')];
  if (!alvos.length) return;
  for (const el of alvos) {
    const txt = el.textContent;
    el.setAttribute('aria-label', txt.trim());
    el.classList.add('rolo');
    el.textContent = '';
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'rolo__d';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--rd', (i * 45) + 'ms');
      el.appendChild(s);
    });
  }
  const olho = new IntersectionObserver((es, o) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('rolo--ok'); o.unobserve(e.target); }
  }, { threshold: .6 });
  alvos.forEach(el => olho.observe(el));
  setTimeout(() => alvos.forEach(el => el.classList.add('rolo--ok')), 5000);
})();
