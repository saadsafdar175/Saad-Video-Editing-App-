export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  openMediaFiles: () => Promise<string[] | null>;
  saveProjectDialog: (defaultName?: string) => Promise<string | null>;
  openProjectDialog: () => Promise<string | null>;
  executeFFmpeg: (args: string[], outputPath: string) => Promise<{ success: boolean; outputPath: string }>;
  cancelFFmpeg: () => Promise<boolean>;
  onFFmpegProgress: (callback: (data: { time: string | null; frame: number | null; raw: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
