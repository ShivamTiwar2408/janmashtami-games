declare module 'muuri' {
  interface MuuriOptions {
    items?: string;
    dragEnabled?: boolean;
    dragContainer?: HTMLElement;
    dragSortHeuristics?: {
      sortInterval?: number;
      minDragDistance?: number;
      minBounceBackAngle?: number;
    };
    dragPlaceholder?: {
      enabled?: boolean;
      createElement?: () => HTMLElement;
      onCreate?: (item: { getWidth(): number; getHeight(): number }, element: HTMLElement) => void;
      onRemove?: (item: any, element: HTMLElement) => void;
    };
    dragRelease?: {
      duration?: number;
      easing?: string;
      useDragContainer?: boolean;
    };
    layout?: {
      fillGaps?: boolean;
      horizontal?: boolean;
      alignRight?: boolean;
      alignBottom?: boolean;
      rounding?: boolean;
    };
    layoutOnResize?: boolean;
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
