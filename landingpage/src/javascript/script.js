const dishesData = [
    {
        image: "src/img/dish.png",
        title: "Hambúrguer Clássico",
        description: "Pão, carne artesanal e queijo.",
        price: "R$20,00"
    },
    {
        image: "src/img/dish2.png",
        title: "Hambúrguer Duplo",
        description: "Dobro de carne, dobro de sabor.",
        price: "R$25,00"
    },
    {
        image: "src/img/dish3.png",
        title: "Hambúrguer Bacon",
        description: "Com bacon crocante.",
        price: "R$23,00"
    },
    {
        image: "src/img/dish4.png",
        title: "Hambúrguer Especial",
        description: "Receita da casa.",
        price: "R$28,00"
    }
];

const dishesContainer = document.getElementById("dishes");

dishesData.forEach(dish => {
    const dishElement = document.createElement("article");
    dishElement.classList.add("dish");

    dishElement.innerHTML = `
        <span class="dish-heart">
            <i class="fa-solid fa-heart"></i>
        </span>

        <img src="${dish.image}" alt="${dish.title}">

        <h4 class="dish-title">${dish.title}</h4>

        <p class="dish-description">${dish.description}</p>

        <div class="dish-rate">
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <i class="fa-solid fa-star"></i>
            <span>(500+)</span>
        </div>

        <div class="dish-price">
            <strong>${dish.price}</strong>
            <button class="btn-default" aria-label="Adicionar ao carrinho">
                <i class="fa-solid fa-basket-shopping"></i>
            </button>
        </div>
    `;

    dishesContainer.appendChild(dishElement);
});
