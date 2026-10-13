import type { Metadata,Viewport } from 'next';
import './globals.css';
import './theme-v1_2.css';
import './theme-v1_4.css';
import './theme-v1_5.css';
export const metadata:Metadata={title:'Tower of Trials — Two spins. One floor.',description:'Spin the wheel, beat two mini-game trials, and climb a mysterious tower every day.'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#08111f'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
