import { serwist } from "@serwist/next/config";

export default await serwist.withNextConfig(() => ({
	swSrc: "src/sw.ts",
	swDest: "public/sw.js",
}));
