import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`
          w-full h-[45px] p-3 
          rounded-xl 
          border border-gray-300 
          focus:outline-none focus:border-gray-500
          hover:border-gray-400
          transition-all duration-300 ease-in-out
          shadow-sm hover:shadow-md
          ${className || ''}
        `}
      {...props}
    />
  );
}

export default Input;
