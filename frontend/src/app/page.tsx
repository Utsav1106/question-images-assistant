'use client'

import { useEffect, useState } from 'react';
import { fetchSources } from "@/services/source";
import { Source } from "@/types/source";
import { toast } from "@/components/ui/toast";
import Preloader from "@/components/ui/preloader";
import Sidebar from "@/components/sidebar";
import QuestionChat from "@/components/question-chat";
import SourcesManager from "@/components/sources";
import { FiAlertTriangle } from 'react-icons/fi';

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'sources'>('questions');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    handleFetchSources();
  }, []);

  useEffect(() => {
    if (sources.length > 0 && !selectedSource) {
      setSelectedSource(sources[0].name);
    }
  }, [sources, selectedSource]);

  const handleFetchSources = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSources = await fetchSources();
      setSources(fetchedSources);
    } catch (e) {
      console.error(e);
      setError((e as Error).message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceSelect = (sourceName: string) => {
    setSelectedSource(sourceName);
    setSidebarOpen(false);
  };

  if (isLoading) {
    return <Preloader text="Loading Sources..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <FiAlertTriangle className="w-16 h-16 mb-4 text-danger-500" />
        <h2 className="text-2xl font-bold text-danger-600">Failed to Load Sources</h2>
        <p className="text-danger-500 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen antialiased text-default-800">
      <div className="flex flex-row h-full w-full overflow-x-hidden">
        <Sidebar
          sources={sources}
          setSources={setSources}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSourceSelect={handleSourceSelect}
          selectedSource={selectedSource}
          isMobile={true}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <div className="flex flex-col flex-auto h-full lg:ml-0">
          {activeTab === 'questions' ? (
            selectedSource ? (
              <QuestionChat sourceName={selectedSource} />
            ) : (
              <div className="flex items-center justify-center h-full bg-chat">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-default-700 mb-2">No Source Selected</h2>
                  <p className="text-default-500">Please select a source from the sidebar to start asking questions.</p>
                </div>
              </div>
            )
          ) : (
            <SourcesManager 
              selectedSource={selectedSource} 
              onSourceUpdate={handleFetchSources}
            />
          )}
        </div>
      </div>
    </div>
  );
}
