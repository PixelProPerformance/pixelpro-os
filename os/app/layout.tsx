import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"PixelPro OS", description:"Operação de conteúdos da PixelPro Performance", icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt"><body>{children}</body></html>}
