document.addEventListener('DOMContentLoaded', function() {

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
    let contadorAcompanhantes = 0;

    // --- REFERÊNCIAS AOS ELEMENTOS ---
    const btnShowRsvp = document.getElementById('btnShowRsvp');
    const rsvpForm = document.getElementById('rsvp-form');
    const giftContainer = document.getElementById('gift-container');
    
    // Elementos do Modal
    const modalOverlay = document.getElementById('rsvp-modal');
    const modalContent = document.querySelector('.modal-content');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const finalCloseBtn = document.getElementById('btn-final-close');
    const modalSteps = document.querySelectorAll('.modal-step');

    // Elementos do Formulário Dinâmico
    const btnAddAcompanhante = document.getElementById('btnAddAcompanhante');
    const acompanhantesContainer = document.getElementById('acompanhantes-container');
    const btnAddCriancas = document.getElementById('btnAddCriancas');
    const campoCriancas = document.querySelector('.campo-criancas');
    const btnDiminuirCriancas = document.getElementById('btn-diminuir-criancas');
    const btnAumentarCriancas = document.getElementById('btn-aumentar-criancas');
    const qtdCriancasSpan = document.getElementById('qtd-criancas');
    
    function showModalStep(stepNumber) {
        modalSteps.forEach(step => step.classList.remove('active'));
        document.getElementById(`modal-step-${stepNumber}`).classList.add('active');
    }

    // --- LÓGICA DO MODAL ---
    btnShowRsvp.addEventListener('click', () => {
        showModalStep(1);
        modalOverlay.classList.add('visible');
    });

    function closeModal() {
        modalOverlay.classList.remove('visible');
    }
    modalCloseBtn.addEventListener('click', closeModal);
    finalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // --- LÓGICA DO FORMULÁRIO DINÂMICO ---
    btnAddAcompanhante.addEventListener('click', () => {
        contadorAcompanhantes++;
        const novoCampo = document.createElement('div');
        novoCampo.classList.add('campo-form', 'acompanhante-dinamico');
        // Adiciona o botão de remover junto com o campo
        novoCampo.innerHTML = `
            <div class="acompanhante-header">
                <label>Acompanhante ${contadorAcompanhantes}:</label>
                <button type="button" class="btn-remover">Remover</button>
            </div>
            <input type="text" class="nome-acompanhante-input" placeholder="Nome do acompanhante">
        `;
        acompanhantesContainer.appendChild(novoCampo);
    });

    // Lógica para remover o campo de acompanhante
    acompanhantesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remover')) {
            e.target.closest('.acompanhante-dinamico').remove();
        }
    });

    btnAddCriancas.addEventListener('click', () => {
        campoCriancas.style.display = 'block';
    });

    // Controle do contador de crianças
    btnAumentarCriancas.addEventListener('click', () => {
        let count = parseInt(qtdCriancasSpan.textContent);
        qtdCriancasSpan.textContent = count + 1;
    });

    btnDiminuirCriancas.addEventListener('click', () => {
        let count = parseInt(qtdCriancasSpan.textContent);
        if (count > 0) {
            qtdCriancasSpan.textContent = count - 1;
        }
    });

    rsvpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        nomeConvidadoPrincipal = document.getElementById('nome-convidado').value.trim();
        if (!nomeConvidadoPrincipal) {
            alert('Por favor, preencha seu nome.');
            return;
        }
        showModalStep(2);
        carregarPresentes();
    });

    // --- LÓGICA DOS PRESENTES ---
    function carregarPresentes() {
        db.collection('presentes').orderBy('nome').onSnapshot(snapshot => {
            giftContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const presente = doc.data();
                const presenteId = doc.id;
                
                const itemHTML = `
                    <div class="item-presente ${presente.quantidade <= 0 ? 'esgotado' : ''}">
                        <img src="${presente.imageUrl || 'https://via.placeholder.com/250x200?text=Presente'}" alt="${presente.nome}" class="gift-image">
                        <div class="gift-info">
                            <h3>${presente.nome}</h3>
                            <p>Restam: <strong>${presente.quantidade}</strong></p>
                            <button class="btn-presentear" data-id="${presenteId}" data-nome="${presente.nome}" ${presente.quantidade <= 0 ? 'disabled' : ''}>
                                ${presente.quantidade > 0 ? 'Presentear' : 'Esgotado'}
                            </button>
                        </div>
                    </div>
                `;
                giftContainer.innerHTML += itemHTML;
            });

            document.querySelectorAll('.btn-presentear').forEach(button => {
                button.addEventListener('click', () => {
                    if (button.disabled) return;
                    const presenteId = button.dataset.id;
                    const presenteNome = button.dataset.nome;
                    atualizarPresenteNoBanco(presenteId, presenteNome);
                });
            });
        });
    }

    async function atualizarPresenteNoBanco(presenteId, presenteNome) {
        const presenteRef = db.collection('presentes').doc(presenteId);
        try {
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(presenteRef);
                if (!doc.exists) throw "Presente não encontrado!";
                const novaQuantidade = doc.data().quantidade - 1;
                if (novaQuantidade < 0) throw "Ops, este presente já foi escolhido!";
                transaction.update(presenteRef, { quantidade: novaQuantidade });
            });

            // Coleta os nomes de TODOS os acompanhantes
            const inputsAcompanhantes = document.querySelectorAll('.nome-acompanhante-input');
            const listaAcompanhantes = [];
            inputsAcompanhantes.forEach(input => {
                if(input.value.trim() !== '') {
                    listaAcompanhantes.push(input.value.trim());
                }
            });

            await db.collection('convidados').add({
                nomeConvidado: nomeConvidadoPrincipal,
                acompanhantes: listaAcompanhantes, // Salva um array com os nomes
                qtdCriancas: qtdCriancasSpan.textContent,
                presenteEscolhido: presenteNome,
                dataConfirmacao: new Date()
            });
            
            document.getElementById('thank-you-message').textContent = `Sua presença foi confirmada e o presente "${presenteNome}" foi reservado com sucesso em seu nome. Mal podemos esperar para celebrar com você!`;
            showModalStep(3);

        } catch (error) {
            console.error("Erro: ", error);
            alert("Erro: " + error);
        }
    }
});