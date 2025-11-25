const list = document.querySelectorAll('.item');
const next = document.getElementById('next');
const prev = document.getElementById('prev');

let active = 0;

function changeSlide(direction) {
  list[active].classList.remove('active');
  active = (active + direction + list.length) % list.length;
  list[active].classList.add('active');
}

next.addEventListener('click', () => changeSlide(1));
prev.addEventListener('click', () => changeSlide(-1));

// Extra: controle com teclado (opcional)
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') changeSlide(1);
  if (e.key === 'ArrowLeft') changeSlide(-1);
});
