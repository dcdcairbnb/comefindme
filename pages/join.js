export default function Join() {
  return null;
}

export async function getServerSideProps(ctx) {
  const raw = (ctx.query.code || ctx.query.join || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const code = raw;
  const deepLink = code ? `glowshare://join/${code}` : 'glowshare://';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Join a Glow Share group</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b1020; color: #f5f7fb;
  }
  .card {
    width: 100%; max-width: 420px; text-align: center;
    background: #151b30; border: 1px solid #26304d;
    border-radius: 18px; padding: 32px 24px;
  }
  .glow {
    width: 64px; height: 64px; margin: 0 auto 16px;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 45%, #ffd479 0%, #ff9f1c 38%, #6d3bd6 100%);
    box-shadow: 0 0 34px rgba(255,180,80,.5);
  }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p.sub { margin: 0 0 22px; color: #9fb0d0; font-size: 15px; }
  .code {
    font: 700 38px/1.1 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 8px; padding: 16px 8px; margin: 0 0 20px;
    background: #101733; border: 2px dashed #4f6bd8; border-radius: 12px;
    color: #cfe0ff;
  }
  a.btn, button.btn {
    display: block; width: 100%; padding: 15px 18px; margin: 10px 0;
    border: 0; border-radius: 12px; font-size: 16px; font-weight: 650;
    text-decoration: none; cursor: pointer; font-family: inherit;
  }
  .primary { background: #3b82f6; color: #fff; }
  .ghost { background: transparent; color: #9fb0d0; border: 1px solid #2c3a5e; }
  .ghost { border: 1px solid #2c3a5e; }
  ol { text-align: left; color: #9fb0d0; font-size: 14px; padding-left: 20px; margin: 18px 0 0; }
  li { margin: 6px 0; }
  .hint { margin-top: 18px; font-size: 13px; color: #7286aa; }
</style>
</head>
<body>
  <div class="card">
    <div class="glow"></div>
    <h1>${code ? 'You were invited to a group' : 'Glow Share'}</h1>
    <p class="sub">${code ? 'Open Glow Share to join and start sharing your location.' : 'Location sharing with the people who matter.'}</p>
    ${code ? `<div class="code">${code}</div>` : ''}
    ${code ? `<a class="btn primary" id="open" href="${deepLink}">Open in Glow Share</a>` : ''}
    ${code ? `<button class="btn ghost" id="copy" type="button">Copy code</button>` : ''}
    <ol>
      <li>Install Glow Share from your TestFlight invite.</li>
      <li>Create an account (email + password).</li>
      <li>Groups tab &rarr; Join &rarr; enter ${code ? 'the code above' : 'your invite code'}.</li>
    </ol>
    <p class="hint">Don't have the beta yet? Ask whoever invited you to add your email in TestFlight.</p>
  </div>
<script>
(function () {
  var code = ${JSON.stringify(code)};
  if (!code) return;
  var btn = document.getElementById('copy');
  if (btn) {
    btn.addEventListener('click', function () {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(function () {
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = 'Copy code'; }, 1800);
        });
      }
    });
  }
  try { window.location.href = ${JSON.stringify(deepLink)}; } catch (e) {}
})();
</script>
</body>
</html>`;

  ctx.res.setHeader('Content-Type', 'text/html; charset=utf-8');
  ctx.res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  ctx.res.write(html);
  ctx.res.end();
  return { props: {} };
}
