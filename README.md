# Fifones — Gêmeo Conselheiro Pessoal

Fifones é um aplicativo Windows privado dedicado exclusivamente ao seu
desenvolvimento: entender você, desafiar padrões limitantes, sustentar motivação
saudável e ajudá-lo a agir em direção à melhor versão que você mesmo definiu. Ele
oferece reflexão, simulação do seu ponto de vista, contraditório e persuasão
explicitamente autorizada. Não tenta ser uma cópia consciente de você: usa
memórias revisáveis para ajudar a pensar sem esconder incertezas.

## Missão exclusiva

- A “melhor versão” é definida pelos seus valores e objetivos confirmados, não
  por um padrão externo de produtividade, riqueza, aparência ou status.
- O ECO entende antes de aconselhar, desafia sem diminuir, incentiva sem bajular
  e busca transformar clareza em passos sustentáveis.
- Pedidos sem ligação com desenvolvimento pessoal são redirecionados; o ECO não
  funciona como assistente genérico.
- Manipulação, engano, coerção, vigilância ou controle de terceiros são
  bloqueados. O foco volta para suas escolhas, comunicação e limites.
- Memórias sensíveis nunca podem ser usadas como alavancas de pressão.

## O que já está implementado

- Aplicativo Electron + React + TypeScript com interface em português.
- Tela **Hoje** com próximo passo, tarefas, lembretes, agenda e atalhos de conversa.
- Frases faladas viram rascunhos de tarefa; nenhuma tarefa nasce sem confirmação.
- Tarefas e lembretes locais cifrados, com prazo, prioridade, recorrência e origem.
- Lembretes nativos do Windows, adiamento, conclusão, cancelamento e horário silencioso.
- Ícone na bandeja, atalho global `Ctrl+Shift+F` e janela compacta recolhível até a aura.
- Mapa de Pessoas com relação, contexto, fatos confirmados e assuntos pendentes.
- Catálogo visível das oito skills iniciais e de suas permissões.
- Orçamento mensal estimado com aviso em 80% e bloqueio de novas sessões no limite.
- Google Calendar opcional, consultado somente após comando e com escopo de leitura.
- Chat por texto em quatro modos: reflexão, simulação, contraditório e persuasão.
- Voz de baixa latência com WebRTC, `gpt-realtime-2.1-mini` no perfil Econômico
  e `gpt-realtime-2.1` no perfil Qualidade.
- Entrevistas de formação mãos livres: o ECO inicia, pergunta uma coisa por vez,
  aceita interrupções e salva a transcrição apenas como memória candidata.
- Orientações práticas são explicadas em passos numerados, curtos e progressivos.
- Análise deliberada com Responses API e `gpt-5.6-terra`.
- Modo demonstração totalmente local, utilizável sem chave de API.
- Entrevistas estruturadas, diário e revisão de memórias candidatas.
- Cofre SQLite (`sql.js`) serializado e cifrado integralmente com AES-256-GCM.
- Chave do cofre e chave da OpenAI protegidas pelo `safeStorage` do Electron
  (DPAPI no Windows).
- Histórico de revisões, confiança, fonte e três níveis de sensibilidade.
- Memórias restritas nunca são incluídas em contexto enviado.
- Recuperação vetorial local por representações determinísticas; apenas os trechos mais
  relevantes são enviados.
- Contratos de persuasão com objetivo, motivo, limites, intensidade e condição de
  parada.
- Bloqueio automático de persuasão em temas médicos, jurídicos, financeiros de
  alto impacto e crises emocionais.
- Exportação em JSON, exclusão completa e bloqueio automático do cofre.
- Testes de recuperação, rastreabilidade, autorização e segurança.
- Modelo de avaliação pessoal em `evals/personal-baseline.example.json`.

## Executar

Requisitos: Windows 10/11, Node.js 20 ou superior e npm.

O aplicativo começa em modo demonstração. Para respostas reais e voz ao vivo:

1. Entre na pasta do projeto no PowerShell:

   ```powershell
   cd "C:\Users\Dell\Documents\Codex\2026-07-24\quero-construir-uma-ia-personalizada-para"
   ```

2. Instale as dependências apenas na primeira vez:

   ```powershell
   npm.cmd install
   ```

3. Abra o Fifones:

   ```powershell
   npm.cmd run dev
   ```

4. Abra **Privacidade**.
5. Insira uma chave da OpenAI iniciada por `sk-`.
6. Desative **Modo demonstração**.
7. Volte para **Conversa** e use o botão do microfone.

A chave nunca é disponibilizada ao renderer. A conexão WebRTC é criada pelo
processo principal do Electron em `POST /v1/realtime/calls`.

## Validar e empacotar

```powershell
npm.cmd run check
npm.cmd run dist:win
```

O instalador NSIS é gerado pelo `electron-builder`.

Para avaliar semelhança de raciocínio, copie
`evals/personal-baseline.example.json`, preencha suas respostas antes de consultar
o Fifones e compare valores usados, contrapontos e limites — não apenas o vocabulário.

## Modelo de dados e privacidade

O banco é mantido em memória enquanto o aplicativo está desbloqueado. Ao
persistir, os bytes do SQLite são cifrados com AES-256-GCM antes da gravação. A
chave aleatória de 256 bits é protegida pelo mecanismo do sistema operacional.

As chamadas de texto usam `store: false`. Uma sessão conectada envia:

- áudio falado durante a sessão;
- a pergunta atual;
- instruções de segurança;
- um conjunto pequeno de memórias confirmadas e não restritas.

O aplicativo não inclui telemetria e não carrega fontes, scripts ou fontes
tipográficas externas.

O reconhecimento de voz do navegador não é usado como chamado em espera, pois
ele pode depender de serviço remoto. O chamado “Fala, Fifones” fica desligado
até a validação do Vosk local; botão, bandeja e atalho global funcionam sem
enviar áudio antes da ativação.

## Limites importantes

Fifones é um instrumento de reflexão. Não é terapeuta, médico, advogado, consultor
financeiro, representante legal ou substituto de relações humanas. Detecção de
alto risco reduz risco, mas não é infalível. Decisões importantes devem ser
validadas com pessoas qualificadas.

## Estrutura

```text
src/
  core/       políticas, prompts, recuperação e modo demonstração
  electron/   cofre cifrado, IPC e integrações OpenAI
  renderer/   interface React e cliente WebRTC
  shared/     contratos de tipos entre os processos
tests/        testes de segurança e comportamento
```
