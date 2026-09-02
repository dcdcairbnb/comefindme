export default function Support() {
  return (
    <main>
      <h1>Come Find Me Support</h1>
      <p>
        Email <a href="mailto:support@comefindme.app">support@comefindme.app</a>. Include your account
        email and what you were doing when the problem happened.
      </p>

      <h2>Common questions</h2>

      <h3>Nobody shows up on my map</h3>
      <p>
        Members appear only while their sharing window is open and the app has location permission.
        Check Settings, Come Find Me, Location and pick Always or While Using.
      </p>

      <h3>My invite link does nothing</h3>
      <p>
        The person tapping it needs the app installed. If they have it and the link still does not
        open, they can enter the 6-character code on the Join screen instead.
      </p>

      <h3>How long does sharing last?</h3>
      <p>
        You pick 12, 24, or 48 hours when you start a group, and you can extend it whenever you want.
        When under 30 minutes remain, the app offers to extend.
      </p>

      <h3>How do I stop sharing?</h3>
      <p>Turn sharing off on the map screen, or leave the group. Both clear your location right away.</p>

      <h3>Delete my account</h3>
      <p>
        Email <a href="mailto:support@comefindme.app">support@comefindme.app</a> from the address on
        your account.
      </p>

      <p className="foot">
        <a href="/privacy">Privacy Policy</a>
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
        h1 { font-size: 28px; margin: 0 0 12px; }
        h2 { font-size: 19px; margin: 34px 0 6px; color: #ffb347; }
        h3 { font-size: 16px; margin: 22px 0 4px; }
        a { color: #ffb347; }
        .foot { margin-top: 40px; }
      `}</style>
    </main>
  );
}
