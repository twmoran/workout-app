# Workout Interval Coach

A personal installable PWA for interval workouts.

Features:
- Create, edit, duplicate and delete saved workouts
- Exercise-specific durations
- Adjustable rest time
- Spoken exercise announcements
- Strong high-pitched BEEP at exercise start
- Strong lower-pitched BEEP at exercise end
- Pause, resume, skip and stop
- Offline support after first successful load
- Workouts saved locally on the device

## Easiest way to put it on your phone

These files must be served over HTTPS for normal PWA installation.

One easy free option is GitHub Pages:
1. Create a new GitHub repository.
2. Upload everything in this folder, preserving the `icons` folder.
3. In the repository, open Settings > Pages.
4. Under Build and deployment, choose "Deploy from a branch".
5. Select the main branch and `/ (root)`, then save.
6. GitHub will give you a public web address.
7. Open that address on your phone.

iPhone:
- Open the address in Safari.
- Tap Share.
- Tap Add to Home Screen.
- Tap Add.

Android:
- Open the address in Chrome.
- Open the browser menu.
- Choose Install app or Add to Home screen.

The workout data stays in that browser/app installation on that device. Clearing site data or deleting the app may remove saved workouts.

## Important audio note

Tap the app's Start button to begin each workout. That user tap allows the browser to activate audio. The app then uses:
- High BEEP: exercise starts
- Low BEEP: exercise ends

For best results, keep phone media volume audible.
