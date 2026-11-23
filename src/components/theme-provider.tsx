"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { type ComponentProps, useEffect } from "react";

const LIGHT_THEME_COLOR = "#fafafa";
const DARK_THEME_COLOR = "#121212";

function ThemeColorSync() {
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		if (!resolvedTheme) return;
		const color =
			resolvedTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;

		let meta = document.querySelector<HTMLMetaElement>(
			'meta[name="theme-color"][data-dynamic-theme-color="true"]',
		);
		if (!meta) {
			meta = document.createElement("meta");
			meta.name = "theme-color";
			meta.setAttribute("data-dynamic-theme-color", "true");
			document.head.appendChild(meta);
		}
		meta.content = color;
	}, [resolvedTheme]);

	return null;
}

export function ThemeProvider({
	children,
	...props
}: ComponentProps<typeof NextThemesProvider>) {
	return (
		<NextThemesProvider {...props}>
			<ThemeColorSync />
			{children}
		</NextThemesProvider>
	);
}
