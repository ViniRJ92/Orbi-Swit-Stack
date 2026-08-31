; Script de instalação personalizado (NSIS), usado pelo electron-builder.
;
; Fase 47 — limpeza dos atalhos do nome antigo.
;
; O app se chamava "Orbi Swit Stack" e passou a se chamar "Orbi". O
; instalador cria os atalhos com o nome NOVO, mas os antigos ficariam para
; trás na área de trabalho e no menu iniciar, e o usuário veria dois ícones
; para o mesmo programa.
;
; Apagar aqui, antes de criar os novos, resolve sem depender de o
; desinstalador da versão anterior ter rodado — o que não acontece nas
; atualizações silenciosas feitas pelo próprio app.
;
; `customInstall` é executado pelo electron-builder durante a instalação.
; Apagar atalho que não existe não é erro no NSIS, então rodar isto em uma
; instalação limpa é inofensivo.
;
; Orbi — Criado por Vinicius Braga

!macro customInstall
  ; Atalho da área de trabalho
  Delete "$DESKTOP\Orbi Swit Stack.lnk"

  ; Atalho do menu iniciar (formato solto, o padrão do electron-builder)
  Delete "$SMPROGRAMS\Orbi Swit Stack.lnk"

  ; Atalho do menu iniciar dentro de uma pasta com o nome antigo, caso alguma
  ; versão tenha sido instalada assim. A pasta só é removida se ficar vazia.
  Delete "$SMPROGRAMS\Orbi Swit Stack\Orbi Swit Stack.lnk"
  RMDir "$SMPROGRAMS\Orbi Swit Stack"

  ; Mesmos caminhos para instalação feita para todos os usuários.
  SetShellVarContext all
  Delete "$DESKTOP\Orbi Swit Stack.lnk"
  Delete "$SMPROGRAMS\Orbi Swit Stack.lnk"
  Delete "$SMPROGRAMS\Orbi Swit Stack\Orbi Swit Stack.lnk"
  RMDir "$SMPROGRAMS\Orbi Swit Stack"
  SetShellVarContext current
!macroend
