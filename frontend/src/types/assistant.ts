export interface AssistantQuestion {
    question_number: string
    question: string
    answer: string
    source: string
    section: string
    question_type: string
    options_with_answer?: string
}

export interface QuestionSection {
    type: string
    questions: number[]
    pages: string[]
}

export interface AssistantResult {
    type: "structured_answers" | "single_response"
    answers?: AssistantQuestion[]
    total_questions?: number
    response?: string
    source_name?: string
    message?: string
    sections_summary?: Record<string, number>
}

export interface AssistantResponse {
    type: "structured_answers" | "single_response"
    result?: AssistantResult
    source_name: string
    files_processed: number
    chat_history_length?: number
    message?: string
}

export interface ChatHistoryEntry {
    user: string
    assistant: string
}

export interface ChatHistoryResponse {
    source_name: string
    history: ChatHistoryEntry[]
    total_exchanges: number
}
