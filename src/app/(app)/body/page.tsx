import { redirect } from "next/navigation";

export default function BodyRedirectPage() {
	redirect("/profile?tab=body");
}
