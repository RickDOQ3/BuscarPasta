let pesquisaAtiva = false;
let pastaProcurada = '';
let timeoutBusca;

// Escuta mensagens do popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'iniciarPesquisa') {
    iniciarPesquisa(request.nomePasta);
    sendResponse({success: true});
  } else if (request.action === 'pararPesquisa') {
    pararPesquisa();
    sendResponse({success: true});
  }
  return true;
});

function iniciarPesquisa(nomePasta) {
  pastaProcurada = nomePasta.toLowerCase().trim();
  pesquisaAtiva = true;
  
  enviarStatus(`🔍 Procurando por: "${nomePasta}"...`, 'loading');
  
  // Inicia o processo de busca
  buscarPasta();
}

function pararPesquisa() {
  pesquisaAtiva = false;
  if (timeoutBusca) {
    clearTimeout(timeoutBusca);
  }
  enviarStatus('⏹️ Pesquisa parada', 'error');
}

function buscarPasta() {
  if (!pesquisaAtiva) return;
  
  console.log('Buscando pasta:', pastaProcurada);
  
  // Tenta encontrar a pasta na página atual (busca rápida)
  const pastaEncontrada = procurarNaPaginaAtual();
  
  if (pastaEncontrada) {
    pastaEncontrada.scrollIntoView({ behavior: 'smooth', block: 'center' });
    destacarElemento(pastaEncontrada);
    
    // CORREÇÃO: Envia mensagem indicando que encontrou
    enviarStatus(`✅ Pasta "${pastaProcurada}" encontrada!`, 'success', true);
    pesquisaAtiva = false;
    return;
  }
  
  // Se não encontrou, rola para carregar mais conteúdo
  enviarStatus('📂 Carregando mais itens...', 'loading');
  carregarMaisItens();
}

function procurarNaPaginaAtual() {
  const lista = document.querySelector('#html-list_2');
  if (!lista) {
    console.log('Lista #html-list_2 não encontrada');
    return null;
  }
  
  // Busca mais específica e rápida
  const seletores = [
    '[data-selection-target]',
    '[role="listitem"]',
    '[role="gridcell"]',
    '.ms-List-cell',
    '.od-ItemTile',
    '[data-automationid]'
  ];
  
  for (let seletor of seletores) {
    const elementos = lista.querySelectorAll(seletor);
    for (let elemento of elementos) {
      const texto = elemento.textContent?.trim();
      if (texto && texto.toLowerCase() === pastaProcurada) {
        console.log('Pasta encontrada via seletor:', seletor, texto);
        return elemento;
      }
    }
  }
  
  // Busca em todos os elementos
  const todosElementos = lista.querySelectorAll('div, span, a');
  for (let elemento of todosElementos) {
    const texto = elemento.textContent?.trim();
    if (texto && texto.toLowerCase() === pastaProcurada) {
      console.log('Pasta encontrada em elemento genérico:', texto);
      return elemento;
    }
  }
  
  return null;
}

function carregarMaisItens() {
  if (!pesquisaAtiva) return;
  
  const scrollContainer = document.querySelector('#html-list_2');
  if (!scrollContainer) {
    enviarStatus('❌ Lista não encontrada', 'error');
    pesquisaAtiva = false;
    return;
  }
  
  const scrollAntes = scrollContainer.scrollTop;
  const alturaAntes = scrollContainer.scrollHeight;
  
  console.log('Rolando para carregar mais...');
  
  // Rola suavemente para o final
  scrollContainer.scrollTo({
    top: scrollContainer.scrollHeight,
    behavior: 'smooth'
  });
  
  timeoutBusca = setTimeout(() => {
    if (!pesquisaAtiva) return;
    
    const scrollDepois = scrollContainer.scrollTop;
    const alturaDepois = scrollContainer.scrollHeight;
    
    if (alturaDepois > alturaAntes) {
      enviarStatus('📂 Itens carregados, verificando...', 'loading');
      timeoutBusca = setTimeout(() => {
        if (pesquisaAtiva) buscarPasta();
      }, 500);
    } else if (scrollDepois > scrollAntes + 100) {
      enviarStatus('🔍 Verificando itens carregados...', 'loading');
      timeoutBusca = setTimeout(() => {
        if (pesquisaAtiva) buscarPasta();
      }, 300);
    } else {
      enviarStatus('❌ Final da lista. Pasta não encontrada.', 'error');
      pesquisaAtiva = false;
    }
  }, 1000);
}

