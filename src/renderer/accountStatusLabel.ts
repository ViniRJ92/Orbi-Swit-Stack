/**
 * Texto de status de uma conta, compartilhado entre sidebar, tela de
 * gerenciamento e paleta de comando — evita que cada tela reimplemente essa
 * lógica com pequenas divergências (ver Fase 10: "Aguardando QR Code" só
 * pode aparecer para instâncias WhatsApp, que são as únicas que realmente
 * usam QR Code para conectar).
 *
 * Orbi Swit Stack — Criado por Vinicius Braga
 */
import { AccountRecord, AccountStatus } from './types';

export function accountStatusLabel(acc: AccountRecord, status: AccountStatus | undefined): string {
  if (status?.loadError) return 'Falha ao carregar';
  if (acc.phone) return acc.phone;
  if (status?.suspended) return 'Suspensa';
  // Fase 31.1: "Conectado" só é honesto no WhatsApp, onde o app realmente
  // detecta o login concluído (a lista de conversas só existe depois dele).
  // Nos demais serviços `isOnline` significa apenas que a página terminou de
  // carregar — dizer "Conectado" ali enganava: aparecia igual quando o login
  // tinha falhado (ex.: a tela de recusa de login do Google). Detectar login
  // site a site exigiria depender do HTML interno de terceiros, que é
  // justamente o que este projeto não faz.
  if (status?.isOnline) return acc.service === 'whatsapp' ? 'Conectado' : 'Aberto';
  // "Aguardando QR Code" é um estado exclusivo do WhatsApp — os demais
  // serviços (Gmail, Google Earth, navegador livre, URL customizada) não têm
  // esse fluxo, então antes de ficarem prontos mostram só "Carregando...".
  if (acc.service === 'whatsapp') return 'Aguardando QR Code';
  return 'Carregando...';
}
