// Bus Buddy - one-time setup script.
// Run this once in Scriptable (tap the play button, not add-to-home-screen) to securely
// store your credentials in the device Keychain. bus-buddy.js reads them from there -
// nothing sensitive is ever written into the widget script's own code.
//
// Where to get each value:
// - Google Client ID / Secret: from credentials.json (Google Cloud Console > Credentials)
// - Google Refresh Token: from scripts/token.json on your computer, after running
//   `npm run test-calendar-auth` there once (the "refresh_token" field)
// - Google Maps API Key: the key you created for the Routes API (scripts/.env on your computer)
// - Home Address: your home address, used by the "go home" widget

async function promptFor(label) {
  const alert = new Alert();
  alert.title = label;
  alert.message = 'Paste the value below.';
  alert.addTextField(label, '');
  alert.addAction('Save');
  alert.addCancelAction('Skip');
  const choice = await alert.presentAlert();
  if (choice === -1) return null; // cancelled
  // Trim whitespace/newlines/quotes that often sneak in from copy-pasting out of a JSON preview.
  return alert.textFieldValue(0).trim().replace(/^["']|["']$/g, '');
}

function maskPreview(value) {
  if (value.length <= 8) return `${value.length} chars: ${value}`;
  return `${value.length} chars: ${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function confirmSaved(label, value) {
  const alert = new Alert();
  alert.title = `Saved: ${label}`;
  alert.message = `${maskPreview(value)}\n\nDoes this look right? (correct length, no stray quotes/spaces)`;
  alert.addAction('Looks right');
  alert.addAction('Redo this one');
  return alert.presentAlert();
}

async function main() {
  const fields = [
    ['bb_client_id', 'Google Client ID'],
    ['bb_client_secret', 'Google Client Secret'],
    ['bb_refresh_token', 'Google Refresh Token'],
    ['bb_maps_api_key', 'Google Maps API Key'],
    ['bb_home_address', 'Home Address'],
  ];

  for (const [key, label] of fields) {
    let value = await promptFor(label);
    while (value) {
      const choice = await confirmSaved(label, value);
      if (choice === 0) {
        Keychain.set(key, value);
        console.log(`Saved ${label} (${maskPreview(value)}).`);
        break;
      } else {
        value = await promptFor(label);
      }
    }
    if (!value) {
      console.log(`Skipped ${label} (leaving any existing value unchanged).`);
    }
  }

  const done = new Alert();
  done.title = 'Setup complete';
  done.message = 'Bus Buddy credentials saved to Keychain. You can now add the bus-buddy widget to your home screen.';
  done.addAction('OK');
  await done.presentAlert();
}

await main();
