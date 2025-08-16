'use client'

import { useState, useRef, useEffect, FormEvent, ChangeEvent, KeyboardEvent } from 'react';
import {
  FiSend,
  FiPaperclip,
  FiTrash2,
  FiDownload,
  FiLoader,
  FiX,
  FiUser,
  FiCpu,
  FiImage
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askAssistant, getChatHistory, clearChatHistory } from '@/services/assistant';
import { AssistantResponse, AssistantQuestion } from '@/types/assistant';
import StructuredAnswers from '@/components/ui/structured-answers';
import jsPDF from 'jspdf';
import Preloader from '../ui/preloader';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images: string[];
  timestamp?: Date;
  answers?: AssistantQuestion[];
  isStructured?: boolean;
  ocrContent?: string;
  pageFiles?: string[];
}

interface QuestionChatProps {
  sourceName: string;
}

export default function QuestionChat({ sourceName }: QuestionChatProps) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [input, setInput] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedPreviews, setStagedPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    loadChatHistory();
    return () => {
      setMessages(null)
      stagedPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [sourceName]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(sourceName);
      setChatHistory(history.history);

      const historyMessages: Message[] = history.history.map((entry, index) => ([
        {
          role: 'user' as const,
          content: entry.user,
          images: [],
          timestamp: new Date(Date.now() - (history.history.length - index) * 60000)
        },
        {
          role: 'assistant' as const,
          content: entry.assistant || '',
          images: [],
          timestamp: new Date(Date.now() - (history.history.length - index) * 60000 + 1000)
        }
      ])).flat();

      setMessages(historyMessages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await clearChatHistory(sourceName);
      setMessages([]);
      setChatHistory([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    const newFiles = Array.from(event.target.files);
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));

    setStagedFiles(prev => [...prev, ...newFiles]);
    setStagedPreviews(prev => [...prev, ...newPreviews]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeStagedFile = (indexToRemove: number) => {
    URL.revokeObjectURL(stagedPreviews[indexToRemove]);
    setStagedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    setStagedPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement> | KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if ((!input.trim() && stagedFiles.length === 0) || isLoading) return;
    if (!messages) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      images: stagedPreviews,
      timestamp: new Date(),
    };

    setMessages(prev => prev ? [...prev, userMessage] : [userMessage]);
    setInput('');
    const currentFiles = [...stagedFiles];
    const currentFileNames = currentFiles.map(file => file.name);
    setStagedFiles([]);
    setStagedPreviews([]);
    setIsLoading(true);

    try {
      const response: AssistantResponse = await askAssistant(sourceName, input, currentFiles);

      let assistantMessage: Message = {
        role: 'assistant',
        content: '',
        images: [],
        timestamp: new Date(),
      };

      if (response.result) {
        if (response.result.type === 'structured_answers') {
          assistantMessage.content = `Answered ${response.result.total_questions} questions`;
          assistantMessage.answers = response.result.answers as AssistantQuestion[];
          assistantMessage.isStructured = true;
        } else {
          assistantMessage.content = response.result.response || 'No response';
        }
      }

      setMessages(prev => prev ? [...prev, assistantMessage] : [assistantMessage]);
      await loadChatHistory();
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        images: [],
        timestamp: new Date(),
      };
      setMessages(prev => prev ? [...prev, errorMessage] : [errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMessageAsPDF = (message: Message, index: number) => {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const FONT_SIZES = { H1: 18, H2: 15, H3: 13, P: 12, SMALL: 10 }
    const LINE_HEIGHT = 1.5
    const MARGIN = { TOP: 20, LEFT: 18, RIGHT: 18, BOTTOM: 20 }
    const page = { w: pdf.internal.pageSize.getWidth(), h: pdf.internal.pageSize.getHeight() }
    const width = page.w - MARGIN.LEFT - MARGIN.RIGHT
    let y = MARGIN.TOP

    const mm = (pt: number) => pt * 0.352778
    const lh = (fs: number) => mm(fs) * LINE_HEIGHT
    const setFont = (style: 'normal' | 'bold' | 'italic' | 'bolditalic', size: number, mono = false) => {
      pdf.setFont(mono ? 'Courier' : 'Times', style)
      pdf.setFontSize(size)
    }
    const pageBreak = (h: number) => {
      if (y + h > page.h - MARGIN.BOTTOM) {
        pdf.addPage()
        y = MARGIN.TOP
      }
    }
    const sanitize = (s: string) =>
      s.replace(/\u2013|\u2014/g, '-').replace(/\u00A0/g, ' ').replace(/\r\n/g, '\n')
    const drawCheck = (x: number, baselineY: number, size: number) => {
      const w = mm(size) * 0.8
      const h = mm(size) * 0.8
      const x0 = x
      const y0 = baselineY - h * 0.2
      const x1 = x + w * 0.38
      const y1 = baselineY + h * 0.25
      const x2 = x + w
      const y2 = baselineY - h * 0.45
      const prev = pdf.getLineWidth()
      pdf.setLineWidth(Math.max(0.6, mm(size) * 0.08))
      pdf.line(x0, y0, x1, y1)
      pdf.line(x1, y1, x2, y2)
      pdf.setLineWidth(prev)
      return w
    }
    const writeRun = (text: string, xStart: number, size: number, mono: boolean) => {
      let x = xStart
      const maxX = page.w - MARGIN.RIGHT
      const lineH = lh(size)
      setFont('normal', size, mono)
      const parts = sanitize(text).split(/(\s+)/)
      for (const part of parts) {
        if (part === '\n') {
          y += lineH
          pageBreak(lineH)
          x = xStart
          continue
        }
        if (part === '✓' || part === '\u2713') {
          const w = drawCheck(x, y, size)
          x += w
          continue
        }
        const segments = part.split(/(\u2713|✓)/)
        for (const seg of segments) {
          if (!seg) continue
          if (seg === '✓' || seg === '\u2713') {
            const w = drawCheck(x, y, size)
            x += w
            continue
          }
          const w = pdf.getTextWidth(seg)
          if (x + w > maxX && seg.trim() !== '') {
            y += lineH
            pageBreak(lineH)
            x = xStart
          }
          if (seg.length) pdf.text(seg, x, y)
          x += w
        }
      }
      return x
    }
    const drawInlineTokens = (children: any[], baseSize: number, xStart = MARGIN.LEFT, bullet?: string, forceBold = false) => {
      let style: 'normal' | 'bold' | 'italic' | 'bolditalic' = forceBold ? 'bold' : 'normal'
      let italicOn = false
      let boldOn = forceBold
      let mono = false
      const lineH = lh(baseSize)
      let x = xStart
      const maxX = page.w - MARGIN.RIGHT
      const applyStyle = () => {
        style = boldOn && italicOn ? 'bolditalic' : boldOn ? 'bold' : italicOn ? 'italic' : 'normal'
        setFont(style, baseSize, mono)
      }
      if (bullet) {
        applyStyle()
        const b = bullet + ' '
        const bw = pdf.getTextWidth(b)
        pdf.text(b, x, y)
        x += bw
      }
      for (let i = 0; i < children.length; i++) {
        const t = children[i]
        if (t.type === 'softbreak' || t.type === 'hardbreak') {
          y += lineH
          pageBreak(lineH)
          x = xStart + (bullet ? pdf.getTextWidth('   ') : 0)
          continue
        }
        if (t.type === 'strong_open') {
          boldOn = true
          applyStyle()
          continue
        }
        if (t.type === 'strong_close') {
          boldOn = forceBold
          applyStyle()
          continue
        }
        if (t.type === 'em_open') {
          italicOn = true
          applyStyle()
          continue
        }
        if (t.type === 'em_close') {
          italicOn = false
          applyStyle()
          continue
        }
        if (t.type === 'code_inline') {
          mono = true
          applyStyle()
          x = writeRun(t.content, x, baseSize, true)
          mono = false
          applyStyle()
          continue
        }

        if (t.type === 'text') {
          applyStyle();
          const raw = sanitize(t.content);
          const lines = raw.split('\n');

          lines.forEach((line, lineIndex) => {
            if (lineIndex > 0) {
              y += lineH;
              pageBreak(lineH);
              x = xStart + (bullet ? pdf.getTextWidth('   ') : 0);
            }

            const words = line.split(/(\s+)/);
            for (const w of words) {
              if (!w) continue;

              const chunks = w.split(/(\u2713|✓)/);
              for (const c of chunks) {
                if (!c) continue;
                if (c === '✓' || c === '\u2713') {
                  const cw = drawCheck(x, y, baseSize);
                  x += cw;
                  continue;
                }
                const tw = pdf.getTextWidth(c);

                if (x > xStart && x + tw > maxX && c.trim() !== '') {
                  y += lineH;
                  pageBreak(lineH);
                  x = xStart + (bullet ? pdf.getTextWidth('   ') : 0);
                }
                if (c.length) pdf.text(c, x, y);
                x += tw;
              }
            }
          });
          continue;
        }

        if (t.type === 'link_open' || t.type === 'link_close') continue
      }
      y += lineH
      pageBreak(lineH)
    }

    const drawFence = (content: string) => {
      const size = FONT_SIZES.SMALL
      const lineH = lh(size)
      setFont('normal', size, true)
      const lines = sanitize(content).split('\n')
      for (const line of lines) {
        const chunks = pdf.splitTextToSize(line, width)
        for (const c of chunks) {
          pageBreak(lineH)
          let x = MARGIN.LEFT
          const parts = c.split(/(\u2713|✓)/)
          for (const p of parts) {
            if (!p) continue
            if (p === '✓' || p === '\u2713') {
              const cw = drawCheck(x, y, size)
              x += cw
              continue
            }
            pdf.text(p, x, y)
            x += pdf.getTextWidth(p)
          }
          y += lineH
        }
      }
      y += 2
    }

    const MarkdownIt = require('markdown-it')
    const md = new MarkdownIt({ html: false, breaks: true, linkify: true })
    const tokens = md.parse(message.content || '', {})

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      if (t.type === 'heading_open') {
        const level = parseInt(t.tag.slice(1), 10)
        const inline = tokens[i + 1]
        const size = level === 1 ? FONT_SIZES.H1 : level === 2 ? FONT_SIZES.H2 : FONT_SIZES.H3
        if (inline && inline.type === 'inline') {
          drawInlineTokens(inline.children || [], size, MARGIN.LEFT, undefined, true)
        }
        while (i < tokens.length && tokens[i].type !== 'heading_close') i++
        continue
      }
      if (t.type === 'paragraph_open') {
        const inline = tokens[i + 1]
        if (inline && inline.type === 'inline') drawInlineTokens(inline.children || [], FONT_SIZES.P)
        while (i < tokens.length && tokens[i].type !== 'paragraph_close') i++
        continue
      }
      if (t.type === 'bullet_list_open') {
        let j = i + 1
        while (j < tokens.length && tokens[j].type !== 'bullet_list_close') {
          if (tokens[j].type === 'list_item_open') {
            const inline = tokens[j + 1]
            if (inline && inline.type === 'inline') drawInlineTokens(inline.children || [], FONT_SIZES.P, MARGIN.LEFT, '•')
            while (j < tokens.length && tokens[j].type !== 'list_item_close') j++
          }
          j++
        }
        i = j
        continue
      }
      if (t.type === 'fence') {
        drawFence(t.content || '')
        continue
      }
      if (t.type === 'hr') {
        pageBreak(6)
        pdf.setDrawColor(180, 180, 180)
        pdf.line(MARGIN.LEFT, y, page.w - MARGIN.RIGHT, y)
        y += 6
        continue
      }
    }

    pdf.save(`chat-response-${index + 1}.pdf`)
  }

  return (
    <div className="flex flex-col h-full bg-chat">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {!messages ? (
            <Preloader />
          ) : messages.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex p-6 bg-default-300/10 rounded-3xl text-primary-600 shadow-lg mb-6">
                <FiImage className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-default-800 mb-4">
                Question Images
              </h2>
              <p className="text-default-600 mb-6 max-w-2xl mx-auto">
                Upload images of your questions or type them directly.
              </p>
            </div>
          )}

          {messages?.map((msg, index) => (
            <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
                    <FiCpu size={20} />
                  </div>
                </div>
              )}

              <div className={`max-w-2xl rounded-2xl shadow-sm ${msg.role === 'user'
                ? 'bg-message-user text-white'
                : 'bg-message-assistant border border-default-200'
                }`}>
                {msg.images.length > 0 && (
                  <div className="p-4 border-b border-default-200">
                    <div className="grid grid-cols-2 gap-2">
                      {msg.images.map((image, imgIndex) => (
                        <img
                          key={imgIndex}
                          src={image}
                          alt={`Upload ${imgIndex + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {msg.content && (
                  <div className="p-4 relative group">
                    {msg.role === 'assistant' && msg.content ? (
                      <div className="prose prose-sm max-w-none whitespace-pre-line text-default-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}

                    {msg.role === 'assistant' && msg.content && (
                      <button
                        onClick={() => downloadMessageAsPDF(msg, index)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-default-400 hover:text-default-600 rounded-lg hover:bg-default-100"
                        title="Download as PDF"
                      >
                        <FiDownload size={16} />
                      </button>
                    )}
                  </div>
                )}

                {msg.isStructured && msg.answers && (
                  <div className="p-4 border-t border-default-200">
                    <StructuredAnswers answers={msg.answers} />
                  </div>
                )}

                {msg.timestamp && (
                  <div className="px-4 pb-2 text-xs text-default-600">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-default-100 text-foreground flex items-center justify-center">
                    <FiUser size={20} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center">
                  <FiCpu size={20} />
                </div>
              </div>
              <div className="bg-message-assistant border border-default-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <FiLoader className="animate-spin text-primary-600" size={20} />
                  <span className="text-default-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-default-200 p-4 bg-sidebar">
        <div className="max-w-4xl mx-auto">
          {stagedPreviews.length > 0 && (
            <div className="mb-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex items-center gap-2 mb-3">
                <FiPaperclip size={16} className="text-primary-600" />
                <span className="text-sm font-medium text-primary-700">
                  {stagedPreviews.length} file(s) selected
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {stagedPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeStagedFile(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-default-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors border-2 border-dashed border-default-300 hover:border-primary-400"
              title="Upload images"
            >
              <FiPaperclip size={20} />
            </button>

            <div className="flex-1 flex items-center relative">
              <textarea
                value={input}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Ask a question about your homework..."
                rows={1}
                className="w-full p-3 pr-12 bg-white border border-default-300 rounded-lg resize-none focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 text-gray-700 placeholder:text-default-400"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />

              <button
                type="submit"
                disabled={(!input.trim() && stagedFiles.length === 0) || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-primary-600 text-white rounded-lg disabled:bg-default-400 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
              >
                <FiSend size={16} />
              </button>
            </div>

            {(messages?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="p-3 text-default-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                title="Clear chat history"
              >
                <FiTrash2 size={20} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
