import { type ChangeEvent, type KeyboardEvent, useEffect, useRef } from 'react';

import { useStyles } from './style';

interface InputBoxProps {
  onChange: (value: string) => void;
  onEscape: () => void;
  onSubmit: (value: string) => void;
  value: string;
}

const InputBox = ({ value, onChange, onSubmit, onEscape }: InputBoxProps) => {
  const { styles } = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
    };

    window.electron?.ipcRenderer.on('spotlightFocus', handler);
    return () => {
      window.electron?.ipcRenderer.removeListener('spotlightFocus', handler);
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (value) {
        onChange('');
      } else {
        onEscape();
      }
      return;
    }
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault();
      onSubmit(value.trim());
    }
  };

  return (
    <div className={styles.inputArea}>
      <input
        autoFocus
        className={styles.input}
        placeholder="Type to chat, > for commands, @ for search..."
        ref={inputRef}
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default InputBox;
