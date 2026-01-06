import HomeLayout from "~/layout/HomeLayout";
import Leaderboard from "./leaderboard";
import Matchmaking from "./matchmaking";
import ProfilePanel from "./profilepanel";
import FriendPanel from "./friendpanel";

export default function IndexPage() {
  return (
    <HomeLayout
      leaderboard={<Leaderboard />}
      matchmaking={<Matchmaking />}
      profile={<ProfilePanel />}
      friends={<FriendPanel />}
    />
  );
}


