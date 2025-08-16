import { callApi } from "@/utils/api"
import { AssistantResponse, ChatHistoryResponse } from "@/types/assistant"

export const askAssistant = async (sourceName: string, text: string = "", files: File[] = [], previousAmbiguities: string = "", ambiguitiesResponse: string = ""): Promise<AssistantResponse> => {
  const formData = new FormData()
  
  if (text) {
    formData.append('text', text)
  }
    
  files.forEach(file => {
    formData.append('file', file)
  })

  const res = await callApi(`/assistant/${sourceName}/ask`, {
    method: 'POST',
    noDefaultHeader: true,
    body: formData,
  })
  
  return res as AssistantResponse
}

export const getChatHistory = async (sourceName: string): Promise<ChatHistoryResponse> => {
  const res = await callApi(`/assistant/${sourceName}/history`)
  return res as ChatHistoryResponse
}

export const clearChatHistory = async (sourceName: string): Promise<{ message: string }> => {
  const res = await callApi(`/assistant/${sourceName}/clear_history`, {
    method: 'POST',
  })
  return res as { message: string }
}
