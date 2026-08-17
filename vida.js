/* A camada viva — entrada de conteúdo e massa nos controles.
 * Regra acordada com o Pedro: movimento NUNCA atrasa leitura. Entrada rápida
 * (500ms), deslocamento pequeno (12px), UMA vez, stagger curto, e rede de
 * segurança de 5s. Em prefers-reduced-motion nada disso existe. */
(() => {
  'use strict';
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a nav MERGULHA na secao escura — estado, nao movimento: vale mesmo em
  // reduced-motion, senao a barra de papel atravessa o climax de tinta
  const caso = document.querySelector('.case');
  if (caso) new IntersectionObserver(es => {
    for (const e of es) document.body.classList.toggle('nav-escura', e.isIntersecting);
  }, { rootMargin: '-1px 0px -93% 0px' }).observe(caso);

  if (calmo) return;

  // tudo que entra vivo — o h1 fica de fora (o manchete.js o dimensiona)
  const alvos = [...document.querySelectorAll(
    'h2,.hero .apoio,.hero__acao,.regua .container>div,.prev .lead,.trio>div,' +
    '.case__col,.case__pico,.case__nota,.case__link,.passo,.claro li,' +
    '.quem figure,.quem__nome,.quem .lead,.quem .apoio,.form label,.form .btn,' +
    '.conversa__prova,.alt'
  )];
  alvos.forEach((el, i) => {
    el.classList.add('viva');
    el.style.setProperty('--vd', (i % 5) * 60 + 'ms');
  });
  const olho = new IntersectionObserver((es, o) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('viva--ok'); o.unobserve(e.target); }
  }, { threshold: .2, rootMargin: '0px 0px -6% 0px' });
  alvos.forEach(el => olho.observe(el));
  // o conteudo so esta escondido porque o JS escondeu: se o observer falhar,
  // tudo aparece mesmo assim
  setTimeout(() => alvos.forEach(el => el.classList.add('viva--ok')), 5000);

  // O magnetismo do CTA foi removido: vivia atras de (hover:hover) and
  // (pointer:fine), ou seja, codigo morto para a maioria esmagadora do nosso
  // trafego. O substituto no celular e o :active com escala, no CSS.
})();
