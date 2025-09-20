// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyByob2xaoSU4PP68hotE_zvaeK00ICDQyg",
  authDomain: "cha-de-bebe-do-murilo.firebaseapp.com",
  projectId: "cha-de-bebe-do-murilo",
  storageBucket: "cha-de-bebe-do-murilo.firebasestorage.app",
  messagingSenderId: "593312984706",
  appId: "1:593312984706:web:2e01c447cd70973cdb8e9b"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- VARIÁVEIS GLOBAIS ---
let nomeConvidadoPrincipal = '';
let presencaConfirmada = false;

// --- REFERÊNCIAS AOS ELEMENTOS DA PÁGINA ---
const rsvpForm = document.getElementById('rsvp-form');
const nomeConvidadoInput = document.getElementById('nome-convidado');
const nomeAcompanhanteInput = document.getElementById('nome-acompanhante');
const giftContainer = document.getElementById('gift-container');
const navLinks = document.querySelectorAll('.main-nav a');
const contentSections = document.querySelectorAll('.content-section');
const heroImageContainer = document.querySelector('.hero-image-container');

// --- LÓGICA DE NAVEGAÇÃO POR ABAS ---
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);

        if (targetId === 'lista-presentes' && !presencaConfirmada) {
            alert('Por favor, confirme sua presença primeiro para ver a lista de presentes!');
            document.querySelector('a[href="#confirmacao-presenca"]').click();
            return;
        }
        
        if (targetId === 'home') { heroImageContainer.style.display = 'block'; } 
        else { heroImageContainer.style.display = 'none'; }
        
        navLinks.forEach(navLink => navLink.classList.remove('active'));
        contentSections.forEach(section => section.classList.remove('active'));

        link.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

// --- LÓGICA DO FORMULÁRIO DE PRESENÇA ---
rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    nomeConvidadoPrincipal = nomeConvidadoInput.value.trim();
    if (nomeConvidadoPrincipal === '') {
        alert('Por favor, digite seu nome para confirmar.');
        return;
    }
    presencaConfirmada = true;
    document.querySelector('a[href="#lista-presentes"]').click();
    carregarPresentes();
});

// --- FUNÇÕES DO FIREBASE (LISTA DE PRESENTES) ---
function carregarPresentes() {
    db.collection('presentes').orderBy('nome').onSnapshot(snapshot => {
        if (snapshot.empty) {
            giftContainer.innerHTML = "<p>Nenhum presente na lista no momento.</p>";
            return;
        }
        giftContainer.innerHTML = '';
        snapshot.forEach(doc => {
            const presente = doc.data();
            const presenteId = doc.id;
            
            // NOVO HTML DO CARD COM IMAGEM E DETALHES ESCONDIDOS
            const itemHTML = `
                <div class="item-presente ${presente.quantidade <= 0 ? 'esgotado' : ''}" data-id="${presenteId}">
                    <div class="gift-summary">
                        <img src="${presente.imageUrl || 'https://via.placeholder.com/300x200?text=Presente'}" alt="${presente.nome}" class="gift-image">
                        <div class="gift-info">
                            <h3>${presente.nome}</h3>
                            <p>Restam: <strong>${presente.quantidade}</strong></p>
                        </div>
                    </div>
                    <div class="gift-details">
                        <label>Quero dar:</label>
                        <input type="number" class="qtd-presente" value="1" min="1" max="${presente.quantidade}">
                        <button class="btn-escolher" data-nome="${presente.nome}">Escolher</button>
                    </div>
                </div>
            `;
            giftContainer.innerHTML += itemHTML;
        });
    });
}

// --- LÓGICA DE CLIQUE NOS CARDS DE PRESENTE ---
giftContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.item-presente');
    if (!card) return; // Sai se o clique não foi em um card

    // Se o clique foi no botão "Escolher"
    if (e.target.classList.contains('btn-escolher')) {
        const botao = e.target;
        const itemDiv = botao.closest('.item-presente');
        const qtdInput = itemDiv.querySelector('.qtd-presente');
        const presenteId = itemDiv.dataset.id;
        const presenteNome = botao.dataset.nome;
        const quantidadeEscolhida = parseInt(qtdInput.value);

        if (isNaN(quantidadeEscolhida) || quantidadeEscolhida <= 0) {
            alert('Por favor, escolha uma quantidade válida.');
            return;
        }
        
        botao.disabled = true;
        botao.textContent = 'Processando...';
        atualizarPresenteNoBanco(presenteId, presenteNome, quantidadeEscolhida, botao);
        return; // Impede que o card feche ao clicar no botão
    }
    
    // Se o clique foi no card (para abrir/fechar)
    if (card.classList.contains('open')) {
        card.classList.remove('open');
    } else {
        // Fecha qualquer outro card que esteja aberto
        document.querySelectorAll('.item-presente.open').forEach(openCard => {
            openCard.classList.remove('open');
        });
        card.classList.add('open');
    }
});

async function atualizarPresenteNoBanco(presenteId, presenteNome, quantidadeEscolhida, botao) {
    const presenteRef = db.collection('presentes').doc(presenteId);
    try {
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(presenteRef);
            if (!doc.exists) throw "Este presente não existe mais!";
            const novaQuantidade = doc.data().quantidade - quantidadeEscolhida;
            if (novaQuantidade < 0) throw "Ops! A quantidade restante é menor que a escolhida.";
            transaction.update(presenteRef, { quantidade: novaQuantidade });
        });
        await db.collection('convidados').add({
            nomeConvidado: nomeConvidadoPrincipal,
            nomeAcompanhante: nomeAcompanhanteInput.value.trim(),
            presenteEscolhido: presenteNome,
            quantidadeDada: quantidadeEscolhida,
            dataConfirmacao: new Date()
        });
        alert(`Obrigado, ${nomeConvidadoPrincipal}! Seu presente foi reservado com sucesso!`);
    } catch (error) {
        console.error("Erro ao escolher o presente: ", error);
        alert("Erro: " + error);
        botao.disabled = false;
        botao.textContent = 'Escolher';
    }
}