// ==UserScript==
// @name         Auto-Injetor
// @namespace    http://tampermonkey.net/
// @version      14.6
// @description  Bypass de vídeos, resolvedor de provas de múltipla escolha e escritor fantasma para plataformas EAD (Unicte, Noz, Cademi, SpBIM).
// @author       Você
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let mudandoDePagina = false;
    let aguardandoResultado = false;

    // ==========================================
    // INTERCEPTADOR DE REDE (MÁQUINA DO TEMPO)
    // ==========================================
    const adulterarPayload = (json) => {
        let alterou = false;
        const camposTempo = ['time', 'duration', 'time_spent', 'tempo', 'currentTime', 'watchTime', 'watched', 'play_time', 'played'];
        camposTempo.forEach(c => { if (json[c] !== undefined) { json[c] = 3600; alterou = true; } });
        
        const camposPorcentagem = ['progress', 'percentage', 'percent', 'completed'];
        camposPorcentagem.forEach(c => { if (json[c] !== undefined && typeof json[c] === 'number') { json[c] = (json[c] <= 1 ? 1 : 100); alterou = true; } });
        
        return alterou;
    };

    const originalFetch = window.fetch;
    window.fetch = async function() {
        let args = arguments;
        if (args[1] && args[1].body && typeof args[1].body === 'string') {
            try {
                let json = JSON.parse(args[1].body);
                if (adulterarPayload(json)) {
                    args[1].body = JSON.stringify(json);
                    console.log("⏳ [Máquina do Tempo] Payload adulterado no Fetch!");
                }
            } catch(e) {}
        }
        return originalFetch.apply(this, args);
    };

    const originalXHR = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        if (body && typeof body === 'string') {
            try {
                let json = JSON.parse(body);
                if (adulterarPayload(json)) {
                    body = JSON.stringify(json);
                    console.log("⏳ [Máquina do Tempo] Payload adulterado no XHR!");
                }
            } catch(e) {}
        }
        originalXHR.call(this, body);
    };

    // ==========================================
    // FUNÇÃO UNIVERSAL DE AVANÇO
    // ==========================================
    const irParaProximaAula = () => {
        const btnProximoCademi = document.querySelector('a.a-next');
        const botoesGenericos = Array.from(document.querySelectorAll('a, button')).filter(b => {
            const txt = b.textContent.toLowerCase().trim();
            return txt.includes('próxim') || txt.includes('avanç') || txt === 'seguir' || txt.includes('seguir ') || txt.includes('frente') || txt.includes('continuar');
        });
        const btnSeguir = btnProximoCademi || botoesGenericos[0];

        if (btnSeguir && !btnSeguir.disabled && window.getComputedStyle(btnSeguir).display !== 'none') {
            console.log("⏩ Caminho livre! Avançando de tela...");
            mudandoDePagina = true;
            setTimeout(() => { mudandoDePagina = false; }, 5000);
            
            localStorage.removeItem('quiz_bot_state_' + window.location.pathname);

            if (!window.location.hostname.includes('spbim.com.br')) btnSeguir.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => btnSeguir.click(), 500);
            return true;
        }

        // Tentar avançar pela barra lateral se não tiver botão próximo (Ex: SpBIM)
        if (window.location.hostname.includes('spbim.com.br')) {
            console.log("⏸️ Ignorando barra lateral na SpBIM (avanço será via Modal Pular).");
            return false;
        }
        
        const sidebarContainer = document.querySelector('aside, [class*="sidebar"], [class*="menu"], [class*="playlist"]') || document.body;
        const links = Array.from(sidebarContainer.querySelectorAll('a[href]'));
        
        const aulaLinks = links.filter(a => {
            const h = a.getAttribute('href');
            if (!h || h === '#' || h.startsWith('javascript:')) return false;
            
            // Tem que ter um link de aula real
            const isLessonLink = h.includes('/curso/') || h.includes('/lesson/') || h.includes('/aula/') || h.includes('/module/');
            if (!isLessonLink) return false;
            
            // Ignorar cabecalhos de módulos
            const txt = a.textContent.toLowerCase();
            if (txt.includes('módulo') || txt.includes('modulo') || txt.includes('trilha')) return false;
            
            return true;
        });
        
        if (aulaLinks.length === 0) return false;

        let currentIndex = -1;
        
        // Estratégia 1: Classes ativas
        for (let i = 0; i < aulaLinks.length; i++) {
            const classes = aulaLinks[i].className.toLowerCase();
            if (classes.includes('active') || classes.includes('current') || aulaLinks[i].getAttribute('aria-current') === 'page') {
                currentIndex = i;
            }
        }
        
        // Estratégia 2: Matching de URL
        if (currentIndex === -1) {
            for (let i = 0; i < aulaLinks.length; i++) {
                if (aulaLinks[i].href === window.location.href || window.location.href.endsWith(aulaLinks[i].getAttribute('href'))) {
                    currentIndex = i;
                }
            }
        }
        
        // Estratégia 3: Titulos na tela (h1, h2) batendo com o link da barra lateral
        if (currentIndex === -1) {
            const titulos = Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent.trim().toLowerCase()).filter(t => t.length > 4);
            for (let i = 0; i < aulaLinks.length; i++) {
                const linkTxt = aulaLinks[i].textContent.trim().toLowerCase();
                if (titulos.some(t => linkTxt.includes(t) || t.includes(linkTxt))) {
                    currentIndex = i;
                }
            }
        }
        
        if (currentIndex !== -1 && currentIndex + 1 < aulaLinks.length) {
            const nextLink = aulaLinks[currentIndex + 1];
            if (nextLink.href !== window.location.href) {
                console.log("⏩ Próxima aula encontrada na barra lateral! Clicando no index:", currentIndex + 1);
                mudandoDePagina = true;
                setTimeout(() => { mudandoDePagina = false; }, 5000);
                localStorage.removeItem('quiz_bot_state_' + window.location.pathname);
                
                if (!window.location.hostname.includes('spbim.com.br')) nextLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                setTimeout(() => {
                    console.log("🚀 Forçando navegação absoluta (Bypass SPA)...");
                    if (nextLink.href && nextLink.href.startsWith('http')) {
                        window.location.href = nextLink.href;
                    } else {
                        nextLink.click();
                    }
                }, 500);
                return true;
            }
        }

        return false;
    };

    // ==========================================
    // INJEÇÃO DE VÍDEOS (COMUM)
    // ==========================================
    setTimeout(() => {
        console.log("🤖 [Tampermonkey] Iniciando Escritor Fantasma (V14.6)...");

        const botoesProgresso = Array.from(document.querySelectorAll('a.progresso-click'));
        if (botoesProgresso.some(btn => btn.classList.contains('progresso-realizado') || btn.textContent.toLowerCase().includes('desmarcar'))) { irParaProximaAula(); return; }

        document.querySelectorAll('iframe').forEach(iframe => {
            const src = iframe.src || "";
            let origin = "*";
            try { origin = new URL(src).origin; } catch(e) {}
            if (src.includes('pandavideo')) {
                [JSON.stringify({ event: "ended" }), JSON.stringify({ message: "panda_event", event: "ended" })].forEach(payload => window.dispatchEvent(new MessageEvent('message', { data: payload, origin, source: iframe.contentWindow })));
            } else if (src.includes('vimeo')) {
                window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ event: "finish", type: "finish" }), origin, source: iframe.contentWindow }));
            } else if (src.includes('youtube.com/embed')) {
                window.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ event: "infoDelivery", info: { playerState: 0 } }), origin, source: iframe.contentWindow }));
            }
        });

        botoesProgresso.forEach(btn => { if (btn.textContent.toLowerCase().includes('marcar')) btn.click(); });

        if (!window.location.hostname.includes('unicte.com') && !window.location.hostname.includes('appnoz.com.br') && !window.location.hostname.includes('spbim.com.br')) {
            let tentativasChat = 0;
            const monitorDeSaida = setInterval(() => {
                const chatwoot = document.getElementById('cw-bubble-holder');
                const chatCarregou = (chatwoot && window.getComputedStyle(chatwoot).display !== 'none');
                tentativasChat++;
                if (chatCarregou || tentativasChat > 12) { clearInterval(monitorDeSaida); irParaProximaAula(); }
            }, 250);
        }
    }, 3000);

    const getGrupos = () => {
        const g = {};
        document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => {
            let nome = input.name;
            if (!nome) { 
                const container = input.closest('div').parentElement.parentElement;
                nome = 'grupo_auto_' + container.textContent.trim().replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
            }
            if (!g[nome]) g[nome] = { tipo: input.type, inputs: [] };
            g[nome].inputs.push(input);
        });
        return g;
    };

    // ==========================================
    // RADAR CENTRAL DE RESOLUÇÃO
    // ==========================================
    setInterval(() => {
        // Auto-scroll PDF / Elementos de Texto
        if (!window.location.hostname.includes('spbim.com.br')) {
            try {
                document.querySelectorAll('div, iframe').forEach(el => {
                    if (el.tagName === 'IFRAME') {
                        try { el.contentWindow.scrollTo(0, 999999); } catch(e) {}
                    } else if (el.scrollHeight > el.clientHeight && !el.classList.contains('no-scroll')) {
                        el.scrollTop = el.scrollHeight;
                    }
                });
            } catch(e) {}
        }
        
        // =====================================================
        // BYPASS DE MINUTOS DE VÍDEO (Pula para 99% do vídeo)
        // =====================================================
        try {
            document.querySelectorAll('video').forEach(v => {
                if (!v.paused && v.duration > 0 && v.currentTime < v.duration - 2) {
                    v.playbackRate = 16.0; 
                    v.currentTime = v.duration - 1; // Deixa rolar 1 segundo final pra registrar "ended"
                    console.log("⏩ [Bypass de Vídeo] Tempo avançado para o final!");
                }
            });
        } catch(e) {}

        if (mudandoDePagina) return; 
        if (!window.location.hostname.includes('unicte.com') && !window.location.hostname.includes('appnoz.com.br') && !window.location.hostname.includes('spbim.com.br') && window === window.top) return; 

        // -----------------------------------------------------
        // MODAL DE AVALIAÇÃO / PULAR (NOVA TELA)
        // -----------------------------------------------------
        const btnPular = Array.from(document.querySelectorAll('button, a')).find(b => {
            const txt = b.textContent.toLowerCase().trim();
            return txt === 'pular' || txt === 'avaliar e avançar' || txt === 'avaliar e avancar';
        });
        if (btnPular && window.getComputedStyle(btnPular).display !== 'none' && !btnPular.disabled) {
            console.log("🌟 Modal de avaliação detectado! Pulando...");
            btnPular.click();
            return;
        }

        // -----------------------------------------------------
        // MARCAR CONCLUÍDA (NATIVO SPBIM E OUTROS)
        // -----------------------------------------------------
        const btnMarcar = Array.from(document.querySelectorAll('button, a')).find(b => {
            const txt = b.textContent.toLowerCase().trim();
            return txt === 'marcar concluída' || txt === 'marcar como concluída' || txt === 'marcar como concluído';
        });
        if (btnMarcar && !btnMarcar.disabled && window.getComputedStyle(btnMarcar).display !== 'none') {
            console.log("✔️ Marcando aula como concluída...");
            btnMarcar.click();
            return; 
        }

        if (irParaProximaAula()) return;

        // -----------------------------------------------------
        // ESCRITOR FANTASMA (Questões Abertas)
        // -----------------------------------------------------
        const textAreas = document.querySelectorAll('textarea');
        if (textAreas.length > 0) {
            let digitouAlgo = false;
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            
            textAreas.forEach(ta => {
                let ehQuestao = false;
                let atual = ta.parentElement;
                for(let i=0; i<5; i++) { 
                    if(!atual) break;
                    const txt = (atual.innerText || "").toLowerCase();
                    if(txt.includes('questão') || txt.includes('enviar resposta') || txt.includes('desafio')) {
                        ehQuestao = true; break;
                    }
                    atual = atual.parentElement;
                }
                
                if (ehQuestao && window.getComputedStyle(ta).display !== 'none' && ta.value.trim().length < 2) {
                    nativeSetter.call(ta, "Compreendido e de acordo.");
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                    ta.dispatchEvent(new Event('change', { bubbles: true }));
                    digitouAlgo = true;
                }
            });

            if (digitouAlgo) {
                console.log("✍️ Questões dissertativas respondidas! Clicando em enviar...");
                setTimeout(() => {
                    const botoesEnviar = Array.from(document.querySelectorAll('button, a')).filter(b => {
                        const txt = b.textContent.toLowerCase().trim();
                        return txt.includes('enviar resposta') || txt === 'enviar' || txt === 'responder';
                    });
                    botoesEnviar.forEach(btn => {
                        if (!btn.disabled && window.getComputedStyle(btn).display !== 'none') {
                            btn.click();
                        }
                    });
                }, 500);
            }
        }

        // -----------------------------------------------------
        // RESOLVEDOR DE MÚLTIPLA ESCOLHA
        // -----------------------------------------------------
        const gruposInfo = getGrupos();
        const chavesGrupos = Object.keys(gruposInfo);

        if (chavesGrupos.length === 0) {
            const btnRevelar = Array.from(document.querySelectorAll('button, a')).find(b => {
                const txt = b.textContent.toLowerCase().trim();
                return txt.includes('pronto') || txt.includes('vamos') || txt.includes('ok');
            });
            if (btnRevelar && window.getComputedStyle(btnRevelar).display !== 'none') {
                console.log("🔓 Botão de Revelar detectado. Clicando...");
                if (!window.location.hostname.includes('spbim.com.br')) btnRevelar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                btnRevelar.click();
            }
            return; 
        }

        if (aguardandoResultado) {
            const btnReiniciar = Array.from(document.querySelectorAll('a, button')).find(b => b.textContent.toLowerCase().includes('reiniciar') || b.textContent.toLowerCase().includes('tentar novamente'));
            const tempoEspera = Date.now() - (window.tempoUltimoConfirmar || Date.now());
            
            if ((btnReiniciar && window.getComputedStyle(btnReiniciar).display !== 'none') || tempoEspera > 2500) {
                console.log("🔄 Lendo o resultado da tela...");
                aguardandoResultado = false;
                
                const memoriaId = 'quiz_bot_state_' + window.location.pathname;
                let state = JSON.parse(localStorage.getItem(memoriaId));
                
                if (state && state.grupos) {
                    const textoTela = document.body.innerText.toLowerCase();
                    const acertouParcialmente = textoTela.includes('parcialmente');

                    chavesGrupos.forEach(nome => {
                        const info = gruposInfo[nome];
                        const stateGrupo = state.grupos[nome];
                        
                        if (!stateGrupo || stateGrupo.resolvido) return; 

                        const temVerde = info.inputs.some(input => {
                             const area = input.closest('div')?.parentElement?.parentElement;
                             return area && (area.innerHTML.toLowerCase().includes('green') || area.innerHTML.toLowerCase().includes('emerald') || area.innerHTML.toLowerCase().includes('success') || area.className.toLowerCase().includes('green'));
                        });

                        if (temVerde) {
                            console.log(`✨ A questão ${nome} FICOU VERDE! Travando ela!`);
                            stateGrupo.resolvido = true;
                        } else {
                            if (info.tipo === 'radio') {
                                stateGrupo.currentIndex++;
                            } else {
                                if (stateGrupo.fase === 'testando') {
                                    if (acertouParcialmente) stateGrupo.correctIndices.push(stateGrupo.currentIndex);
                                    stateGrupo.currentIndex++;
                                    if (stateGrupo.currentIndex >= info.inputs.length) stateGrupo.fase = 'final';
                                } else if (stateGrupo.fase === 'final') {
                                    stateGrupo.currentIndex = 0;
                                    stateGrupo.correctIndices = [];
                                    stateGrupo.fase = 'testando';
                                }
                            }
                        }
                    });
                    localStorage.setItem(memoriaId, JSON.stringify(state));
                }

                if (btnReiniciar && window.getComputedStyle(btnReiniciar).display !== 'none') {
                    if (!window.location.hostname.includes('spbim.com.br')) btnReiniciar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnReiniciar.click();
                }
            }
            return; 
        }

        if (window.preenchendoQuiz) return;

        const memoriaId = 'quiz_bot_state_' + window.location.pathname;
        let state = JSON.parse(localStorage.getItem(memoriaId) || '{}');
        
        const pageHash = chavesGrupos.join('|');
        if (state.pageHash !== pageHash) {
            state = { pageHash: pageHash, grupos: {} };
        }

        let todasVerdes = true;
        chavesGrupos.forEach(nome => {
            if (!state.grupos[nome]) {
                state.grupos[nome] = { currentIndex: 0, correctIndices: [], fase: 'testando', resolvido: false };
            }
            if (!state.grupos[nome].resolvido) todasVerdes = false;
        });

        if (todasVerdes) {
            return;
        }

        window.preenchendoQuiz = true;

        const preencherTudoComCalma = async () => {
            for (const nome of chavesGrupos) {
                const info = gruposInfo[nome];
                const stateGrupo = state.grupos[nome];
                
                if (stateGrupo.resolvido) continue; 

                const infoFresquinha = getGrupos()[nome];
                if (!infoFresquinha) continue;

                for (let i = 0; i < infoFresquinha.inputs.length; i++) {
                    const inputAtual = infoFresquinha.inputs[i];
                    const alvoCerto = (infoFresquinha.tipo === 'radio') 
                        ? (i === (stateGrupo.currentIndex % infoFresquinha.inputs.length))
                        : ((stateGrupo.fase === 'testando' && i === stateGrupo.currentIndex) || (stateGrupo.fase === 'final' && stateGrupo.correctIndices.includes(i)));
                    
                    const darClique = async () => {
                        inputAtual.click();
                        inputAtual.dispatchEvent(new Event('change', { bubbles: true }));
                        await new Promise(r => setTimeout(r, 200)); 
                    };

                    if (infoFresquinha.tipo === 'radio') {
                        if (alvoCerto && !inputAtual.checked) await darClique();
                    } else {
                        if (inputAtual.checked !== alvoCerto) await darClique();
                    }
                }
            }

            localStorage.setItem(memoriaId, JSON.stringify(state));

            setTimeout(() => {
                const btnConfirmar = Array.from(document.querySelectorAll('button, a')).find(b => {
                    const txt = b.textContent.toLowerCase().trim();
                    return txt.includes('confirmar') || txt.includes('responder') || txt.includes('enviar') || txt.includes('validar') || txt.includes('avaliar') || txt.includes('pronto') || txt.includes('vamos') || txt.includes('ok');
                });

                if (btnConfirmar && !btnConfirmar.disabled) {
                    if (!window.location.hostname.includes('spbim.com.br')) btnConfirmar.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnConfirmar.click();
                }
                
                aguardandoResultado = true; 
                window.tempoUltimoConfirmar = Date.now();
                window.preenchendoQuiz = false;
            }, 800);
        };

        preencherTudoComCalma();

    }, 500); 
})();
