import { redirect } from "next/navigation";

export default function LogRedirectPage() {
	redirect("/today?tab=log");
}
