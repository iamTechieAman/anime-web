import { redirect } from "next/navigation";

export default function UpcomingPage() {
    redirect("/browse?sort_by=primary_release_date.desc");
}
