// Seleciona o botão ">" (avançar)
let btnNext = document.querySelector('.next')

// Seleciona o botão "<" (voltar)
let btnBack = document.querySelector('.back')

// Seleciona o container principal (onde estão os elementos visuais do carrossel)
let container = document.querySelector('.container')

// Seleciona a lista principal de destinos (as imagens grandes)
let list = document.querySelector('.container .list')

// Seleciona a lista de miniaturas (as imagens pequenas abaixo ou ao lado)
let thumb = document.querySelector('.container .thumb')


// Adiciona o evento de clique no botão ">"
btnNext.onclick = () => moveItemsOnClick('next')

// Adiciona o evento de clique no botão "<"
btnBack.onclick = () => moveItemsOnClick('back')


// Função responsável por mover os itens do carrossel
function moveItemsOnClick(type){

    // Captura novamente todos os itens grandes e miniaturas (atualizados a cada clique)
    let listItems = document.querySelectorAll('.list .list-item')
    let thumbItems = document.querySelectorAll('.thumb .thumb-item')

    // Se o usuário clicou no botão "próximo"
    if(type === 'next'){
        // Move o primeiro item da lista principal para o final
        list.appendChild(listItems[0])

        // Move também a miniatura correspondente para o final
        thumb.appendChild(thumbItems[0])

        // Adiciona a classe CSS "next" para ativar a animação de avanço
        container.classList.add('next')
    } else {
        // Se o usuário clicou no botão "voltar"
        
        // Move o último item da lista principal para o início
        list.prepend(listItems[listItems.length - 1])

        // Move a miniatura correspondente para o início
        thumb.prepend(thumbItems[listItems.length - 1])

        // Adiciona a classe CSS "back" para ativar a animação de retorno
        container.classList.add('back')
    }

    // Após 3 segundos (3000ms), remove as classes de animação
    // Isso garante que o carrossel fique pronto para o próximo clique
    setTimeout(() => {
        container.classList.remove('next')
        container.classList.remove('back')
    }, 3000)
}
