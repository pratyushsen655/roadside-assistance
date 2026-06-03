# Play Store Submission Checklist

## Pre‑Release
- [ ] Final code freeze on `main` branch
- [ ] Run `eas build --profile production` and generate an AAB
- [ ] Verify the AAB with `bundletool` (no missing resources)
- [ ] Test release build on physical Android devices (different OS versions)
- [ ] Update versionCode & versionName in `app.json` (`expo.version`)
- [ ] Generate signed APK/AAB (EAS handles signing, ensure keystore is uploaded)

## Assets & Metadata
- Store listing text (title, short description, full description, keywords) – see `store-listing.txt`
- High‑resolution screenshots (portrait & landscape, 5‑7 per device)
- Feature graphic (1024×500 px)
- App icon (512×512 px PNG)
- Privacy policy URL (host the `privacy-policy.md` on a public site)
- Contact details (email, website)

## Legal & Compliance
- [ ] Privacy policy complies with GDPR/CCPA (review template)
- [ ] Declare data collection (location, camera, microphone, contacts)
- [ ] Ensure no restricted APIs are used without declaration

## Play Console Setup
- Create a new app (or select existing)
- Upload the AAB
- Fill in Store listing information
- Add the privacy‑policy URL
- Upload signed keystore (or let EAS manage it)
- Set the appropriate content rating
- Set distribution countries
- Submit for review

## Post‑Release
- Monitor crash reports via Firebase Crashlytics
- Verify in‑app updates via EAS
- Respond to user reviews

---
*Checklist generated on 2026‑06‑03*
