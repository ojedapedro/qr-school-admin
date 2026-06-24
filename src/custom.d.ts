// Custom ambient module declarations for third-party packages without types
declare module '@tailwindcss/vite';
declare module '@vitejs/plugin-react';
declare module 'motion/react';
declare module 'lucide-react';
declare module 'qrcode.react';
declare module 'html5-qrcode' {
	export class Html5Qrcode {
		constructor(elementIdOrElement: string | HTMLElement);
		static getCameras?(): Promise<any[]>;
		isScanning?: boolean;
		start(...args: any[]): Promise<any>;
		stop(): Promise<void>;
		clear?: () => void;
	}
	export enum Html5QrcodeSupportedFormats {}
}
declare module 'date-fns/locale';
declare module 'date-fns';
declare module 'clsx' {
	export type ClassValue = any;
	export function clsx(...inputs: any[]): string;
	export default clsx;
}

declare module 'tailwind-merge' {
	export function twMerge(...classes: string[]): string;
}
