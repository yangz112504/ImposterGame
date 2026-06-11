import Link from "next/link";

export default function HowToPlay() {
  return (
    <div className="container">
      <h1 className="title">How to Play</h1>
      <p className="subtitle">Learn the rules of Imposter</p>

      <ul style={{ textAlign: "left", maxWidth: "500px" }}>
        <li>Each player gets a word except one person, who is the Imposter.</li>
        <li>Players give hints related to their word without saying it.</li>
        <li>The Imposter tries to blend in without knowing the word.</li>
        <li>At the end, everyone votes for who they think is the Imposter.</li>
      </ul>

      <Link href="/">
        <button className="homescreen-btn" style={{ marginTop: "2rem" }}>
          Back to Home
        </button>
      </Link>
    </div>
  );
}
