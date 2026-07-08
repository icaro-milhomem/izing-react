export type WhatsAppProvider = "baileys";

export const isBaileysEnabled = (): boolean => true;

/** @deprecated Wuzapi removido — mantido para compatibilidade de imports */
export const isWuzapiEnabled = (): boolean => false;

export const getWhatsAppProvider = (): WhatsAppProvider => "baileys";
