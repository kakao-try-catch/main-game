declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement>
  >;
  const src: string;
  export default src;
}

declare global {
  interface Window {
    __GAME_RATIO: number;
    // Deprecated: 하위 호환성을 위해 유지
    __APPLE_GAME_RATIO: number;
    __FLAPPY_GAME_RATIO: number;
  }
}
