import React, { useRef, useEffect, useState } from 'react';
import styles from './AutomationScheduler.module.scss';

export const TimeWheel = ({ options, value, onChange }) => {
  const containerRef = useRef(null);
  const itemHeight = 40;

  // Estado local para permitir a digitação sem disparar atualizações prematuras no pai
  const [inputValue, setInputValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  const infiniteOptions = [...options, ...options, ...options];
  const listLength = options.length;

  // Sincroniza o valor vindo do pai se não estiver digitando ativamente
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value);
    }
  }, [value, isEditing]);

  // Posiciona o scroll no item correto
  useEffect(() => {
    if (containerRef.current && !isEditing) {
      const selectedIndex = options.indexOf(value);
      if (selectedIndex !== -1) {
        const middleIndex = selectedIndex + listLength;
        containerRef.current.scrollTop = middleIndex * itemHeight;
      }
    }
  }, [value, isEditing, options, listLength]);

  const handleScroll = () => {
    if (!containerRef.current || isEditing) return;

    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);

    const realIndex = index % listLength;
    const selectedValue = options[realIndex];

    if (selectedValue && selectedValue !== value) {
      onChange(selectedValue);
    }

    // Reposicionamento infinito
    if (scrollTop < itemHeight * 2) {
      containerRef.current.scrollTop = scrollTop + (listLength * itemHeight);
    } else if (scrollTop > itemHeight * (listLength * 2 + 2)) {
      containerRef.current.scrollTop = scrollTop - (listLength * itemHeight);
    }
  };

  const handleInputChange = (e) => {
    // Permite digitar apenas números e limita a 2 dígitos
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputValue(val);
  };

  const handleCommitChange = () => {
    setIsEditing(false);

    // Formata com zero à esquerda (ex: "1" vira "01")
    let formatted = inputValue.padStart(2, '0');

    // Se digitou algo fora do range (ex: "99" para hora), volta para o último valor válido
    if (!options.includes(formatted)) {
      formatted = value;
    }

    setInputValue(formatted);
    onChange(formatted);
  };

  return (
    <div className={styles.wheelContainer}>
      <div className={styles.wheelHighlight} />

      <div
        ref={containerRef}
        className={styles.wheelList}
        onScroll={handleScroll}
      >
        <div className={styles.wheelSpacer} />

        {infiniteOptions.map((item, idx) => {
          const isSelected = item === value;

          return (
            <div
              key={`${item}-${idx}`}
              className={`${styles.wheelItem} ${isSelected ? styles.wheelItemSelected : ''}`}
            >
              {isSelected ? (
                <input
                  type="text"
                  value={isEditing ? inputValue : value}
                  onFocus={() => setIsEditing(true)}
                  onChange={handleInputChange}
                  onBlur={handleCommitChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCommitChange();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'center',
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    color: '#0067b8',
                    outline: 'none',
                    cursor: 'text'
                  }}
                />
              ) : (
                <span
                  style={{ width: '100%', textAlign: 'center' }}
                  onClick={() => {
                    const targetScroll = idx * itemHeight;
                    containerRef.current.scrollTop = targetScroll;
                    onChange(item);
                  }}
                >
                  {item}
                </span>
              )}
            </div>
          );
        })}

        <div className={styles.wheelSpacer} />
      </div>
    </div>
  );
};