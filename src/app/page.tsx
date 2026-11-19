import { redirect } from "next/navigation";

// proxy.ts sends signed-out users to /sign-in; everyone else lands on /today.
export default function Home() {
	redirect("/today");
}
