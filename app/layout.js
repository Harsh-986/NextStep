import { Inter} from "next/font/google";
import "./globals.css";

import {ClerkProvider,} from '@clerk/nextjs'
import { dark } from "@clerk/themes";
import { Toaster } from "sonner";


import {ThemeProvider} from "@/components/theme-proider";
import Header from "@/components/header";


const inter=Inter({subsets: ["latin"]})

export const metadata = {
  title: "NextStep - Fresher Career Coach",
  description: "Your AI-Powered Career Coach for Freshers",
};


export default function RootLayout({ children }) {
  return (
    <ClerkProvider appearance={{
      baseTheme: dark,
    }}> 

    
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} `}
        >
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {/* header */}
            <Header />

            <main className="min-h-screen">{children}</main>
            <Toaster richColors />

            {/* footer */}
            <footer className="bg-muted/50 py-12">
              <div className="container mx-auto px-4 text-center text-gray-200">
                <p>Made by Ansu and team...</p>
              </div>
            </footer>

          </ThemeProvider>
      </body>
    </html>
        </ClerkProvider>
  );
}
