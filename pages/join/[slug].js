import { sql } from '@vercel/postgres';

const APP_STORE_URL = 'https://apps.apple.com/app/id6801256606';

export default function JoinPage(props) {
  const code = props.code;
  const groupName = props.groupName;
  const expired = props.expired;
  const found = props.found;
  const deepLink = 'comefindme://join/' + code;

  const title = !found
    ? 'Invite not found'
    : expired
    ? 'This invite has expired'
    : 'You are invited to ' + groupName;

  const sub = !found
    ? 'Double-check the link, or ask for a new one.'
    : expired
    ? 'Ask whoever sent it to start a new share.'
    : 'Open Come Find Me to see each other on the map.';

  return (
    <div className="wrap">
      <div className="card">
        <div className="dot" />
        <h1>{title}</h1>
        <p className="sub">{sub}</p>

        {found && !expired ? (
          <>
            <div className="code">{code}</div>
            <a className="btn" href={deepLink}>Open in Come Find Me</a>
            <a className="btn ghost" href={APP_STORE_URL}>Get the app</a>
            <p className="hint">
              Already have the app? Tap Open. Otherwise install it, then enter code {code}.
            </p>
          </>
        ) : (
          <a className="btn ghost" href={APP_STORE_URL}>Get the app</a>
        )}
      </div>

      {found && !expired ? (
        <script
          dangerouslySetInnerHTML={{
            __html:
              "setTimeout(function(){window.location.href=" +
              JSON.stringify(deepLink) +
              ";},350);"
          }}
        />
      ) : null}

      <style jsx global>{`
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #0b1020;
          color: #f5f7fb;
          font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          width: 100%;
          max-width: 420px;
          text-align: center;
          background: #151b30;
          border: 1px solid #26304d;
          border-radius: 18px;
          padding: 34px 24px;
        }
        .dot {
          width: 64px;
          height: 64px;
          margin: 0 auto 18px;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 45%, #ffd479 0%, #ff9f1c 38%, #6d3bd6 100%);
          box-shadow: 0 0 34px rgba(255, 180, 80, 0.45);
        }
        h1 { font-size: 22px; margin: 0 0 6px; }
        .sub { margin: 0 0 22px; color: #9fb0d0; font-size: 15px; }
        .code {
          font: 700 36px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
          letter-spacing: 6px;
          padding: 16px 8px;
          margin-bottom: 20px;
          border: 2px dashed #3a4a72;
          border-radius: 14px;
        }
        .btn {
          display: block;
          text-decoration: none;
          padding: 14px 18px;
          border-radius: 12px;
          font-weight: 600;
          margin-bottom: 10px;
          background: #ff9f1c;
          color: #1a1205;
        }
        .btn.ghost {
          background: transparent;
          border: 1px solid #3a4a72;
          color: #cfdcf5;
        }
        .hint { color: #7d8db0; font-size: 13px; margin: 14px 0 0; }
      `}</style>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const slug = String(ctx.params.slug || '');
  const tail = slug.indexOf('-') >= 0 ? slug.slice(slug.lastIndexOf('-') + 1) : slug;
  const code = tail.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

  let found = false;
  let expired = false;
  let groupName = 'the group';

  if (code) {
    try {
      const r = await sql.query(
        'SELECT group_name, expires_at, is_active FROM groups WHERE join_code = $1',
        [code]
      );
      if (r.rows.length > 0) {
        found = true;
        const g = r.rows[0];
        groupName = g.group_name || 'the group';
        if (g.is_active === false) expired = true;
        if (g.expires_at && new Date(g.expires_at) < new Date()) expired = true;
      }
    } catch (e) {
      // Database unavailable: report not-found rather than faking a valid invite.
      // Showing "You're invited" for an unresolvable code just hands the app a code
      // it will reject, which is a worse experience than an honest error.
      found = false;
    }
  }

  return { props: { code, groupName, expired, found } };
}
