
import { Component, ChangeDetectionStrategy, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { GeneratedImage, ReviewAnalysis, MarketingCampaign } from '../../models/analysis.model';

type CreativeMode = 'text-to-image' | 'image-inspired' | 'ai-editor';
type StylePreset = 'nano-pro' | 'john-v3' | 'editorial' | 'minimalist' | 'neon';
type PublishState = 'idle' | 'generating' | 'ready' | 'posting' | 'posted';

interface BrainstormedIdea {
    title: string;
    concept: string;
    visualPrompt: string;
}

@Component({
  selector: 'app-marketing-studio',
  templateUrl: './marketing-studio.component.html',
  imports: [CommonModule],
})
export class MarketingStudioComponent {
  analysis = input.required<ReviewAnalysis>();
  private geminiService = inject(GeminiService);
  private nextImageId = 0;

  // Component State
  mode = signal<CreativeMode>('text-to-image');
  prompt = signal<string>('A stunning photo of a client with a fresh, vibrant balayage, hair perfectly styled and shiny.');
  editPrompt = signal<string>('Make the hair blonde and add a soft glow.');
  aspectRatio = signal<string>('1:1');
  imageSize = signal<string>('1K');
  stylePreset = signal<StylePreset>('nano-pro');
  uploadedImage = signal<string | null>(null);
  
  // Generation State
  isGenerating = signal<boolean>(false);
  error = signal<string | null>(null);
  generatedImages = signal<GeneratedImage[]>([]);
  activeImage = signal<GeneratedImage | null>(null);

  // Prompt Enhancement State
  isEnhancingPrompt = signal<boolean>(false);

  // Content Workflow State
  publishState = signal<PublishState>('idle');
  captions = signal<string[]>([]);
  selectedCaption = signal<string>('');
  
  // Brainstorming State
  isBrainstorming = signal<boolean>(false);
  brainstormedIdeas = signal<BrainstormedIdea[]>([]);
  
  // UI State
  shareSuccess = signal<string | null>(null);

  // Text Overlay State
  overlayText = signal<string>('');
  overlayPosition = signal<'top' | 'center' | 'bottom'>('center');
  overlayColor = signal<string>('#ffffff');

  supportedAspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];
  supportedImageSizes = ['1K', '2K', '4K'];

  setMode(newMode: CreativeMode) {
    this.mode.set(newMode);
    this.error.set(null); // Clear error when switching modes
  }
  
  updatePrompt(event: Event) {
      this.prompt.set((event.target as HTMLTextAreaElement).value);
  }

  updateEditPrompt(event: Event) {
      this.editPrompt.set((event.target as HTMLTextAreaElement).value);
  }

  updateOverlayText(event: Event) {
      this.overlayText.set((event.target as HTMLInputElement).value);
  }

  setOverlayPosition(position: 'top' | 'center' | 'bottom') {
      this.overlayPosition.set(position);
  }

  setOverlayColor(color: string) {
      this.overlayColor.set(color);
  }

  setAspectRatio(ratio: string) {
      this.aspectRatio.set(ratio);
  }

  setImageSize(size: string) {
      this.imageSize.set(size);
  }

  setStylePreset(preset: StylePreset) {
      this.stylePreset.set(preset);
  }

  handleImageUpload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.uploadedImage.set(null);
      return;
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async enhancePrompt() {
    if (this.isEnhancingPrompt() || !this.prompt()) return;

    this.isEnhancingPrompt.set(true);
    this.error.set(null);
    try {
      const enhanced = await this.geminiService.enhancePrompt(this.prompt());
      this.prompt.set(enhanced);
    } catch (e) {
      console.error("Failed to enhance prompt", e);
      this.error.set('Failed to enhance prompt. The AI may be busy.');
    } finally {
      this.isEnhancingPrompt.set(false);
    }
  }

  async generateNewIdeas() {
      this.isBrainstorming.set(true);
      this.error.set(null);
      try {
          const ideas = await this.geminiService.brainstormMarketingAngles(this.analysis());
          this.brainstormedIdeas.set(ideas);
      } catch (e) {
          console.error("Brainstorming failed", e);
          this.error.set("Could not brainstorm ideas at this time.");
      } finally {
          this.isBrainstorming.set(false);
      }
  }

  useBrainstormedIdea(idea: BrainstormedIdea) {
      this.prompt.set(idea.visualPrompt);
  }

  async generate() {
    this.isGenerating.set(true);
    this.error.set(null);
    this.resetPublishState();
    let finalPrompt = this.prompt();

    try {
        if (this.mode() === 'ai-editor') {
             const uploaded = this.uploadedImage();
             if (!uploaded) {
                 throw new Error('Please upload an image to edit.');
             }
             if (!this.editPrompt()) {
                 throw new Error('Please provide editing instructions.');
             }
             const imageUrl = await this.geminiService.editImage(uploaded, this.editPrompt());
             
             const newImage: GeneratedImage = {
                id: this.nextImageId++,
                url: imageUrl,
                prompt: `Edit: ${this.editPrompt()}`,
            };
            this.generatedImages.update(images => [newImage, ...images]);
            this.activeImage.set(newImage);
            return; // Exit early for edit mode
        }

        if (this.mode() === 'image-inspired') {
            const uploaded = this.uploadedImage();
            if (!uploaded) {
                throw new Error('Please upload an image for the Image-Inspired mode.');
            }
            const imageDescription = await this.geminiService.generateImagePromptFromImage(uploaded);
            finalPrompt = `Based on the style of "${imageDescription}", create a new image with the following request: "${this.prompt()}"`;
        }
        
        const imageUrl = await this.geminiService.generateMarketingImage({
            context: finalPrompt,
            aspectRatio: this.aspectRatio(),
            imageSize: this.imageSize(),
            stylePreset: this.stylePreset(),
        });

        const newImage: GeneratedImage = {
            id: this.nextImageId++,
            url: imageUrl,
            prompt: finalPrompt,
        };

        this.generatedImages.update(images => [newImage, ...images]);
        this.activeImage.set(newImage);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        this.error.set(errorMessage);
    } finally {
        this.isGenerating.set(false);
    }
  }

  selectImageFromGallery(image: GeneratedImage) {
      this.activeImage.set(image);
      this.resetPublishState();
  }

  editGeneratedImage(image: GeneratedImage) {
      this.uploadedImage.set(image.url);
      this.mode.set('ai-editor');
      this.editPrompt.set(''); 
      // User is now in edit mode with the image loaded
  }

  private resetPublishState() {
      this.publishState.set('idle');
      this.captions.set([]);
      this.selectedCaption.set('');
  }

  async startPublishWorkflow() {
      const image = this.activeImage();
      if (!image) return;

      this.publishState.set('generating');
      try {
          const generatedCaptions = await this.geminiService.generateMarketingCaption(image.prompt);
          this.captions.set(generatedCaptions);
          if (generatedCaptions.length > 0) {
              this.selectedCaption.set(generatedCaptions[0]);
          }
          this.publishState.set('ready');
      } catch {
          this.error.set('Could not generate captions.');
          this.publishState.set('idle');
      }
  }
  
  async autoPost() {
      this.publishState.set('posting');
      // Simulate multi-platform posting
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.publishState.set('posted');
      await new Promise(resolve => setTimeout(resolve, 3000));
      this.resetPublishState();
      this.activeImage.set(null);
  }

  useCampaign(campaign: MarketingCampaign) {
    const newPrompt = `${campaign.title}: ${campaign.description}`;
    this.prompt.set(newPrompt);
  }

  getAspectRatioPadding(): string {
    const ratio = this.aspectRatio();
    switch (ratio) {
      case '1:1': return '100%';
      case '2:3': return '150%';
      case '3:2': return '66.66%';
      case '4:3': return '75%';
      case '3:4': return '133.33%';
      case '16:9': return '56.25%';
      case '9:16': return '177.77%';
      case '21:9': return '42.85%';
      default: return '100%';
    }
  }

  downloadImage() {
    const image = this.activeImage();
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const text = this.overlayText();
      if (text) {
        // Configure text style
        const fontSize = Math.max(img.width * 0.05, 24); // Responsive font size
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = this.overlayColor();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const x = canvas.width / 2;
        let y = canvas.height / 2;

        if (this.overlayPosition() === 'top') {
          y = fontSize * 1.5;
        } else if (this.overlayPosition() === 'bottom') {
          y = canvas.height - (fontSize * 1.5);
        }

        // Handle text wrapping
        const maxWidth = canvas.width * 0.9;
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Adjust Y for multiple lines
        const totalHeight = lines.length * fontSize * 1.2;
        if (this.overlayPosition() === 'center') {
            y -= totalHeight / 2;
        } else if (this.overlayPosition() === 'bottom') {
            y -= totalHeight;
        }

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, y + (i * fontSize * 1.2));
        }
      }

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `aura-marketing-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    };
    img.src = image.url;
  }
}
