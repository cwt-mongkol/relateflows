import React, { useEffect, useState, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';

interface TextScrambleProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export const TextScramble: React.FC<TextScrambleProps> = ({ text, className, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState(text);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let frame = 0;
    const totalFrames = text.length * 2 + 20;

    const scramble = () => {
      if (frame >= totalFrames) {
        setDisplayedText(text);
        onComplete?.();
        return;
      }

      const progress = frame / totalFrames;
      const charsRevealed = Math.floor(progress * text.length);

      setDisplayedText(
        text
          .split('')
          .map((char, i) => {
            if (i < charsRevealed) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      frame++;
      frameRef.current = window.setTimeout(scramble, speed);
    };

    scramble();

    return () => clearTimeout(frameRef.current);
  }, [text, speed]);

  return <span className={className}>{displayedText}</span>;
};
