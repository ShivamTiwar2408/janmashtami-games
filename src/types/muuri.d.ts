declare module 'muuri' {
  interface MuuriOptions {
    items?: string;
    dragEnabled?: boolean;
    dragSortHeuristics?: {
      sortInterval?: number;
      minDragDistance?: number;
      minBounceBackAngle?: number;
    };
    layout?: {
      fillGaps?: boolean;
      horizontal?: boolean;
      alignRight?: boolean;
      alignBottom?: boolean;
      rounding?: boolean;
    };
    layoutDuration?: number;
    layoutEasing?: string;
    [key: string]: any; // Allow additional properties
  }

  interface MuuriItem {
    getElement(): HTMLElement | null;
  }

  class Muuri {
    constructor(element: HTMLElement, options?: MuuriOptions);
    
    getItems(): MuuriItem[];
    destroy(): void;
    on(event: string, callback: () => void): void;
    off(event: string, callback: () => void): void;
    layout(): void;
    refreshItems(): Muuri;
  }

  export = Muuri;
}
