
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneInputProps {
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export default function PhoneInput({ 
  value = '', 
  onChange, 
  error, 
  label = "Telefone",
  placeholder = "+55 (11) 99999-9999",
  required = false 
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(value);

  const processPhone = (phone: string): string => {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Se já começa com 55 e tem tamanho correto, não modifica
    if (cleanPhone.startsWith('55') && (cleanPhone.length === 13 || cleanPhone.length === 12)) {
      return cleanPhone;
    }
    
    // Se tem 11 dígitos (celular brasileiro), adiciona 55
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
      return '55' + cleanPhone;
    }
    
    // Se tem 10 dígitos (fixo brasileiro), adiciona 55  
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('55')) {
      return '55' + cleanPhone;
    }
    
    return cleanPhone;
  };

  const formatPhoneDisplay = (phone: string): string => {
    if (!phone) return '';
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Formatar para exibição brasileira
    if (cleanPhone.startsWith('55') && (cleanPhone.length === 13 || cleanPhone.length === 12)) {
      const phoneWithoutCountry = cleanPhone.substring(2);
      if (phoneWithoutCountry.length === 11) {
        return `+55 (${phoneWithoutCountry.substring(0, 2)}) ${phoneWithoutCountry.substring(2, 7)}-${phoneWithoutCountry.substring(7)}`;
      } else if (phoneWithoutCountry.length === 10) {
        return `+55 (${phoneWithoutCountry.substring(0, 2)}) ${phoneWithoutCountry.substring(2, 6)}-${phoneWithoutCountry.substring(6)}`;
      }
    }
    
    // Para entrada, formatar conforme digita
    if (cleanPhone.length <= 11) {
      if (cleanPhone.length <= 2) {
        return cleanPhone;
      } else if (cleanPhone.length <= 7) {
        return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2)}`;
      } else {
        return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
      }
    }
    
    return phone;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanInput = inputValue.replace(/\D/g, '');
    
    // Limita a entrada
    if (cleanInput.length <= 15) {
      const processedPhone = processPhone(cleanInput);
      const formattedDisplay = formatPhoneDisplay(inputValue);
      
      setDisplayValue(formattedDisplay);
      onChange(processedPhone);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="phone">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id="phone"
        type="tel"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-gray-500">
        Digite o telefone. Números brasileiros recebem +55 automaticamente.
      </p>
    </div>
  );
}
