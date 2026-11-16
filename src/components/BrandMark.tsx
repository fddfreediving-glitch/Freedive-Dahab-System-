import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white ${className}`}
  >
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-[82%] w-[82%]">
      <path
        d="M24 4L10 12V22L17 26V16L24 12L34 18V28L24 34L17 30V37L24 41L38 33V23L31 19V29L24 33L14 27V17L24 11L31 15V8L24 4Z"
        fill="#111827"
      />
    </svg>
  </span>
);
