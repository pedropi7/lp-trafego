/* Barra de ação na zona do polegar + convívio com o teclado do iOS.
 * O CTA não é NOVO: ele desce da nav (que o escondia na zona morta do polegar)
 * para o alcance do dedo. Os dois nunca coexistem — o CSS esconde o da nav
 * abaixo de 860px no mesmo commit, senão viram dois WhatsApps e lê como spam. */
(() => {
  'use strict';
  const barra = document.getElementById('acao-fixa');
  if (!barra) return;

  const mostrar = v => barra.classList.toggle('acao-fixa--ok', v);

  // sobe quando o herói sai de vista; some quando o formulário entra (lá o CTA
  // já está na tela e a barra só cobriria o campo)
  const hero = document.getElementById('hero');
  const form = document.querySelector('.conversa');
  let foraDoHero = false, noForm = false;
  const rever = () => mostrar(foraDoHero && !noForm && !tecladoAberto);

  if (hero) new IntersectionObserver(([e]) => { foraDoHero = !e.isIntersecting; rever(); },
    { threshold: 0 }).observe(hero);
  if (form) new IntersectionObserver(([e]) => { noForm = e.isIntersecting; rever(); },
    { rootMargin: '0px 0px -35% 0px' }).observe(form);

  // O teclado do iOS sobe e a barra ficaria plantada sobre o campo que a pessoa
  // digita — a cena mais cara possível, no meio da conversão. focusout dispara
  // ANTES do focusin do campo seguinte: o atraso evita piscar entre campos.
  let tecladoAberto = false, t = 0;
  const alvo = document.getElementById('form');
  if (alvo) {
    alvo.addEventListener('focusin', () => { clearTimeout(t); tecladoAberto = true; rever(); });
    alvo.addEventListener('focusout', () => {
      clearTimeout(t);
      t = setTimeout(() => { tecladoAberto = false; rever(); }, 80);
    });
    // O foco NAO se perde ao rolar para longe: sem isto a barra ficava presa
    // escondida depois que a pessoa tocava num campo e subia a pagina de novo.
    // Medido: "de volta ao meio" dava false quando devia dar true.
    addEventListener('scroll', () => {
      if (!tecladoAberto) return;
      const r = alvo.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) {
        const a = document.activeElement;
        if (a && alvo.contains(a)) a.blur();
        clearTimeout(t); tecladoAberto = false; rever();
      }
    }, { passive: true });
  }

  // rede de segurança: se algum observer falhar, o CTA aparece assim mesmo
  setTimeout(() => { if (!noForm) { foraDoHero = true; rever(); } }, 6000);
})();
