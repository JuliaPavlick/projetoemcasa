
        const prevButton = document.getElementById('prev');
        const nextButton = document.getElementById('next');
        const items = document.querySelectorAll('.item');
        const dots = document.querySelectorAll('.dot');
        const numberIndicator = document.querySelector('.numbers');

        let active = 0;
        const total = items.length;
        let timer = null;
        const AUTOPLAY_MS = 5000;

   
        function show(index) {
            active = ((index % total) + total) % total; // garante 0..total-1 mesmo com negativos
            items.forEach((it, i) => it.classList.toggle('active', i === active));
            dots.forEach((d, i) => d.classList.toggle('active', i === active));
            numberIndicator.textContent = String(active + 1).padStart(2, '0');
            resetTimer();
        }

      
        function update(direction) {
            show(active + direction);
        }

        function resetTimer() {
            if (timer) clearInterval(timer);
            timer = setInterval(() => update(1), AUTOPLAY_MS);
        }

 
        prevButton.addEventListener('click', () => update(-1));
        nextButton.addEventListener('click', () => update(1));

       
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const idx = Number(dot.dataset.index);
                if (!Number.isNaN(idx)) show(idx);
            });
        });

       
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') update(-1);
            if (e.key === 'ArrowRight') update(1);
        });

        resetTimer();

        show(0);