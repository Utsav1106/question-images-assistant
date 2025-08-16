'use client'

import { useState } from 'react';
import { Source } from "@/types/source";
import { FiMessageSquare, FiFolder, FiMenu, FiX, FiFile, FiPlus, FiImage } from 'react-icons/fi';
import Input from './ui/input';
import Button from './ui/button';
import { createSource } from '@/services/source';
import { toast } from './ui/toast';
import { ImSpinner8 } from 'react-icons/im';

interface SidebarProps {
  sources: Source[];
  activeTab: 'questions' | 'sources';
  onTabChange: (tab: 'questions' | 'sources') => void;
  onSourceSelect?: (sourceName: string) => void;
  setSources?: (sources: Source[]) => void;
  selectedSource?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({
  sources,
  activeTab,
  onTabChange,
  setSources,
  onSourceSelect,
  selectedSource,
  isMobile = false,
  isOpen = true,
  onToggle
}: SidebarProps) {
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const handleCreateSource = async () => {
    try {
      if (newSourceName.trim()) {
        setIsCreating(true);
        await createSource(newSourceName);
        toast.success("Source created successfully");
        setNewSourceName('');
        if (setSources) {
          setSources([...sources, { name: newSourceName, images: [] }]);
        }
      } else {
        toast.error("Source name cannot be empty");
      }
    } catch (e) {
      toast.error((e as Error).message || "Failed to create source");
    } finally {
      setIsCreating(false);
    }
  };
  return (
    <>
      {isMobile && (
        <Button
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 lg:hidden p-2"
          variant={"outline"}
        >
          {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
        </Button>
      )}

      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40 w-[300px] shrink-0 max-w-[90vw] bg-sidebar border-r border-default-200 
        transform transition-transform duration-300 ease-in-out
        ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        lg:translate-x-0
      `}>
        <div className="flex flex-col h-full overflow-y-scroll py-8 px-6">
          <div className="flex flex-row items-center justify-center h-12 w-full mb-8">
            <div className="flex items-center justify-center rounded-2xl text-primary-700 bg-primary-100 h-10 w-10">
              <FiImage className="w-6 h-6" />
            </div>
            <div className="ml-2 font-bold text-2xl text-default-800">Question Images</div>
          </div>

          <div className="flex flex-col space-y-2 mb-8">
            <Button
              onClick={() => onTabChange('questions')}
              size={"lg"}
              variant={"ghost"}
              className={`justify-start ${activeTab === 'questions' ? '!bg-primary-100 !text-primary-700' : ''}`}
            >
              <FiMessageSquare className="w-5 h-5" />
              <span className="font-semibold">Ask Questions</span>
            </Button>
            <Button
              onClick={() => onTabChange('sources')}
              size={"lg"}
              variant={"ghost"}
              className={`justify-start ${activeTab === 'sources' ? '!bg-primary-100 !text-primary-700' : ''}`}
            >
              <FiFolder className="w-5 h-5" />
              <span className="font-semibold">Source Files</span>
            </Button>
          </div>

          <div className="flex flex-col flex-1">
            <div className="flex flex-row items-center justify-between text-sm mb-4">
              <span className="font-bold text-default-700">Sources</span>
              <div className='flex items-center'>
                <span className="flex items-center justify-center bg-default-300 h-5 w-5 rounded-full text-xs text-default-600">
                  {sources.length}
                </span>
              </div>
            </div>
            <div className='flex items-center mb-4'>
              <Input
                placeholder="Source Name"
                value={newSourceName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateSource();
                  }
                }}
                onChange={(e) => setNewSourceName(e.target.value)}
              />
              <Button
                className="ml-2 h-full px-3 rounded-lg"
                onClick={handleCreateSource}
                disabled={isCreating}
              >
                {isCreating ? <ImSpinner8 className="w-4 h-4 animate-spin" /> : <FiPlus className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex flex-col space-y-1 -mx-2 overflow-y-auto">
              {sources.map((source) => (
                <Button
                  key={source.name}
                  onClick={() => onSourceSelect?.(source.name)}
                  size={"lg"}
                  variant={"ghost"}
                  className={`justify-start !py-6 ${selectedSource === source.name ? '!bg-primary-100 !text-primary-700' : ''}`}
                >
                  <div className="relative">
                    <div className="flex items-center justify-center h-8 w-8 bg-primary-200 rounded-full">
                      <FiFile className="w-4 h-4 text-primary-600" />
                    </div>
                    {source.images.length > 0 && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-success-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {source.images.length > 9 ? '9+' : source.images.length}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold truncate">{source.name}</div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
