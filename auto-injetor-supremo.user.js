// ==UserScript==
// @name         Auto-Injetor Universal Supremo
// @namespace    http://tampermonkey.net/
// @version      10.0
// @description  Bypass de vídeos, resolvedor de provas de múltipla escolha e escritor fantasma para plataformas EAD (Unicte, Noz, Cademi).
// @author       Você
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let mudandoDePagina = false;
    let aguardandoResultado = false;

    // ==========================================
    // FUNÇÃO UNIVERSAL DE AVANÇO
    // ==========================================
    const irParaProximaAula = () => {
        const btnProximoCademi = document.querySelector('a.a-next');
        const botoesGenericos = Array.from(document.querySelectorAll('a, button')).filter(b => {
            const txt = b.textContent.toLowerCase().trim();
            return txt.includes('próxim') || txt.includes('avanç') || txt === 'seguir' || txt.includes('seguir ') || txt.includes('frente') || txt.includes('continuar') || txt.includes('concluir');
        });
        const btnSeguir = btnProximoCademi || botoesGenericos[0];

        if (btnSeguir && !btnSeguir.disabled && window.getComputedStyle(btnSeguir).display !== 'none') {
            console.log("⏩ Caminho livre! Avançando de tela...");
            mudandoDePagina = true;
            setTimeout(() => { mudandoDePagina = false; }, 5000);
            
            localStorage.removeItem('quiz_bot_state_' + window.location.pathname);

            btnSeguir.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => btnSeguir.click(), 500);
            return true;
        }
        return false;
    };

    // ==========================================
    // INJEÇÃO DE VÍDEOS (COMUM)
    // ==========================================
    setTimeout(() => {
        console.log("🤖 [Tampermonkey] Iniciando Escritor Fantasma (V10.0)...");

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

        if (!window.location.hostname.includes('unicte.com') && !window.location.hostname.includes('appnoz.com.br')) {
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
        if (mudandoDePagina) return; 
        if (!window.location.hostname.includes('unicte.com') && !window.location.hostname.includes('appnoz.com.br')) return; 
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
                btnRevelar.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                    btnReiniciar.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                    btnConfirmar.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
