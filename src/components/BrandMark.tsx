import React from 'react';

interface BrandMarkProps {
  className?: string;
  tone?: 'adaptive' | 'black' | 'light';
}

const blackLogo = '/brand/logo-black.png';
const lightLogo = '/brand/logo-white.png';

export const BrandMark: React.FC<BrandMarkProps> = ({ className = '', tone = 'adaptive' }) => {
  if (tone === 'black') {
    return <img src={blackLogo} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
  }

  if (tone === 'light') {
    return <img src={lightLogo} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
  }

  return (
    <>
      <img src={blackLogo} alt="" aria-hidden="true" className={`object-contain dark:hidden ${className}`} />
      <img src={lightLogo} alt="" aria-hidden="true" className={`hidden object-contain dark:block ${className}`} />
    </>
  );
};
