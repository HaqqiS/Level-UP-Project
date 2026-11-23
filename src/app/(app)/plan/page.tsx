import { redirect } from "next/navigation";

export default function PlanRedirectPage() {
	redirect("/today?tab=plan");
}
