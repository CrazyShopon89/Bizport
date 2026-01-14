import React from 'react';

interface SuccessAnimationProps {
  size?: number;
  className?: string;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ size = 56, className = "" }) => {
  return (
    <div className={`checkmark-wrapper ${className}`} style={{ width: size, height: size }}>
      <svg className="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
        <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
        <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
      </svg>
    </div>
  );
};

export default SuccessAnimation;