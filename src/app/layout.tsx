import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Calisthenics Quest",
	description: "Gamified calisthenics training with an AI-personalized plan.",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={cn(
				"h-full antialiased font-sans",
				geistSans.variable,
				geistMono.variable,
				publicSans.variable,
			)}
		>
			<body className="min-h-full flex flex-col bg-background">
				<NextIntlClientProvider>
					{children}
					<Toaster position="top-center" />
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
