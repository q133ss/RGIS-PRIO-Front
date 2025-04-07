import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';

interface PhoneInputProps {
  value: string;
  onChange: (e: any) => void;
  disabled?: boolean;
  isInvalid?: boolean;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ 
  value, 
  onChange, 
  disabled = false, 
  isInvalid = false, 
  placeholder = "+7(XXX)XXX-XX-XX" 
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  // Функция для установки курсора в нужную позицию
  useEffect(() => {
    if (cursorPosition !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [value, cursorPosition]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const selectionStart = input.selectionStart || 0;
    
    // Получаем только цифры из введенного значения
    const digitsOnly = input.value.replace(/\D/g, '');
    
    // Форматируем телефон по мере ввода
    let formattedValue = '';
    
    if (digitsOnly.length > 0) {
      // Начинаем с +7
      formattedValue = '+7';
      
      // Добавляем скобки для кода города
      if (digitsOnly.length > 1) {
        formattedValue += '(' + digitsOnly.substring(1, Math.min(4, digitsOnly.length));
      }
      
      // Закрываем скобку и добавляем следующую часть
      if (digitsOnly.length > 4) {
        formattedValue += ')' + digitsOnly.substring(4, Math.min(7, digitsOnly.length));
      }
      
      // Добавляем первый дефис
      if (digitsOnly.length > 7) {
        formattedValue += '-' + digitsOnly.substring(7, Math.min(9, digitsOnly.length));
      }
      
      // Добавляем второй дефис
      if (digitsOnly.length > 9) {
        formattedValue += '-' + digitsOnly.substring(9, Math.min(11, digitsOnly.length));
      }
    } else {
      // Если ничего не введено, оставляем поле пустым
      formattedValue = '';
    }
    
    // Сохраняем новую позицию курсора
    const addedSymbols = formattedValue.length - input.value.length;
    const newPosition = selectionStart + addedSymbols;
    setCursorPosition(newPosition > 0 ? newPosition : 0);
    
    // Вызываем переданную функцию onChange
    onChange({
      target: {
        name: input.name,
        value: formattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <Form.Control
      ref={inputRef}
      type="text"
      name="phone"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      isInvalid={isInvalid}
    />
  );
};

export default PhoneInput;