import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider"; // Import the provider
import Sidebar from "@/components/Sidebar";
import OktaProviderWrapper from "@/components/OktaProviderWrapper"; // Import Okta Provider

export const metadata: Metadata = {
  title: "Elevate",
  description: "Empowering Teams. Recognizing Excellence",
  icons: {
    icon: '/logo4.svg', // Path to your favicon
    apple: '/logo4.svg', // Path to your apple touch icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-gray-100"> {/* Added default background */}
        <OktaProviderWrapper> {/* Wrap with Okta Provider */}
     
            <div className="flex min-h-screen"> {/* Flex container */}
              <Sidebar /> {/* Add the Sidebar */}
              <main className="flex-grow p-6 md:p-8 lg:p-10"> {/* Main content area */}
                {children}
              </main>
            </div>
 
        </OktaProviderWrapper>
      </body>
    </html>
  );
}