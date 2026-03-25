
import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import type { Chat } from '@google/genai';
import { ChatMessage } from '../../models/analysis.model';

// Extend the Window interface for the Web Speech API
declare global {
  interface Window {
    // FIX: Add SpeechRecognition to the global Window interface to resolve TypeScript error.
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

@Component({
  selector: 'app-style-consultant',
  templateUrl: './style-consultant.component.html',
  imports: [CommonModule],
})
export class StyleConsultantComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('input') private inputElement!: ElementRef<HTMLInputElement>;
  
  // Chat state
  messages = signal<ChatMessage[]>([]);
  isLoading = signal<boolean>(false);
  userUploadedImage = signal<string | null>(null);

  // Voice state
  isListening = signal<boolean>(false);
  voiceOutputEnabled = signal<boolean>(true);
  isSpeaking = signal<boolean>(false);
  
  // Video Generation state
  isGeneratingVideo = signal<boolean>(false);
  private videoPollInterval: any = null;
  
  private chat: Chat | null = null;
  private readonly geminiService = inject(GeminiService);
  private speechRecognition: any | null = null;

  constructor() {
      this.setupSpeechRecognition();
  }

  ngAfterViewInit(): void {
    this.initializeChat();
  }

  ngOnDestroy(): void {
      if (this.videoPollInterval) {
          clearInterval(this.videoPollInterval);
      }
      if (this.speechRecognition) {
          this.speechRecognition.stop();
      }
      window.speechSynthesis.cancel();
  }

  private setupSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
          this.speechRecognition = new SpeechRecognition();
          this.speechRecognition.continuous = false;
          this.speechRecognition.lang = 'en-US';
          this.speechRecognition.interimResults = false;
          this.speechRecognition.maxAlternatives = 1;

          this.speechRecognition.onresult = (event: any) => {
              const transcript = event.results[0][0].transcript;
              this.inputElement.nativeElement.value = transcript;
              this.sendMessage();
          };

          this.speechRecognition.onstart = () => this.isListening.set(true);
          this.speechRecognition.onend = () => this.isListening.set(false);
          this.speechRecognition.onerror = (event: any) => {
              console.error('Speech recognition error:', event.error);
              this.isListening.set(false);
          };
      } else {
          console.warn('Speech Recognition not supported in this browser.');
      }
  }

  private initializeChat(): void {
    this.chat = this.geminiService.startStyleConsultantChat();
    const welcome = `I am AURA, your AI Creative Partner. We don't follow trends; we create them.

Describe the aesthetic you wish to achieve, or upload a reference image for a high-fashion critique. Let's create something iconic.`;
    
    this.messages.set([{ role: 'model', text: welcome, html: this.formatText(welcome) }]);
  }

  handleImageUpload(event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          this.userUploadedImage.set(e.target?.result as string);
          this.messages.update(m => [...m, { role: 'user', text: '[Photo Uploaded]', html: `<img src="${e.target?.result}" class="max-w-[150px] rounded-lg border border-gray-300">` }]);
          this.scrollToBottom();
      };
      reader.readAsDataURL(file);
  }
  
  toggleVoiceListening() {
    if (!this.speechRecognition) return;
    if (this.isListening()) {
        this.speechRecognition.stop();
    } else {
        this.speechRecognition.start();
    }
  }

  async sendMessage() {
      const input = this.inputElement.nativeElement;
      const text = input.value.trim();
      if (!text && !this.userUploadedImage()) return;
      
      input.value = '';
      if (text) {
        this.messages.update(m => [...m, { role: 'user', text }]);
      }
      
      this.isLoading.set(true);
      this.scrollToBottom();

      try {
          const videoRegex = /video|animate|create a short film|movie|clip/i;
          if (videoRegex.test(text)) {
              await this.handleVideoGenerationRequest(text);
          } else if (text.toLowerCase().includes('visual') || text.toLowerCase().includes('show me')) {
              await this.handleVisualizationRequest(text);
          } else {
              await this.handleTextRequest(text);
          }
      } catch (e) {
          this.messages.update(m => [...m, { role: 'model', text: 'Error', html: '<span class="text-red-500">I am having trouble connecting right now.</span>'}]);
      } finally {
          this.isLoading.set(false);
          this.userUploadedImage.set(null); // Clear upload after send
      }
  }

  private async handleTextRequest(prompt: string) {
      const responseStream = await this.chat?.sendMessageStream({ message: prompt });
      let fullText = '';
      this.messages.update(m => [...m, { role: 'model', text: '...', html: '<span class="animate-pulse">AURA is thinking...</span>' }]);
      
      if (responseStream) {
          for await (const chunk of responseStream) {
              fullText += chunk.text;
              this.messages.update(m => {
                  const last = m[m.length - 1];
                  last.text = fullText;
                  last.html = this.formatText(fullText);
                  return [...m];
              });
              this.scrollToBottom();
          }
          this.speak(fullText);
      }
  }

  private async handleVisualizationRequest(prompt: string) {
      this.isLoading.set(true);
      const loadingMsgIndex = this.messages().length;
      this.messages.update(m => [...m, { role: 'model', text: 'Generating...', html: '<div class="flex items-center gap-2"><span class="animate-spin text-rose-500">✨</span> Visualizing your concept...</div>' }]);
      this.speak("Visualizing your concept now.");

      try {
        const imageBase64 = await this.geminiService.generateStyleConcept(this.userUploadedImage(), prompt);
        
        this.messages.update(m => {
            const newM = [...m];
            newM.splice(loadingMsgIndex, 1);
            return [...newM, { 
                role: 'model', 
                text: 'Here is the concept visualization.', 
                html: `<div class="space-y-2">
                        <p>Here is the concept visualization based on your direction:</p>
                        <img src="${imageBase64}" class="w-full rounded-lg shadow-md border border-gray-100">
                       </div>`
            }];
        });
        this.speak("Here is the concept visualization I generated for you.");
      } catch (e: any) {
           this.messages.update(m => {
               const newM = [...m];
               newM[loadingMsgIndex] = { role: 'model', text: 'Error', html: '<span class="text-red-500">I could not generate the image at this time. Please try a text description.</span>' };
               return newM;
           });
           this.speak("I'm sorry, I was unable to generate the image concept.");
      }
  }

  private async handleVideoGenerationRequest(prompt: string) {
      this.isGeneratingVideo.set(true);
      const msgId = Date.now();
      const initialMessage: ChatMessage = {
          role: 'model',
          text: 'Initiating video generation...',
          isVideo: true,
          videoGenerationStatus: 'Initializing Nano-Pro video render...',
      };
      this.messages.update(m => [...m, initialMessage]);
      this.speak("Initiating a Nano-Pro video render. This may take a few minutes, but I'll keep you updated on the progress.");

      try {
          let operation = await this.geminiService.generateVideo(prompt, this.userUploadedImage());
          this.pollVideoStatus(operation, msgId);
      } catch (e) {
          this.isGeneratingVideo.set(false);
          this.messages.update(m => {
              const last = m[m.length - 1];
              last.videoGenerationStatus = "Failed to start video generation.";
              return [...m];
          });
          this.speak("I'm sorry, I was unable to start the video generation process.");
      }
  }

  private pollVideoStatus(operation: any, msgId: number) {
      const progressMessages = ["Analyzing prompt with creative engine...", "Allocating render resources...", "Compositing high-fashion visuals...", "Applying cinematic color grade...", "Finalizing video output..."];
      let progressIndex = 0;

      this.videoPollInterval = setInterval(async () => {
          try {
              operation = await this.geminiService.getVideosOperation(operation);
              
              if (operation.done) {
                  clearInterval(this.videoPollInterval);
                  this.isGeneratingVideo.set(false);
                  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                  const finalUrl = `${downloadLink}&key=${this.geminiService.getApiKey()}`;
                  
                  this.messages.update(m => m.map(msg => msg.text.startsWith('Initiating') ? {
                      ...msg,
                      videoGenerationStatus: "Render Complete.",
                      videoUrl: finalUrl
                  } : msg));
                  this.speak("Your video concept is complete and ready for review.");

              } else {
                  // Cycle through progress messages
                  const status = progressMessages[progressIndex % progressMessages.length];
                  progressIndex++;
                  this.messages.update(m => m.map(msg => msg.text.startsWith('Initiating') ? { ...msg, videoGenerationStatus: status } : msg));
              }
          } catch(e) {
              clearInterval(this.videoPollInterval);
              this.isGeneratingVideo.set(false);
               this.messages.update(m => m.map(msg => msg.text.startsWith('Initiating') ? { ...msg, videoGenerationStatus: "An error occurred during rendering." } : msg));
               this.speak("An error occurred while rendering the video.");
          }
      }, 10000);
  }

  private speak(text: string) {
      if (!this.voiceOutputEnabled() || !text) return;
      
      const cleanText = text.replace(/\*\*/g, '').replace(/<[^>]*>/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onstart = () => this.isSpeaking.set(true);
      utterance.onend = () => this.isSpeaking.set(false);
      utterance.onerror = () => this.isSpeaking.set(false);
      window.speechSynthesis.speak(utterance);
  }

  private formatText(text: string): string {
      return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }

  private scrollToBottom() {
      setTimeout(() => {
          if (this.chatContainer) this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }, 100);
  }
}
