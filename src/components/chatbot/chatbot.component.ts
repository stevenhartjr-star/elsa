
import { Component, ChangeDetectionStrategy, input, inject, signal, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { type ReviewAnalysis, type ChatMessage } from '../../models/analysis.model';
import { GeminiService } from '../../services/gemini.service';
import type { Chat } from '@google/genai';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  imports: [CommonModule],
})
export class ChatbotComponent implements AfterViewInit {
  analysisContext = input.required<ReviewAnalysis>();

  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  private chat: Chat | null = null;
  private readonly geminiService = inject(GeminiService);

  ngAfterViewInit(): void {
    this.initializeChat();
  }

  private initializeChat(): void {
    this.chat = this.geminiService.startChat(this.analysisContext());
    const initialText = `Hello! I'm your AI Salon Advisor. I've reviewed the analysis for ${this.analysisContext().businessName}. How can I help you grow your business today? Feel free to ask about marketing, improving weaknesses, or anything else on your mind.`;
    this.messages.set([
      {
        role: 'model',
        text: initialText,
        html: this.parseToHtml(initialText)
      }
    ]);
  }
  
  async sendMessage(inputElement: HTMLInputElement): Promise<void> {
    const prompt = inputElement.value.trim();
    if (!prompt || this.isLoading()) return;

    // Add user message to chat
    this.messages.update(m => [...m, { role: 'user', text: prompt }]);
    inputElement.value = '';
    this.isLoading.set(true);
    this.error.set(null);
    this.scrollToBottom();

    try {
      if (!this.chat) {
        throw new Error("Chat not initialized.");
      }

      const stream = await this.chat.sendMessageStream({ message: prompt });
      
      let modelResponse = '';
      this.messages.update(m => [...m, { role: 'model', text: '...', html: '<div class="flex gap-1.5"><span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span><span class="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span></div>' }]);
      this.scrollToBottom();
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        const htmlResponse = this.parseToHtml(modelResponse);

        this.messages.update(m => {
          const lastMessage = m[m.length - 1];
          if (lastMessage.role === 'model') {
            lastMessage.text = modelResponse; // Keep raw text
            lastMessage.html = htmlResponse; // Store parsed HTML
          }
          return [...m];
        });
        this.scrollToBottom();
      }

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      this.error.set(`Sorry, I encountered an error: ${errorMessage}`);
       const errorText = `I seem to be having trouble connecting. Please try again.`;
       this.messages.update(m => {
            const lastMessage = m[m.length - 1];
            if (lastMessage.role === 'model') {
                lastMessage.text = errorText;
                lastMessage.html = this.parseToHtml(errorText);
            } else {
                m.push({ role: 'model', text: errorText, html: this.parseToHtml(errorText) });
            }
            return [...m];
       });

    } finally {
      this.isLoading.set(false);
      this.scrollToBottom();
    }
  }

  private parseToHtml(text: string): string {
      let html = text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Bold: **text**
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Unordered lists
      html = html.replace(/^\s*[-*]\s(.*$)/gm, '<li>$1</li>');
      html = html.replace(/<\/li>\n<li>/g, '</li><li>');
      // Use a regex with a negative lookbehind to avoid wrapping lists in lists
      html = html.replace(/(?<!<\/ul>\s*)((<li>.*<\/li>)+)/s, '<ul>$1</ul>');
      
      // Split by newline, but keep list blocks together
      const blocks = html.split(/(\n)/).reduce((acc, part) => {
          if (part === '\n') {
              if (!acc[acc.length - 1].includes('<ul>')) {
                  acc.push('');
              } else {
                 acc[acc.length - 1] += part;
              }
          } else {
              if (acc[acc.length - 1] === undefined) {
                  acc.push(part)
              } else {
                  acc[acc.length - 1] += part;
              }
          }
          return acc;
      }, ['']);

      return blocks
          .map(block => block.trim())
          .filter(block => block.length > 0)
          .map(block => {
              if (block.startsWith('<ul>')) {
                  return block;
              }
              return `<p>${block}</p>`;
          })
          .join('');
  }

  private scrollToBottom(): void {
    setTimeout(() => {
        try {
            this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
        } catch(err) { }
    }, 0);
  }
}
