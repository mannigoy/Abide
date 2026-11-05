# Delete your Abide account

<!-- Published at https://mannigoy.github.io/Abide/delete-account.html (gh-pages branch, without the admin section
     at the bottom). Put that URL in Play Console → App content → Data deletion. -->

**Abide** (Bible reading check-ins for church leaders) by **Emman Roy Pielago**

You can delete your Abide account and its data at any time.

## Option 1: in the app (fastest)

1. Open Abide and sign in.
2. Go to the **Profile** tab.
3. Tap **Delete my account** at the bottom.
4. Read the summary and tap **Delete my account** again to confirm.

Your account is deleted straight away and you're signed out.

## Option 2: without the app

Email **emmanroy.pielago03@gmail.com** from the email address you signed up with, with the subject **"Delete my Abide account"**. We'll delete your account and data within 30 days and reply to confirm.

## What gets deleted

- Your profile: name, email address, role and friend code
- Your check-ins and streak
- Your Read, Reflect, Respond notes
- Your highlights and highlight notes
- Your reading plan progress
- Your friendships and the encouragements you sent or received
- Your reminder time and notification token
- Your small group memberships
- Any "Report a problem" messages you sent

## What may be kept

- Copies in our hosting provider's backups and logs can remain for a short time until they are replaced. They are not used for anything else.
- Groups you were a member of stay for everyone else. You're simply removed from them.
- **Overseers:** if you still lead a group, an admin first moves your groups to another overseer (so the group isn't lost for its members), then your account can be deleted. The app will tell you if this applies to you.

Notebook photos are never uploaded or saved, so there's nothing to delete there.

More details: https://mannigoy.github.io/Abide/privacy.html

---

### For the Abide admin (don't publish this part)

When a deletion email arrives:

1. Check that it came from the address on the account.
2. If the person leads a group, move it first with the admin website (group overseer), or the deletion will remove the group for everyone.
3. Supabase dashboard → Authentication → Users → find the email → **Delete user**. The database cascades remove all their data.
4. Reply to confirm, within 30 days of the request.
