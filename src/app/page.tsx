import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://toonplayer.in',
  },
};

export default function Page() {
  return <HomeClient />;
}
