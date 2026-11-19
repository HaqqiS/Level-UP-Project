import { getRequestConfig } from "next-intl/server";

// EN only for now; locale will later come from profile/cookie.
export default getRequestConfig(async () => {
	const locale = "en";
	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
	};
});
