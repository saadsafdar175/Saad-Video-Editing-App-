import { ProjectData } from '../types/editor';
import { APP_NAME, APP_VERSION, createEmptyProject, PROJECT_FILE_EXTENSION } from '../utils/constants';

const AUTOSAVE_STORAGE_KEY = 'saad_video_studio_autosave';
const BACKUP_STORAGE_KEY = 'saad_video_studio_crash_recovery';

export class ProjectManager {
  /**
   * Serializes current project into a clean .saadvideo JSON string
   */
  static serializeProject(project: ProjectData): string {
    const clone = {
      ...project,
      appName: APP_NAME,
      version: APP_VERSION,
      updatedAt: Date.now(),
      // Remove runtime object URLs or Blobs before serializing
      media: project.media.map((m) => ({
        ...m,
        url: '', // Reconstructed on reload or file link
        blob: undefined,
      })),
    };
    return JSON.stringify(clone, null, 2);
  }

  /**
   * Parses .saadvideo JSON into ProjectData
   */
  static deserializeProject(jsonText: string): ProjectData {
    try {
      const data = JSON.parse(jsonText);
      if (!data.tracks || !data.clips || !data.canvas) {
        throw new Error('Invalid project structure. Missing essential timeline tracks or clips.');
      }
      return {
        ...data,
        updatedAt: Date.now(),
      };
    } catch (err) {
      throw new Error(`Failed to parse project file: ${(err as Error).message}`);
    }
  }

  /**
   * Saves project as downloadable .saadvideo file
   */
  static exportProjectFile(project: ProjectData, customName?: string) {
    const filename = `${(customName || project.name || 'Untitled').replace(/\s+/g, '_')}${PROJECT_FILE_EXTENSION}`;
    const jsonStr = this.serializeProject(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Prompts user to pick a .saadvideo file and returns parsed project
   */
  static openProjectFile(): Promise<ProjectData> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = `${PROJECT_FILE_EXTENSION},.json`;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        try {
          const text = await file.text();
          const project = this.deserializeProject(text);
          resolve(project);
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }

  /**
   * Saves project snapshot to local storage for autosave and crash recovery
   */
  static saveAutosave(project: ProjectData) {
    try {
      const serialized = this.serializeProject(project);
      localStorage.setItem(AUTOSAVE_STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    } catch {
      // LocalStorage quota handling
    }
  }

  /**
   * Checks if an autosaved project exists that can be recovered
   */
  static getRecoverableProject(): ProjectData | null {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY) || localStorage.getItem(AUTOSAVE_STORAGE_KEY);
      if (!stored) return null;
      return this.deserializeProject(stored);
    } catch {
      return null;
    }
  }

  /**
   * Clears autosave storage
   */
  static clearAutosave() {
    localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    localStorage.removeItem(BACKUP_STORAGE_KEY);
  }
}
