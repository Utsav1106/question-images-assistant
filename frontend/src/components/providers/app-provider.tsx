'use client'
import React from 'react';
import { Toaster } from 'react-hot-toast';

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Toaster />
      {children}
    </>
  );
};

export default AppProvider;