import React from "react";
import styles from "~/styles/home.module.css";

export default function HomeLayout({
  leaderboard,
  matchmaking,
  profile,
  friends,
}: {
  leaderboard: React.ReactNode;
  matchmaking: React.ReactNode;
  profile: React.ReactNode;
  friends: React.ReactNode;
}) {
  return (
    <div className={styles.canvas}>
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={styles.leaderboardBox}>{leaderboard}</div>
          <div className={styles.matchmakingBox}>{matchmaking}</div>
        </div>
        <div className={styles.rightColumn}>
          <div className={styles.profileBox}>{profile}</div>
          <div className={styles.friendsBox}>{friends}</div>
        </div>
      </div>
    </div>
  );
}
