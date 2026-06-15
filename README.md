# Auto-Injetor 🤖🚀

Um script avançado e universal para Tampermonkey que automatiza o avanço de aulas e resolve avaliações de forma inteligente em plataformas EAD modernas como Unicte, Noz e Cademi.

## 🔥 Principais Funcionalidades

- **Avanço Automático:** Detecta e pula aulas que já foram concluídas.
- **Bypass de Vídeos (Iframes e Nativos):** Engana players de vídeo como Vimeo, YouTube e PandaVideo, simulando que o vídeo foi assistido até o fim de forma instantânea.
- **Resolvedor de Provas Multi-Thread:** 
  - Mapeia múltiplas questões em uma única tela.
  - Para provas de Múltipla Escolha: Identifica gabaritos por cor (verde = certo, vermelho = tenta de novo) e aprende a resposta correta sozinho de forma assíncrona.
  - Para Desafios de Checkbox: Utiliza força-bruta assíncrona para descobrir as combinações exatas em provas que exigem "múltiplas corretas".
- **Escritor Fantasma:** Identifica caixas de texto dissertativas em avaliações e as preenche nativamente burlando bloqueios do React.
- **Sistema de Radar 500ms:** Não depende de recarregamento de página. O robô reage em tempo real na arquitetura SPA (Single Page Application).

## 📥 Como Instalar

1. Instale a extensão [Tampermonkey](https://www.tampermonkey.net/) no seu navegador.
2. Crie um novo script.
3. Copie todo o conteúdo do arquivo `auto-injetor.user.js` e cole no painel do Tampermonkey.
4. Salve e ative o script.

## 🛠️ Tecnologias Suportadas

- Plataformas SPA (React/Vue/Remix)
- Domínios nativamente suportados no motor lógico de Quizzes: `unicte.com` e `appnoz.com.br`.

## 🔒 Privacidade e Segurança
Este script foi construído sem o uso de chaves privadas, e-mails, senhas ou tokens de identificação pessoal. Toda a sua operação ocorre de forma isolada na memória do navegador.

---
*Aviso: Este projeto foi criado com propósitos educacionais e de automação de testes.*
