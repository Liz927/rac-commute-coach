# Firebase Sync Setup

The app uses Google sign-in and stores one merged learning-data snapshot at:

`users/{userId}/sync/state`

## Firebase Console checklist

1. In **Authentication > Sign-in method**, enable **Google**.
2. In **Authentication > Settings > Authorized domains**, add `liz927.github.io`.
3. In **Firestore Database**, create a database in Production mode.
4. Open **Firestore Database > Rules**, replace the rules with the following, then publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/sync/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

The Firebase Web config is a public client identifier. Do not add a Firebase service-account JSON or any private key to this repository.

The app uses Google popup sign-in instead of redirect sign-in because Safari blocks the cross-origin storage used by Firebase redirect flows on GitHub Pages.
