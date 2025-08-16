import { API_URL } from "@/config"
import { Source } from "@/types/source"
import { callApi } from "@/utils/api"

export const fetchSources = async (): Promise<Source[]> => {
  const res = await callApi('/source')
  return res.sources as Source[]
}

export const createSource = async (sourceName: string): Promise<Source> => {
  await callApi('/source', {
    method: 'POST',
    body: JSON.stringify({ name: sourceName }),
  })

  return {
    name: sourceName,
    images: []
  } as Source
}

export const fetchSource = async(sourceName: string): Promise<Source> => {
  const res = await callApi(`/source/${sourceName}`)
  return res as Source
}

export const uploadSource = async (sourceName: string, files: File[]): Promise<void> => {
    const uploadPromises = files.map(file => {
        const formData = new FormData();
        formData.append('file', file);
        return callApi(`/source/${sourceName}/upload`, {
            method: 'POST',
            noDefaultHeader: true,
            body: formData,
        });
    });

    const results = await Promise.allSettled(uploadPromises);

    const failedUploads = results.filter(result => result.status === 'rejected') as PromiseRejectedResult[];

    if (failedUploads.length > 0) {
        const failedFilesCount = failedUploads.length;
        const totalFilesCount = files.length;
        const successCount = totalFilesCount - failedFilesCount;

        failedUploads.forEach(fail => {
            console.error('Upload failed with reason:', fail.reason);
        });

        throw new Error(`Upload partially failed. ${successCount}/${totalFilesCount} files succeeded. Please try the remaining ${failedFilesCount} again.`);
    }

};

export const deleteSource = async (sourceName: string, imageNames: string[]): Promise<void> => {
    await callApi(`/source/${sourceName}/files`, {
        method: 'DELETE',
        body: JSON.stringify({ fileNames: imageNames }),
    });
};