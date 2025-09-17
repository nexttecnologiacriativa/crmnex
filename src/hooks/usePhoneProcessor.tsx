
import { useMemo } from 'react';

interface PhoneProcessorResult {
  processPhone: (phone: string) => string;
  formatPhoneDisplay: (phone: string) => string;
  extractPhoneComponents: (phone: string) => {
    countryCode: string;
    areaCode: string;
    number: string;
    formatted: string;
  };
}

export function usePhoneProcessor(): PhoneProcessorResult {
  const processPhone = useMemo(() => {
    return (phone: string): string => {
      if (!phone) return '';
      
      // Remove todos os caracteres não numéricos
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Se já começa com 55 e tem o tamanho correto, não modifica
      if (cleanPhone.startsWith('55') && (cleanPhone.length === 13 || cleanPhone.length === 12)) {
        return cleanPhone;
      }
      
      // Se tem 11 dígitos (celular brasileiro sem código do país)
      if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
        return '55' + cleanPhone;
      }
      
      // Se tem 10 dígitos (fixo brasileiro sem código do país)  
      if (cleanPhone.length === 10 && !cleanPhone.startsWith('55')) {
        return '55' + cleanPhone;
      }
      
      // Para outros casos, retorna como está
      return cleanPhone;
    };
  }, []);

  const formatPhoneDisplay = useMemo(() => {
    return (phone: string): string => {
      if (!phone) return '';
      
      // Remove caracteres não numéricos para processar
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Se tem código do país 55 (Brasil), formata com padrão brasileiro
      if (cleanPhone.startsWith('55') && (cleanPhone.length === 13 || cleanPhone.length === 12)) {
        const phoneWithoutCountry = cleanPhone.substring(2);
        if (phoneWithoutCountry.length === 11) {
          // Celular: +55 (11) 99999-9999
          return `+55 (${phoneWithoutCountry.substring(0, 2)}) ${phoneWithoutCountry.substring(2, 7)}-${phoneWithoutCountry.substring(7)}`;
        } else if (phoneWithoutCountry.length === 10) {
          // Fixo: +55 (11) 1234-5678
          return `+55 (${phoneWithoutCountry.substring(0, 2)}) ${phoneWithoutCountry.substring(2, 6)}-${phoneWithoutCountry.substring(6)}`;
        }
      }
      
      // Para outros formatos, apenas adiciona + se não tiver
      if (cleanPhone.length > 0 && !phone.startsWith('+')) {
        return '+' + cleanPhone;
      }
      
      return phone;
    };
  }, []);

  const extractPhoneComponents = useMemo(() => {
    return (phone: string) => {
      const cleanPhone = phone.replace(/\D/g, '');
      
      if (cleanPhone.startsWith('55') && (cleanPhone.length === 13 || cleanPhone.length === 12)) {
        return {
          countryCode: '55',
          areaCode: cleanPhone.substring(2, 4),
          number: cleanPhone.substring(4),
          formatted: formatPhoneDisplay(phone)
        };
      }
      
      return {
        countryCode: cleanPhone.substring(0, 2) || '55',
        areaCode: cleanPhone.substring(2, 4) || '',
        number: cleanPhone.substring(4) || cleanPhone,
        formatted: formatPhoneDisplay(phone)
      };
    };
  }, [formatPhoneDisplay]);

  return {
    processPhone,
    formatPhoneDisplay,
    extractPhoneComponents
  };
}
