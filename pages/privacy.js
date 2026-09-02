const UPDATED = 'September 2, 2026';

export default function Privacy() {
  return (
    <main>
      <h1>Come Find Me Privacy Policy</h1>
      <p className="updated">Last updated: {UPDATED}</p>

      <h2>What we collect</h2>
      <ul>
        <li>Your email address and a password, used to sign in.</li>
        <li>Your device location, only while you have sharing turned on.</li>
        <li>The groups you create or join, and the color you pick in each one.</li>
      </ul>

      <h2>Location</h2>
      <p>
        Your location goes to the people in the groups you chose, for the length of time you chose.
        When your sharing window ends, your location stops updating and your last position is cleared.
        You can stop sharing at any time from inside the app.
      </p>
      <p>
        We do not sell location data. We do not share it with advertisers. We do not build a history
        of where you have been; the app stores only your most recent position while sharing is on.
      </p>

      <h2>Who can see your location</h2>
      <p>
        Only members of a group you joined, and only while your sharing window is open. Leaving a
        group removes your position from it immediately.
      </p>

      <h2>How long we keep data</h2>
      <ul>
        <li>Location: cleared when your sharing window ends or you leave the group.</li>
        <li>Groups: removed after the group expires.</li>
        <li>Account: kept until you ask us to delete it.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        Email <a href="mailto:support@comefindme.app">support@comefindme.app</a> from the address on
        your account. We delete the account, its groups, and all stored location data.
      </p>

      <h2>Children</h2>
      <p>Come Find Me is not directed at children under 13, and we do not knowingly collect their data.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:support@comefindme.app">support@comefindme.app</a>
      </p>

      <style jsx global>{`
        :root { color-scheme: light dark; }
        body {
          margin: 0;
          background: #0b1020;
          color: #e7ecf7;
          font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        main { max-width: 680px; margin: 0 auto; padding: 48px 22px 80px; }
        h1 { font-size: 28px; margin: 0 0 4px; }
        h2 { font-size: 18px; margin: 32px 0 8px; color: #ffb347; }
        .updated { color: #8fa0c0; margin: 0 0 8px; font-size: 14px; }
        a { color: #ffb347; }
        ul { padding-left: 20px; }
        li { margin-bottom: 6px; }
      `}</style>
    </main>
  );
}
