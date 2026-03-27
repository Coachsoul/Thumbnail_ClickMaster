
export interface VideoInfo {
  title: string;
  description: string;
  category: string;
  language: 'ko' | 'en';
  channelName: string;
}

export interface PsychologicalHook {
  type: 'Negativity' | 'Curiosity' | 'SocialProof' | 'Authority';
  label: string;
  copy: string;
  psychology: string;
}

export interface ThumbnailResult {
  imageUrl: string;
  hooks: PsychologicalHook[];
  analysis: string;
  titles: string[];
  fullDescription: string;
  hashtags: string;
  keywords: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
