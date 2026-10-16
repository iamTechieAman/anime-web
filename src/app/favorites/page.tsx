import { redirect } from "next/navigation";

export default function FavoritesPage() {
    redirect("/watchlist?collection=Favorites");
}