function destacarElemento(elemento) {
  // Remove destaque anterior se existir
  const destaqueAnterior = document.querySelector('.pasta-destacada');
  if (destaqueAnterior) {
    destaqueAnterior.classList.remove('pasta-destacada');
  }
  
  // Adiciona classe de destaque
  elemento.classList.add('pasta-destacada');
  
  // Scroll para o elemento
  elemento.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center',
    inline: 'center'
  });
  
  // Tenta clicar na pasta para abrir
  setTimeout(() => {
    try {
      elemento.click();
      console.log('Clicou na pasta automaticamente');
    } catch (e) {
      console.log('Clique automático não funcionou');
    }
  }, 800);
}

// CORREÇÃO: Função enviarStatus atualizada
function enviarStatus(mensagem, tipo, encontrada = false) {
  chrome.runtime.sendMessage({
    action: 'atualizarStatus',
    mensagem: mensagem,
    tipo: tipo,
    encontrada: encontrada
  });
}

// Estilos CSS com animação usando cores da empresa
const estiloDestaque = document.createElement('style');
estiloDestaque.textContent = `
  .pasta-destacada {
    background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%) !important;
    border: 3px solid #1a365d !important;
    border-radius: 12px !important;
    padding: 15px !important;
    box-shadow: 
      0 0 0 4px rgba(26, 54, 93, 0.2),
      0 8px 30px rgba(26, 54, 93, 0.3) !important;
    transform: scale(1.02) !important;
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    position: relative !important;
    z-index: 10000 !important;
    animation: destaqueEmpresa 2s ease-in-out !important;
  }
  
  .pasta-destacada::before {
    content: "🎯 ENCONTRADO";
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #1a365d 0%, #2d3748 100%);
    color: white;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: bold;
    white-space: nowrap;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(26, 54, 93, 0.4);
    animation: pulseBadge 1.5s infinite alternate;
  }
  
  .pasta-destacada::after {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    border-radius: 14px;
    background: linear-gradient(45deg, #1a365d, #2d3748, #1a365d);
    z-index: -1;
    animation: bordaAnimada 3s linear infinite;
    opacity: 0.8;
  }
  
  @keyframes destaqueEmpresa {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(26, 54, 93, 0.7);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 15px rgba(26, 54, 93, 0);
    }
    100% {
      transform: scale(1.02);
      box-shadow: 0 0 0 0 rgba(26, 54, 93, 0);
    }
  }
  
  @keyframes bordaAnimada {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  
  @keyframes pulseBadge {
    0% {
      transform: translateX(-50%) scale(1);
      box-shadow: 0 4px 12px rgba(26, 54, 93, 0.4);
    }
    100% {
      transform: translateX(-50%) scale(1.05);
      box-shadow: 0 6px 20px rgba(26, 54, 93, 0.6);
    }
  }
  
  .pasta-destacada:hover {
    transform: scale(1.04) !important;
    box-shadow: 
      0 0 0 6px rgba(26, 54, 93, 0.3),
      0 12px 40px rgba(26, 54, 93, 0.4) !important;
  }
  
  /* Efeito de partículas */
  .pasta-destacada .particula {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #1a365d;
    border-radius: 50%;
    animation: particulas 2s infinite;
  }
  
  @keyframes particulas {
    0% {
      transform: translate(0, 0);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty));
      opacity: 0;
    }
  }
`;

document.head.appendChild(estiloDestaque);

// Função para adicionar partículas animadas
function adicionarParticulas(elemento) {
  for (let i = 0; i < 8; i++) {
    const particula = document.createElement('div');
    particula.className = 'particula';
    const angle = (i / 8) * Math.PI * 2;
    const distance = 30;
    particula.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    particula.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    particula.style.left = '50%';
    particula.style.top = '50%';
    particula.style.animationDelay = `${i * 0.1}s`;
    elemento.appendChild(particula);
  }
}

// Observer otimizado
const observer = new MutationObserver(function(mutations) {
  if (pesquisaAtiva) {
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        console.log('Novos itens detectados pelo observer');
        timeoutBusca = setTimeout(() => {
          if (pesquisaAtiva) {
            const pastaEncontrada = procurarNaPaginaAtual();
            if (pastaEncontrada) {
              pastaEncontrada.scrollIntoView({ behavior: 'smooth', block: 'center' });
              destacarElemento(pastaEncontrada);
              enviarStatus(`✅ Pasta encontrada!`, 'success', true);
              pesquisaAtiva = false;
            }
          }
        }, 200);
        break;
      }
    }
  }
});

// Inicia o observer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarObserver);
} else {
  iniciarObserver();
}

function iniciarObserver() {
  const lista = document.querySelector('#html-list_2');
  if (lista) {
    observer.observe(lista, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
    console.log('Observer otimizado iniciado');
  } else {
    setTimeout(iniciarObserver, 500);
  }
}

// Limpa timeouts quando a página é fechada
window.addEventListener('beforeunload', function() {
  if (timeoutBusca) {
    clearTimeout(timeoutBusca);
  }
});