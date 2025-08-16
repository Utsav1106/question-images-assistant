import React from 'react';
import { ImSpinner8 } from 'react-icons/im';

interface PreloaderProps {
    text?: string;
}
const Preloader = ({
    text
}: PreloaderProps) => {
    return (
        <div className="flex flex-col items-center justify-center pt-20 text-gray-500">
            <ImSpinner8 className="w-12 h-12 animate-spin mb-4" />
            <p className="text-lg">{text || "Loading..."}</p>
        </div>
    );
};

export default Preloader;