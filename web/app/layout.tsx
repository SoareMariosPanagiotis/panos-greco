import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter, SiteFooterFallback } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Panos Greco",
    description: "Ulei de măsline extravirgin bio, din livada proprie.",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="ro"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
        <body className="flex min-h-full flex-col bg-olive-light font-sans">
        <CartProvider>
            <SiteHeader />
            {children}
            {/* Subsolul citește datele firmei din baza de date; până vin, arată restul */}
            <Suspense fallback={<SiteFooterFallback />}>
                <SiteFooter />
            </Suspense>
        </CartProvider>
        </body>
        </html>
    );
}