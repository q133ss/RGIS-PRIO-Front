// Определения типов для Яндекс.Карт API
declare global {
    interface Window {
      ymaps: {
        ready: (callback: () => void) => void;
        Map: new (
          container: string | HTMLElement,
          options: {
            center: [number, number];
            zoom: number;
            controls?: string[];
          }
        ) => any;
        Placemark: new (
          coordinates: [number, number],
          properties?: any,
          options?: any
        ) => any;
        GeoObjectCollection: new () => any;
      };
    }
  }
  
  export {};