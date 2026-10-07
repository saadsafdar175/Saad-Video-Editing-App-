import { ProjectData } from '../types/editor';

export interface HistoryState {
  past: ProjectData[];
  present: ProjectData;
  future: ProjectData[];
}

export class HistoryManager {
  private past: ProjectData[] = [];
  private present: ProjectData;
  private future: ProjectData[] = [];
  private maxHistory: number = 50;

  constructor(initialProject: ProjectData) {
    this.present = JSON.parse(JSON.stringify(initialProject));
  }

  getCurrent(): ProjectData {
    return this.present;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  record(newProject: ProjectData) {
    // Avoid duplicate records if no changes
    if (JSON.stringify(this.present.clips) === JSON.stringify(newProject.clips) &&
        JSON.stringify(this.present.tracks) === JSON.stringify(newProject.tracks) &&
        JSON.stringify(this.present.canvas) === JSON.stringify(newProject.canvas)) {
      return;
    }

    this.past.push(JSON.parse(JSON.stringify(this.present)));
    if (this.past.length > this.maxHistory) {
      this.past.shift();
    }
    this.present = JSON.parse(JSON.stringify(newProject));
    this.future = []; // Clear redo stack on new action
  }

  undo(): ProjectData | null {
    if (!this.canUndo()) return null;
    const previous = this.past.pop()!;
    this.future.unshift(JSON.parse(JSON.stringify(this.present)));
    this.present = previous;
    return JSON.parse(JSON.stringify(this.present));
  }

  redo(): ProjectData | null {
    if (!this.canRedo()) return null;
    const next = this.future.shift()!;
    this.past.push(JSON.parse(JSON.stringify(this.present)));
    this.present = next;
    return JSON.parse(JSON.stringify(this.present));
  }

  reset(newProject: ProjectData) {
    this.past = [];
    this.present = JSON.parse(JSON.stringify(newProject));
    this.future = [];
  }
}
