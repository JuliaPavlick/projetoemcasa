document.addEventListener('DOMContentLoaded', () => {
    const artistsData = [
        {name: 'Henrique & Juliano', image: './img/henriquejuliano.jpg' },
        {name: 'Jorge & Mateus', image: './img/jorgemateus.jpg' },
        {name: 'Zé Neto & Cristiano', image: './img/zeneto.jpg' },
        {name: 'Gustavo Limma', image: './img/gustavolimma.jpg' },
        {name: 'Luan Santana', image: './img/luansantana.jpg' },
        {name: 'Matheus e Kauan', image: './img/mateuskauan.jpg' }
    ];

    const albumsData = [
        {name: 'White Noise (Sleep & Relaxation Sounds)', artist: 'Sleepy John', image: './img/albumwhitenoise.jpg'},
        {name: 'O Céu Explica tudo (Ao Vivo)', artist: 'Henrique & Juliano', image: './img/albumceuexplica.jpg'},
        {name: 'Nada como um dia após o outro', artist: 'Racionais', image: './img/albumvidaloka.jpg'},
        {name: 'HIT ME HARD AND SOFT', artist: 'Billie Eilish', image: './img/albumhitme.jpg'},
        {name: 'CAJU', artist: 'Liniker', image: './img/albumcaju.jpg'},
        {name: 'Escândalo Íntimo', artist: 'Luísa Sonza', image: './img/albumescandalointimo.jpg'}
    ];

    const artistGrid = document.querySelector('.artists-grid');  
    const albumsGrid = document.querySelector('.albums-grid');
     
   
    artistsData.forEach(artist => {
        const artistCard = document.createElement('div');
        artistCard.classList.add('artist-card');

        artistCard.innerHTML = `
            <img src="${artist.image}" alt="Imagem de ${artist.name}">
            <h3>${artist.name}</h3>
            <p>Artista</p>
        `;

        artistGrid.appendChild(artistCard);
    });

   
    albumsData.forEach(album => {
        const albumCard  = document.createElement('div');
        albumCard.classList.add('album-card'); 

        albumCard.innerHTML = `
            <img src="${album.image}" alt="Capa do álbum ${album.name}">
            <h3>${album.name}</h3>
            <p>${album.artist}</p> 
        `;

        albumsGrid.appendChild(albumCard);
    });
});
