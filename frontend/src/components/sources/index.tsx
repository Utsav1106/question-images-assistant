'use client'

import { useState, useRef, FormEvent, useEffect } from 'react';
import { Source } from "@/types/source";
import { createSource, fetchSource, uploadSource, deleteSource } from '@/services/source';
import { API_URL } from '@/config';
import { toast } from '@/components/ui/toast';
import { 
  FiUpload, 
  FiTrash2, 
  FiLoader, 
  FiCheckSquare, 
  FiSquare, 
  FiImage,
  FiPlus,
  FiAlertTriangle
} from 'react-icons/fi';
import Input from '@/components/ui/input';
import Preloader from '@/components/ui/preloader';

interface SourcesManagerProps {
  selectedSource?: string;
  onSourceUpdate?: () => void;
}

const SelectableImage = ({ 
  sourceName, 
  imageName, 
  isSelected, 
  onSelect 
}: { 
  sourceName: string;
  imageName: string;
  isSelected: boolean;
  onSelect: (imageName: string) => void;
}) => {
  const imageUrl = `${API_URL}/uploads/sources/${sourceName}/${imageName}`;

  return (
    <div className="relative group aspect-square">
      <button
        onClick={() => onSelect(imageName)}
        className={`w-full h-full block rounded-lg overflow-hidden border-2 transition-colors ${
          isSelected ? 'border-primary-500' : 'border-transparent group-hover:border-primary-200'
        } focus:outline-none focus:ring-2 focus:ring-primary-200`}
      >
        <img src={imageUrl} alt={imageName} loading="lazy" className="w-full h-full object-cover" />
      </button>
      <div
        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200 ${
          isSelected ? 'bg-primary-500 text-white' : 'bg-default-900 bg-opacity-50 text-white opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected ? <FiCheckSquare className="w-4 h-4" /> : <FiSquare className="w-4 h-4" />}
      </div>
    </div>
  );
};

export default function SourcesManager({ selectedSource, onSourceUpdate }: SourcesManagerProps) {
  const [source, setSource] = useState<Source | null>(null);
  const [newSourceName, setNewSourceName] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSource = async () => {
    if (!selectedSource) {
      setSource(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSource = await fetchSource(selectedSource);
      setSource(fetchedSource);
      setSelectedImages([]);
    } catch (e) {
      setError((e as Error).message || "Source not found or failed to load.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSource();
  }, [selectedSource]);

  const handleCreateSource = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || isCreating) {
      if (!newSourceName.trim()) toast.error("Source name cannot be empty.");
      return;
    }

    setIsCreating(true);

    try {
      await createSource(newSourceName);
      toast.success(`Source "${newSourceName}" created!`);
      setNewSourceName("");
      onSourceUpdate?.();
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Failed to create source");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectImage = (imageName: string) => {
    setSelectedImages(prev =>
      prev.includes(imageName)
        ? prev.filter(name => name !== imageName)
        : [...prev, imageName]
    );
  };

  const handleUploadSources = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedSource) return;
    
    setIsProcessing(true);
    toast.info(`Uploading ${files.length} image(s)...`);

    try {
      await uploadSource(selectedSource, Array.from(files));
      toast.success("Upload complete!");
      await loadSource();
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "An error occurred during upload.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteSources = async () => {
    if (selectedImages.length === 0 || !selectedSource) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedImages.length} image(s)? This cannot be undone.`)) return;

    setIsProcessing(true);
    toast.info("Deleting selected images...");

    try {
      await deleteSource(selectedSource, selectedImages);
      toast.success("Images deleted successfully!");
      setSelectedImages([]);
      await loadSource();
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Failed to delete images.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!selectedSource) {
    return (
      <div className="flex flex-col h-full bg-chat p-6">
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-default-800 mb-2">Manage Sources</h2>
            <p className="text-default-600">Create a new source or select one from the sidebar to manage files.</p>
          </div>

          <form onSubmit={handleCreateSource} className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-sidebar rounded-xl border border-default-200 shadow-sm">
            <Input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="e.g., 'Math Homework'"
              className="w-full sm:flex-1 bg-white border-default-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !newSourceName.trim()}
              className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-default-400 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? <FiLoader className="animate-spin w-5 h-5 mr-2" /> : <FiPlus className="w-5 h-5 mr-2" />}
              Create Source
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-chat">
        <Preloader text={`Loading ${selectedSource}...`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-chat p-6">
        <div className="flex flex-col items-center justify-center flex-1 text-center">
          <FiAlertTriangle className="w-16 h-16 mb-4 text-danger-500" />
          <h2 className="text-xl font-bold text-danger-600 mb-2">Error Loading Source</h2>
          <p className="text-danger-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-chat">
      <div className="border-b border-default-200 p-6 bg-sidebar">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-default-800 truncate" title={source?.name}>
              {source?.name}
            </h1>
            <p className="text-default-600">
              {source?.images.length} image(s).
              {selectedImages.length > 0 && ` ${selectedImages.length} selected.`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <input
              type="file" 
              multiple 
              accept="image/png, image/jpeg, image/jpg"
              ref={fileInputRef} 
              onChange={(e) => handleUploadSources(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:bg-default-400 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? <FiLoader className="animate-spin w-5 h-5 mr-2" /> : <FiUpload className="w-5 h-5 mr-2" />}
              Upload
            </button>
            {selectedImages.length > 0 && (
              <button
                onClick={handleDeleteSources}
                disabled={isProcessing}
                className="flex items-center justify-center px-4 py-2 bg-danger-600 text-white font-semibold rounded-lg shadow-sm hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-200 disabled:bg-default-400 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? <FiLoader className="animate-spin w-5 h-5 mr-2" /> : <FiTrash2 className="w-5 h-5 mr-2" />}
                Delete ({selectedImages.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {source && source.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {source.images.map(imageName => (
              <SelectableImage
                key={imageName}
                sourceName={selectedSource}
                imageName={imageName}
                isSelected={selectedImages.includes(imageName)}
                onSelect={handleSelectImage}
              />
            ))}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center text-center text-default-500 border-2 border-dashed border-default-300 rounded-xl py-24 cursor-pointer transition hover:bg-default-50"
          >
            <FiImage className="w-16 h-16 mb-4" />
            <h3 className="text-xl font-semibold text-default-700">This source is empty</h3>
            <p className="mt-2">Click here to upload your first image.</p>
          </div>
        )}
      </div>
    </div>
  );
}
