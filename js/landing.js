// PARCHXA landing layer — progressive enhancement for index.html only.
// Everything here is optional decoration: without this file the page is
// fully readable, with all copy visible and every link working.

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hasIO = 'IntersectionObserver' in window;

// ---- gentle reveals (content stays visible if this never runs) ----
if (!reduce && hasIO) {
  root.classList.add('js-anim');

  const revealIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealIO.unobserve(entry.target);
      }
    }
  }, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.setProperty('--rd', `${Math.min(i % 4, 3) * 0.08}s`);
    revealIO.observe(el);
  });

  // ---- story focus: highlight the step crossing the reading band ----
  const steps = document.querySelectorAll('[data-story-step]');
  if (steps.length) {
    const storyIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
      }
    }, { rootMargin: '-34% 0px -34% 0px' });
    steps.forEach((step) => storyIO.observe(step));
  }
}

// ---- pointer tilt on the hero document stack (fine pointers only) ----
const hero = document.querySelector('[data-hero]');
const stack = document.querySelector('[data-doc-stack]');
const finePointer = window.matchMedia('(pointer: fine)').matches;

if (!reduce && finePointer && hero && stack) {
  const BASE_X = 6;   // matches CSS --rx default
  const BASE_Y = -8;  // matches CSS --ry default
  let rotY = BASE_Y;
  let rotX = BASE_X;
  let frame = 0;

  const apply = () => {
    frame = 0;
    stack.style.setProperty('--rx', `${rotX.toFixed(2)}deg`);
    stack.style.setProperty('--ry', `${rotY.toFixed(2)}deg`);
  };

  hero.addEventListener('pointermove', (event) => {
    const box = hero.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width - 0.5;
    const py = (event.clientY - box.top) / box.height - 0.5;
    rotY = BASE_Y + px * 11;
    rotX = BASE_X - py * 8;
    if (!frame) frame = requestAnimationFrame(apply);
  });

  hero.addEventListener('pointerleave', () => {
    rotY = BASE_Y;
    rotX = BASE_X;
    if (!frame) frame = requestAnimationFrame(apply);
  });
}
