document.addEventListener('DOMContentLoaded', function() {

    // --- IMPORTANTE: COLE SUA CHAVE DO FIREBASE AQUI ---
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

    // --- REFERÊNCIAS ---
    const guestListBody = document.getElementById('guest-list-body');
    const exportBtn = document.getElementById('export-btn');

    // --- FUNÇÕES ---

    // 1. Busca os dados no Firebase e exibe na tabela
    async function fetchAndDisplayGuests() {
        try {
            const querySnapshot = await db.collection('convidados').orderBy('dataConfirmacao', 'desc').get();
            
            if (querySnapshot.empty) {
                guestListBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum convidado confirmou presença ainda.</td></tr>';
                return;
            }

            guestListBody.innerHTML = ''; // Limpa a mensagem de "carregando"
            querySnapshot.forEach(doc => {
                const data = doc.data();
                const acompanhantes = Array.isArray(data.acompanhantes) && data.acompanhantes.length > 0 ? data.acompanhantes.join(', ') : 'Nenhum';
                const dataConfirmacao = data.dataConfirmacao ? data.dataConfirmacao.toDate().toLocaleString('pt-BR') : 'Não registrada';

                const row = `
                    <tr>
                        <td>${data.nomeConvidado || ''}</td>
                        <td>${acompanhantes}</td>
                        <td>${data.qtdCriancas || '0'}</td>
                        <td>${data.presenteEscolhido || 'Nenhum'}</td>
                        <td>${dataConfirmacao}</td>
                    </tr>
                `;
                guestListBody.innerHTML += row;
            });

        } catch (error) {
            console.error("Erro ao buscar convidados:", error);
            guestListBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Erro ao carregar a lista. Verifique o console.</td></tr>';
        }
    }

    // 2. Exporta os dados da tabela para um arquivo CSV
    async function exportToCsv() {
        alert("Buscando dados para exportação...");
        try {
            const querySnapshot = await db.collection('convidados').get();
            let dataToExport = [];
            
            const headers = ['Nome Convidado', 'Acompanhantes', 'Qtd Crianças', 'Presente Escolhido', 'Data da Confirmação'];
            dataToExport.push(headers);

            querySnapshot.forEach(doc => {
                const data = doc.data();
                const acompanhantes = Array.isArray(data.acompanhantes) ? data.acompanhantes.join(' | ') : '';
                const dataConfirmacao = data.dataConfirmacao ? data.dataConfirmacao.toDate().toLocaleString('pt-BR') : '';

                const row = [
                    `"${data.nomeConvidado || ''}"`,
                    `"${acompanhantes}"`,
                    `"${data.qtdCriancas || '0'}"`,
                    `"${data.presenteEscolhido || ''}"`,
                    `"${dataConfirmacao}"`
                ];
                dataToExport.push(row);
            });

            let csvContent = "data:text/csv;charset=utf-8,";
            dataToExport.forEach(rowArray => {
                let row = rowArray.join(";");
                csvContent += row + "\r\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "lista_convidados_cha_murilo.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Erro ao exportar dados:", error);
            alert("Ocorreu um erro ao exportar a lista.");
        }
    }

    // --- EVENT LISTENERS ---
    exportBtn.addEventListener('click', exportToCsv);

    // Carrega a lista assim que a página abre
    fetchAndDisplayGuests();
});