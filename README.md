# SportsClan Mobile

Expo Router app for browsing and creating sports tournaments with friends. It uses the Django API in `Sportsclan_backend` for accounts, sports, venues, tournaments, and player spots.

## Connect to the API

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`:

- Android emulator: `http://10.0.2.2:8000/api/v1`
- iOS simulator or web on the same computer: `http://127.0.0.1:8000/api/v1`
- Physical phone: `http://<computer-lan-ip>:8000/api/v1`

For a physical phone, run Django with `python manage.py runserver 0.0.0.0:8000` and add the computer's LAN IP to `DJANGO_ALLOWED_HOSTS` in the backend `.env`. Keep the phone and computer on the same network. Restart Expo after changing `.env`.

Run the backend migrations, `python manage.py seed_catalog`, and `python manage.py seed_countries` first. Assign each local venue to a country and connect it to sports in Django Admin; the Create screen filters venues and currencies using the selected country.

Venue listings may be free, fixed-price, hourly, or quote-only. The Create screen asks for game length to estimate hourly costs. A tournament stores the rate snapshot and an estimate; the host can record the actual agreed cost on its detail screen. Venue costs are separate from player entry fees, and the host pays the venue directly in this version.

## Start the app

```sh
npm install
npx expo start
```

Press `a` for Android, `i` for iOS on macOS, or `w` for web. The app uses SecureStore for tokens on native devices and browser storage for web previews. Access tokens are refreshed when needed.

## App features

- Browse open tournaments and filter by sport, title, venue, or city.
- Register or sign in with the backend and keep the session on device.
- Create tournaments with a sport, local venue, start time, entry price, currency, and player spot count.
- See the projected full prize pool and a winner-takes-all payout suggestion.
- View tournament details and choose an open numbered spot.
- See which spots are taken, and join or leave a tournament.
- View tournaments you host or joined.

Entry fees are saved by the backend but are not charged. Payment processing is not connected yet.